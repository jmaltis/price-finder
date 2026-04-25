# Signal Canvas Spec

## Pipeline
1. Scraper Google Maps sur des requêtes food locales à Lyon.
2. Enrichir chaque fiche avec signaux publics:
   adresse, note, horaires, téléphone, site, liens sociaux, visuels, attributs pratiques, snippets d'avis quand visibles.
3. Chercher des coordonnées supplémentaires via recherche web publique prudente, profils sociaux et annuaires/sources société quand ils révèlent un canal exploitable.
4. Qualifier et scorer.
5. Écrire les artefacts bruts et normalisés en JSON.
6. Synchroniser les leads exploitables dans Airtable.
7. Générer une preview HTML statique pour chaque lead qualifié.
8. Préparer un email de prospection pour chaque lead approuvé.

## Interfaces
- `LeadRaw`: donnée brute issue de Maps + enrichissement.
- `LeadQualified`: lead classifié, scoré et prêt à être stocké / synchronisé.
- `WebsiteDraft`: métadonnée + rendu du site démo.
- `OutreachDraft`: payload email avant envoi.

## Règles métier
- `priority`: `website_status = no_domain`, note >= 4.4, volume d'avis suffisant quand détectable.
- `secondary`: fit commercial intéressant, mais signal site / volume d'avis moins fort.
- `rejected`: site existant, chaîne, fermé, ou note insuffisante.

## Données riches pour la génération de site
- `images`: URLs typées avec source, alt et dimensions quand disponibles.
- `reviews`: extraits d'avis publics visibles, note et date relative quand détectables.
- `businessDetails`: prix, options de service, repas, offres, ambiance, accessibilité et planning.
- `rich_data_json`: miroir Airtable des données utiles pour revue humaine et génération de site.
- `maps_url`: lien direct vers la fiche Google Maps.
- `website_url`: domaine détecté directement ou extrait depuis un social / annuaire.

## Commandes CLI
- `npm run lead:scan`
- `npm run lead:sync`
- `npm run lead:generate`
- `npm run lead:review`
- `npm run lead:outreach`
