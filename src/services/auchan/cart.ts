import { AuchanClient, type AuchanProduct } from './client.js';

export interface CartItem {
  productId: string;
  offerId: string;
  sellerId?: string;
  sellerType?: string;
  name?: string;
  quantity: number;
  price?: number;
}

export interface CartState {
  id: string;
  items: CartItem[];
  totalPrice?: number;
}

export async function getCart(client: AuchanClient): Promise<CartState> {
  const session = client.getSession();
  if (!session) throw new Error('Non authentifié');
  const data = await client.getJson(`/cart?consentId=${session.consentId}`) as {
    cart?: { cart?: { id: string; items: Array<{ productId: string; offerId: string; desiredQuantity: number; sellerId?: string; sellerType?: string; seller?: { id: string; type: string }; offering?: { prices?: { totalPrice?: { amount: number } } } }> } };
  };
  const cart = data?.cart?.cart;
  return {
    id: cart?.id ?? session.cartId,
    items: (cart?.items ?? []).map(i => ({
      productId: i.productId,
      offerId: i.offerId,
      sellerId: i.sellerId || i.seller?.id,
      sellerType: i.sellerType || i.seller?.type,
      quantity: i.desiredQuantity,
      price: i.offering?.prices?.totalPrice?.amount,
    })),
  };
}

export async function clearCart(client: AuchanClient): Promise<CartState> {
  const session = client.getSession();
  if (!session) throw new Error('Non authentifié');
  
  const currentCart = await getCart(client);
  if (currentCart.items.length === 0) return currentCart;

  const res = await client.post('/cart/update', {
    cartId: session.cartId,
    consentId: session.consentId,
    reservationId: null,
    mbaAvailabilityNeeded: true,
    items: currentCart.items.map(item => ({
      productId: item.productId,
      offerId: item.offerId,
      sellerId: item.sellerId || client.defaultSellerId,
      sellerType: item.sellerType || 'VENDU_PAR_AUCHAN',
      desiredQuantity: 0,
      desiredType: 'DEFAULT',
    })),
  });

  if (!res.ok) {
    const err = await res.json() as { error?: string };
    throw new Error(`Erreur clear panier: ${err?.error ?? res.status}`);
  }
  
  // Mettre à jour le cartId en session si nécessaire (comme dans addToCart)
  const data = await res.json() as { cart?: { cart?: { id: string; items: CartItem[] } } };
  const updatedCart = data?.cart?.cart;
  if (updatedCart?.id && updatedCart.id !== session.cartId) {
    session.cartId = updatedCart.id;
  }

  return await getCart(client);
}

export async function addToCart(client: AuchanClient, product: AuchanProduct, quantity = 1): Promise<CartState> {
  const session = client.getSession();
  if (!session) throw new Error('Non authentifié');

  const res = await client.post('/cart/update', {
    cartId: session.cartId,
    consentId: session.consentId,
    reservationId: null,
    mbaAvailabilityNeeded: true,
    items: [{
      productId: product.productId,
      offerId: product.offerId,
      sellerType: product.sellerType,
      sellerId: product.sellerId,
      desiredQuantity: quantity,
      desiredType: 'DEFAULT',
    }],
  });

  if (!res.ok) {
    const err = await res.json() as { error?: string };
    throw new Error(`Erreur ajout panier: ${err?.error ?? res.status}`);
  }

  const data = await res.json() as { cart?: { cart?: { id: string; items: CartItem[] } } };
  const cart = data?.cart?.cart;

  // Mettre à jour le cartId en session si nécessaire
  if (cart?.id && cart.id !== session.cartId) {
    session.cartId = cart.id;
  }

  return await getCart(client);
}

export async function updateCartItemQuantity(client: AuchanClient, productId: string, offerId: string, quantity: number): Promise<CartState> {
  const session = client.getSession();
  if (!session) throw new Error('Non authentifié');

  const currentCart = await getCart(client);
  const item = currentCart.items.find(i => i.productId === productId && i.offerId === offerId);

  const res = await client.post('/cart/update', {
    cartId: session.cartId,
    consentId: session.consentId,
    reservationId: null,
    mbaAvailabilityNeeded: true,
    items: [{
      productId,
      offerId,
      sellerType: item?.sellerType || 'VENDU_PAR_AUCHAN',
      sellerId: item?.sellerId || client.defaultSellerId,
      desiredQuantity: quantity,
      desiredType: 'DEFAULT',
    }],
  });

  if (!res.ok) {
    const err = await res.json() as { error?: string };
    throw new Error(`Erreur maj quantité panier: ${err?.error ?? res.status}`);
  }

  const data = await res.json() as { cart?: { cart?: { id: string } } };
  const updatedCart = data?.cart?.cart;
  if (updatedCart?.id && updatedCart.id !== session.cartId) {
    session.cartId = updatedCart.id;
  }

  return await getCart(client);
}
