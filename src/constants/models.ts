import type { LLMModelConfig } from '../types/llm.js';

export const LLM_MODELS: Record<string, LLMModelConfig> = {
  'claude-haiku-4-5': {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    pricePerMTokenInput: 0.8,
    pricePerMTokenOutput: 4.0,
    minTemperature: 0,
    maxTemperature: 1,
    defaultTemperature: 0.3
  },

  'claude-sonnet-4.5': {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    pricePerMTokenInput: 3.0,
    pricePerMTokenOutput: 15.0,
    minTemperature: 0,
    maxTemperature: 1,
    defaultTemperature: 0.7
  }
};
