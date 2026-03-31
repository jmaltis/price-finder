import type { ExtractionResult, ProductPrice, SearchResult } from '../types/pipeline.js';
import { logger } from '../utils/logger.js';
import { extractApify } from './extractors/apify.js';
import { closeStagehand, extractWithStagehand } from './extractors/stagehand.js';
import { extractLocalHtml } from './extractors/local-html.js';
import { fetchHtmlPlaywright, closeBrowser } from '../utils/playwright.js';

interface ExtractConfig {
  apifyToken: string;
}

/** Phase 1 : extraction locale (HTML fetch + JSON-LD/Meta/DOM + Apify). Parallélisable. */
async function extractLocal(
  result: SearchResult,
  config: ExtractConfig
): Promise<ExtractionResult | null> {
  const { url } = result;
  const domain = new URL(url).hostname.replace('www.', '');
  logger.info(`\n📄 [${domain}] ${url.substring(0, 80)}`);

  const html = await fetchHtmlPlaywright(url);
  if (!html) {
    logger.warn(`  ❌ HTML non récupéré, fallback Stagehand`);
    return null;
  }
  logger.info(`  📥 HTML récupéré (${(html.length / 1024).toFixed(0)}KB)`);

  // Pass 1 : Apify CMS detection (Shopify, WooCommerce)
  const apifyResult = await extractApify(url, html, config.apifyToken);
  if (apifyResult.success) return apifyResult;

  // Pass 2 : Local HTML parsing (JSON-LD, Meta OG, DOM heuristics)
  const localResult = extractLocalHtml(url, html);
  if (localResult.success) return localResult;

  return null;
}

export async function extractPrices(
  searchResults: SearchResult[],
  config: ExtractConfig
): Promise<{ prices: ProductPrice[]; errors: string[] }> {
  const allPrices: ProductPrice[] = [];
  const errors: string[] = [];

  logger.info(`📦 Extraction en cours pour ${searchResults.length} URLs...`);

  // Phase 1 : extracteurs locaux en parallèle (pas de Stagehand)
  const batchSize = 5;
  const stagehandQueue: string[] = [];

  for (let i = 0; i < searchResults.length; i += batchSize) {
    const batch = searchResults.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(result => extractLocal(result, config))
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled' && result.value) {
        allPrices.push(...result.value.prices);
        if (result.value.error) {
          errors.push(`${result.value.url}: ${result.value.error}`);
        }
      } else {
        // Pas de résultat local → queue pour Stagehand
        stagehandQueue.push(batch[j].url);
      }
    }
  }

  await closeBrowser();

  // Phase 2 : Stagehand séquentiel pour les URLs sans résultat local
  if (stagehandQueue.length > 0) {
    logger.info(`\n🌐 Phase Stagehand: ${stagehandQueue.length} URLs restantes`);

    for (const url of stagehandQueue) {
      try {
        const result = await extractWithStagehand(url);
        allPrices.push(...result.prices);
        if (result.error) {
          errors.push(`${result.url}: ${result.error}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Stagehand ${url}: ${msg}`);
      }
    }

    await closeStagehand();
  }

  const deduplicated = deduplicatePrices(allPrices);

  deduplicated.sort((a, b) => {
    const totalA = a.price + (a.shippingCost ?? 0);
    const totalB = b.price + (b.shippingCost ?? 0);
    return totalA - totalB;
  });

  logger.success(`${deduplicated.length} prix uniques trouvés`);
  return { prices: deduplicated, errors };
}

function deduplicatePrices(prices: ProductPrice[]): ProductPrice[] {
  const seen = new Map<string, ProductPrice>();

  for (const price of prices) {
    const key = `${price.merchantName.toLowerCase()}-${price.price}`;
    if (!seen.has(key)) {
      seen.set(key, price);
    }
  }

  return Array.from(seen.values());
}
