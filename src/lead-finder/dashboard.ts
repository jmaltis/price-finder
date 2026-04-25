import fs from 'node:fs/promises';
import path from 'node:path';
import type { LeadBatchManifest, LeadQualified } from '../types/lead-finder.js';
import { INTERNAL_PRODUCT_NAME } from './config.js';
import { LeadFinderStore } from './store.js';
import { resolveFileHrefToPath } from './utils.js';

interface DashboardLead extends LeadQualified {
  batchId: string;
  previewExists: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function pathExists(filePath: string | null): Promise<boolean> {
  if (!filePath) return false;
  try {
    await fs.access(resolveFileHrefToPath(filePath) ?? filePath);
    return true;
  } catch {
    return false;
  }
}

async function listBatchIds(store: LeadFinderStore): Promise<string[]> {
  const batchesDir = path.join(store.rootDir, 'batches');
  try {
    const entries = await fs.readdir(batchesDir, { withFileTypes: true });
    return entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort().reverse();
  } catch {
    return [];
  }
}

async function loadDashboardLeads(store: LeadFinderStore): Promise<{ manifests: LeadBatchManifest[]; leads: DashboardLead[] }> {
  const batchIds = await listBatchIds(store);
  const manifests: LeadBatchManifest[] = [];
  const leads: DashboardLead[] = [];

  for (const batchId of batchIds) {
    try {
      manifests.push(await store.readManifest(batchId));
      const batchLeads = await store.readLeads(batchId);
      for (const lead of batchLeads) {
        leads.push({
          ...lead,
          batchId,
          previewExists: await pathExists(lead.previewUrl)
        });
      }
    } catch {
      // Ignore incomplete/dev batches.
    }
  }

  return { manifests, leads };
}

function renderRows(leads: DashboardLead[]): string {
  return leads.map(lead => {
    const previewLink = lead.previewUrl
      ? `<a href="${escapeHtml(lead.previewUrl)}">${lead.previewExists ? 'ouvrir' : 'manquante'}</a>`
      : '-';
    const richSummary = `${lead.imageUrls?.length ?? 0} images · ${lead.reviews?.length ?? 0} avis · ${lead.businessDetails?.rawAttributes?.length ?? 0} détails`;
    return `<tr>
      <td><strong>${escapeHtml(lead.businessName)}</strong><small>${escapeHtml(lead.leadId)}</small></td>
      <td>${escapeHtml(lead.batchId)}</td>
      <td><span class="pill ${escapeHtml(lead.status)}">${escapeHtml(lead.status)}</span><br><span class="muted">${escapeHtml(lead.priorityTier)}</span></td>
      <td>${escapeHtml(lead.websiteStatus)}</td>
      <td>${lead.rating ?? '-'} / ${lead.reviewCount ?? '-'}</td>
      <td>${escapeHtml(String(lead.score.total))}</td>
      <td>${escapeHtml(richSummary)}</td>
      <td>${previewLink}<br><a href="${escapeHtml(lead.source.mapsUrl)}">maps</a></td>
      <td>${escapeHtml(lead.contact.email ?? lead.contact.channel)}</td>
    </tr>`;
  }).join('\n');
}

function renderHtml(manifests: LeadBatchManifest[], leads: DashboardLead[]): string {
  const totalPreviews = leads.filter(lead => lead.previewUrl).length;
  const totalRichImages = leads.reduce((sum, lead) => sum + (lead.imageUrls?.length ?? 0), 0);

  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${INTERNAL_PRODUCT_NAME} Dashboard</title>
    <style>
      :root { --bg:#f7f3ea; --ink:#1d1b18; --muted:#6b6258; --line:#ded4c6; --card:#fffaf2; --accent:#a84d31; }
      * { box-sizing: border-box; }
      body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:var(--bg); color:var(--ink); }
      main { width:min(1280px, calc(100% - 32px)); margin:0 auto; padding:34px 0 60px; }
      h1 { font-size: clamp(2rem, 5vw, 4rem); margin:0 0 8px; letter-spacing:-0.05em; }
      .muted, small { color:var(--muted); }
      .cards { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap:12px; margin:24px 0; }
      .card { background:var(--card); border:1px solid var(--line); border-radius:20px; padding:18px; }
      .card strong { display:block; font-size:1.8rem; }
      table { width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--line); border-radius:20px; overflow:hidden; }
      th, td { padding:14px; border-bottom:1px solid var(--line); vertical-align:top; text-align:left; }
      th { font-size:0.78rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--muted); }
      td small { display:block; margin-top:4px; font-size:0.76rem; }
      a { color:var(--accent); font-weight:700; }
      .pill { display:inline-flex; border-radius:999px; padding:5px 9px; background:#eee1d5; font-size:0.82rem; font-weight:700; }
      .draft_ready { background:#e7dbff; }
      .qualified { background:#d8e9ff; }
      .rejected { background:#ffd7cf; }
      .approved { background:#d7f4df; }
      @media (max-width: 900px) { .cards { grid-template-columns:1fr 1fr; } table { font-size:0.88rem; } }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(INTERNAL_PRODUCT_NAME)} Dashboard</h1>
      <p class="muted">Vue locale centralisée: JSON batches, previews générées et richesse des données collectées.</p>
      <section class="cards">
        <div class="card"><strong>${leads.length}</strong><span class="muted">leads</span></div>
        <div class="card"><strong>${manifests.length}</strong><span class="muted">batches</span></div>
        <div class="card"><strong>${totalPreviews}</strong><span class="muted">previews</span></div>
        <div class="card"><strong>${totalRichImages}</strong><span class="muted">images collectées</span></div>
      </section>
      <table>
        <thead>
          <tr>
            <th>Lead</th>
            <th>Batch</th>
            <th>Status</th>
            <th>Website</th>
            <th>Note / avis</th>
            <th>Score</th>
            <th>Données riches</th>
            <th>Preview</th>
            <th>Contact</th>
          </tr>
        </thead>
        <tbody>
          ${renderRows(leads)}
        </tbody>
      </table>
    </main>
  </body>
</html>`;
}

export async function buildLeadDashboard(store = new LeadFinderStore()): Promise<string> {
  const { manifests, leads } = await loadDashboardLeads(store);
  const outputPath = path.join(store.rootDir, 'dashboard.html');
  await fs.mkdir(store.rootDir, { recursive: true });
  await fs.writeFile(outputPath, renderHtml(manifests, leads), 'utf8');
  return outputPath;
}
