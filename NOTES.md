# Price Finder — Notes de conception

## Objectif
Trouver automatiquement le prix le moins cher pour un article donné, livrable en France.

## Approches envisagées

### 1. APIs de comparateurs (idéal)
- Google Shopping API — restrictive / payante
- PriceAPI.com, Pricerunner, Kelkoo — agrégateurs avec accès programmatique
- ✅ fiable  ❌ coût, couverture limitée

### 2. Web scraping ciblé
- Amazon.fr, Fnac, Cdiscount, Darty, Boulanger, Leclerc...
- Playwright/Puppeteer (JS) ou Cheerio (HTML statique)
- ✅ gratuit  ❌ fragile, anti-bot, maintenance

### 3. Google Shopping via scraping
- Large couverture
- ❌ risque de blocage, conditions grises

### 4. SerpAPI / ScraperAPI (MVP recommandé)
- API qui gère le scraping Google Shopping
- SerpAPI : endpoint Google Shopping dédié, ~$50/mois
- ✅ pragmatique, rapide à implémenter

## Stack MVP envisagée
```
Input: nom de l'article
  ↓
SerpAPI → Google Shopping → liste marchands + prix
  ↓
Filtre: livraison France disponible
  ↓
Output: tableau trié par prix total (article + livraison)
```

## Questions ouvertes (à définir avec Jeremy)
- [ ] Type d'articles ciblés ? (élec, mode, tout ?)
- [ ] Budget API ? (gratuit vs payant)
- [ ] Format de l'outil ? (CLI, web app, API)
- [ ] One-shot ou suivi de prix dans le temps (alertes) ?
