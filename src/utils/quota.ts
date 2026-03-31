import { logger } from './logger.js';

interface APIError {
  status?: number;
  statusCode?: number;
  code?: string;
  message?: string;
  error?: {
    type?: string;
  };
  body?: {
    error?: string;
    detail?: string | { status?: string; message?: string };
  };
}

export function isQuotaError(error: unknown): boolean {
  const err = error as APIError;
  const statusCode = err.status || err.statusCode;
  const bodyDetail = err.body?.detail;
  const errorMessage =
    err.message || err.body?.error || (typeof bodyDetail === 'string' ? bodyDetail : '') || '';

  if (statusCode === 402 || statusCode === 429) return true;
  if (err.error?.type === 'rate_limit_error') return true;
  if (err.code === 'insufficient_quota') return true;
  if (
    errorMessage.toLowerCase().includes('quota') ||
    errorMessage.toLowerCase().includes('rate limit')
  ) {
    return true;
  }

  return false;
}

export function handleQuotaError(
  error: unknown,
  serviceName: string,
  provider: string,
  model?: string
): never {
  const err = error as APIError;
  const errorMessage = err.message || err.body?.error || err.body?.detail || 'Erreur inconnue';

  logger.error(`❌ QUOTA ${serviceName.toUpperCase()} DÉPASSÉ (${provider})`);
  if (model) logger.error(`Modèle: ${model}`);

  throw new Error(`Quota ${serviceName} dépassé (${provider}): ${errorMessage}`);
}
