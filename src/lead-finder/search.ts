import { logger } from '../utils/logger.js';

const BRIGHT_DATA_API_URL = 'https://api.brightdata.com/request';
const UNLOCKER_ZONE = 'mcp_unlocker';

export interface GenericSearchResult {
  title: string;
  url: string;
  description: string;
}

interface BrightDataSearchResult {
  organic?: Array<{
    title?: string;
    link?: string;
    description?: string;
  }>;
}

async function fetchPage(query: string, page: number, apiToken: string): Promise<GenericSearchResult[]> {
  const start = page * 10;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&gl=fr&hl=fr&start=${start}&brd_json=1`;

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
    throw new Error(`Bright Data search failed: ${response.status} ${response.statusText}`);
  }

  const raw = await response.text();
  const parsed = JSON.parse(raw) as BrightDataSearchResult;

  return (parsed.organic ?? [])
    .filter(result => result.link && result.title)
    .map(result => ({
      title: result.title ?? '',
      url: result.link ?? '',
      description: result.description ?? ''
    }));
}

export async function searchWeb(
  query: string,
  apiToken: string,
  pages: number = 1
): Promise<GenericSearchResult[]> {
  logger.info(`🔎 Recherche web enrichissement: "${query}"`);

  const settled = await Promise.allSettled(
    Array.from({ length: pages }, (_, index) => fetchPage(query, index, apiToken))
  );

  const deduped = new Map<string, GenericSearchResult>();
  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    for (const item of result.value) {
      if (!deduped.has(item.url)) deduped.set(item.url, item);
    }
  }

  return Array.from(deduped.values());
}
