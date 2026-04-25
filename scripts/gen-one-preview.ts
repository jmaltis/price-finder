import { readFile } from 'node:fs/promises';
import { generateWebsiteDraft } from '../src/lead-finder/preview.js';
import { LeadFinderStore } from '../src/lead-finder/store.js';
import type { LeadQualified } from '../src/types/lead-finder.js';

async function main(): Promise<void> {
  const batch = process.argv[2];
  const target = process.argv[3];
  if (!batch || !target) {
    console.error('usage: tsx scripts/gen-one-preview.ts <batchId> <businessName>');
    process.exit(1);
  }

  const raw = await readFile(
    `./data/lead-finder/batches/${batch}/normalized/qualified-leads.json`,
    'utf8'
  );
  const leads = JSON.parse(raw) as LeadQualified[];
  const lead = leads.find(l => l.businessName === target);
  if (!lead) {
    console.error(`lead not found: ${target}`);
    process.exit(1);
  }

  const store = new LeadFinderStore();
  const draft = await generateWebsiteDraft(lead, store);
  console.log('generated:', draft.previewUrl);
  console.log('outputDir:', draft.outputDir);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
