import type { LeadQualified } from '../types/lead-finder.js';

function summarizeCount(label: string, count: number): string {
  return `- ${label}: ${count}`;
}

export function buildReviewMarkdown(batchId: string, leads: LeadQualified[]): string {
  const priority = leads.filter(lead => lead.priorityTier === 'priority');
  const secondary = leads.filter(lead => lead.priorityTier === 'secondary');
  const rejected = leads.filter(lead => lead.status === 'rejected');

  const topRows = leads.slice(0, 12).map(lead => {
    const rating = lead.rating != null ? lead.rating.toFixed(1) : '?';
    const reviews = lead.reviewCount != null ? String(lead.reviewCount) : '?';
    return `| ${lead.businessName} | ${lead.category ?? '-'} | ${rating} | ${reviews} | ${lead.websiteStatus} | ${lead.contact.channel} | ${lead.score.total} |`;
  });

  return `# Batch ${batchId}

## Résumé
${summarizeCount('Leads scannés', leads.length)}
${summarizeCount('Prioritaires', priority.length)}
${summarizeCount('Secondaires', secondary.length)}
${summarizeCount('Rejetés', rejected.length)}

## Top leads
| Business | Catégorie | Note | Avis | Website status | Contact | Score |
|---|---|---:|---:|---|---|---:|
${topRows.join('\n')}

## Notes
- priority = sans domaine détecté + note >= 4.4 + volume d’avis suffisant quand détectable.
- secondary = bon fit commercial mais signal site / avis moins fort.
- rejected = déjà un site, chaîne, ou fit insuffisant.
`;
}
