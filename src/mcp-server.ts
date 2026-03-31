import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { AuchanClient } from './services/auchan/client.js';
import { login } from './services/auchan/auth.js';
import { findProduct, searchProducts } from './services/auchan/search.js';
import { addToCart, getCart, clearCart, updateCartItemQuantity } from './services/auchan/cart.js';
import { getFavoriteProducts } from './services/auchan/wishlist.js';
import { getOrderDetail, getOrders } from './services/auchan/orders.js';

const email = process.env['AUCHAN_EMAIL'];
const password = process.env['AUCHAN_PASSWORD'];
if (!email || !password) {
  throw new Error('AUCHAN_EMAIL et AUCHAN_PASSWORD requis dans .env');
}

const client = new AuchanClient(email, password);
const server = new McpServer({ name: 'auchan', version: '1.0.0' });

async function ensureAuth(): Promise<void> {
  if (!client.getSession()) {
    await login(client, email!, password!);
  }
}

server.registerTool('search_products', {
  description: 'Recherche des produits Auchan par nom',
  inputSchema: {
    query: z.string().describe('Nom du produit à rechercher'),
    limit: z.number().optional().default(5).describe('Nombre de résultats'),
  },
}, async ({ query, limit }) => {
  const results = await searchProducts(query, limit);
  return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
});

server.registerTool('find_product', {
  description: 'Trouve un produit et retourne ses IDs pour l\'ajout au panier',
  inputSchema: { query: z.string().describe('Nom du produit') },
}, async ({ query }) => {
  await ensureAuth();
  const product = await findProduct(client, query);
  if (!product) return { content: [{ type: 'text', text: `Produit "${query}" non trouvé` }] };
  return { content: [{ type: 'text', text: JSON.stringify(product, null, 2) }] };
});

server.registerTool('add_to_cart', {
  description: 'Recherche un produit par nom et l\'ajoute au panier Auchan',
  inputSchema: {
    query: z.string().describe('Nom du produit à ajouter'),
    quantity: z.number().optional().default(1).describe('Quantité'),
  },
}, async ({ query, quantity }) => {
  await ensureAuth();
  const product = await findProduct(client, query);
  if (!product) return { content: [{ type: 'text', text: `Produit "${query}" non trouvé` }] };
  const cart = await addToCart(client, product, quantity);
  return { content: [{ type: 'text', text: `Ajouté : "${query}". Panier : ${cart.items.length} articles` }] };
});

server.registerTool('get_cart', {
  description: 'Affiche le contenu du panier actuel',
}, async () => {
  await ensureAuth();
  const cart = await getCart(client);
  return { content: [{ type: 'text', text: JSON.stringify(cart, null, 2) }] };
});

server.registerTool('clear_cart', {
  description: 'Vide intégralement le panier Auchan',
}, async () => {
  await ensureAuth();
  const cart = await clearCart(client);
  return { content: [{ type: 'text', text: `Panier vidé. Panier : ${cart.items.length} articles` }] };
});

server.registerTool('update_cart_item', {
  description: 'Met à jour la quantité d\'un article déjà dans le panier (utiliser 0 pour supprimer). Utilisez get_cart pour trouver productId et offerId.',
  inputSchema: {
    productId: z.string().describe('ID du produit'),
    offerId: z.string().describe('ID de l\'offre'),
    quantity: z.number().describe('Nouvelle quantité (0 pour supprimer)'),
  },
}, async ({ productId, offerId, quantity }) => {
  await ensureAuth();
  const cart = await updateCartItemQuantity(client, productId, offerId, quantity);
  return { content: [{ type: 'text', text: `Quantité mise à jour. Panier : ${cart.items.length} articles` }] };
});

server.registerTool('get_favorite_products', {
  description: 'Récupère tous les produits depuis "Mes produits préférés" Auchan',
}, async () => {
  await ensureAuth();
  const products = await getFavoriteProducts(client);
  return { content: [{ type: 'text', text: JSON.stringify(products, null, 2) }] };
});

server.registerTool('get_order_history', {
  description: 'Liste les dernières commandes Auchan avec leurs IDs',
}, async () => {
  await ensureAuth();
  const orders = await getOrders(client);
  return { content: [{ type: 'text', text: JSON.stringify(orders, null, 2) }] };
});

server.registerTool('get_order_detail', {
  description: 'Détail d\'une commande avec tous les produits achetés (nom, quantité, IDs)',
  inputSchema: {
    orderId: z.string().describe('ID commande ex: AROM-757708550'),
    subId: z.string().describe('Sous-ID ex: 365749742'),
  },
}, async ({ orderId, subId }) => {
  await ensureAuth();
  const detail = await getOrderDetail(client, orderId, subId);
  return { content: [{ type: 'text', text: JSON.stringify(detail, null, 2) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
