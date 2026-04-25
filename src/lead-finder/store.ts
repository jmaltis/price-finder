import fs from 'node:fs/promises';
import path from 'node:path';
import type { LeadBatchManifest, LeadQualified, OutreachDraft, WebsiteDraft } from '../types/lead-finder.js';
import { getLeadDataRoot, getPreviewOutputRoot } from './config.js';
import { isoNow } from './utils.js';

export interface BatchPaths {
  batchDir: string;
  rawDir: string;
  normalizedDir: string;
  outreachDir: string;
  reviewPath: string;
  leadsPath: string;
  manifestPath: string;
}

export class LeadFinderStore {
  readonly rootDir: string;
  readonly previewRootDir: string;

  constructor(rootDir = getLeadDataRoot(), previewRootDir = getPreviewOutputRoot()) {
    this.rootDir = rootDir;
    this.previewRootDir = previewRootDir;
  }

  getBatchPaths(batchId: string): BatchPaths {
    const batchDir = path.join(this.rootDir, 'batches', batchId);
    return {
      batchDir,
      rawDir: path.join(batchDir, 'raw'),
      normalizedDir: path.join(batchDir, 'normalized'),
      outreachDir: path.join(batchDir, 'outreach'),
      reviewPath: path.join(batchDir, 'normalized', 'review.md'),
      leadsPath: path.join(batchDir, 'normalized', 'leads.json'),
      manifestPath: path.join(batchDir, 'manifest.json')
    };
  }

  async ensureBatch(batchId: string): Promise<BatchPaths> {
    const paths = this.getBatchPaths(batchId);
    await Promise.all([
      fs.mkdir(paths.rawDir, { recursive: true }),
      fs.mkdir(paths.normalizedDir, { recursive: true }),
      fs.mkdir(paths.outreachDir, { recursive: true }),
      fs.mkdir(this.previewRootDir, { recursive: true })
    ]);
    return paths;
  }

  async writeJson(relativePath: string, data: unknown): Promise<string> {
    const outputPath = path.join(this.rootDir, relativePath);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    return outputPath;
  }

  async writeBatchJson(batchId: string, relativePath: string, data: unknown): Promise<string> {
    const paths = await this.ensureBatch(batchId);
    const outputPath = path.join(paths.batchDir, relativePath);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    return outputPath;
  }

  async writeBatchText(batchId: string, relativePath: string, content: string): Promise<string> {
    const paths = await this.ensureBatch(batchId);
    const outputPath = path.join(paths.batchDir, relativePath);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, content, 'utf8');
    return outputPath;
  }

  async writeLeadBatch(
    batchId: string,
    city: string,
    queries: string[],
    leads: LeadQualified[],
    reviewMarkdown: string
  ): Promise<LeadBatchManifest> {
    const paths = await this.ensureBatch(batchId);
    await fs.writeFile(paths.leadsPath, `${JSON.stringify(leads, null, 2)}\n`, 'utf8');
    await fs.writeFile(paths.reviewPath, reviewMarkdown, 'utf8');

    const manifest: LeadBatchManifest = {
      batchId,
      createdAt: isoNow(),
      city,
      queries,
      leadsPath: paths.leadsPath,
      reviewPath: paths.reviewPath,
      counts: {
        raw: leads.length,
        qualified: leads.filter(lead => lead.status === 'qualified').length,
        priority: leads.filter(lead => lead.priorityTier === 'priority').length
      }
    };

    await fs.writeFile(paths.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return manifest;
  }

  async readLeads(batchId: string): Promise<LeadQualified[]> {
    const { leadsPath } = this.getBatchPaths(batchId);
    const raw = await fs.readFile(leadsPath, 'utf8');
    return JSON.parse(raw) as LeadQualified[];
  }

  async readManifest(batchId: string): Promise<LeadBatchManifest> {
    const { manifestPath } = this.getBatchPaths(batchId);
    const raw = await fs.readFile(manifestPath, 'utf8');
    return JSON.parse(raw) as LeadBatchManifest;
  }

  async findLatestBatchId(): Promise<string | null> {
    const batchesDir = path.join(this.rootDir, 'batches');
    try {
      const entries = await fs.readdir(batchesDir, { withFileTypes: true });
      const batchIds = entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
      return batchIds.at(-1) ?? null;
    } catch {
      return null;
    }
  }

  async writePreview(slug: string, html: string, metadata: WebsiteDraft): Promise<string> {
    const outputDir = path.join(this.previewRootDir, slug);
    await fs.mkdir(outputDir, { recursive: true });
    const htmlPath = path.join(outputDir, 'index.html');
    const metadataPath = path.join(outputDir, 'metadata.json');
    await fs.writeFile(htmlPath, html, 'utf8');
    await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
    return htmlPath;
  }

  async writeOutreachDraft(batchId: string, draft: OutreachDraft): Promise<string> {
    return this.writeBatchJson(batchId, `outreach/${draft.leadId}.json`, draft);
  }
}
