import path from 'node:path';
import { getEnvOptional } from '../utils/env.js';

export const DEFAULT_LEAD_CITY = 'Lyon';
export const INTERNAL_PRODUCT_NAME = 'Signal Canvas';
export const FOOD_BATCH_QUERIES = [
  'restaurants lyon',
  'cafes lyon',
  'boulangeries lyon',
  'brunch lyon',
  'patisseries lyon',
  'bars a tapas lyon'
];

export const QUALIFICATION_THRESHOLDS = {
  minRating: 4.4,
  minReviewCount: 40
};

export const SOCIAL_DOMAINS = [
  'facebook.com',
  'instagram.com',
  'x.com',
  'twitter.com',
  'tiktok.com',
  'youtube.com',
  'youtu.be',
  'linktr.ee'
];

export const COMMON_WEBMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'live.fr',
  'yahoo.com',
  'yahoo.fr',
  'icloud.com',
  'me.com',
  'proton.me',
  'protonmail.com',
  'laposte.net',
  'orange.fr',
  'wanadoo.fr',
  'free.fr',
  'sfr.fr'
];

export const PLACEHOLDER_EMAIL_DOMAINS = [
  'domain.com',
  'example.com',
  'example.fr',
  'test.com',
  'yourdomain.com',
  'aaa.com'
];

export const NON_WEBSITE_HOSTS = [
  'google.com',
  'googleusercontent.com',
  'g.page',
  'goo.gl',
  'facebook.com',
  'instagram.com',
  'x.com',
  'twitter.com',
  'tiktok.com',
  'youtube.com',
  'youtu.be',
  'linktr.ee',
  'pagesjaunes.fr',
  'pappers.fr',
  'societe.com',
  'tripadvisor.com',
  'thefork.fr',
  'ubereats.com',
  'deliveroo.fr',
  'privateaser.com',
  'restaurantguru.com',
  'petitfute.com',
  'mapstr.com'
];

export const CHAIN_KEYWORDS = [
  'mcdonald',
  'burger king',
  'starbucks',
  'subway',
  'pizza hut',
  'domino',
  'domino’s',
  'kfc',
  'paul',
  'brioche dorée',
  'brioche doree',
  'pret a manger',
  'pokawa',
  'sushi shop',
  'o tacos'
];

export function getLeadDataRoot(): string {
  return path.resolve(process.cwd(), 'data/lead-finder');
}

export function getPreviewOutputRoot(): string {
  const configured = getEnvOptional('leadPreviewOutputDir');
  if (configured) return path.resolve(configured);
  return path.resolve(getLeadDataRoot(), 'previews');
}
