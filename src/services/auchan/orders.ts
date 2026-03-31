import { AuchanClient, type AuchanProduct } from './client.js';

export interface Order {
  orderId: string;
  subId: string;
  date?: string;
  total?: string;
  productCount?: number;
}

export interface OrderDetail extends Order {
  items: Array<AuchanProduct & { quantity?: string }>;
}

export async function getOrders(client: AuchanClient): Promise<Order[]> {
  const $ = await client.getHtml('/client/mes-commandes');
  const orders: Order[] = [];
  const seen = new Set<string>();

  $('a[href*="/client/mes-commandes/AROM-"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const match = href.match(/\/client\/mes-commandes\/(AROM-[\d]+)\/([\d]+)/);
    if (!match || seen.has(match[1])) return;
    seen.add(match[1]);
    orders.push({ orderId: match[1], subId: match[2] });
  });

  return orders;
}

export async function getOrderDetail(client: AuchanClient, orderId: string, subId: string): Promise<OrderDetail> {
  const $ = await client.getHtml(`/client/mes-commandes/${orderId}/${subId}`);
  const items: Array<AuchanProduct & { quantity?: string }> = [];
  const seen = new Set<string>();

  $('[data-product-id]').each((_, el) => {
    const productId = $(el).attr('data-product-id') ?? '';
    if (!productId || seen.has(productId)) return;
    seen.add(productId);

    const container = $(el).closest('article, li, tr, [class*="entry"], [class*="product"]');
    const name = container.find('[class*="description"] strong').text().trim() + ' '
      + container.find('[class*="description"]').contents().filter((_, n) => n.type === 'text').text().trim();
    const quantity = container.find('[class*="quantity"]').first().text().trim() || undefined;

    items.push({
      productId,
      offerId: $(el).attr('data-offer-id') ?? '',
      sellerId: $(el).attr('data-seller-id') ?? client.defaultSellerId,
      sellerType: $(el).attr('data-seller-type') ?? 'GROCERY',
      name: name.trim() || undefined,
      quantity,
    });
  });

  return { orderId, subId, items };
}
