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
│  → JSON structuré direct, pas de LLM         │
│                                              │
│  Pass 2 : Apify E-Commerce Scraper           │
│  → Détection auto du CMS                     │
│  → Shopify, WooCommerce, Magento, Presta...  │
│  → Extraction structurée native              │
│                                              │
│  Pass 3 : Bright Data scrape_as_markdown     │
│           + Claude API extraction             │
│  → Pour les sites non reconnus               │
│  → LLM extrait : prix, variantes, dispo      │
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

L'idée : ne dépenser des tokens LLM que quand c'est nécessaire.

### Pass 1 — Bright Data structured data (gratuit en tokens LLM)
Sites supportés nativement : Amazon, Google Shopping, Walmart, eBay...
Retourne directement du JSON avec prix, titre, images, ratings, dispo.
→ Coût : 1 requête Bright Data

### Pass 2 — Apify E-Commerce Scraper (gratuit en tokens LLM)
Détecte automatiquement 6+ systèmes de boutique :
- Shopify
- WooCommerce
- Magento
- PrestaShop
- BigCommerce
- Custom (heuristiques)

Extrait : nom, prix, variantes (taille, couleur...), dispo, images.
→ Coût : 1 requête Apify

### Pass 3 — LLM extraction (fallback)
Pour les sites ni reconnus par Bright Data ni par Apify :
1. Bright Data `scrape_as_markdown` → contenu propre
2. Claude API → extraction structurée via prompt

Prompt type :
```
Extrais les informations produit de cette page :
- Nom du produit
- Prix (en euros TTC)
- Variantes disponibles (taille, couleur, etc.) avec prix de chaque
- Disponibilité / stock
- Frais de livraison
- Nom du marchand

Retourne en JSON.
```
→ Coût : 1 requête Bright Data + tokens Claude

## Estimation de coûts (10 articles suivis, relevé toutes les 6h)

| Composant | Requêtes/mois | Coût estimé |
|---|---|---|
| Bright Data search | 120 (10 × 4/jour × 30j) | Free tier (5 000/mois) |
| Bright Data scrape | ~1 200 (10 URLs par search) | Free tier |
| Apify extraction | ~600 (50% des URLs) | ~5$/mois en crédits |
| Claude API (pass 3) | ~200 (sites non reconnus) | ~2$/mois |
| **Total** | | **~7$/mois** |
