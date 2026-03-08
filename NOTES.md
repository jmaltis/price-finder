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

## Architecture cible

```
┌─────────────────────────────────────────────┐
│                  INPUT                       │
│  Nom de l'article (ex: "Sony WH-1000XM5")   │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│              PRICE FETCHER                  │
│  SerpAPI → Google Shopping (gl=fr)          │
│  Filtre: marchands avec livraison France    │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│              STORAGE (SQLite)               │
│  articles | price_history | alerts          │
│  Horodatage de chaque relevé de prix        │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│              SCHEDULER                      │
│  Cron job : relevé quotidien ou N fois/jour │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│              ALERTING                       │
│  Notification si prix < seuil défini        │
│  (email, webhook, ou notif locale)          │
└─────────────────────────────────────────────┘
```

## Stack retenue

| Composant | Choix | Raison |
|---|---|---|
| Runtime | Node.js + TypeScript | Cohérence avec 60.pulse |
| Prix | SerpAPI (Google Shopping) | ~$50/mo, large couverture, fiable |
| DB | SQLite + Drizzle ORM | Simple, local, pas de serveur |
| Scheduler | node-cron | Léger, intégré |
| Alerting | À définir (email / ntfy.sh / webhook) | — |

## Coût estimé SerpAPI
- 100 searches/mois gratuit (plan dev)
- $50/mois pour 5 000 searches
- 1 article suivi toutes les heures = ~720 searches/mois → ~$7/mois (plan $50/5000)
- 10 articles suivis toutes les 6h = ~1 200 searches/mois → très acceptable

## Étapes de prototypage

- [ ] 1. Setup projet TypeScript
- [ ] 2. Appel SerpAPI Google Shopping, parser les résultats
- [ ] 3. Stocker les prix en DB (SQLite)
- [ ] 4. Scheduler de relevé régulier
- [ ] 5. Logique d'alerte (prix < seuil)
- [ ] 6. Interface (CLI d'abord, puis TBD)

## Questions encore ouvertes
- [ ] Canal d'alerte préféré ? (email, SMS, notif desktop, webhook...)
- [ ] Seuil d'alerte fixe (ex: < 300€) ou relatif (ex: -10% vs prix observé max) ?
