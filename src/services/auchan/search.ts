import { AuchanClient, type AuchanProduct } from './client.js';

const CNSTRC_KEY = 'key_WvtcKl3wWnoLo5Yo';
const CNSTRC_BASE = 'https://ac.cnstrc.com';

export interface SearchResult {
  slug: string;
  legacyId: string;
  name: string;
}

export async function searchProducts(query: string, pageSize = 5): Promise<SearchResult[]> {
  const url = `${CNSTRC_BASE}/search/${encodeURIComponent(query)}?key=${CNSTRC_KEY}&num_results_per_page=${pageSize}`;
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0' },
  });
  const data = await res.json() as { response?: { results?: Array<{ value: string; data: { id: string; url: string } }> } };
  const results = data?.response?.results ?? [];
  return results.map(r => ({
    name: r.value,
    legacyId: r.data.id,
    slug: r.data.url.replace('https://www.auchan.fr', ''),
  }));
}

export async function resolveProduct(client: AuchanClient, slug: string): Promise<AuchanProduct | null> {
  const $ = await client.getHtml(slug);
  const el = $('[data-offer-id]').first();
  if (!el.length) return null;
  return {
    productId: el.attr('data-product-id') ?? '',
    offerId: el.attr('data-offer-id') ?? '',
    sellerId: el.attr('data-seller-id') ?? client.defaultSellerId,
    sellerType: el.attr('data-seller-type') ?? 'GROCERY',
    slug,
  };
}

export async function findProduct(client: AuchanClient, query: string): Promise<AuchanProduct | null> {
  const results = await searchProducts(query, 3);
  if (!results.length) return null;
  return resolveProduct(client, results[0].slug);
}
