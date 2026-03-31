---
name: test-feature
description: Tester une feature de bout en bout
disable-model-invocation: true
---

# Test de Feature pour 60.pulse

Ce skill guide le test complet d'une feature.

## Workflow de Test

### 1. Vérification statique
```bash
npm run check
```
- Code compile sans erreurs
- Pas de warnings ESLint

### 2. Tests unitaires
```bash
npm run test
```
- Tous les tests passent
- Si nouveau code : ajouter tests avant de tester manuellement

### 3. Test du workflow concerné

#### News (étape 1)
```bash
npm run workflow:news
```
- Vérifier que des articles sont récupérés
- Checker `runs/<date>/news.json`

#### Selection (étape 2)
```bash
npm run workflow:selection
```
- Vérifier la sélection LLM
- Checker `runs/<date>/selection.json`

#### Script (étape 3)
```bash
npm run workflow:script
```
- Vérifier le script généré
- Checker `runs/<date>/script.json`

#### Audio (étape 4)
```bash
npm run workflow:audio
```
- Vérifier la génération audio
- Écouter les fichiers MP3 dans `runs/<date>/audio/`
- Checker `runs/<date>/audio.json` (contient alignement)

#### Media (étape 5)
```bash
npm run workflow:media
```
- Vérifier les médias téléchargés
- Checker `runs/<date>/media.json`
- Regarder les fichiers dans `runs/<date>/media/`

#### Transitions (étape 6)
```bash
npm run workflow:transitions
```
- Vérifier les transitions générées
- Checker `runs/<date>/video.json` (contient transitions)

#### Video (étape 7)
```bash
npm run workflow:video
```
- Vérifier le rendu vidéo
- Regarder `runs/<date>/final-video.mp4`
- Vérifier la durée (50-60s)

#### Workflow complet
```bash
npm run workflow
```
- Test end-to-end complet
- Vérifier chaque étape
- Vérifier la vidéo finale

### 4. Preview Remotion (optionnel)
```bash
npm run remotion:preview
```
- Tester visuellement dans le studio Remotion
- Vérifier les transitions, timing, synchronisation

### 5. Vérifications finales

- [ ] Durée vidéo : 50-60 secondes
- [ ] Audio synchronisé avec les mots
- [ ] Transitions fluides
- [ ] Thème approprié
- [ ] Punchline présente et naturelle
- [ ] Emojis pertinents
- [ ] Pas d'erreurs dans les logs

## Utilisation

Invoque ce skill avec : `/test-feature <workflow-name>`

Exemples :
- `/test-feature audio` - Test uniquement l'étape audio
- `/test-feature video` - Test uniquement le rendu vidéo
- `/test-feature full` - Test workflow complet
