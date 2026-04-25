# Signal Canvas Documentation Technique Complète

## But de cette documentation
Documenter:
- ce qui existe déjà
- ce qui manque
- comment le système doit évoluer
- comment automatiser au maximum la partie développement / opérations ensuite

Ce document doit servir de base à:
- un dev humain
- un agent IA de développement
- un agent ops / automation

## Vue d'ensemble
Le système actuel est un pipeline TypeScript piloté en CLI qui:
1. scanne Google Maps sur des requêtes locales;
2. extrait données business, images, avis et détails publics;
3. enrichit les contacts via recherche web + socials + annuaires;
4. qualifie et score les leads;
5. stocke les artefacts localement en JSON;
6. synchronise les leads dans Airtable;
7. génère des previews HTML statiques;
8. prépare la couche outreach.

## Repository
Racine:
- `/Users/jeremy/dev/scraping-lab`

## Structure actuelle importante
- [package.json](/Users/jeremy/dev/scraping-lab/package.json)
- [src/lead-finder](/Users/jeremy/dev/scraping-lab/src/lead-finder)
- [src/types/lead-finder.ts](/Users/jeremy/dev/scraping-lab/src/types/lead-finder.ts)
- [src/utils/env.ts](/Users/jeremy/dev/scraping-lab/src/utils/env.ts)
- [src/utils/playwright.ts](/Users/jeremy/dev/scraping-lab/src/utils/playwright.ts)
- [tests/lead-finder.test.ts](/Users/jeremy/dev/scraping-lab/tests/lead-finder.test.ts)
- [data/lead-finder](/Users/jeremy/dev/scraping-lab/data/lead-finder)

## Commandes CLI disponibles
Depuis [package.json](/Users/jeremy/dev/scraping-lab/package.json):
- `npm run lead:scan`
- `npm run lead:sync`
- `npm run lead:airtable:bootstrap`
- `npm run lead:airtable:clear`
- `npm run lead:generate`
- `npm run lead:review`
- `npm run lead:dashboard`
- `npm run lead:outreach`

## Commandes typiques
### Scan
```bash
npm run lead:scan -- --limit 2
```

### Sync Airtable
```bash
npm run lead:sync -- --batch lead-20260416204042
```

### Génération previews
```bash
npm run lead:generate -- --batch lead-20260416204042
```

### Dashboard
```bash
npm run lead:dashboard
```

## Variables d'environnement
Déclarées dans [src/utils/env.ts](/Users/jeremy/dev/scraping-lab/src/utils/env.ts) et [.env.example](/Users/jeremy/dev/scraping-lab/.env.example).

### Sources / scraping
- `BRIGHT_DATA_API_TOKEN`
- `GOOGLE_MAPS_STORAGE_STATE_PATH` optionnel

### Airtable
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_NAME`

### Preview
- `LEAD_PREVIEW_BASE_URL`
- `LEAD_PREVIEW_OUTPUT_DIR`

### Outreach
- `RESEND_API_KEY`
- `OUTREACH_FROM_EMAIL`
- `OUTREACH_REPLY_TO`

## Modèle de données
Défini dans [src/types/lead-finder.ts](/Users/jeremy/dev/scraping-lab/src/types/lead-finder.ts).

### Types principaux
- `LeadRaw`
- `LeadQualified`
- `LeadContact`
- `LeadScore`
- `WebsiteDraft`
- `OutreachDraft`
- `LeadBatchManifest`

### Champs importants dans `LeadRaw`
- `businessName`
- `category`
- `rating`
- `reviewCount`
- `address`
- `openingHours`
- `phone`
- `websiteUrl`
- `discoveredWebsiteUrls`
- `socialLinks`
- `images`
- `reviews`
- `businessDetails`
- `source.mapsUrl`

### Champs importants dans `LeadQualified`
- `websiteStatus`
- `status`
- `priorityTier`
- `qualifiesForOutreach`
- `contact`
- `score`
- `previewUrl`
- `notes`

## Pipeline actuel détaillé
## 1. Scan Maps
Fichier principal:
- [src/lead-finder/maps.ts](/Users/jeremy/dev/scraping-lab/src/lead-finder/maps.ts)

Responsabilités:
- ouvrir Google Maps avec Playwright
- faire défiler les résultats
- extraire les listings
- ouvrir chaque fiche
- récupérer:
  - nom
  - note
  - nombre d'avis
  - adresse
  - téléphone
  - site
  - liens sociaux
  - images
  - extraits d'avis
  - attributs du business

Sortie:
- `MapsScanResult`
- liste de `LeadRaw`

## 2. Enrichissement contacts
Fichier principal:
- [src/lead-finder/contact.ts](/Users/jeremy/dev/scraping-lab/src/lead-finder/contact.ts)

Sources déjà utilisées:
- site détecté
- recherche web “contact”
- recherche “social”
- recherche “directory”
- pages sociales publiques
- Linktree
- pages de type `contact`

Extraction actuelle:
- emails standard
- emails obfusqués (`at` / `dot`)
- `mailto:`
- téléphones
- social links
- URLs externes présentes dans le texte ou les metas

Sélection actuelle:
- scoring des emails candidats
- filtrage des faux positifs
- sélection du meilleur site détecté

Limites connues:
- encore du bruit possible sur certaines pages sociales
- peu d'emails vraiment fiables pour les meilleurs leads `no_domain/social_only`

## 3. Qualification et scoring
Fichier principal:
- [src/lead-finder/qualify.ts](/Users/jeremy/dev/scraping-lab/src/lead-finder/qualify.ts)

Statuts site:
- `no_domain`
- `social_only`
- `has_domain`
- `chain_or_franchise`
- `closed_or_invalid`

Statuts lead:
- `new`
- `qualified`
- `draft_ready`
- `approved`
- `contacted`
- `rejected`

Score actuel:
- traction
- absence de site
- contactabilité
- richesse de contenu
- fit commercial

Limite actuelle:
- ne tient pas encore compte de la position réelle du business dans Maps

## 4. Stockage local
Fichier principal:
- [src/lead-finder/store.ts](/Users/jeremy/dev/scraping-lab/src/lead-finder/store.ts)

Arborescence:
- `data/lead-finder/batches/<batchId>/raw`
- `data/lead-finder/batches/<batchId>/normalized`
- `data/lead-finder/batches/<batchId>/outreach`
- `data/lead-finder/previews`

Artefacts batch:
- `raw/maps-leads.json`
- `normalized/leads.json`
- `normalized/qualified-leads.json`
- `normalized/review.md`
- `manifest.json`

## 5. Sync Airtable
Fichier principal:
- [src/lead-finder/airtable.ts](/Users/jeremy/dev/scraping-lab/src/lead-finder/airtable.ts)

Champs gérés:
- `lead_id`
- `business_name` via `Name`
- `category`
- `city`
- `rating`
- `review_count`
- `maps_url`
- `website_url`
- `website_status`
- `social_links`
- `fallback_channels`
- `contact_email`
- `contact_channel`
- `contact_confidence`
- `lead_score`
- `image_count`
- `review_snippets`
- `detail_highlights`
- `rich_data_json`
- `preview_url`
- `lead_status`
- `last_action_at`
- `notes`

Commandes utiles:
- bootstrap du schéma
- clear de la table
- sync des leads

## 6. Génération preview
Fichier principal:
- [src/lead-finder/preview.ts](/Users/jeremy/dev/scraping-lab/src/lead-finder/preview.ts)

Sortie:
- HTML statique par lead
- `metadata.json`
- `previewUrl`

Contenu actuel:
- hero
- about
- infos pratiques
- reviews
- détails utiles
- galerie

## 7. Dashboard
Fichier principal:
- [src/lead-finder/dashboard.ts](/Users/jeremy/dev/scraping-lab/src/lead-finder/dashboard.ts)

Sortie:
- [dashboard.html](/Users/jeremy/dev/scraping-lab/data/lead-finder/dashboard.html)

Utilité:
- vue centralisée locale des batches
- previews
- richesse de données
- statuts

## 8. Outreach
Fichiers:
- [src/lead-finder/outreach.ts](/Users/jeremy/dev/scraping-lab/src/lead-finder/outreach.ts)
- [src/lead-finder/cli.ts](/Users/jeremy/dev/scraping-lab/src/lead-finder/cli.ts)

État actuel:
- génération d'un draft email
- support Resend
- passage des leads `approved` vers envoi

Limite actuelle:
- modèle majoritairement email-first
- pas encore de moteur multicanal social / téléphone

## Stabilité / correctifs déjà apportés
### 1. Clickabilité des previews
`preview_url` local est généré en `file:///...` pour être ouvrable depuis Airtable.

### 2. Champs Airtable supplémentaires
Ajoutés:
- `maps_url`
- `website_url`
- `fallback_channels`

### 3. Enrichissement social
Ajout de lectures:
- Linktree
- Instagram
- Facebook
- pages de contact dérivées

### 4. Nettoyage avis
`review_snippets` est mieux nettoyé qu'au départ.

### 5. Correction process `lead:scan`
Le CLI fermait mal certaines ressources Playwright.
Correctifs:
- fermeture des contexts en `finally`
- fermeture explicite du browser
- sortie de process forcée à la fin du CLI

## Problèmes ouverts
### Ranking Maps réel
Le système cible doit stocker la vraie position locale par requête (`7` à `25`).
Ce n'est pas encore implémenté proprement.

### Pain point explicite
On score les leads, mais on n'écrit pas encore un `pain_point` structuré directement exploitable commercialement.

### Qualifiés sans email
Les leads les plus intéressants n'exposent souvent pas d'email fiable publiquement.

### Outreach multicanal
Il manque:
- DM Instagram
- DM Facebook
- scripts d'appel
- priorisation du canal optimal

### Google Business Profile optimization engine
Pas encore implémenté:
- score de complétude GBP
- comparaison concurrentielle
- suggestions de posts automatiques
- calendrier hebdomadaire

## Architecture cible
## Bloc A. Discovery Engine
Entrées:
- ville
- catégorie
- mot-clé

Sorties:
- classement Maps
- business
- ranking position
- signaux locaux

## Bloc B. Intelligence Engine
Sorties:
- diagnostic GBP
- diagnostic visibilité
- diagnostic conversion
- diagnostic contenu
- pain points

## Bloc C. Improvement Engine
Sorties:
- preview site
- mini audit
- roadmap d'amélioration
- plan de posts
- suggestions GBP

## Bloc D. Outreach Engine
Sorties:
- meilleur canal
- message personnalisé
- séquence
- logs

## Bloc E. Delivery Engine
Sorties:
- updates hebdo
- publication de posts
- enrichissement continu
- reporting

## Roadmap technique prioritaire
## Priorité 1. Ranking Maps
À implémenter:
- `ranking_position`
- `ranking_bucket`
- `competitor_snapshot`

## Priorité 2. Pain point generation
À implémenter:
- champ `pain_point`
- champ `offer_angle`
- champ `improvement_plan`

## Priorité 3. Audit GBP
À implémenter:
- complétude fiche
- densité contenu
- fraîcheur d'activité
- manque d'updates

## Priorité 4. Outreach multicanal
À implémenter:
- `contact_strategy`
- `best_contact_channel`
- templates par canal

## Priorité 5. Delivery automation
À implémenter:
- génération de posts hebdo
- calendrier
- workflow d'approbation

## Règles pour automatisation future par agents
### Règle 1
Chaque étape doit avoir:
- entrée claire
- sortie claire
- format stable

### Règle 2
Chaque artefact doit être sérialisable en JSON.

### Règle 3
Chaque commande doit être idempotente autant que possible.

### Règle 4
Chaque étape critique doit être testable indépendamment.

### Règle 5
Les règles métier ne doivent pas être enfouies dans le scraping brut.

## Fichiers à faire évoluer en priorité
- [src/lead-finder/maps.ts](/Users/jeremy/dev/scraping-lab/src/lead-finder/maps.ts)
- [src/lead-finder/contact.ts](/Users/jeremy/dev/scraping-lab/src/lead-finder/contact.ts)
- [src/lead-finder/qualify.ts](/Users/jeremy/dev/scraping-lab/src/lead-finder/qualify.ts)
- [src/lead-finder/airtable.ts](/Users/jeremy/dev/scraping-lab/src/lead-finder/airtable.ts)
- [src/lead-finder/preview.ts](/Users/jeremy/dev/scraping-lab/src/lead-finder/preview.ts)
- [src/lead-finder/cli.ts](/Users/jeremy/dev/scraping-lab/src/lead-finder/cli.ts)
- [src/types/lead-finder.ts](/Users/jeremy/dev/scraping-lab/src/types/lead-finder.ts)

## Proposition de futurs champs de données
### Lead intelligence
- `ranking_position`
- `ranking_bucket`
- `pain_point`
- `offer_angle`
- `contact_strategy`
- `best_contact_channel`
- `gbp_completeness_score`
- `content_freshness_score`
- `competitive_gap_score`

### Delivery
- `weekly_post_plan`
- `gbp_update_draft`
- `landing_page_angle`
- `cta_strategy`

## Tests à ajouter ensuite
- ranking extraction exact
- classification pain point
- sélection du meilleur canal de contact
- filtrage des faux emails sociaux
- génération audit GBP
- génération séquence outreach multi-canal

## Conclusion technique
Le système actuel est déjà une bonne base de production:
- discovery local
- enrichissement public
- qualification
- previews
- sync CRM

La prochaine évolution doit transformer ce pipeline en plateforme d'intelligence locale et d'activation commerciale, pas seulement en scraper + générateur de site.
