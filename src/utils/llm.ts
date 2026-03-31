import { jsonrepair } from 'jsonrepair';
import { LLM_MODELS } from '../constants/models.js';
import type { LLMModelConfig, LLMProvider, ProviderConfig } from '../types/llm.js';
import { getEnvOptional } from './env.js';

export function calculateEstimatedCost(
  model: LLMModelConfig,
  tokensInput: number,
  tokensOutput: number
): number {
  const costInput = (tokensInput / 1_000_000) * model.pricePerMTokenInput;
  const costOutput = (tokensOutput / 1_000_000) * model.pricePerMTokenOutput;
  return costInput + costOutput;
}

export function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();

  const markdownMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (markdownMatch) {
    cleaned = markdownMatch[1].trim();
  }

  return jsonrepair(cleaned);
}

function getAvailableProviders(): ProviderConfig[] {
  const anthropicKey = getEnvOptional('anthropicApiKey');
  const openrouterKey = getEnvOptional('openrouterApiKey');
  const openaiKey = getEnvOptional('openaiApiKey');

  const configs: ProviderConfig[] = [];

  if (anthropicKey) {
    configs.push({
      name: 'Anthropic',
      type: 'anthropic',
      apiKey: anthropicKey,
      baseURL: undefined,
      models: Object.values(LLM_MODELS).filter(m => m.provider === 'anthropic')
    });
  }

  if (openrouterKey) {
    configs.push({
      name: 'OpenRouter',
      type: 'openrouter',
      apiKey: openrouterKey,
      baseURL: 'https://openrouter.ai/api/v1',
      models: Object.values(LLM_MODELS).filter(m => m.provider === 'openrouter')
    });
  }

  if (openaiKey) {
    configs.push({
      name: 'OpenAI',
      type: 'openai',
      apiKey: openaiKey,
      baseURL: 'https://api.openai.com/v1',
      models: Object.values(LLM_MODELS).filter(m => m.provider === 'openai')
    });
  }

  return configs;
}

export function getLLMProviderConfig(provider: LLMProvider): ProviderConfig {
  const providers = getAvailableProviders();
  const providerConfig = providers.find(p => p.type === provider);

  if (!providerConfig) {
    throw new Error(
      `Aucune clé API trouvée pour le provider ${provider}. ` +
        `Configurez ${provider.toUpperCase()}_API_KEY dans .env`
    );
  }

  return providerConfig;
}
