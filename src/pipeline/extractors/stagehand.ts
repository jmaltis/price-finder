import { Stagehand, type Page } from '@browserbasehq/stagehand';
import { z } from 'zod';
import type { ExtractionResult, ProductPrice, VariantGroup } from '../../types/pipeline.js';
import { logger } from '../../utils/logger.js';
import { getDomain } from '../../utils/url.js';
import { extractVariantsFromPage } from '../../utils/variants.js';

const ProductSchema = z.object({
  products: z.array(
    z.object({
      productName: z.string().describe('Nom du produit principal'),
      price: z.number().describe('Prix actuel en nombre (pas l\'ancien prix barré)'),
      currency: z.string().describe('Devise (EUR, USD, etc.)'),
      shippingCost: z.number().nullable().describe('Frais de livraison, null si inconnu'),
      inStock: z.boolean().nullable().describe('En stock ou non, null si inconnu'),
      variant: z.string().nullable().describe('Variante sélectionnée (couleur, taille, etc.)'),
      merchantName: z.string().describe('Nom du marchand / site'),
      gtin: z.string().nullable().describe('Code EAN/GTIN (code-barres 8 ou 13 chiffres), null si non visible'),
      brand: z.string().nullable().describe('Marque du produit, null si non visible')
    })
  )
});

type ExtractResult = z.infer<typeof ProductSchema>;

const COOKIE_SELECTORS = [
  '[id*="cookie"] button[id*="accept"]',
  '[id*="cookie"] button[id*="agree"]',
  '[class*="cookie"] button[class*="accept"]',
  '[class*="cookie"] button[class*="agree"]',
  '[id*="consent"] button[id*="accept"]',
  '[class*="consent"] button[class*="accept"]',
  'button[id*="onetrust-accept"]',
  '#didomi-notice-agree-button',
  '.cc-accept',
  '.cc-allow',
  '[data-testid="cookie-accept"]'
];

const PRODUCT_SELECTORS = [
  '[itemtype*="schema.org/Product"]',
  '[class*="product-detail"]',
  '[class*="product-info"]',
  '[class*="pdp"]',
  '#product',
  'main'
];

function isValidResult(result: ExtractResult | null): boolean {
  if (!result || result.products.length === 0) return false;
  return result.products.some(p => p.price > 0 && p.productName.length > 0);
}

let stagehandInstance: Stagehand | null = null;

export async function getStagehand(): Promise<Stagehand> {
  if (!stagehandInstance) {
    stagehandInstance = new Stagehand({
      env: 'LOCAL',
      model: 'anthropic/claude-haiku-4-5',
      verbose: 0
    });
    await stagehandInstance.init();
  }
  return stagehandInstance;
}

export async function closeStagehand(): Promise<void> {
  if (stagehandInstance) {
    await stagehandInstance.close();
    stagehandInstance = null;
  }
}

export async function dismissCookies(page: Page): Promise<void> {
  for (const selector of COOKIE_SELECTORS) {
    try {
      const count = await page.locator(selector).count();
      if (count > 0) {
        await page.locator(selector).first().click();
        logger.info('  🍪 Cookie banner dismissed');
        return;
      }
    } catch {
      // Selector pas trouvé, on continue
    }
  }
}

async function findProductSelector(page: Page): Promise<string | undefined> {
  for (const selector of PRODUCT_SELECTORS) {
    try {
      const count = await page.locator(`${selector} :is([class*="price"], [itemprop="price"], [data-price])`).count();
      if (count > 0) return selector;
    } catch {
      // Selector pas trouvé, on continue
    }
  }
  return undefined;
}

function fixStringifiedJson(obj: unknown): unknown {
  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        return fixStringifiedJson(JSON.parse(trimmed));
      } catch {
        return obj;
      }
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(fixStringifiedJson);
  }
  if (obj !== null && typeof obj === 'object') {
    const fixed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      fixed[key] = fixStringifiedJson(value);
    }
    return fixed;
  }
  return obj;
}

function extractRawValue(err: unknown): unknown | null {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if ('value' in e && e.value !== undefined) return e.value;
    if ('cause' in e && e.cause) return extractRawValue(e.cause);
  }
  return null;
}

/** Wrapper stagehand.extract() qui corrige le bug Haiku (array renvoyé en string JSON) */
export async function robustExtract<T extends z.ZodType>(
  stagehand: Stagehand,
  instruction: string,
  schema: T,
  options?: { selector?: string }
): Promise<z.infer<T>> {
  try {
    return await stagehand.extract(instruction, schema, options);
  } catch (err) {
    const raw = extractRawValue(err);
    if (raw) {
      const fixed = fixStringifiedJson(raw);
      const result = schema.safeParse(fixed);
      if (result.success) {
        logger.info('  🔧 Résultat corrigé (JSON stringifié par le LLM)');
        return result.data as z.infer<T>;
      }
    }
    throw err;
  }
}

export async function extractWithStagehand(
  url: string
): Promise<ExtractionResult> {
  const domain = getDomain(url);
  logger.info(`🌐 Stagehand extraction: ${domain}`);

  try {
    const stagehand = await getStagehand();
    const page = stagehand.context.pages()[0];
    await page.goto(url, { waitUntil: 'domcontentloaded', timeoutMs: 30_000 });

    await dismissCookies(page);

    const instruction =
      `Extrais les informations du produit principal de cette page e-commerce (marchand: ${domain}). ` +
      'Prends le prix actuel de la variante sélectionnée par défaut (pas l\'ancien prix barré). ' +
      'Note la variante affichée (poids, taille, couleur) si applicable. ' +
      'Note les frais de livraison si mentionnés. ' +
      'Ignore les accessoires et produits similaires.';

    // Escalade : sélecteur ciblé → full page
    let result: ExtractResult | null = null;

    const productSelector = await findProductSelector(page);
    if (productSelector) {
      logger.info(`  🎯 Extraction ciblée: ${productSelector}`);
      result = await robustExtract(stagehand, instruction, ProductSchema, { selector: productSelector });

      if (!isValidResult(result)) {
        logger.info('  ↩️  Résultat insuffisant, retry full page');
        result = null;
      }
    }

    if (!result) {
      logger.info('  📄 Extraction full page');
      result = await robustExtract(stagehand, instruction, ProductSchema);
    }

    if (!isValidResult(result)) {
      logger.warn(`🌐 Stagehand: aucun produit trouvé sur ${domain}`);
      return { url, prices: [], method: 'stagehand', success: false, error: 'Aucun produit trouvé' };
    }

    // Extraire les variantes via DOM (déterministe, 0 tokens LLM)
    let variants: VariantGroup[] = [];
    try {
      variants = await extractVariantsFromPage(page);
      if (variants.length > 0) {
        logger.info(`  📦 ${variants.length} groupes de variantes détectés`);
      }
    } catch {
      // Non bloquant — on continue sans variantes
    }

    const prices: ProductPrice[] = result.products
      .filter(p => p.price > 0 && p.productName.length > 0)
      .map(p => ({
        productName: p.productName,
        price: p.price,
        currency: p.currency || 'EUR',
        shippingCost: p.shippingCost,
        inStock: p.inStock,
        variant: p.variant,
        variants: variants.length > 0 ? variants : undefined,
        identifiers: (p.gtin || p.brand) ? {
          ...(p.gtin && { gtin: p.gtin }),
          ...(p.brand && { brand: p.brand }),
        } : undefined,
        merchantName: p.merchantName || domain,
        merchantUrl: `https://${domain}`,
        sourceUrl: url,
        extractionMethod: 'stagehand' as const
      }));

    logger.info(`🌐 Stagehand: ${prices.length} prix extraits sur ${domain}`);
    return { url, prices, method: 'stagehand', success: prices.length > 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.warn(`🌐 Stagehand échoué pour ${domain}: ${message}`);

    // Reset l'instance pour que le prochain appel reparte de zéro
    try { await closeStagehand(); } catch { /* ignore */ }

    return { url, prices: [], method: 'stagehand', success: false, error: message };
  }
}
