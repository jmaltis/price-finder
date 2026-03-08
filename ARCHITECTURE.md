# Architecture

## Flow principal

```
Utilisateur : "Sony WH-1000XM5"
  │
  ▼
┌──────────────────────────────────────────────┐
│  1. SEARCH — Bright Data                     │
│  Recherche Google (gl=fr, hl=fr)             │
│  Récupère les 30 premiers résultats (3 pages)│
│  → liste d'URLs + snippets                   │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│  2. SCRAPE + EXTRACT — stratégie en escalade │
│                                              │
│  Pour chaque URL :                           │
│                                              │
│  Pass 1 : Bright Data web_data_*             │
│  → Si site connu (Amazon, Fnac, Cdiscount)   │
│  → JSON structuré direct, zéro LLM           │
│                                              │
│  Pass 2 : Apify E-Commerce Scraper           │
│  → Détection auto du CMS                     │
│  → Shopify, WooCommerce, Magento, Presta...  │
│  → Extraction structurée native, zéro LLM    │
│                                              │
│  Pass 3 : Scrape HTML + extraction locale    │
│  → JSON-LD / schema.org → parsing Node.js    │
│  → Meta tags OG → parsing Node.js            │
│  → Heuristiques DOM (zones "price/product")  │
│  → Zéro LLM, zéro coût                      │
│                                              │
│  Pass 4 : LLM (dernier recours)              │
│  → HTML tronqué (section produit seule)      │
│  → ~1-2K tokens max envoyés à Claude Haiku   │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│  3. AGGREGATE                                │
│  Dédoublonne, normalise les prix (€ TTC)     │
│  Trie par prix total (article + livraison)   │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│  4. STORE — SQLite                           │
│  Tables : products, prices, merchants, alerts│
│  Historique complet de chaque relevé         │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│  5. SCHEDULE — node-cron                     │
│  Relevé automatique selon fréquence choisie  │
│  (ex: toutes les 6h)                         │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│  6. ALERT                                    │
│  Si prix < seuil défini par l'utilisateur    │
│  → Email + webhook                           │
└──────────────────────────────────────────────┘
```

## Stratégie d'extraction en escalade (détail)

Principe : **ne jamais envoyer de tokens LLM si on peut l'éviter.**
Chaque pass est moins cher que le suivant. On s'arrête dès qu'on a le prix.

### Pass 1 — Bright Data structured data (0 token LLM)

Sites supportés nativement : Amazon, Google Shopping, Walmart, eBay...
Retourne directement du JSON avec prix, titre, images, ratings, dispo.

→ Coût : 1 requête Bright Data
→ Couverture estimée : ~30% des URLs (gros marchands)

### Pass 2 — Apify E-Commerce Scraper (0 token LLM)

Détecte automatiquement 6+ systèmes de boutique :
- Shopify
- WooCommerce
- Magento
- PrestaShop
- BigCommerce
- Custom (heuristiques)

Extrait : nom, prix, variantes (taille, couleur...), dispo, images.

→ Coût : 1 requête Apify
→ Couverture estimée : ~40% des URLs restantes

### Pass 3 — Extraction locale depuis le HTML (0 token LLM, 0 coût API)

Avant d'appeler un LLM, on parse le HTML brut côté Node.js :

**Étape 3a — JSON-LD / schema.org**
```html
<!-- Beaucoup de sites e-commerce incluent ça pour le SEO -->
<script type="application/ld+json">
{
  "@type": "Product",
  "name": "Sony WH-1000XM5",
  "offers": {
    "price": "279.99",
    "priceCurrency": "EUR",
    "availability": "InStock"
  }
}
</script>
```
→ Parsing JSON natif, trivial, 0 coût

**Étape 3b — Meta tags Open Graph / product**
```html
<meta property="og:title" content="Sony WH-1000XM5">
<meta property="product:price:amount" content="279.99">
<meta property="product:price:currency" content="EUR">
<meta property="product:availability" content="instock">
```
→ Parsing HTML simple (cheerio), 0 coût

**Étape 3c — Heuristiques DOM**
Chercher dans le HTML les zones contenant des prix :
- Sélecteurs courants : `[class*="price"]`, `[class*="product"]`, `[itemprop="price"]`
- Regex prix : `/\d+[.,]\d{2}\s*€/`
- Proximité avec des boutons "Ajouter au panier"

→ Parsing HTML (cheerio), 0 coût
→ Couverture estimée : ~70-80% des URLs restantes

### Pass 4 — LLM extraction (dernier recours)

Seulement pour les ~5-10% de pages où rien d'autre n'a marché.

**Optimisation des tokens :**

| Approche | Tokens input | Coût/page (Haiku) |
|---|---|---|
| HTML brut complet | ~300K | ~0.08$ |
| Markdown nettoyé complet | ~10K | ~0.003$ |
| **Section produit extraite** | **~1-2K** | **~0.0005$** |

On n'envoie PAS toute la page. Avant d'appeler le LLM :
1. Supprimer : `<nav>`, `<footer>`, `<header>`, `<script>`, `<style>`, `<aside>`
2. Garder uniquement la zone "main" ou "product"
3. Si trop gros, tronquer à ~2K tokens

Prompt :
```
Extrais les informations produit de ce contenu HTML :
- Nom du produit
- Prix (€ TTC)
- Variantes disponibles (taille, couleur...) avec prix de chaque
- Disponibilité / stock
- Frais de livraison
- Nom du marchand

Retourne en JSON strict.
```

→ Coût : ~0.0005$/page avec Haiku
→ Utilisé pour : ~5-10% des pages seulement

## Résumé de la couverture estimée

```
100% des URLs
  │
  ├── 30% → Pass 1 (Bright Data structured)     → 0 token LLM
  ├── 28% → Pass 2 (Apify CMS detection)        → 0 token LLM
  ├── 35% → Pass 3 (JSON-LD / meta / DOM local)  → 0 token LLM
  └──  7% → Pass 4 (LLM Haiku, ~1-2K tokens)     → ~0.0005$/page
```

**~93% des extractions se font sans aucun appel LLM.**

## Estimation de coûts (10 articles suivis, relevé toutes les 6h)

| Composant | Requêtes/mois | Coût estimé |
|---|---|---|
| Bright Data search | 120 | Free tier (5 000/mois) |
| Bright Data scrape/structured | ~1 200 | Free tier |
| Apify extraction | ~400 | ~3$/mois |
| Claude Haiku (pass 4, ~7% des pages) | ~80 pages × 2K tokens | ~0.04$/mois |
| **Total** | | **~3$/mois** |

## Schéma DB (SQLite)

```sql
-- Produits suivis par l'utilisateur
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  search_query TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Marchands trouvés
CREATE TABLE merchants (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  cms_type TEXT  -- shopify, woocommerce, magento, etc.
);

-- Historique des prix
CREATE TABLE prices (
  id INTEGER PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  merchant_id INTEGER REFERENCES merchants(id),
  price REAL NOT NULL,          -- prix en euros TTC
  shipping_cost REAL,           -- frais de port (null = inconnu)
  currency TEXT DEFAULT 'EUR',
  in_stock BOOLEAN,
  variant TEXT,                 -- ex: "Noir / 256GB"
  source_url TEXT NOT NULL,
  extraction_method TEXT,       -- 'bright_data' | 'apify' | 'json_ld' | 'meta_og' | 'dom' | 'llm'
  scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alertes configurées
CREATE TABLE alerts (
  id INTEGER PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  type TEXT NOT NULL,           -- 'absolute' | 'relative'
  threshold REAL NOT NULL,      -- ex: 300.00 ou 0.10 (10%)
  channel TEXT NOT NULL,        -- 'email' | 'webhook'
  channel_target TEXT NOT NULL, -- adresse email ou URL webhook
  enabled BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
