---
name: code-review
description: Checklist complète de review de code
---

# Code Review pour 60.pulse

Ce skill effectue une review complète du code selon les standards du projet.

## Checklist de Review

### TypeScript & Types
- [ ] Pas de `any` utilisé
- [ ] Tous les JSON.parse sont castés avec `as Interface`
- [ ] Interfaces définies dans `src/types/`
- [ ] Named exports uniquement (pas de default exports)
- [ ] camelCase pour variables/fonctions, PascalCase pour types/classes

### Gestion d'erreurs
- [ ] Tous les appels async ont try-catch approprié
- [ ] Messages d'erreur descriptifs
- [ ] Pas d'erreurs silencieusement ignorées
- [ ] Utilisation de `WorkflowError` pour les erreurs métier
- [ ] Pattern "fail fast" respecté

### Variables d'environnement
- [ ] Pas d'accès direct à `process.env`
- [ ] Utilisation de `validateEnv()`, `getEnv()`, `getEnvOptional()`
- [ ] ENV_REQUIREMENTS approprié validé

### Logging
- [ ] Utilisation du logger winston custom
- [ ] Messages en français
- [ ] Pas d'emojis de statut (✅❌⚠️)
- [ ] OK pour emojis descriptifs (📂🤖📝)

### Tests
- [ ] Tests unitaires pour nouvelle logique
- [ ] Edge cases couverts
- [ ] Tests passent (`npm run test`)

### DRY (Don't Repeat Yourself)
- [ ] Pas de code dupliqué
- [ ] Utilitaires extraits si utilisé 2+ fois
- [ ] Fonctions dans `src/utils/` si réutilisable

### Structure & Organisation
- [ ] Fichiers dans les bons dossiers (workflows, services, prompts, types, utils)
- [ ] Pas de logique métier dans `workflow-runner.ts`
- [ ] Imports groupés (external, internal, types)

### Documentation
- [ ] Code complexe commenté
- [ ] Nouveaux fichiers `.md` dans `docs/` (pas à la racine)
- [ ] CLAUDE.md mis à jour si règles/gotchas importants

### Sécurité
- [ ] Pas de secrets en dur
- [ ] Pas de command injection
- [ ] Pas de XSS dans génération de contenu
- [ ] Validation des inputs externes

### Performance
- [ ] Pas de boucles inutiles
- [ ] Utilisation appropriée du cache
- [ ] Retry logic avec backoff (pas de retry immédiat en boucle)

## Utilisation

Invoque ce skill avec : `/code-review`

Fournir les fichiers à reviewer avec @ mentions.
