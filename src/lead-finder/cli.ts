import path from 'node:path';
import type { LeadQualified } from '../types/lead-finder.js';
import { getEnvOptional } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { closeBrowser } from '../utils/playwright.js';
import {
  bootstrapAirtableLeadSchema,
  clearAirtableLeads,
  listApprovedAirtableLeads,
  markAirtableLeadContacted,
  syncLeadsToAirtable,
  updateAirtableAfterPreview
} from './airtable.js';
import { enrichLeadContact } from './contact.js';
import { buildLeadDashboard } from './dashboard.js';
import { scanGoogleMapsLeads } from './maps.js';
import { generateWebsiteDraft } from './preview.js';
import { dedupeQualifiedLeads, qualifyLead } from './qualify.js';
import { buildReviewMarkdown } from './review.js';
import { LeadFinderStore } from './store.js';
import { buildOutreachDraft, sendOutreachEmail } from './outreach.js';

function parseArgs(argv: string[]): { command: string; options: Map<string, string | boolean> } {
  const [command = 'help', ...rest] = argv;
  const options = new Map<string, string | boolean>();

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith('--')) {
      options.set(key, true);
      continue;
    }
    options.set(key, next);
    index += 1;
  }

  return { command, options };
}

function getStringOption(options: Map<string, string | boolean>, key: string, fallback?: string): string | undefined {
  const value = options.get(key);
  if (typeof value === 'string') return value;
  return fallback;
}

function getNumberOption(options: Map<string, string | boolean>, key: string, fallback: number): number {
  const value = getStringOption(options, key);
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function resolveBatchId(store: LeadFinderStore, explicitBatchId?: string): Promise<string> {
  if (explicitBatchId) return explicitBatchId;
  const latest = await store.findLatestBatchId();
  if (!latest) throw new Error('Aucun batch lead-finder trouvé');
  return latest;
}

async function commandScan(options: Map<string, string | boolean>): Promise<void> {
  const store = new LeadFinderStore();
  const brightDataApiToken = getEnvOptional('brightDataApiToken') || null;
  const queries = getStringOption(options, 'queries')?.split(',').map(query => query.trim()).filter(Boolean);
  const result = await scanGoogleMapsLeads({
    city: getStringOption(options, 'city', 'Lyon'),
    queries,
    perQueryLimit: getNumberOption(options, 'limit', 12),
    scrollPasses: getNumberOption(options, 'scroll-passes', 4)
  });

  logger.info(`🧪 Enrichissement contacts sur ${result.leads.length} leads`);
  const qualified = dedupeQualifiedLeads(
    await Promise.all(
      result.leads.map(async rawLead => {
        const enrichment = await enrichLeadContact(rawLead, brightDataApiToken);
        rawLead.socialLinks = enrichment.socialLinks;
        rawLead.websiteUrl = enrichment.websiteUrl;
        rawLead.discoveredWebsiteUrls = enrichment.discoveredWebsiteUrls;
        rawLead.source.sourceUrls = Array.from(
          new Set([...rawLead.source.sourceUrls, ...enrichment.discoveredWebsiteUrls, ...enrichment.socialLinks])
        );
        return qualifyLead(rawLead, enrichment.contact);
      })
    )
  );

  await Promise.all([
    store.writeBatchJson(result.batchId, 'raw/maps-leads.json', result.leads),
    store.writeBatchJson(result.batchId, 'normalized/qualified-leads.json', qualified)
  ]);

  const reviewMarkdown = buildReviewMarkdown(result.batchId, qualified);
  const manifest = await store.writeLeadBatch(result.batchId, result.city, result.queries, qualified, reviewMarkdown);

  logger.success(`Batch ${manifest.batchId} prêt`);
  logger.info(`Leads: ${manifest.leadsPath}`);
  logger.info(`Review: ${manifest.reviewPath ?? 'n/a'}`);
}

async function commandSync(options: Map<string, string | boolean>): Promise<void> {
  const store = new LeadFinderStore();
  const batchId = await resolveBatchId(store, getStringOption(options, 'batch'));
  const leads = await store.readLeads(batchId);
  await syncLeadsToAirtable(leads);
  logger.success(`Airtable synchronisé pour ${leads.length} leads (${batchId})`);
}

async function commandAirtableBootstrap(): Promise<void> {
  await bootstrapAirtableLeadSchema();
}

async function commandAirtableClear(): Promise<void> {
  const deleted = await clearAirtableLeads();
  logger.success(`Airtable vidé (${deleted} records supprimés)`);
}

async function commandGenerate(options: Map<string, string | boolean>): Promise<void> {
  const store = new LeadFinderStore();
  const batchId = await resolveBatchId(store, getStringOption(options, 'batch'));
  const leads = await store.readLeads(batchId);
  const all = Boolean(options.get('all'));
  const filtered = leads.filter(lead => all || lead.status === 'qualified' || lead.status === 'draft_ready');

  const updatedLeads: LeadQualified[] = [];

  for (const lead of leads) {
    if (!filtered.some(candidate => candidate.leadId === lead.leadId)) {
      updatedLeads.push(lead);
      continue;
    }

    const draft = await generateWebsiteDraft(lead, store);
    const nextLead: LeadQualified = {
      ...lead,
      previewUrl: draft.previewUrl,
      status: lead.status === 'rejected' ? lead.status : 'draft_ready',
      lastActionAt: draft.generatedAt
    };
    updatedLeads.push(nextLead);

    try {
      await updateAirtableAfterPreview(lead.leadId, draft.previewUrl);
    } catch (error) {
      logger.warn(`Airtable preview sync ignoré pour ${lead.businessName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const reviewMarkdown = buildReviewMarkdown(batchId, updatedLeads);
  await store.writeLeadBatch(batchId, leads[0]?.city ?? 'Lyon', [], updatedLeads, reviewMarkdown);
  logger.success(`Previews générées pour ${filtered.length} leads`);
  logger.info(`Dossier previews: ${path.resolve(store.previewRootDir)}`);
}

async function commandDashboard(): Promise<void> {
  const store = new LeadFinderStore();
  const outputPath = await buildLeadDashboard(store);
  logger.success(`Dashboard lead-finder généré: ${outputPath}`);
}

async function commandReview(options: Map<string, string | boolean>): Promise<void> {
  const store = new LeadFinderStore();
  const batchId = await resolveBatchId(store, getStringOption(options, 'batch'));
  const manifest = await store.readManifest(batchId);
  logger.info(`Batch: ${manifest.batchId}`);
  logger.info(`Leads: ${manifest.leadsPath}`);
  logger.info(`Review: ${manifest.reviewPath ?? 'n/a'}`);
}

async function commandOutreach(options: Map<string, string | boolean>): Promise<void> {
  const store = new LeadFinderStore();
  const batchId = await resolveBatchId(store, getStringOption(options, 'batch'));
  const dryRun = Boolean(options.get('dry-run'));

  const records = await listApprovedAirtableLeads();
  logger.info(`📬 ${records.length} leads Airtable approuvés`);

  for (const record of records) {
    const fields = record.fields;
    const draft = buildOutreachDraft({
      leadId: String(fields.lead_id ?? record.id),
      businessName: String(fields.business_name ?? 'Business'),
      category: typeof fields.category === 'string' ? fields.category : null,
      city: typeof fields.city === 'string' ? fields.city : 'Lyon',
      previewUrl: typeof fields.preview_url === 'string' && fields.preview_url ? fields.preview_url : null,
      contact: {
        email: typeof fields.contact_email === 'string' && fields.contact_email ? fields.contact_email : null,
        channel: typeof fields.contact_channel === 'string' ? (fields.contact_channel as LeadQualified['contact']['channel']) : 'none',
        confidence: typeof fields.contact_confidence === 'string'
          ? (fields.contact_confidence as LeadQualified['contact']['confidence'])
          : 'none',
        sourceUrl: null,
        fallbackChannels: [],
        discoveredWebsite: typeof fields.website_url === 'string' && fields.website_url ? fields.website_url : null
      }
    });

    await store.writeOutreachDraft(batchId, draft);
    if (!draft.readyToSend || dryRun) continue;

    const sent = await sendOutreachEmail(draft);
    await markAirtableLeadContacted(
      record.id,
      sent.sentAt,
      `Email envoyé via Signal Canvas (${sent.providerId})`
    );
  }

  logger.success(`Outreach ${dryRun ? 'préparé (dry-run)' : 'terminé'}`);
}

function printUsage(): void {
  console.log(`Usage:
  npm run lead:scan [--limit 12] [--queries "restaurants lyon,cafes lyon"]
  npm run lead:airtable:bootstrap
  npm run lead:airtable:clear
  npm run lead:sync [--batch lead-...]
  npm run lead:generate [--batch lead-...] [--all]
  npm run lead:review [--batch lead-...]
  npm run lead:dashboard
  npm run lead:outreach [--batch lead-...] [--dry-run]`);
}

async function main(): Promise<void> {
  try {
    const { command, options } = parseArgs(process.argv.slice(2));

    switch (command) {
      case 'scan':
        await commandScan(options);
        break;
      case 'sync':
        await commandSync(options);
        break;
      case 'airtable:bootstrap':
        await commandAirtableBootstrap();
        break;
      case 'airtable:clear':
        await commandAirtableClear();
        break;
      case 'generate':
        await commandGenerate(options);
        break;
      case 'review':
        await commandReview(options);
        break;
      case 'dashboard':
        await commandDashboard();
        break;
      case 'outreach':
        await commandOutreach(options);
        break;
      default:
        printUsage();
    }
  } finally {
    await closeBrowser().catch(() => undefined);
  }
}

main().catch(error => {
  logger.error(`Lead finder fatal: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}).finally(() => {
  process.exit(process.exitCode ?? 0);
});
