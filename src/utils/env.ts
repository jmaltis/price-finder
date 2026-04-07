import 'dotenv/config';

export interface EnvConfig {
  brightDataApiToken: string;
  apifyToken: string;
  anthropicApiKey: string;
  browserUseApiKey?: string;
  openaiApiKey?: string;
  openrouterApiKey?: string;
}

const ENV_VAR_MAPPING: Record<keyof EnvConfig, string> = {
  brightDataApiToken: 'BRIGHT_DATA_API_TOKEN',
  apifyToken: 'APIFY_TOKEN',
  anthropicApiKey: 'ANTHROPIC_API_KEY',
  browserUseApiKey: 'BROWSER_USE_API_KEY',
  openaiApiKey: 'OPENAI_API_KEY',
  openrouterApiKey: 'OPENROUTER_API_KEY'
};

export const ENV_REQUIREMENTS = {
  search: ['brightDataApiToken'] as (keyof EnvConfig)[],
  apify: ['apifyToken'] as (keyof EnvConfig)[],
  llm: ['anthropicApiKey'] as (keyof EnvConfig)[],
  all: ['brightDataApiToken', 'apifyToken', 'anthropicApiKey'] as (keyof EnvConfig)[]
};

export function getEnv(varName: keyof EnvConfig): string {
  const envVarName = ENV_VAR_MAPPING[varName];
  const value = process.env[envVarName];
  if (!value) {
    throw new Error(`Variable d'environnement requise: ${envVarName}`);
  }
  return value;
}

export function getEnvOptional(varName: keyof EnvConfig, defaultValue = ''): string {
  const envVarName = ENV_VAR_MAPPING[varName];
  return process.env[envVarName] || defaultValue;
}

export function validateEnv(varNames: (keyof EnvConfig)[]): void {
  const missing: string[] = [];

  for (const varName of varNames) {
    const envVarName = ENV_VAR_MAPPING[varName];
    if (!process.env[envVarName]) {
      missing.push(envVarName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes: ${missing.join(', ')}\n` +
        'Vérifiez votre fichier .env'
    );
  }
}
