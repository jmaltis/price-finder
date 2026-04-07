export type LLMProvider = 'anthropic' | 'openai' | 'openrouter';

export interface UsageMetrics {
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  estimatedCost: number;
  provider: LLMProvider;
  model: string;
}

export interface LLMResponse<T = string> {
  content: T;
  usage: UsageMetrics;
}

export interface LLMModelConfig {
  id: string;
  name: string;
  provider: LLMProvider;
  pricePerMTokenInput: number;
  pricePerMTokenOutput: number;
  minTemperature: number;
  maxTemperature: number;
  defaultTemperature: number;
}

export interface ProviderConfig {
  name: string;
  type: LLMProvider;
  apiKey: string;
  baseURL?: string;
  models: LLMModelConfig[];
}
