import type { SearchResult } from '../types/pipeline.js';
import { logger } from '../utils/logger.js';

const BRIGHT_DATA_API_URL = 'https://api.brightdata.com/request';
const UNLOCKER_ZONE = 'mcp_unlocker';

interface BrightDataSearchResult {
  organic?: Array<{
    title?: string;
    link?: string;
    description?: string;
  }>;
}

async function fetchPage(
  searchQuery: string,
  page: number,
  apiToken: string
): Promise<SearchResult[]> {
  const start = page * 10;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&gl=fr&start=${start}&brd_json=1`;

  const response = await fetch(BRIGHT_DATA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`
    },
    body: JSON.stringify({
      zone: UNLOCKER_ZONE,
      url: googleUrl,
      format: 'raw',
      data_format: 'parsed_light'
    })
  });

  if (!response.ok) {
    throw new Error(`Bright Data search failed (page ${page}): ${response.status} ${response.statusText}`);
  }

  const raw = await response.text();
  let data: BrightDataSearchResult;
  try {
    data = JSON.parse(raw) as BrightDataSearchResult;
  } catch {
    logger.warn(`Page ${page + 1}: réponse non-JSON, ignorée`);
    return [];
  }

  return (data.organic ?? [])
    .filter(r => r.link && r.title)
    .map(r => ({
      title: r.title ?? '',
      url: r.link ?? '',
      description: r.description ?? ''
    }));
}

const EXCLUDED_DOMAINS = new Set([
  'youtube.com', 'youtu.be',
  'facebook.com', 'fb.com',
  'twitter.com', 'x.com',
  'instagram.com',
  'tiktok.com',
  'reddit.com',
  'wikipedia.org',
  'pinterest.com',
  'linkedin.com',
]);

function isEcommerceUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return !EXCLUDED_DOMAINS.has(hostname);
  } catch {
    return false;
  }
}

export async function searchGoogle(
  query: string,
  apiToken: string,
  pages: number = 3
): Promise<SearchResult[]> {
  const searchQuery = `${query} prix acheter`;

  logger.info(`🔍 Recherche Google: "${searchQuery}" (gl=fr, ${pages} pages)`);

  // Lancer les 3 pages en parallèle
  const pagePromises = Array.from({ length: pages }, (_, i) =>
    fetchPage(searchQuery, i, apiToken)
  );
  const pageResults = await Promise.allSettled(pagePromises);

  const results: SearchResult[] = [];
  const seen = new Set<string>();

  for (const pageResult of pageResults) {
    if (pageResult.status !== 'fulfilled') continue;
    for (const r of pageResult.value) {
      if (!seen.has(r.url) && isEcommerceUrl(r.url)) {
        seen.add(r.url);
        results.push(r);
      }
    }
  }

  logger.success(`${results.length} résultats trouvés`);
  return results;
}
