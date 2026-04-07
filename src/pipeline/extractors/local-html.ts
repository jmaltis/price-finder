import type { ExtractionResult, ProductPrice } from '../../types/pipeline.js';
import { extractDomPrices, extractJsonLd, extractMetaOg } from '../../utils/html.js';
import { logger } from '../../utils/logger.js';
import { getDomain } from '../../utils/url.js';

export function extractLocalHtml(url: string, html: string): ExtractionResult {
  const domain = getDomain(url);
  const prices: ProductPrice[] = [];

  // Pass 3a : JSON-LD
  const jsonLdResults = extractJsonLd(html);
  for (const result of jsonLdResults) {
    prices.push({
      productName: result.name,
      price: result.price,
      currency: result.currency,
      shippingCost: result.shippingCost,
      inStock: result.inStock,
      variant: null,
      identifiers: Object.keys(result.identifiers).length > 0 ? result.identifiers : undefined,
      merchantName: result.seller || domain,
      merchantUrl: `https://${domain}`,
      sourceUrl: url,
      extractionMethod: 'json_ld'
    });
  }

  if (prices.length > 0) {
    logger.info(`📄 JSON-LD: ${prices.length} prix trouvés sur ${domain}`);
    return { url, prices, method: 'json_ld', success: true };
  }

  // Pass 3b : Meta OG
  const metaResult = extractMetaOg(html);
  if (metaResult.price != null && !isNaN(metaResult.price) && metaResult.price > 0) {
    prices.push({
      productName: metaResult.title || '',
      price: metaResult.price,
      currency: metaResult.currency || 'EUR',
      shippingCost: null,
      inStock: null,
      variant: null,
      merchantName: domain,
      merchantUrl: `https://${domain}`,
      sourceUrl: url,
      extractionMethod: 'meta_og'
    });
    logger.info(`📄 Meta OG: prix trouvé sur ${domain}`);
    return { url, prices, method: 'meta_og', success: true };
  }

  // Pass 3c : Heuristiques DOM
  const domResults = extractDomPrices(html);
  if (domResults.length > 0) {
    logger.info(`📄 DOM heuristique: ${domResults.length} prix trouvés sur ${domain}`);

    // Si trop de prix différents, c'est probablement une page catalogue/listing
    // → ne pas faire confiance, laisser Stagehand gérer
    if (domResults.length > 3) {
      logger.info(`  ↩️  ${domResults.length} prix = page ambiguë, skip DOM`);
      return { url, prices: [], method: 'dom', success: false, error: 'Trop de prix DOM, page ambiguë' };
    }

    // Prendre le prix médian (moins sensible aux outliers que le min)
    const mid = Math.floor(domResults.length / 2);
    const best = domResults[mid];
    prices.push({
      productName: '',
      price: best.price,
      currency: 'EUR',
      shippingCost: null,
      inStock: null,
      variant: null,
      merchantName: domain,
      merchantUrl: `https://${domain}`,
      sourceUrl: url,
      extractionMethod: 'dom'
    });
    return { url, prices, method: 'dom', success: true };
  }

  return { url, prices: [], method: 'dom', success: false, error: 'Aucun prix trouvé en local' };
}
