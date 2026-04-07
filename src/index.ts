import { extractPrices } from './pipeline/extract.js';
import { searchGoogle } from './pipeline/search.js';
import type { PipelineResult, ProductIdentifiers, ProductPrice } from './types/pipeline.js';
import { getEnv, validateEnv, ENV_REQUIREMENTS } from './utils/env.js';
import { logger } from './utils/logger.js';

function formatPrice(price: number, currency: string): string {
  if (currency === 'EUR' || currency === '€') {
    return `${price.toFixed(2).replace('.', ',')}€`;
  }
  return `${price.toFixed(2)} ${currency}`;
}

function findGtin(prices: ProductPrice[]): string | undefined {
  for (const p of prices) {
    if (p.identifiers?.gtin) return p.identifiers.gtin;
  }
  return undefined;
}

function findIdentifiers(prices: ProductPrice[]): ProductIdentifiers | undefined {
  const merged: ProductIdentifiers = {};
  for (const p of prices) {
    if (!p.identifiers) continue;
    if (p.identifiers.gtin && !merged.gtin) merged.gtin = p.identifiers.gtin;
    if (p.identifiers.sku && !merged.sku) merged.sku = p.identifiers.sku;
    if (p.identifiers.mpn && !merged.mpn) merged.mpn = p.identifiers.mpn;
    if (p.identifiers.brand && !merged.brand) merged.brand = p.identifiers.brand;
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function formatShipping(cost: number | null): string {
  if (cost === null) return '?';
  if (cost === 0) return 'Gratuite';
  return `${cost.toFixed(2).replace('.', ',')}€`;
}

function displayResults(result: PipelineResult, identifiers?: ProductIdentifiers): void {
  console.log('');
  console.log(`Recherche : "${result.query}" (France)`);
  if (identifiers) {
    const parts: string[] = [];
    if (identifiers.brand) parts.push(`Marque: ${identifiers.brand}`);
    if (identifiers.gtin) parts.push(`EAN: ${identifiers.gtin}`);
    if (identifiers.sku) parts.push(`SKU: ${identifiers.sku}`);
    if (identifiers.mpn) parts.push(`MPN: ${identifiers.mpn}`);
    if (parts.length > 0) console.log(`Produit identifié — ${parts.join(' | ')}`);
  }
  console.log(`${result.searchResults.length} résultats Google trouvés`);
  console.log('');

  if (result.prices.length === 0) {
    console.log('Aucun prix trouvé.');
    return;
  }

  // Header
  const header = ' # | Prix     | Livraison | Marchand          | Méthode    | URL';
  const separator = '---|---------|-----------|-------------------|------------|' + '-'.repeat(50);
  console.log(header);
  console.log(separator);

  result.prices.forEach((p: ProductPrice, i: number) => {
    const num = String(i + 1).padStart(2);
    const price = formatPrice(p.price, p.currency).padEnd(8);
    const shipping = formatShipping(p.shippingCost).padEnd(10);
    const merchant = p.merchantName.substring(0, 18).padEnd(18);
    const method = p.extractionMethod.padEnd(11);
    const url = p.sourceUrl.substring(0, 50);

    console.log(`${num} | ${price}| ${shipping}| ${merchant}| ${method}| ${url}`);
  });

  console.log('');
  console.log(`Total: ${result.prices.length} prix trouvés`);
  console.log(
    `Temps: recherche ${result.timing.searchMs}ms, extraction ${result.timing.extractionMs}ms, total ${result.timing.totalMs}ms`
  );

  if (result.errors.length > 0) {
    console.log('');
    logger.warn(`${result.errors.length} erreurs durant l'extraction`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : undefined;
  const query = args.filter((_, i) => i !== limitIdx && i !== limitIdx + 1).join(' ');

  if (!query) {
    console.error('Usage: npx tsx src/index.ts "nom du produit" [--limit N]');
    process.exit(1);
  }

  validateEnv(ENV_REQUIREMENTS.all);

  const brightDataToken = getEnv('brightDataApiToken');
  const apifyToken = getEnv('apifyToken');

  const totalStart = Date.now();

  // Étape 1 : Recherche Google
  const searchStart = Date.now();
  const pages = limit ? 1 : 3;
  let searchResults = await searchGoogle(query, brightDataToken, pages);
  if (limit) {
    searchResults = searchResults.slice(0, limit);
    logger.info(`🔬 Mode test: limité à ${limit} résultats`);
  }
  const searchMs = Date.now() - searchStart;

  if (searchResults.length === 0) {
    logger.error('Aucun résultat Google trouvé');
    process.exit(1);
  }

  // Étape 2 : Extraction des prix
  const extractStart = Date.now();
  const { prices, errors } = await extractPrices(searchResults, {
    apifyToken
  });

  // Étape 3 : Enrichissement GTIN
  // Chercher un GTIN dans les résultats extraits
  const gtin = findGtin(prices);
  let enrichedPrices = prices;
  let enrichedSearchResults = searchResults;
  let enrichErrors = errors;

  if (gtin) {
    logger.info(`\n🔎 GTIN trouvé: ${gtin} — recherche enrichie`);

    const enrichSearchStart = Date.now();
    let enrichResults = await searchGoogle(`"${gtin}"`, brightDataToken, 1);

    // Filtrer les URLs déjà extraites
    const existingUrls = new Set(searchResults.map(r => r.url));
    enrichResults = enrichResults.filter(r => !existingUrls.has(r.url));

    if (enrichResults.length > 0) {
      if (limit) {
        enrichResults = enrichResults.slice(0, limit);
      }
      logger.info(`  ${enrichResults.length} nouveaux résultats à extraire`);

      const enrichExtract = await extractPrices(enrichResults, { apifyToken });
      enrichedPrices = [...prices, ...enrichExtract.prices];
      enrichedSearchResults = [...searchResults, ...enrichResults];
      enrichErrors = [...errors, ...enrichExtract.errors];

      // Déduplique par marchand+prix
      const seen = new Map<string, ProductPrice>();
      for (const p of enrichedPrices) {
        const key = `${p.merchantName.toLowerCase()}-${p.price}`;
        if (!seen.has(key)) seen.set(key, p);
      }
      enrichedPrices = Array.from(seen.values());
      enrichedPrices.sort((a, b) => {
        const totalA = a.price + (a.shippingCost ?? 0);
        const totalB = b.price + (b.shippingCost ?? 0);
        return totalA - totalB;
      });
    } else {
      logger.info('  Aucun nouveau résultat via GTIN');
    }

    logger.info(`  Recherche enrichie: +${Date.now() - enrichSearchStart}ms`);
  }

  const extractionMs = Date.now() - extractStart;

  const result: PipelineResult = {
    query,
    searchResults: enrichedSearchResults,
    prices: enrichedPrices,
    errors: enrichErrors,
    timing: {
      searchMs,
      extractionMs,
      totalMs: Date.now() - totalStart
    }
  };

  displayResults(result, gtin ? findIdentifiers(prices) : undefined);
}

main().catch(error => {
  logger.error(`Erreur fatale: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
