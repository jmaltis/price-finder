import * as cheerio from 'cheerio';
import type { ProductIdentifiers } from '../types/pipeline.js';
import { logger } from './logger.js';

interface JsonLdProduct {
  '@type'?: string;
  name?: string;
  offers?: JsonLdOffer | JsonLdOffer[];
  brand?: { name?: string } | string;
  gtin13?: string;
  gtin?: string;
  gtin8?: string;
  gtin14?: string;
  sku?: string;
  mpn?: string;
  productID?: string;
}

interface JsonLdOffer {
  '@type'?: string;
  price?: string | number;
  priceCurrency?: string;
  availability?: string;
  seller?: { name?: string } | string;
  shippingDetails?: { shippingRate?: { value?: string | number } };
}

export interface ExtractedJsonLd {
  name: string;
  price: number;
  currency: string;
  inStock: boolean | null;
  seller: string | null;
  shippingCost: number | null;
  identifiers: ProductIdentifiers;
}

export interface ExtractedMeta {
  title: string | null;
  price: number | null;
  currency: string | null;
}

export interface ExtractedDomPrice {
  price: number;
  context: string;
  selector: string;
}

export function extractJsonLd(html: string): ExtractedJsonLd[] {
  const $ = cheerio.load(html);
  const results: ExtractedJsonLd[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const text = $(el).text();
      const data = JSON.parse(text) as JsonLdProduct | JsonLdProduct[];

      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] !== 'Product') continue;

        const offers = Array.isArray(item.offers) ? item.offers : item.offers ? [item.offers] : [];
        for (const offer of offers) {
          const price = parseFloat(String(offer.price ?? ''));
          if (isNaN(price) || price <= 0) continue;

          const seller =
            typeof offer.seller === 'object' ? offer.seller?.name ?? null : offer.seller ?? null;
          const shippingValue = offer.shippingDetails?.shippingRate?.value;

          const gtin = item.gtin13 || item.gtin || item.gtin14 || item.gtin8 || undefined;
          const brandName = typeof item.brand === 'object' ? item.brand?.name : item.brand;
          const identifiers: ProductIdentifiers = {
            ...(gtin && { gtin }),
            ...(item.sku && { sku: item.sku }),
            ...(item.mpn && { mpn: item.mpn }),
            ...(brandName && { brand: brandName }),
          };

          const idStr = gtin ? ` EAN:${gtin}` : item.sku ? ` SKU:${item.sku}` : '';
          logger.info(`    📋 JSON-LD: "${item.name}" → ${price} ${offer.priceCurrency ?? 'EUR'} (seller: ${seller ?? '?'})${idStr}`);

          results.push({
            name: item.name ?? '',
            price,
            currency: offer.priceCurrency ?? 'EUR',
            inStock: offer.availability
              ? offer.availability.toLowerCase().includes('instock')
              : null,
            seller,
            shippingCost: shippingValue != null ? parseFloat(String(shippingValue)) : null,
            identifiers
          });
        }
      }
    } catch {
      // JSON-LD invalide, on skip
    }
  });

  return results;
}

export function extractMetaOg(html: string): ExtractedMeta {
  const $ = cheerio.load(html);

  const priceStr =
    $('meta[property="product:price:amount"]').attr('content') ||
    $('meta[property="og:price:amount"]').attr('content');
  const currency =
    $('meta[property="product:price:currency"]').attr('content') ||
    $('meta[property="og:price:currency"]').attr('content');
  const title = $('meta[property="og:title"]').attr('content') || $('title').text() || null;

  if (priceStr) {
    logger.info(`    🏷️  Meta OG: "${title}" → ${priceStr} ${currency ?? 'EUR'}`);
  }

  return {
    title,
    price: priceStr ? parseFloat(priceStr) : null,
    currency: currency ?? null
  };
}

export function extractDomPrices(html: string): ExtractedDomPrice[] {
  const $ = cheerio.load(html);
  const results: ExtractedDomPrice[] = [];
  const seen = new Set<number>();

  const priceSelectors = [
    '[itemprop="price"]',
    '[class*="price"]:not([class*="compare"]):not([class*="old"]):not([class*="crossed"])',
    '[class*="prix"]:not([class*="ancien"]):not([class*="barre"])',
    '[data-price]'
  ];

  for (const selector of priceSelectors) {
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      const attrPrice = $(el).attr('content') || $(el).attr('data-price');
      const classes = $(el).attr('class') || '';
      const tag = (el as unknown as { tagName: string }).tagName;

      let price: number | null = null;

      if (attrPrice) {
        price = parseFloat(attrPrice.replace(',', '.'));
      }

      if (price == null || isNaN(price)) {
        const match = text.match(/(\d+[.,]\d{2})\s*€/) || text.match(/€\s*(\d+[.,]\d{2})/);
        if (match) {
          price = parseFloat(match[1].replace(',', '.'));
        }
      }

      if (price != null && !isNaN(price) && price > 0 && price < 100000 && !seen.has(price)) {
        seen.add(price);
        const shortContext = text.substring(0, 80).replace(/\s+/g, ' ');
        logger.info(`    🔍 DOM [${selector}] <${tag} class="${classes.substring(0, 60)}"> → ${price}€ | "${shortContext}"`);
        results.push({ price, context: text.substring(0, 100), selector });
      }
    });
  }

  // Regex fallback sur le body
  const bodyText = $('main, [role="main"], article, .product, #product').text();
  const euroMatches = bodyText.matchAll(/(\d+[.,]\d{2})\s*€/g);
  for (const match of euroMatches) {
    const price = parseFloat(match[1].replace(',', '.'));
    if (price > 0 && price < 100000 && !seen.has(price)) {
      seen.add(price);
      logger.info(`    🔍 DOM [regex body] → ${price}€ | "${match[0]}"`);
      results.push({ price, context: match[0], selector: 'regex-body' });
    }
  }

  return results.sort((a, b) => a.price - b.price);
}

export function cleanHtmlForLlm(html: string): string {
  const $ = cheerio.load(html);

  $('script, style, nav, footer, header, iframe, noscript, svg').remove();
  $('[class*="cookie"], [class*="banner"], [class*="popup"], [class*="modal"]').remove();
  $('[class*="sidebar"], [class*="menu"], [class*="newsletter"]').remove();

  const mainContent =
    $('main, [role="main"], .product, #product, [class*="product-detail"]').html() ||
    $('body').html() ||
    '';

  return mainContent
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 8000);
}
