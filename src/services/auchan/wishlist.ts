import { AuchanClient, type AuchanProduct } from './client.js';

// Catégories fixes découvertes par reverse engineering
const WISHLIST_CATEGORIES = ['n01', 'n03', 'n05', 'n06', 'n08', 'n10', 'n13', 'n1203'];

const ACTIVE_CONTEXTS = 'GROCERY--c37b5c6c-e257-4a77-8592-ebeb0d129e88__SHIPPING%2CONLINE%2CSTORE--6f197f03-dd72-43bf-b120-1b3edc46bd57__PICK_UP';

export async function getFavoriteProducts(client: AuchanClient): Promise<AuchanProduct[]> {
  const results = await Promise.all(
    WISHLIST_CATEGORIES.map(cat => fetchCategory(client, cat))
  );
  return results.flat();
}

async function fetchCategory(client: AuchanClient, categoryId: string): Promise<AuchanProduct[]> {
  const path = `/wishlist/ajax/category/${categoryId}?activeContexts=${ACTIVE_CONTEXTS}&newFav=true`;
  const $ = await client.getHtml(path, {
    accept: 'application/crest',
    'x-crest-renderer': 'wishlist-renderer',
    'x-requested-with': 'XMLHttpRequest',
  });

  const products: AuchanProduct[] = [];
  const seen = new Set<string>();

  $('[data-offer-id]').each((_, el) => {
    const productId = $(el).attr('data-product-id') ?? '';
    if (!productId || seen.has(productId)) return;
    seen.add(productId);

    const article = $(el).closest('article');
    const name = article.find('[class*="description"] strong').text().trim() + ' '
      + article.find('[class*="description"]').contents().filter((_, n) => n.type === 'text').text().trim();

    products.push({
      productId,
      offerId: $(el).attr('data-offer-id') ?? '',
      sellerId: $(el).attr('data-seller-id') ?? client.defaultSellerId,
      sellerType: $(el).attr('data-seller-type') ?? 'GROCERY',
      name: name.trim() || undefined,
      slug: article.find('a[href*="/pr-"]').attr('href'),
    });
  });

  return products;
}
