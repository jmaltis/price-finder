import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NON_WEBSITE_HOSTS, SOCIAL_DOMAINS } from './config.js';

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function toAbsoluteIfRelative(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

export function hashId(parts: Array<string | null | undefined>): string {
  const stable = parts.map(part => normalizeWhitespace(part ?? '').toLowerCase()).join('|');
  return crypto.createHash('sha1').update(stable).digest('hex').slice(0, 12);
}

export function getDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

export function normalizeUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    if (parsed.pathname === '/') parsed.pathname = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function isSocialUrl(url: string | null): boolean {
  const domain = getDomain(url);
  return domain ? SOCIAL_DOMAINS.some(candidate => domain === candidate || domain.endsWith(`.${candidate}`)) : false;
}

export function isLikelyBusinessWebsite(url: string | null): boolean {
  const domain = getDomain(url);
  if (!domain) return false;
  return !NON_WEBSITE_HOSTS.some(candidate => domain === candidate || domain.endsWith(`.${candidate}`));
}

export function stripGoogleMapsSuffix(title: string): string {
  return normalizeWhitespace(title.replace(/\s*-\s*Google\s*Maps\s*$/i, ''));
}

export function parseRating(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/(\d[.,]\d)/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseReviewCount(text: string): number | null {
  const ratingCountMatch = text.match(/\d[.,]\d\s*\(([\d\s\u202F\u00A0.]*)\)/);
  if (ratingCountMatch) {
    const digits = ratingCountMatch[1].replace(/[^\d]/g, '');
    if (digits) {
      const parsed = Number.parseInt(digits, 10);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  const match =
    text.match(/(\d[\d\s\u202F\u00A0.]*)\s*(avis|reviews?)/i) ??
    text.match(/\((\d[\d\s\u202F\u00A0.]*)\)/);

  if (!match) return null;
  const digits = match[1].replace(/[^\d]/g, '');
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function dedupeStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map(value => normalizeWhitespace(value ?? ''))
        .filter(Boolean)
    )
  );
}

export function firstNonEmpty<T>(values: Array<T | null | undefined>): T | null {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function shortBatchId(prefix: string): string {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `${prefix}-${timestamp}`;
}

function sanitizeExtractedEmail(value: string): string | null {
  const trimmed = value.toLowerCase().replace(/[)\],;:!?]+$/g, '');
  const repaired = trimmed.replace(
    /(\.(?:com|fr|net|org|eu|be|ch|io|co|me|app|biz))(?:actuellement|maintenant|today|contact|email)+$/i,
    '$1'
  );
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$/i.test(repaired) ? repaired : null;
}

export function extractEmails(text: string): string[] {
  const normalizedText = text
    .replace(/\s*\[\s*at\s*\]\s*/gi, '@')
    .replace(/\s*\(\s*at\s*\)\s*/gi, '@')
    .replace(/\s+at\s+/gi, '@')
    .replace(/\s*\[\s*dot\s*\]\s*/gi, '.')
    .replace(/\s*\(\s*dot\s*\)\s*/gi, '.')
    .replace(/\s+dot\s+/gi, '.');
  return dedupeStrings(
    Array.from(normalizedText.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}\b/gi))
      .map(match => sanitizeExtractedEmail(match[0]))
      .filter((email): email is string => Boolean(email))
  );
}

export function extractUrls(text: string): string[] {
  return dedupeStrings(
    (text.match(/https?:\/\/[^\s"'<>]+/gi) ?? [])
      .map(url => url.replace(/[)\],;]+$/g, ''))
  );
}

export function extractSocialLinks(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
  return dedupeStrings(matches.filter(url => isSocialUrl(url)));
}

export function toFileHref(filePath: string): string {
  return pathToFileURL(filePath).href;
}

export function resolveFileHrefToPath(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith('file://')) {
    try {
      return fileURLToPath(value);
    } catch {
      return null;
    }
  }
  return path.isAbsolute(value) ? value : null;
}
