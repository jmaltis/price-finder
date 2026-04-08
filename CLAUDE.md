# Scraping Lab

Lab de prototypes de scraping web partageant la même stack. Chaque use case vit dans son propre pipeline sous `src/` et peut réutiliser les wrappers et utils communs.

**Stack** : Node.js + TypeScript + Apify + Bright Data + Stagehand + Claude API

## Pipelines

| Pipeline | État | Objectif |
|---|---|---|
| **price-finder** | En place (`src/pipeline/`) | Trouver le prix le moins cher d'un article, livraison FR, suivi dans le temps |
| **lead-finder** | À venir | Découvrir des commerces locaux à fort trafic sans site web, pour prospection |

Détails par pipeline dans `NOTES.md`. Architecture de référence dans `ARCHITECTURE.md`. Comparaison des outils dans `STACK.md`.

## Philosophie : extraction en escalade

Principe central de tout ce qui se code ici : **ne jamais payer de tokens LLM si on peut l'éviter.**

Chaque pass d'extraction est moins cher que le suivant. On s'arrête dès qu'on a le résultat. L'ordre typique :

1. **Services structurés spécialisés** (Bright Data datasets, Apify actors) → JSON direct, zéro LLM
2. **Parsing local du HTML** (JSON-LD, meta OG, heuristiques DOM via cheerio) → zéro coût
3. **Automation browser** (Stagehand / Playwright) → seulement si le contenu est dynamique
4. **LLM** (Claude Haiku, HTML tronqué) → dernier recours, ~5-10% des cas

Quand on ajoute un nouveau pipeline ou un nouveau site, **toujours raisonner dans cet ordre** avant de coder.

## Commandes essentielles

```bash
npm run check    # typecheck + eslint — DOIT passer avant commit
npm run test     # vitest
npm run build    # compilation TypeScript

# Run du price-finder
npx tsx src/index.ts "Sony WH-1000XM5"
npx tsx src/index.ts "Sony WH-1000XM5" --limit 3   # mode test
```

## Git workflow (non-négociable)

- **Jamais de push direct sur `main`** → toujours une branche `feat/nom-feature`
- Toujours une PR avant merge
- Workflow : `branche → commit → push → PR → review → merge`

**Avant chaque commit** :
1. `npm run check` DOIT passer (0 erreur TS, 0 warning ESLint)
2. `npm run test` DOIT passer si les tests couvrent la zone modifiée

## Conventions de code

### TypeScript
- Toujours typer, **jamais** `any`
- camelCase (variables/fonctions), PascalCase (types/classes)
- Named exports uniquement, pas de default exports
- JSON parsing : toujours caster `JSON.parse(content) as MyInterface`
- Imports avec extension `.js` (ESM)

### Variables d'environnement
**Ne jamais accéder directement à `process.env`** → passer par `src/utils/env.ts`.

```typescript
import { validateEnv, ENV_REQUIREMENTS, getEnv, getEnvOptional } from './utils/env.js';

validateEnv(ENV_REQUIREMENTS.all);
const apifyToken = getEnv('apifyToken');
const openaiKey = getEnvOptional('openaiApiKey');
```

`ENV_REQUIREMENTS` disponibles : `search`, `apify`, `llm`, `all`.

### Logger
Utiliser `logger` de `src/utils/logger.ts` (logger custom avec couleurs ANSI).

```typescript
import { logger } from './utils/logger.js';
logger.info('Recherche en cours...');
logger.success('12 prix trouvés');
logger.warn('HTML non récupéré');
logger.error('Token manquant');
```

- Messages en français
- Les emojis descriptifs sont OK et utilisés (📄📥🔎🌐...) — pas de règle contre

### Commentaires
- Éviter les commentaires redondants qui reformulent le code
- Commenter uniquement : logique complexe, workarounds, raisons non-évidentes
- Si le code est clair, ne pas commenter. Sinon, améliorer le code plutôt que commenter.

## Structure projet

```
src/
  index.ts              ← entry point CLI du price-finder
  pipeline/             ← pipeline price-finder
    search.ts           ← recherche Google via Bright Data SERP
    extract.ts          ← orchestration multi-extracteurs
    extractors/         ← un fichier par extracteur
      apify.ts          ← détection CMS Shopify/WooCommerce/...
      bright-data.ts    ← datasets structurés (Amazon, Fnac...)
      local-html.ts     ← JSON-LD, meta OG, heuristiques DOM
      stagehand.ts      ← browser automation (dynamique)
      llm.ts            ← fallback Claude Haiku
  services/
    llmService.ts       ← wrapper Claude API
  types/                ← interfaces partagées
  utils/
    env.ts              ← validation + accès env vars
    logger.ts           ← logger ANSI custom
    html.ts             ← nettoyage/parsing HTML (cheerio)
    playwright.ts       ← browser headless réutilisable
    llm.ts              ← helpers LLM (retry, parsing)
    retry.ts, url.ts, variants.ts, quota.ts
```

Quand on ajoutera `lead-finder` : `src/lead-pipeline/` à côté, avec la même structure (`search/extract/extractors`). On extraira un `src/core/` uniquement quand la duplication devient évidente (rule of three).

## Gotchas

- **Stagehand** : browser automation, lent et coûteux en ressources — utilisé uniquement pour les URLs où l'extraction locale a échoué. Ne pas l'appeler en première intention.
- **Quotas API** : Bright Data et Apify ont des free tiers généreux mais pas infinis. Voir `src/utils/quota.ts` pour le tracking.
- **Playwright + Stagehand** : `closeBrowser()` et `closeStagehand()` doivent être appelés en fin de pipeline, sinon le process ne se termine pas proprement.
- **ESM imports** : tous les imports internes doivent finir par `.js` (pas `.ts`), sinon tsx/Node râle.

## Erreurs fréquentes à éviter

- Push direct sur `main`
- Commit sans `npm run check`
- Utiliser `any` en TypeScript
- Accéder directement à `process.env`
- Appeler un LLM avant d'avoir essayé les extracteurs structurés et le parsing local
- Mettre de la logique métier dans `src/index.ts` (qui doit rester un orchestrateur CLI)

## Workflow de collaboration

1. **Avant** : proposer l'approche, expliquer les trade-offs si pertinent
2. **Pendant** : commit par unité logique, tester progressivement
3. **Après** : résumer ce qui a été fait, indiquer comment tester
