export type WebsiteStatus =
  | 'no_domain'
  | 'social_only'
  | 'has_domain'
  | 'chain_or_franchise'
  | 'closed_or_invalid';

export type LeadStatus =
  | 'new'
  | 'qualified'
  | 'draft_ready'
  | 'approved'
  | 'contacted'
  | 'rejected';

export type LeadContactChannel = 'email' | 'phone' | 'website' | 'social' | 'none';
export type LeadContactConfidence = 'high' | 'medium' | 'low' | 'none';
export type LeadPriorityTier = 'priority' | 'secondary' | 'rejected';

export interface LeadImage {
  url: string;
  source: 'maps_listing' | 'maps_detail' | 'maps_photos' | 'website' | 'unknown';
  alt: string | null;
  width: number | null;
  height: number | null;
}

export interface LeadReview {
  author: string | null;
  rating: number | null;
  relativeTime: string | null;
  text: string;
  source: 'google_maps' | 'website' | 'unknown';
}

export interface LeadBusinessDetails {
  priceRange: string | null;
  description: string | null;
  openingHoursText: string | null;
  serviceOptions: string[];
  diningOptions: string[];
  offerings: string[];
  atmosphere: string[];
  accessibility: string[];
  planning: string[];
  rawAttributes: string[];
}

export interface LeadSourceSnapshot {
  query: string;
  mapsUrl: string;
  listingText: string;
  detailText: string;
  searchImageUrl: string | null;
  sourceUrls: string[];
  imageUrls: string[];
}

export interface LeadRaw {
  leadId: string;
  dedupeKey: string;
  sourceQuery: string;
  sourceUrl: string;
  businessName: string;
  category: string | null;
  rating: number | null;
  reviewCount: number | null;
  city: string;
  address: string | null;
  openingHours: string | null;
  phone: string | null;
  websiteUrl: string | null;
  discoveredWebsiteUrls: string[];
  socialLinks: string[];
  plusCode: string | null;
  imageUrls: string[];
  images: LeadImage[];
  reviews: LeadReview[];
  businessDetails: LeadBusinessDetails;
  source: LeadSourceSnapshot;
}

export interface LeadContact {
  email: string | null;
  channel: LeadContactChannel;
  confidence: LeadContactConfidence;
  sourceUrl: string | null;
  fallbackChannels: string[];
  discoveredWebsite: string | null;
}

export interface LeadScore {
  total: number;
  traction: number;
  noWebsite: number;
  contactability: number;
  contentRichness: number;
  salesFit: number;
  reasons: string[];
}

export interface LeadQualified extends LeadRaw {
  websiteStatus: WebsiteStatus;
  status: LeadStatus;
  priorityTier: LeadPriorityTier;
  qualifiesForOutreach: boolean;
  exclusionReason: string | null;
  contact: LeadContact;
  score: LeadScore;
  notes: string;
  previewUrl: string | null;
  lastActionAt: string | null;
}

export interface WebsiteDraft {
  leadId: string;
  slug: string;
  title: string;
  previewUrl: string;
  outputDir: string;
  generatedAt: string;
  sections: {
    heroTitle: string;
    heroSubtitle: string;
    aboutTitle: string;
    aboutBody: string;
    practicalTitle: string;
    practicalItems: string[];
    reviewsTitle: string;
    reviewHighlights: string[];
    detailHighlights: string[];
  };
  assets: string[];
}

export interface OutreachDraft {
  leadId: string;
  recipientEmail: string | null;
  subject: string;
  textBody: string;
  htmlBody: string;
  readyToSend: boolean;
  skippedReason: string | null;
  previewUrl: string | null;
}

export interface LeadBatchManifest {
  batchId: string;
  createdAt: string;
  city: string;
  queries: string[];
  leadsPath: string;
  reviewPath: string | null;
  counts: {
    raw: number;
    qualified: number;
    priority: number;
  };
}
