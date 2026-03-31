import type { ExtractionResult, ProductPrice } from '../../types/pipeline.js';
import { logger } from '../../utils/logger.js';
import { getDomain } from '../../utils/url.js';

const BRIGHT_DATA_WEB_DATA_URL = 'https://api.brightdata.com/datasets/v3/trigger';

const KNOWN_DOMAINS: Record<string, string> = {
  'amazon.fr': 'gd_l7q7dkf244hwjntr0',
  'amazon.com': 'gd_l7q7dkf244hwjntr0',
  'ebay.fr': 'gd_ltr20il3z0cxk0lbue',
  'ebay.com': 'gd_ltr20il3z0cxk0lbue'
};

interface BrightDataProduct {
  title?: string;
  name?: string;
  price?: number | string;
  final_price?: number | string;
  currency?: string;
  seller_name?: string;
  seller?: string;
  in_stock?: boolean;
  availability?: string;
  shipping?: string;
  url?: string;
  variant?: string;
}

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

export function isKnownDomain(url: string): boolean {
  const domain = getDomain(url);
  return Object.keys(KNOWN_DOMAINS).some(d => domain.includes(d));
}

export async function extractBrightData(
  url: string,
  apiToken: string
): Promise<ExtractionResult> {
  const domain = getDomain(url);
  const datasetId = Object.entries(KNOWN_DOMAINS).find(([d]) => domain.includes(d))?.[1];

  if (!datasetId) {
    return { url, prices: [], method: 'bright_data', success: false, error: 'Domaine non supporté' };
  }

  logger.info(`📦 Bright Data extraction: ${domain}`);

  try {
    const response = await fetch(`${BRIGHT_DATA_WEB_DATA_URL}?dataset_id=${datasetId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`
      },
      body: JSON.stringify([{ url }])
    });

    if (!response.ok) {
      throw new Error(`Bright Data API error: ${response.status}`);
    }

    const data = (await response.json()) as BrightDataProduct[];

    const prices: ProductPrice[] = [];
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      const price = parsePrice(item.final_price ?? item.price);
      if (price == null || price <= 0) continue;

      prices.push({
        productName: item.title || item.name || '',
        price,
        currency: item.currency ?? 'EUR',
        shippingCost: item.shipping ? parsePrice(item.shipping) : null,
        inStock: item.in_stock ?? (item.availability?.toLowerCase().includes('in stock') ?? null),
        variant: item.variant ?? null,
        merchantName: item.seller_name || item.seller || domain,
        merchantUrl: `https://${domain}`,
        sourceUrl: item.url || url,
        extractionMethod: 'bright_data'
      });
    }

    return { url, prices, method: 'bright_data', success: prices.length > 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.warn(`Bright Data extraction échouée pour ${url}: ${message}`);
    return { url, prices: [], method: 'bright_data', success: false, error: message };
  }
}
