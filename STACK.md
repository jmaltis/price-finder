# Stack & outils — comparaison et choix

## Comparaison des services de scraping

### Services évalués

| | **Bright Data** | **Apify** | **ScraperAPI** | **Firecrawl** | **ScrapeGraphAI** | **Playwright natif** |
|---|---|---|---|---|---|---|
| Free tier | 5 000 req/mois | 5$/mois crédits | 1 000 req/mois | 500 pages/mois | OSS gratuit | Gratuit |
| Entrée payante | ~1.5$/1K req | 49$/mo | 29$/mo | 16$/mo (scrape) 89$/mo (extract) | 19$/mo cloud | Infra serveur |
| Extraction structurée | 120+ sites natifs | 6 000+ Actors (CMS auto-detect) | Non | Oui (schéma JSON) | Oui (langage naturel) | Non (DIY) |
| Anti-bot | Best-in-class (99.9%) | Bon | Bon | Basique | Dépend du provider | Fragile (course aux armements) |
| MCP server | Oui | Oui | Non | Oui | Oui | Oui (Microsoft) |
| IA intégrée | Oui (web_data_*) | Oui (détection CMS) | Non | Oui | Oui (cœur) | Non |
| Force | Ne se fait jamais bloquer | Diversité des scrapers | Simple et cheap | Clean markdown | Budget | Contrôle total |
| Faiblesse | Prix à l'échelle | Moins robuste anti-bot | Pas d'IA | Cher pour extract | Cher à l'échelle | Maintenance++ |

### Choix retenus

**Bright Data** — service principal
- Recherche Google (SERP API)
- Scraping des pages (Web Unlocker)
- Extraction structurée pour les gros sites (Amazon, Fnac, Cdiscount...)
- Anti-bot best-in-class
- Free tier généreux pour le proto

**Apify** — extraction e-commerce intelligente
- E-Commerce Scraper avec détection auto de CMS
- Couvre Shopify, WooCommerce, Magento, PrestaShop, BigCommerce
- Idéal pour les petits sites e-commerce
- Complète Bright Data là où il n'a pas de parser natif

**Claude API** — fallback LLM
- Pour les pages ni reconnues par Bright Data ni par Apify
- Extraction structurée via prompt

### Services écartés

| Service | Raison |
|---|---|
| Firecrawl | Trop cher pour l'extraction (89$/mo minimum) |
| ScrapeGraphAI | Pas d'anti-bot propre, cher à l'échelle |
| ScraperAPI | Pas d'IA intégrée, on devrait tout faire nous-même |
| Playwright natif | Anti-bot fragile, maintenance élevée, gardé en dernier recours |

## Stack technique

| Composant | Choix | Raison |
|---|---|---|
| Runtime | Node.js + TypeScript | Cohérence avec projets existants |
| Search | Bright Data SERP API | Google FR, anti-bot, free tier |
| Scraping gros sites | Bright Data web_data_* | JSON structuré natif |
| Scraping e-commerce | Apify E-Commerce Scraper | Détection auto CMS |
| Extraction fallback | Claude API (Haiku pour le coût) | Flexible, gère tout |
| DB | SQLite + Drizzle ORM | Simple, local, pas de serveur |
| Scheduler | node-cron | Léger, intégré |
| Alertes | Email + webhook | Customizable |

## Prototypage MCP

Pour le proto, on utilise les MCP servers directement depuis Claude Code :
- `brightdata-mcp` — search + scrape
- `apify-mcp-server` — e-commerce extraction

En prod, on bascule sur les APIs REST (mêmes services derrière).
