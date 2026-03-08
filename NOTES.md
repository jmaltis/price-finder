# Price Finder — Notes de conception

## Objectif
Trouver automatiquement le prix le moins cher pour un article donné, livrable en France,
et suivre l'évolution du prix dans le temps (alertes si baisse).

## Décisions de scope

| Question | Décision |
|---|---|
| Type d'articles | N'importe lequel |
| Budget API | Coût acceptable, pas prohibitif |
| Format | À prototyper — TBD |
| Mode | Suivi dans le temps + alertes |
| Alertes | Email + webhook (plus tard) |
| Seuil d'alerte | Customizable (fixe et/ou relatif) |

## Architecture retenue

Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour le détail.

## Stack retenue

Voir [STACK.md](./STACK.md) pour la comparaison des outils et les choix.

## Étapes de prototypage

- [ ] 1. Setup projet TypeScript
- [ ] 2. Intégrer Bright Data MCP / API — search Google + scrape pages
- [ ] 3. Intégrer Apify E-Commerce Scraper — extraction structurée auto (détection CMS)
- [ ] 4. Claude API — extraction LLM pour les pages non reconnues par Apify
- [ ] 5. Stocker les prix en DB (SQLite + Drizzle)
- [ ] 6. Scheduler de relevé régulier (node-cron)
- [ ] 7. Logique d'alerte (prix < seuil customizable)
- [ ] 8. Interface (CLI d'abord, puis TBD)
