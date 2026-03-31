import Anthropic from '@anthropic-ai/sdk';
import { LLM_MODELS } from '../constants/models.js';
import type { LLMModelConfig, LLMProvider, LLMResponse } from '../types/llm.js';
import { calculateEstimatedCost, cleanJsonResponse, getLLMProviderConfig } from '../utils/llm.js';
import { logger } from '../utils/logger.js';
import { handleQuotaError, isQuotaError } from '../utils/quota.js';

export class LLMService {
  private provider: LLMProvider;
  private anthropicClient?: Anthropic;
  private modelId: string;

  constructor(modelConfig: LLMModelConfig) {
    this.provider = modelConfig.provider;
    this.modelId = modelConfig.id;

    const config = getLLMProviderConfig(this.provider);

    if (this.provider === 'anthropic') {
      this.anthropicClient = new Anthropic({ apiKey: config.apiKey });
    } else {
      throw new Error(`Provider non supporté pour le proto: ${this.provider}`);
    }

    logger.info(`🤖 LLM Service initialisé: ${this.modelId}`);
  }

  async completion(
    prompt: string,
    maxTokens: number = 4096,
    temperature?: number
  ): Promise<LLMResponse<string>> {
    return this.callLLM(prompt, maxTokens, temperature);
  }

  async structuredOutput<T>(
    prompt: string,
    maxTokens: number = 4096,
    temperature?: number
  ): Promise<LLMResponse<T>> {
    const response = await this.callLLM(prompt, maxTokens, temperature);
    const cleanedResponse = cleanJsonResponse(response.content);

    try {
      const parsedContent = JSON.parse(cleanedResponse) as T;
      return {
        content: parsedContent,
        usage: response.usage
      };
    } catch (parseError) {
      logger.error('Erreur de parsing JSON');
      logger.error(`Réponse brute: ${response.content.substring(0, 500)}`);
      throw parseError;
    }
  }

  private async callLLM(
    prompt: string,
    maxTokens: number = 4096,
    temperature?: number
  ): Promise<LLMResponse<string>> {
    try {
      if (this.provider !== 'anthropic' || !this.anthropicClient) {
        throw new Error('LLM client not initialized');
      }

      const response = await this.anthropicClient.messages.create({
        model: this.modelId,
        max_tokens: maxTokens,
        temperature: temperature,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API');
      }

      const tokensInput = response.usage.input_tokens;
      const tokensOutput = response.usage.output_tokens;
      const tokensTotal = tokensInput + tokensOutput;

      const modelConfig = Object.values(LLM_MODELS).find(m => m.id === this.modelId);
      const estimatedCost = modelConfig
        ? calculateEstimatedCost(modelConfig, tokensInput, tokensOutput)
        : 0;

      return {
        content: content.text,
        usage: {
          tokensInput,
          tokensOutput,
          tokensTotal,
          estimatedCost,
          provider: this.provider,
          model: this.modelId
        }
      };
    } catch (error: unknown) {
      if (isQuotaError(error)) {
        handleQuotaError(error, 'LLM', this.provider, this.modelId);
      }
      throw error;
    }
  }
}
