import type { ExtractionResult, ProductPrice } from '../../types/pipeline.js';
import { logger } from '../../utils/logger.js';
import { getDomain } from '../../utils/url.js';

const APIFY_RUN_URL = 'https://api.apify.com/v2/acts';

const CMS_ACTORS: Record<string, string> = {
  shopify: 'apify/shopify-scraper',
  woocommerce: 'apify/woocommerce-scraper'
};

interface ApifyProduct {
  title?: string;
  name?: string;
  price?: number | string;
  compareAtPrice?: number | string;
  currency?: string;
  available?: boolean;
  vendor?: string;
  url?: string;
  variants?: Array<{
    title?: string;
    price?: number | string;
    available?: boolean;
  }>;
}

async function detectCms(html: string): Promise<string | null> {
  if (html.includes('Shopify.theme') || html.includes('cdn.shopify.com')) return 'shopify';
  if (html.includes('woocommerce') || html.includes('wc-add-to-cart')) return 'woocommerce';
  return null;
}

let apifyDisabled = false;

export async function extractApify(
  url: string,
  html: string,
  apifyToken: string
): Promise<ExtractionResult> {
  if (apifyDisabled) {
    return { url, prices: [], method: 'apify', success: false, error: 'Apify désactivé (crédits épuisés)' };
  }

  const cms = await detectCms(html);
  if (!cms) {
    return { url, prices: [], method: 'apify', success: false, error: 'CMS non détecté' };
  }

  const actorId = CMS_ACTORS[cms];
  if (!actorId) {
    return { url, prices: [], method: 'apify', success: false, error: `Actor manquant pour ${cms}` };
  }

  const domain = getDomain(url);
  logger.info(`🛒 Apify extraction (${cms}): ${domain}`);

  try {
    const runResponse = await fetch(`${APIFY_RUN_URL}/${actorId}/runs?token=${apifyToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [{ url }],
        maxItems: 1
      })
    });

    if (runResponse.status === 402 || runResponse.status === 429) {
      apifyDisabled = true;
      logger.warn('Apify: crédits épuisés — pass 2 désactivé pour cette session');
      return { url, prices: [], method: 'apify', success: false, error: 'Crédits Apify épuisés' };
    }

    if (!runResponse.ok) {
      throw new Error(`Apify run failed: ${runResponse.status}`);
    }

    const run = (await runResponse.json()) as { data?: { defaultDatasetId?: string } };
    const datasetId = run.data?.defaultDatasetId;
    if (!datasetId) throw new Error('No dataset ID in Apify response');

    // Attendre que le run se termine (polling simple)
    await new Promise(resolve => setTimeout(resolve, 10000));

    const dataResponse = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`
    );
    const items = (await dataResponse.json()) as ApifyProduct[];

    const prices: ProductPrice[] = [];
    for (const item of items) {
      const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
      if (price == null || isNaN(price) || price <= 0) continue;

      prices.push({
        productName: item.title || item.name || '',
        price,
        currency: item.currency ?? 'EUR',
        shippingCost: null,
        inStock: item.available ?? null,
        variant: null,
        merchantName: item.vendor || domain,
        merchantUrl: `https://${domain}`,
        sourceUrl: item.url || url,
        extractionMethod: 'apify'
      });
    }

    return { url, prices, method: 'apify', success: prices.length > 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.warn(`Apify extraction échouée pour ${url}: ${message}`);
    return { url, prices: [], method: 'apify', success: false, error: message };
  }
}
