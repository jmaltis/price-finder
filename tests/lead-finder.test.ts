import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { selectBestEmailCandidate, selectBestWebsiteCandidate } from '../src/lead-finder/contact.js';
import type { LeadContact, LeadRaw } from '../src/types/lead-finder.js';
import { generateWebsiteDraft } from '../src/lead-finder/preview.js';
import { dedupeQualifiedLeads, qualifyLead } from '../src/lead-finder/qualify.js';
import { LeadFinderStore } from '../src/lead-finder/store.js';
import { buildOutreachDraft } from '../src/lead-finder/outreach.js';
import { extractEmails, extractUrls } from '../src/lead-finder/utils.js';

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lead-finder-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

function makeLead(overrides: Partial<LeadRaw> = {}): LeadRaw {
  return {
    leadId: 'lead_test',
    dedupeKey: 'dedupe_test',
    sourceQuery: 'restaurants lyon',
    sourceUrl: 'https://www.google.com/maps/place/Test',
    businessName: 'Le Test Gourmand',
    category: 'Restaurant',
    rating: 4.7,
    reviewCount: 92,
    city: 'Lyon',
    address: '12 rue de la République, 69001 Lyon',
    openingHours: 'Ouvert · Ferme à 23:00',
    phone: '06 11 22 33 44',
    websiteUrl: null,
    discoveredWebsiteUrls: [],
    socialLinks: [],
    plusCode: 'QRFV+4M Lyon',
    imageUrls: ['https://images.example/1.jpg', 'https://images.example/2.jpg'],
    images: [
      { url: 'https://images.example/1.jpg', source: 'maps_listing', alt: 'Facade', width: 900, height: 600 },
      { url: 'https://images.example/2.jpg', source: 'maps_detail', alt: 'Salle', width: 900, height: 600 }
    ],
    reviews: [
      {
        author: null,
        rating: 5,
        relativeTime: 'il y a 2 mois',
        text: 'Une très belle adresse lyonnaise avec un accueil chaleureux et une cuisine soignée.',
        source: 'google_maps'
      }
    ],
    businessDetails: {
      priceRange: '20-30 €',
      description: 'Restaurant local apprécié pour sa cuisine de saison.',
      openingHoursText: 'Ouvert · Ferme à 23:00',
      serviceOptions: ['Repas sur place'],
      diningOptions: ['Déjeuner', 'Dîner'],
      offerings: ['Vin', 'Café'],
      atmosphere: ['Chaleureux'],
      accessibility: [],
      planning: ['Réservation recommandée'],
      rawAttributes: ['Repas sur place', 'Déjeuner', 'Dîner', 'Chaleureux']
    },
    source: {
      query: 'restaurants lyon',
      mapsUrl: 'https://www.google.com/maps/place/Test',
      listingText: 'Le Test Gourmand 4,7 Restaurant',
      detailText: 'Restaurant à Lyon très apprécié',
      searchImageUrl: 'https://images.example/1.jpg',
      sourceUrls: ['https://www.google.com/maps/place/Test'],
      imageUrls: ['https://images.example/1.jpg']
    },
    ...overrides
  };
}

function makeContact(overrides: Partial<LeadContact> = {}): LeadContact {
  return {
    email: 'bonjour@letestgourmand.fr',
    channel: 'email',
    confidence: 'high',
    sourceUrl: 'https://letestgourmand.fr/contact',
    fallbackChannels: ['06 11 22 33 44'],
    discoveredWebsite: null,
    ...overrides
  };
}

describe('lead qualification', () => {
  it('marks a strong no-domain food business as priority', () => {
    const qualified = qualifyLead(makeLead(), makeContact());
    expect(qualified.priorityTier).toBe('priority');
    expect(qualified.status).toBe('qualified');
    expect(qualified.websiteStatus).toBe('no_domain');
    expect(qualified.qualifiesForOutreach).toBe(true);
  });

  it('marks social-only leads as secondary', () => {
    const qualified = qualifyLead(
      makeLead({
        websiteUrl: 'https://instagram.com/letestgourmand',
        reviewCount: 18
      }),
      makeContact({
        email: null,
        channel: 'social',
        confidence: 'low'
      })
    );

    expect(qualified.priorityTier).toBe('secondary');
    expect(qualified.websiteStatus).toBe('social_only');
    expect(qualified.qualifiesForOutreach).toBe(false);
  });

  it('rejects leads that already have a proper domain', () => {
    const qualified = qualifyLead(
      makeLead({
        websiteUrl: 'https://letestgourmand.fr'
      }),
      makeContact()
    );

    expect(qualified.status).toBe('rejected');
    expect(qualified.websiteStatus).toBe('has_domain');
  });

  it('dedupes identical businesses by keeping the highest score', () => {
    const lower = qualifyLead(makeLead({ reviewCount: 45 }), makeContact());
    const higher = qualifyLead(
      makeLead({ reviewCount: 120, rating: 4.9 }),
      makeContact({ email: 'contact@letestgourmand.fr' })
    );

    const deduped = dedupeQualifiedLeads([lower, higher]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.score.total).toBeGreaterThan(lower.score.total);
  });
});

describe('preview generation', () => {
  it('writes a preview html file with lead content', async () => {
    const rootDir = await createTempDir();
    const previewRoot = path.join(rootDir, 'previews');
    const store = new LeadFinderStore(rootDir, previewRoot);
    const qualified = qualifyLead(makeLead(), makeContact());

    const draft = await generateWebsiteDraft(qualified, store);
    const html = await fs.readFile(path.join(previewRoot, draft.slug, 'index.html'), 'utf8');

    expect(draft.previewUrl).toBe(`file://${path.join(previewRoot, draft.slug, 'index.html')}`);
    expect(html).toContain('Le Test Gourmand');
    expect(html).toContain('preview site vitrine');
  });
});

describe('contact enrichment helpers', () => {
  it('repairs noisy extracted emails when the page text sticks words to the domain', () => {
    expect(extractEmails('Contact: 18laboiteacafelyon@gmail.comactuellement')).toEqual(['18laboiteacafelyon@gmail.com']);
  });

  it('extracts obfuscated emails and urls from social-like text blocks', () => {
    expect(extractEmails('bonjour at example dot fr')).toEqual(['bonjour@example.fr']);
    expect(extractUrls('Retrouvez-nous: https://example.fr/menu et https://linktr.ee/test')).toEqual([
      'https://example.fr/menu',
      'https://linktr.ee/test'
    ]);
  });

  it('prefers a business-domain email over a platform email', () => {
    const selected = selectBestEmailCandidate(
      [
        {
          email: 'contact@privateaser.com',
          confidence: 'low',
          sourceUrl: 'https://www.privateaser.com/lieu/41126-la-bonne-gache',
          origin: 'directory'
        },
        {
          email: 'bonjour@labonnegache.fr',
          confidence: 'high',
          sourceUrl: 'https://labonnegache.fr/contact',
          origin: 'website'
        }
      ],
      'https://labonnegache.fr',
      makeLead({ businessName: 'La Bonne Gâche', websiteUrl: 'https://labonnegache.fr' })
    );

    expect(selected?.email).toBe('bonjour@labonnegache.fr');
  });

  it('drops clearly bogus asset-like or placeholder mailboxes', () => {
    const selected = selectBestEmailCandidate(
      [
        {
          email: 'online@www.aaa.com',
          confidence: 'medium',
          sourceUrl: 'https://linktr.ee/esperanto.lyon',
          origin: 'social'
        },
        {
          email: 'flags@2x.png',
          confidence: 'medium',
          sourceUrl: 'https://restaurantdamalyon.fr',
          origin: 'website'
        },
        {
          email: 'contact@vrairesto.fr',
          confidence: 'high',
          sourceUrl: 'https://vrairesto.fr/contact',
          origin: 'website'
        }
      ],
      'https://vrairesto.fr',
      makeLead({ businessName: 'Vrai Resto', websiteUrl: 'https://vrairesto.fr' })
    );

    expect(selected?.email).toBe('contact@vrairesto.fr');
  });

  it('rejects unrelated corporate emails scraped from social/link-in-bio pages', () => {
    const selected = selectBestEmailCandidate(
      [
        {
          email: 'only@savagex.com',
          confidence: 'medium',
          sourceUrl: 'https://linktr.ee/esperanto.lyon',
          origin: 'social'
        },
        {
          email: 'esperanto.lyon.contact@gmail.com',
          confidence: 'medium',
          sourceUrl: 'https://linktr.ee/esperanto.lyon',
          origin: 'social'
        }
      ],
      'https://linktr.ee/esperanto.lyon',
      makeLead({
        businessName: 'Esperanto Lyon',
        websiteUrl: 'https://linktr.ee/esperanto.lyon',
        socialLinks: ['https://www.instagram.com/esperanto.lyon2/']
      })
    );

    expect(selected?.email).toBe('esperanto.lyon.contact@gmail.com');
  });

  it('prefers a likely business website over social or aggregator links', () => {
    const selected = selectBestWebsiteCandidate(
      [
        'https://linktr.ee/esperanto.lyon',
        'https://www.privateaser.com/lieu/41126-la-bonne-gache',
        'https://labonnegache.fr'
      ],
      makeLead({ businessName: 'La Bonne Gâche', websiteUrl: null })
    );

    expect(selected).toBe('https://labonnegache.fr');
  });
});

describe('outreach draft', () => {
  it('requires both email and preview to be sendable', () => {
    const sendable = buildOutreachDraft({
      leadId: 'lead_test',
      businessName: 'Le Test Gourmand',
      category: 'Restaurant',
      city: 'Lyon',
      previewUrl: 'https://preview.example/lead-test/',
      contact: makeContact()
    });

    const blocked = buildOutreachDraft({
      leadId: 'lead_test',
      businessName: 'Le Test Gourmand',
      category: 'Restaurant',
      city: 'Lyon',
      previewUrl: null,
      contact: makeContact({ email: null, channel: 'phone', confidence: 'medium' })
    });

    expect(sendable.readyToSend).toBe(true);
    expect(blocked.readyToSend).toBe(false);
    expect(blocked.skippedReason).toBe('email de contact manquant');
  });
});
