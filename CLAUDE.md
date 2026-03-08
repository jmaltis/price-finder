# 60.pulse - Générateur de vidéos d'actualité (60s)

Stack : Node.js/TypeScript + Remotion + ElevenLabs + Pexels/Unsplash
Ton : Factuel + Punchline (90%/10%) pour Gen Z

## Commandes essentielles

```bash
# Vérification (TOUJOURS avant commit)
npm run check              # typecheck + lint (à utiliser systématiquement)
npm run test               # tests unitaires
npm run build              # compilation TypeScript

# Workflows
npm run workflow           # Pipeline complet de génération
npm run workflow:scripting # Étapes 1-6 (news → transitions)
npm run workflow:rendering # Étape 7 (rendu vidéo)

# Preview
npm run remotion:preview   # Studio Remotion interactif
```

## Règles critiques

### Git workflow (NON-NÉGOCIABLE)
- ⚠️ **JAMAIS de push direct sur `main`** → toujours créer une branche `feat/nom-feature`
- Toujours créer une PR avant merge
- Workflow : `branche → commit → push → PR → review → merge`

### Avant chaque commit
1. `npm run check` DOIT passer (0 erreur TypeScript, 0 warning ESLint)
2. `npm run test` DOIT passer
3. Tester manuellement si UI/workflow modifié

## Conventions de code

### Code Intelligence

Prefer LSP over Grep/Read for code navigation — it's faster, precise, and avoids reading entire files:
- `workspaceSymbol` to find where something is defined
- `findReferences` to see all usages across the codebase
- `goToDefinition` / `goToImplementation` to jump to source
- `hover` for type info without reading the file

Use Grep only when LSP isn't available or for text/pattern searches (comments, strings, config).

After writing or editing code, check LSP diagnostics and fix errors before proceeding.

### TypeScript
- Toujours typer, JAMAIS `any`
- camelCase (variables/fonctions), PascalCase (types/classes)
- Named exports uniquement (pas de default exports)
- **JSON parsing** : Toujours caster `JSON.parse(content) as MyInterface`
  - Interfaces disponibles : `TTSScriptFile`, `MediaFile`, etc. dans `src/types/index.ts`

### Commentaires
- **Éviter les commentaires redondants** qui n'ajoutent pas de valeur
- ❌ Mauvais : `// Récupérer l'API key depuis env vars` avant `getEnv('apiKey')`
- ❌ Mauvais : `// Initialiser le client` avant `new Client()`
- ✅ Bon : Commenter la logique complexe, les workarounds, ou les raisons non-évidentes
- ✅ Bon : Documenter les fonctions publiques avec JSDoc si l'usage n'est pas évident
- Règle : Si le code est clair, ne pas commenter. Sinon, améliorer le code plutôt que commenter.

### Structure
- Workflows → `src/workflows/` et `src/workflows/steps/`
- Services → `src/services/`
- Prompts LLM → `src/prompts/`
- Types → `src/types/`
- Utils → `src/utils/`

### Logging
- Utiliser `logger` de `src/utils/logger.ts` (winston custom)
- Messages en français
- ❌ PAS d'emojis de statut (✅❌⚠️) → winston les gère
- ✅ OK emojis descriptifs (📂🤖📝🎬)

### Variables d'environnement
**NE JAMAIS accéder directement à `process.env`** → utiliser `src/utils/env.ts`

```typescript
import { validateEnv, ENV_REQUIREMENTS, getEnv, getEnvOptional } from '../utils/env';

// Valider en début de fonction
validateEnv(ENV_REQUIREMENTS.tts);
const apiKey = getEnv('ANTHROPIC_API_KEY');
const model = getEnvOptional('ANTHROPIC_MODEL', 'claude-sonnet-4-5-20250929');
```

ENV_REQUIREMENTS disponibles : `news`, `selection`, `tts`, `media`, `all`

### Utilitaires (DRY)
Extraire si utilisé 2+ fois ou logique complexe :
- `src/utils/date.ts` : `toDateString()`, `getDayRange()`, `isInRange()`
- `src/utils/env.ts` : Validation env vars
- `src/utils/logger.ts` : Logger winston
- `src/utils/retry.ts` : Retry logic avec backoff
- `src/utils/errors.ts` : `WorkflowError`, `runMain()`

## Gotchas & Points d'attention

### Conflit Zod
Remotion force `zod@3.22.3` → npm configuré avec `legacy-peer-deps=true`
Safe car Zod est `peerOptional` pour OpenAI.

### APIs & Limites
- NewsAPI : 100 req/jour (gratuit)
- The News API : 30 articles/jour
- Mediastack : 100 req/jour
- RSS (France24, RFI) : illimité
- ElevenLabs TTS : ~$5-22/mois selon plan
- Pexels/Pixabay/Unsplash : gratuit

### LLM Configuration
Provider par défaut : Anthropic (`claude-sonnet-4-5-20250929`)
Providers supportés : anthropic, openai, openrouter
Configuration dans `.env` ou par workflow step

## Documentation

Voir `docs/` pour détails :
- `ARCHITECTURE.md` : Workflow complet (9 étapes)
- `TECH_DECISIONS.md` : Choix techniques
- `MILESTONE_*.md` : Documentation par jalon

**⚠️ Fichiers `.md` vont dans `docs/`, jamais à la racine (sauf README/CLAUDE)**

## Erreurs fréquentes à éviter

- ❌ Push direct sur `main`
- ❌ Commit sans `npm run check`
- ❌ Utiliser `any` en TypeScript
- ❌ Accéder directement à `process.env`
- ❌ Dupliquer du code au lieu d'extraire un utilitaire
- ❌ Mettre de la logique métier dans `workflow-runner.ts` (orchestration uniquement)

## Workflow de collaboration

1. **Avant** : Proposer l'approche, expliquer les trade-offs si pertinent
2. **Pendant** : Commiter par feature, tester progressivement
3. **Après** : Résumer ce qui a été fait, indiquer comment tester

---

*Dernière mise à jour : 2025-11-14 (Jalon 5 terminé)*
