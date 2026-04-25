import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { LeadBusinessDetails, LeadImage, LeadRaw, LeadReview } from '../types/lead-finder.js';
import { getEnvOptional } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { FOOD_BATCH_QUERIES } from './config.js';
import {
  dedupeStrings,
  firstNonEmpty,
  hashId,
  normalizeWhitespace,
  parseRating,
  parseReviewCount,
  shortBatchId,
  slugify
} from './utils.js';

interface MapsListingCard {
  query: string;
  placeUrl: string;
  name: string;
  ratingText: string | null;
  categoryText: string | null;
  addressSnippet: string | null;
  secondaryText: string | null;
  imageUrl: string | null;
  articleText: string;
}

interface MapsPlaceDetail {
  title: string;
  ratingText: string | null;
  reviewCountText: string;
  address: string | null;
  openingHours: string | null;
  phone: string | null;
  websiteUrl: string | null;
  socialLinks: string[];
  plusCode: string | null;
  imageUrls: string[];
  images: LeadImage[];
  reviews: LeadReview[];
  businessDetails: LeadBusinessDetails;
  bodyText: string;
  sourceUrls: string[];
}

interface ExtraPlaceContent {
  images: LeadImage[];
  reviews: LeadReview[];
}

async function dismissConsent(page: Page): Promise<void> {
  const selectors = [
    /Tout refuser/i,
    /Reject all/i,
    /Refuser tout/i
  ];

  for (const name of selectors) {
    const button = page.getByRole('button', { name });
    if (await button.count()) {
      await button.first().click();
      await page.waitForTimeout(1500);
      return;
    }
  }
}

async function createMapsContext(browser: Browser): Promise<BrowserContext> {
  const storageState = getEnvOptional('googleMapsStorageStatePath');
  return browser.newContext({
    locale: 'fr-FR',
    viewport: { width: 1480, height: 1800 },
    ...(storageState ? { storageState } : {}),
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });
}

async function openMapsPage(browser: Browser, url: string): Promise<{ contextClosed: () => Promise<void>; page: Page }> {
  const context = await createMapsContext(browser);
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForTimeout(1500);
  await page.evaluate('globalThis.__name = (target) => target');
  await dismissConsent(page);
  return {
    page,
    contextClosed: async () => {
      await context.close();
    }
  };
}

async function scrollFeed(page: Page, passes: number): Promise<void> {
  const feed = page.locator('[role="feed"]').first();
  if ((await feed.count()) === 0) return;

  for (let index = 0; index < passes; index += 1) {
    await feed.evaluate(node => {
      node.scrollBy(0, node.scrollHeight);
    });
    await page.waitForTimeout(1200);
  }
}

async function extractListingCards(page: Page, query: string): Promise<MapsListingCard[]> {
  return page.locator('[role="article"]').evaluateAll((elements, queryValue) => {
    return elements.map(element => {
      const anchor = element.querySelector('a[href*="/maps/place/"]') as HTMLAnchorElement | null;
      const image = element.querySelector('img[src]') as HTMLImageElement | null;
      const name =
        element.querySelector('.qBF1Pd')?.textContent?.trim() ||
        anchor?.getAttribute('aria-label') ||
        '';
      const ratingText =
        element.querySelector('[aria-label*="étoiles"]')?.getAttribute('aria-label') ||
        element.querySelector('.MW4etd')?.textContent?.trim() ||
        null;
      const contentRows = Array.from(element.querySelectorAll('.W4Efsd'))
        .map(node => node.textContent?.trim() ?? '')
        .filter(Boolean);
      const secondaryRow = contentRows.at(1) ?? '';
      const segments = contentRows
        .flatMap(row => row
        .split('·')
        .map(segment => segment.trim())
        .filter(Boolean));
      const category =
        segments.find(segment =>
          !/\d[.,]\d|\(\d|€|fermé|ouvert|ouvre|rue|avenue|av\.|quai|place|boulevard|bd\b|cours|impasse|allée|allee/i.test(segment)
        ) ?? null;
      const address =
        segments.find(segment =>
          /rue|avenue|av\.|quai|place|boulevard|bd\b|cours|impasse|allée|allee|\d{5}/i.test(segment)
        ) ?? null;

      return {
        query: queryValue,
        placeUrl: anchor?.href ?? '',
        name,
        ratingText,
        categoryText: category,
        addressSnippet: address,
        secondaryText: secondaryRow || null,
        imageUrl: image?.src ?? null,
        articleText: element.textContent?.trim() ?? ''
      };
    });
  }, query);
}

async function extractPlaceDetail(page: Page): Promise<MapsPlaceDetail> {
  return page.evaluate(String.raw`(() => {
    const normalize = (value) => (value ?? '').replace(/\s+/g, ' ').trim();
    const dedupe = (values) => Array.from(new Set(values.map(normalize).filter(Boolean)));
    const imageFromUrl = (url, source, alt, width, height) => ({
      url,
      source,
      alt,
      width,
      height
    });
    const normalizeGoogleImageUrl = (url) => {
      if (!url.includes('googleusercontent.com')) return url;
      return url.replace(/=w\d+-h\d+[^&)]*/i, '=w1200-h900-k-no').replace(/=s\d+[^&)]*/i, '=w1200-h900-k-no');
    };
    const extractImagesFromDocument = () => {
      const images = [];
      for (const image of Array.from(document.querySelectorAll('img[src]'))) {
        const src = image.getAttribute('src') ?? '';
        if (!src.includes('googleusercontent.com')) continue;
        if (/\/a\//.test(src) || /s\d+-p-k-no-mo/.test(src)) continue;
        images.push(imageFromUrl(
          normalizeGoogleImageUrl(src),
          'maps_detail',
          image.getAttribute('alt'),
          image.naturalWidth || null,
          image.naturalHeight || null
        ));
      }

      for (const element of Array.from(document.querySelectorAll('*'))) {
        const background = document.defaultView?.getComputedStyle(element).backgroundImage ?? '';
        const matches = Array.from(background.matchAll(/https:\/\/[^"')]+googleusercontent\.com[^"')]+/g));
        for (const match of matches) {
          images.push(imageFromUrl(normalizeGoogleImageUrl(match[0]), 'maps_detail', null, null, null));
        }
      }

      const seen = new Set();
      return images.filter(image => {
        if (seen.has(image.url)) return false;
        seen.add(image.url);
        return true;
      });
    };
    const inferAttributes = () => {
      const details = {
        priceRange: null,
        description: null,
        openingHoursText: null,
        serviceOptions: [],
        diningOptions: [],
        offerings: [],
        atmosphere: [],
        accessibility: [],
        planning: [],
        rawAttributes: []
      };
      const bodyText = document.body.textContent ?? '';
      const priceMatch = bodyText.match(/(?:^|\s)(€{1,4}|\d+\s*[–-]\s*\d+\s*€)(?:\s|$)/);
      details.priceRange = priceMatch?.[1] ?? null;

      const buttons = Array.from(document.querySelectorAll('[aria-label]'))
        .map(element => normalize(element.getAttribute('aria-label')))
        .filter(label => label.length > 2);
      const rawAttributes = dedupe(buttons.filter(label =>
        /terrasse|livraison|emporter|place|réservation|reservation|accessible|fauteuil|déjeuner|dîner|dessert|café|alcool|vin|bière|cocktail|chaleureux|décontracté|groupes|enfants|paiement/i.test(label)
      ));
      details.rawAttributes = rawAttributes.slice(0, 40);

      const buckets = [
        ['serviceOptions', /terrasse|livraison|emporter|sur place|drive|retrait/i],
        ['diningOptions', /déjeuner|dîner|brunch|petit-déjeuner|dessert|traiteur|places assises/i],
        ['offerings', /café|alcool|vin|bière|cocktail|végétarien|bio|halal|petites portions/i],
        ['atmosphere', /chaleureux|décontracté|romantique|branché|calme|familial|groupes/i],
        ['accessibility', /accessible|fauteuil|entrée|parking accessible/i],
        ['planning', /réservation|reservation|attente|groupes|enfants|paiement/i]
      ];

      for (const label of rawAttributes) {
        for (const [key, pattern] of buckets) {
          if (pattern.test(label) && Array.isArray(details[key])) {
            details[key].push(label);
          }
        }
      }

      details.serviceOptions = dedupe(details.serviceOptions).slice(0, 8);
      details.diningOptions = dedupe(details.diningOptions).slice(0, 8);
      details.offerings = dedupe(details.offerings).slice(0, 8);
      details.atmosphere = dedupe(details.atmosphere).slice(0, 8);
      details.accessibility = dedupe(details.accessibility).slice(0, 8);
      details.planning = dedupe(details.planning).slice(0, 8);

      const descriptionCandidates = Array.from(document.querySelectorAll('[data-attrid], .PYvSYb, .Io6YTe, .fontBodyMedium'))
        .map(element => normalize(element.textContent))
        .filter(text => text.length > 80 && text.length < 400 && !/Google ne vérifie pas les avis|Suggérer une modification/i.test(text));
      details.description = descriptionCandidates[0] ?? null;
      return details;
    };
    const extractReviewsFromDocument = () => {
      const reviewNodes = Array.from(document.querySelectorAll('[data-review-id], .jftiEf'));
      const reviews = reviewNodes.map(node => {
        const text = normalize(node.textContent);
        const withoutOwnerReply = text.split(/Réponse du propriétaire/i)[0]?.trim() ?? text;
        const ratingLabel = Array.from(node.querySelectorAll('[aria-label*="étoile"], [aria-label*="star"]'))
          .map(element => element.getAttribute('aria-label'))
          .find(Boolean) ?? null;
        const ratingMatch = ratingLabel?.match(/(\d[.,]?\d?)/);
        const rating = ratingMatch ? Number.parseFloat(ratingMatch[1].replace(',', '.')) : null;
        const relativeTime =
          withoutOwnerReply.match(/\bil y a\s+(?:une?|[0-9]+)\s+(?:minute|minutes|heure|heures|jour|jours|semaine|semaines|mois|an|ans)\b/i)?.[0] ??
          null;
        const authorCandidate = withoutOwnerReply.match(/^([^·]+?)(?=\s*·|\s+il y a\b)/i)?.[1] ?? '';
        const author = normalize(authorCandidate)
          .replace(/\bLocal Guide\b/gi, '')
          .replace(/[]/g, '')
          .replace(/\s+/g, ' ')
          .trim() || null;
        const contentStart = relativeTime
          ? withoutOwnerReply.slice(withoutOwnerReply.indexOf(relativeTime) + relativeTime.length)
          : withoutOwnerReply;
        const cleaned = contentStart
          .replace(/\bLocal Guide\b/gi, '')
          .replace(/[]/g, ' ')
          .replace(/\b(J'aime|Partager|Plus|Photo|Avis)\b/gi, ' ')
          .replace(/\bVisité en [^.]+/gi, ' ')
          .replace(/\+\s*\d+\b/g, ' ')
          .replace(/^\W+/, '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/[.…\s]+$/g, '')
          .trim();
        return {
          author,
          rating,
          relativeTime,
          text: cleaned.slice(0, 420),
          source: 'google_maps'
        };
      }).filter(review => review.text.length > 40);

      const seen = new Set();
      return reviews.filter(review => {
        const key = review.text.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 8);
    };
    const title = document.title.replace(/\s*-\s*Google\s*Maps\s*$/i, '').trim();
    const bodyText = document.body.textContent?.trim() ?? '';
    const ratingText = document.querySelector('[aria-label*="étoiles"]')?.getAttribute('aria-label') ?? null;
    const address =
      document.querySelector('[aria-label^="Adresse:"]')?.getAttribute('aria-label')?.replace(/^Adresse:\s*/i, '').trim() ??
      null;
    const openingHours =
      document.querySelector('[aria-label*="Ouvre"], [aria-label*="Fermé"]')?.getAttribute('aria-label')?.trim() ?? null;
    const phone =
      document.querySelector('[aria-label^="Numéro de téléphone:"]')
        ?.getAttribute('aria-label')
        ?.replace(/^Numéro de téléphone:\s*/i, '')
        .trim() ??
      null;
    const websiteNode = document.querySelector('[aria-label^="Site Web:"]');
    const websiteUrl = websiteNode?.href ?? null;
    const plusCode =
      document.querySelector('[aria-label^="Plus\\u00A0code:"], [aria-label^="Plus code:"]')
        ?.getAttribute('aria-label')
        ?.replace(/^Plus[\u00A0\s]code:\s*/i, '')
        .trim() ?? null;
    const allLinks = Array.from(document.querySelectorAll('a[href]'))
      .map(anchor => anchor.getAttribute('href') ?? '')
      .filter(Boolean);
    const images = extractImagesFromDocument().slice(0, 24);
    const imageUrls = images.map(image => image.url);
    const businessDetails = inferAttributes();
    businessDetails.openingHoursText = openingHours;

    return {
      title,
      ratingText,
      reviewCountText: bodyText,
      address,
      openingHours,
      phone,
      websiteUrl,
      socialLinks: allLinks.filter(link =>
        /(instagram\.com|facebook\.com|tiktok\.com|youtube\.com|x\.com|twitter\.com|linktr\.ee)/i.test(link)
      ),
      plusCode,
      imageUrls,
      images,
      reviews: extractReviewsFromDocument(),
      businessDetails,
      bodyText,
      sourceUrls: allLinks
    };
  })()`) as Promise<MapsPlaceDetail>;
}

async function extractExtraPlaceContent(page: Page): Promise<ExtraPlaceContent> {
  const extra: ExtraPlaceContent = { images: [], reviews: [] };

  try {
    const photosButton = page.getByText(/Voir les photos/i).first();
    if (await photosButton.count()) {
      await photosButton.click();
      await page.waitForTimeout(2500);
      for (let index = 0; index < 3; index += 1) {
        await page.mouse.wheel(0, 1000);
        await page.waitForTimeout(500);
      }
    }
  } catch {
    // Non bloquant: certaines fiches ne permettent pas l'ouverture de la galerie.
  }

  extra.images = await page.evaluate(String.raw`(() => {
    const normalizeGoogleImageUrl = (url) => {
      if (!url.includes('googleusercontent.com')) return url;
      return url.replace(/=w\d+-h\d+[^&)]*/i, '=w1200-h900-k-no').replace(/=s\d+[^&)]*/i, '=w1200-h900-k-no');
    };
    const urls = [];

    for (const image of Array.from(document.querySelectorAll('img[src]'))) {
      const src = image.getAttribute('src') ?? '';
      if (!src.includes('googleusercontent.com')) continue;
      if (/\/a\//.test(src) || /s\d+-p-k-no-mo/.test(src)) continue;
      urls.push({
        url: normalizeGoogleImageUrl(src),
        source: 'maps_photos',
        alt: image.getAttribute('alt'),
        width: image.naturalWidth || null,
        height: image.naturalHeight || null
      });
    }

    const seen = new Set();
    return urls.filter(image => {
      if (seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    }).slice(0, 32);
  })()`) as LeadImage[];

  return extra;
}

function mergeImages(images: LeadImage[]): LeadImage[] {
  const seen = new Set<string>();
  return images.filter(image => {
    if (!image.url || seen.has(image.url)) return false;
    seen.add(image.url);
    return true;
  });
}

function buildLeadRaw(query: string, listing: MapsListingCard, detail: MapsPlaceDetail, extra: ExtraPlaceContent, city: string): LeadRaw {
  const detailTitle = detail.title && !/^google\s*maps$/i.test(detail.title) ? detail.title : null;
  const businessName = normalizeWhitespace(firstNonEmpty([detailTitle, listing.name]) ?? slugify(listing.placeUrl));
  const address = firstNonEmpty([detail.address, listing.addressSnippet]);
  const reviewCount = parseReviewCount(detail.reviewCountText) ?? parseReviewCount(listing.articleText);
  const images = mergeImages([
    ...(listing.imageUrl ? [{ url: listing.imageUrl, source: 'maps_listing' as const, alt: listing.name, width: null, height: null }] : []),
    ...detail.images,
    ...extra.images
  ]).slice(0, 32);
  const imageUrls = images.map(image => image.url);
  const reviews = [...detail.reviews, ...extra.reviews].slice(0, 10);
  const sourceUrls = dedupeStrings([listing.placeUrl, detail.websiteUrl, ...detail.socialLinks]);
  const socialLinks = dedupeStrings([
    ...detail.socialLinks,
    listing.placeUrl.includes('instagram.com') ? listing.placeUrl : null
  ]);

  return {
    leadId: `lead_${hashId([businessName, address, detail.phone])}`,
    dedupeKey: hashId([businessName, address, detail.phone]),
    sourceQuery: query,
    sourceUrl: listing.placeUrl,
    businessName,
    category: firstNonEmpty([listing.categoryText, null]),
    rating: parseRating(firstNonEmpty([detail.ratingText, listing.ratingText])),
    reviewCount,
    city,
    address,
    openingHours: detail.openingHours,
    phone: detail.phone,
    websiteUrl: detail.websiteUrl,
    discoveredWebsiteUrls: detail.websiteUrl ? [detail.websiteUrl] : [],
    socialLinks,
    plusCode: detail.plusCode,
    imageUrls,
    images,
    reviews,
    businessDetails: detail.businessDetails,
    source: {
      query,
      mapsUrl: listing.placeUrl,
      listingText: listing.articleText,
      detailText: detail.bodyText,
      searchImageUrl: listing.imageUrl,
      sourceUrls,
      imageUrls
    }
  };
}

export interface MapsScanOptions {
  city?: string;
  queries?: string[];
  perQueryLimit?: number;
  scrollPasses?: number;
}

export interface MapsScanResult {
  batchId: string;
  city: string;
  queries: string[];
  leads: LeadRaw[];
}

export async function scanGoogleMapsLeads(options: MapsScanOptions = {}): Promise<MapsScanResult> {
  const city = options.city ?? 'Lyon';
  const queries = options.queries?.length ? options.queries : FOOD_BATCH_QUERIES;
  const perQueryLimit = options.perQueryLimit ?? 12;
  const scrollPasses = options.scrollPasses ?? 4;
  const batchId = shortBatchId('lead');
  const browser = await chromium.launch({ headless: true });

  try {
    const collected: LeadRaw[] = [];

    for (const query of queries) {
      const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
      logger.info(`🗺️ Scan Google Maps: "${query}"`);

      const { page, contextClosed } = await openMapsPage(browser, url);

      try {
        await scrollFeed(page, scrollPasses);
        const listings = (await extractListingCards(page, query))
          .filter(card => Boolean(card.placeUrl) && Boolean(card.name))
          .slice(0, perQueryLimit);

        logger.info(`  ${listings.length} fiches candidates récupérées`);

        for (const listing of listings) {
          const detailSession = await openMapsPage(browser, listing.placeUrl);

          try {
            const detail = await extractPlaceDetail(detailSession.page);
            const extra = await extractExtraPlaceContent(detailSession.page);
            collected.push(buildLeadRaw(query, listing, detail, extra, city));
          } catch (error) {
            logger.warn(
              `  Fiche ignorée (${listing.name}): ${error instanceof Error ? error.message : String(error)}`
            );
          } finally {
            await detailSession.contextClosed();
          }
        }
      } finally {
        await contextClosed();
      }
    }

    const deduped = new Map<string, LeadRaw>();
    for (const lead of collected) {
      const existing = deduped.get(lead.dedupeKey);
      if (!existing || (lead.rating ?? 0) > (existing.rating ?? 0)) {
        deduped.set(lead.dedupeKey, lead);
      }
    }

    return {
      batchId,
      city,
      queries,
      leads: Array.from(deduped.values())
    };
  } finally {
    await browser.close();
  }
}
