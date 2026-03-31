---
name: commit-workflow
description: Workflow complet de commit avec vérifications
disable-model-invocation: true
---

# Workflow de Commit pour 60.pulse

Ce skill orchestre un workflow de commit complet avec toutes les vérifications requises.

## Étapes

1. **Vérification du code**
   ```bash
   npm run check
   ```
   - Doit passer sans erreurs (0 error TypeScript, 0 warning ESLint)
   - Si échec : arrêter et corriger

2. **Tests**
   ```bash
   npm run test
   ```
   - Tous les tests doivent passer
   - Si échec : arrêter et corriger

3. **Status git**
   ```bash
   git status
   ```
   - Voir les fichiers modifiés
   - Vérifier qu'il n'y a pas de fichiers sensibles (.env, credentials, etc.)

4. **Staging**
   ```bash
   git add <fichiers-spécifiques>
   ```
   - ⚠️ Préférer ajouter des fichiers spécifiques plutôt que `git add .`
   - Éviter d'ajouter accidentellement des fichiers sensibles

5. **Commit**
   ```bash
   git commit -m "$(cat <<'EOF'
   <type>: <description courte>

   <description détaillée si nécessaire>

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
   EOF
   )"
   ```
   - Message en anglais
   - Types : feat, fix, chore, docs, refactor, test, style
   - Description concise (focus sur le "why" plutôt que le "what")

6. **Vérification post-commit**
   ```bash
   git status
   git log -1 --stat
   ```

## Utilisation

Invoque ce skill avec : `/commit-workflow`

Ne pas push automatiquement - attendre confirmation de l'utilisateur.
