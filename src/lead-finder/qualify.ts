import type { LeadContact, LeadQualified, LeadRaw, LeadScore, LeadStatus, WebsiteStatus } from '../types/lead-finder.js';
import { CHAIN_KEYWORDS, QUALIFICATION_THRESHOLDS } from './config.js';
import { clamp, dedupeStrings, isSocialUrl, normalizeWhitespace } from './utils.js';

function detectChain(name: string, websiteUrl: string | null): boolean {
  const haystack = `${name} ${websiteUrl ?? ''}`.toLowerCase();
  return CHAIN_KEYWORDS.some(keyword => haystack.includes(keyword));
}

function computeTraction(rating: number | null, reviewCount: number | null): number {
  if (rating == null) return 0;

  const ratingScore = clamp(((rating - 3.8) / 1.2) * 24, 0, 24);
  const reviewScore = reviewCount == null ? 6 : clamp((reviewCount / 150) * 16, 0, 16);
  return Math.round(ratingScore + reviewScore);
}

function computeNoWebsiteScore(status: WebsiteStatus): number {
  switch (status) {
    case 'no_domain':
      return 20;
    case 'social_only':
      return 12;
    default:
      return 0;
  }
}

function computeContactability(contact: LeadContact): number {
  if (contact.email) {
    return contact.confidence === 'high' ? 15 : contact.confidence === 'medium' ? 12 : 9;
  }

  switch (contact.channel) {
    case 'phone':
      return 8;
    case 'website':
      return 5;
    case 'social':
      return 4;
    default:
      return 0;
  }
}

function computeContentRichness(lead: LeadRaw): number {
  let score = 0;
  if (lead.imageUrls.length >= 6) score += 5;
  else if (lead.imageUrls.length >= 3) score += 4;
  else if (lead.imageUrls.length > 0) score += 2;
  if (lead.reviews.length >= 3) score += 2;
  else if (lead.reviews.length > 0) score += 1;
  if (lead.address) score += 2;
  if (lead.openingHours) score += 2;
  if (lead.category) score += 2;
  if (lead.businessDetails.rawAttributes.length > 0) score += 2;
  return Math.min(score, 12);
}

function computeSalesFit(category: string | null, city: string): number {
  const normalizedCategory = (category ?? '').toLowerCase();
  const isFoodFit =
    normalizedCategory.includes('restaurant') ||
    normalizedCategory.includes('café') ||
    normalizedCategory.includes('cafe') ||
    normalizedCategory.includes('boulangerie') ||
    normalizedCategory.includes('pâtisserie') ||
    normalizedCategory.includes('patisserie') ||
    normalizedCategory.includes('bar');

  return (isFoodFit ? 10 : 4) + (city.toLowerCase() === 'lyon' ? 5 : 2);
}

function classifyWebsiteStatus(lead: LeadRaw): WebsiteStatus {
  const businessText = `${lead.businessName} ${lead.source.detailText}`.toLowerCase();
  if (businessText.includes('définitivement fermé') || businessText.includes('temporairement fermé')) {
    return 'closed_or_invalid';
  }

  if (detectChain(lead.businessName, lead.websiteUrl)) {
    return 'chain_or_franchise';
  }

  if (lead.websiteUrl) {
    return isSocialUrl(lead.websiteUrl) ? 'social_only' : 'has_domain';
  }

  if (lead.socialLinks.length > 0) {
    return 'social_only';
  }

  return 'no_domain';
}

function qualifiesForPriority(lead: LeadRaw, status: WebsiteStatus): boolean {
  return (
    status === 'no_domain' &&
    (lead.rating ?? 0) >= QUALIFICATION_THRESHOLDS.minRating &&
    lead.reviewCount !== null &&
    lead.reviewCount >= QUALIFICATION_THRESHOLDS.minReviewCount
  );
}

function qualifiesForSecondary(lead: LeadRaw, status: WebsiteStatus): boolean {
  if (status === 'chain_or_franchise' || status === 'closed_or_invalid' || status === 'has_domain') {
    return false;
  }

  return (lead.rating ?? 0) >= QUALIFICATION_THRESHOLDS.minRating;
}

export function buildLeadScore(lead: LeadRaw, status: WebsiteStatus, contact: LeadContact): LeadScore {
  const traction = computeTraction(lead.rating, lead.reviewCount);
  const noWebsite = computeNoWebsiteScore(status);
  const contactability = computeContactability(contact);
  const contentRichness = computeContentRichness(lead);
  const salesFit = computeSalesFit(lead.category, lead.city);

  const reasons = dedupeStrings([
    lead.rating != null ? `note ${lead.rating.toFixed(1)}/5` : null,
    lead.reviewCount != null ? `${lead.reviewCount} avis publics détectés` : 'volume d’avis non détecté',
    status === 'no_domain' ? 'aucun domaine détecté' : null,
    status === 'social_only' ? 'présence sociale sans site propriétaire' : null,
    contact.email ? 'email de contact trouvé' : null,
    !contact.email && contact.channel === 'phone' ? 'téléphone disponible' : null
  ]);

  return {
    total: traction + noWebsite + contactability + contentRichness + salesFit,
    traction,
    noWebsite,
    contactability,
    contentRichness,
    salesFit,
    reasons
  };
}

export function qualifyLead(rawLead: LeadRaw, contact: LeadContact): LeadQualified {
  const websiteStatus = classifyWebsiteStatus(rawLead);
  const priority = qualifiesForPriority(rawLead, websiteStatus);
  const secondary = qualifiesForSecondary(rawLead, websiteStatus);

  let status: LeadStatus = 'rejected';
  let exclusionReason: string | null = null;

  if (priority || secondary) {
    status = 'qualified';
  } else if (websiteStatus === 'has_domain') {
    exclusionReason = 'site propriétaire déjà présent';
  } else if (websiteStatus === 'chain_or_franchise') {
    exclusionReason = 'chaîne ou franchise';
  } else if (websiteStatus === 'closed_or_invalid') {
    exclusionReason = 'établissement fermé ou invalide';
  } else if ((rawLead.rating ?? 0) < QUALIFICATION_THRESHOLDS.minRating) {
    exclusionReason = `note inférieure à ${QUALIFICATION_THRESHOLDS.minRating}`;
  } else {
    exclusionReason = 'lead incomplet';
  }

  const score = buildLeadScore(rawLead, websiteStatus, contact);

  return {
    ...rawLead,
    websiteStatus,
    status,
    priorityTier: priority ? 'priority' : secondary ? 'secondary' : 'rejected',
    qualifiesForOutreach: (priority || secondary) && Boolean(contact.email),
    exclusionReason,
    contact,
    score,
    notes: normalizeWhitespace(score.reasons.join(' · ')),
    previewUrl: null,
    lastActionAt: null
  };
}

export function dedupeQualifiedLeads(leads: LeadQualified[]): LeadQualified[] {
  const deduped = new Map<string, LeadQualified>();

  for (const lead of leads) {
    const existing = deduped.get(lead.dedupeKey);
    if (!existing || lead.score.total > existing.score.total) {
      deduped.set(lead.dedupeKey, lead);
    }
  }

  return Array.from(deduped.values()).sort((left, right) => right.score.total - left.score.total);
}
