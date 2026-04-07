import { LLM_MODELS } from '../../constants/models.js';
import { LLMService } from '../../services/llmService.js';
import type { ExtractionResult, ProductPrice } from '../../types/pipeline.js';
import { cleanHtmlForLlm } from '../../utils/html.js';
import { logger } from '../../utils/logger.js';
import { getDomain } from '../../utils/url.js';

interface LlmExtractedPrice {
  productName: string;
  price: number;
  currency: string;
  shippingCost: number | null;
  inStock: boolean | null;
}

export async function extractWithLlm(
  url: string,
  html: string
): Promise<ExtractionResult> {
  const domain = getDomain(url);
  logger.info(`🤖 LLM fallback extraction: ${domain}`);

  const cleanedText = cleanHtmlForLlm(html);

  if (cleanedText.length < 50) {
    return { url, prices: [], method: 'llm', success: false, error: 'Contenu trop court pour LLM' };
  }

  try {
    const llm = new LLMService(LLM_MODELS['claude-haiku-4-5']);

    const prompt = `Tu es un extracteur de prix de produits e-commerce. Analyse ce contenu de page web et extrais les informations de prix.

URL: ${url}

Contenu de la page:
${cleanedText}

Réponds UNIQUEMENT en JSON valide, sans markdown, avec ce format exact:
{
  "products": [
    {
      "productName": "nom du produit",
      "price": 99.99,
      "currency": "EUR",
      "shippingCost": null,
      "inStock": true
    }
  ]
}

Si aucun prix n'est trouvé, réponds: { "products": [] }`;

    const response = await llm.structuredOutput<{ products: LlmExtractedPrice[] }>(
      prompt,
      2048,
      0.1
    );

    const prices: ProductPrice[] = response.content.products
      .filter(p => p.price > 0)
      .map(p => ({
        ...p,
        variant: null,
        merchantName: domain,
        merchantUrl: `https://${domain}`,
        sourceUrl: url,
        extractionMethod: 'llm' as const
      }));

    logger.info(
      `🤖 LLM: ${prices.length} prix extraits (coût: $${response.usage.estimatedCost.toFixed(4)})`
    );

    return { url, prices, method: 'llm', success: prices.length > 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    logger.warn(`LLM extraction échouée pour ${url}: ${message}`);
    return { url, prices: [], method: 'llm', success: false, error: message };
  }
}
