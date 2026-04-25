# Signal Canvas Sprint Plan

Date:
- `2026-04-18`

## But
Transformer la roadmap consolidée en sprints exécutable immédiatement.

Ce document doit servir à:
- décider quoi construire maintenant;
- éviter de travailler sur trop de fronts à la fois;
- donner une séquence claire à un dev humain ou à un agent;
- mesurer si un sprint est vraiment terminé.

## Règles de pilotage
- un sprint doit produire un résultat mesurable, pas seulement du code;
- on privilégie d'abord la validation commerciale avant l'industrialisation;
- on ne lance pas le sprint suivant si le précédent ne produit pas de signal exploitable;
- chaque sprint doit finir avec une vérification concrète.

## Ordre recommandé
1. Sprint 0: conversion de base
2. Sprint 1: batch pilote mesurable
3. Sprint 2: ranking et pain points
4. Sprint 3: audit local et intelligence commerciale
5. Sprint 4: outreach multicanal
6. Sprint 5: delivery semi-automatique

## Sprint 0 — Conversion de base
### Objectif
Rendre l'outreach et la preview assez crédibles pour envoyer un premier batch test sans être aveugle.

### Résultat attendu
- les emails ne sont plus génériques;
- les previews sont plus persuasives;
- les clics et ouvertures sont mesurables;
- les emails douteux ne partent pas automatiquement.

### Tâches
#### S0-T1. Variantes d'email
- ajouter `OutreachDraft.variant`;
- générer `2-3` variantes de sujet;
- générer une première ligne basée sur le lead;
- ajouter un CTA soft et un CTA hard.

Definition of done:
- `lead:outreach --dry-run` génère plusieurs variantes;
- chaque variante contient un angle de personnalisation visible.

#### S0-T2. Footer et conformité minimale
- ajouter footer propre;
- ajouter mention de désinscription / stop contact;
- préparer une version B2B propre à envoyer.

Definition of done:
- aucun brouillon d'email ne sort sans footer.

#### S0-T3. Preview orientée conversion
- remonter une review dans le hero ou au-dessus du pli;
- remplacer la copy corporate par une copy bénéfice;
- ajouter `schema.org LocalBusiness`;
- améliorer l'angle vertical.

Definition of done:
- une preview de test montre clairement:
  - une preuve sociale;
  - un bénéfice;
  - des données structurées.

#### S0-T4. Tracking minimal
- ajouter des UTM aux liens;
- prévoir les champs Airtable:
  - `email_variant`
  - `email_sent_at`
  - `email_opened_at`
  - `preview_clicked_at`
  - `bounced_at`
- préparer un mécanisme de tracking simple.

Definition of done:
- l'URL envoyée dans les drafts porte des UTM;
- les champs existent dans Airtable ou le bootstrap.

#### S0-T5. Vérification email
- ajouter validation syntaxe;
- ajouter vérification MX ou règle équivalente;
- envoyer seulement si le contact passe le seuil minimal;
- sinon marquer `needs_manual_check`.

Definition of done:
- un lead à email douteux ne peut plus partir automatiquement.

#### S0-T6. Tests de base outreach/preview
- ajouter tests sur:
  - variantes d'email;
  - UTM;
  - présence `schema.org`;
  - éléments critiques de preview.

Definition of done:
- `npm test` couvre le nouveau comportement critique.

### Vérification de fin de sprint
1. `npm run check`
2. `npm test`
3. `npm run lead:generate` sur un lead connu
4. `npm run lead:outreach --dry-run` sur un batch test
5. revue manuelle d'une preview mobile et de 3 brouillons email

## Sprint 1 — Batch pilote mesurable
### Objectif
Envoyer un premier petit batch et mesurer le canal.

### Résultat attendu
- un batch de `10-15` leads approuvés a été envoyé;
- on sait mesurer open / click / reply;
- on a un premier signal sur ce qui convertit.

### Tâches
#### S1-T1. Vue Airtable pilote
- créer une vue “Pilot Batch”;
- afficher statut, variante, tracking, preview, canal.

#### S1-T2. Envoi test interne
- envoyer sur adresses de test;
- vérifier rendu, tracking, liens, bounce.

#### S1-T3. Envoi pilote réel
- sélectionner `10-15` leads;
- approuver manuellement;
- envoyer;
- journaliser la date d'envoi.

#### S1-T4. Dashboard funnel V1
- étendre le dashboard avec:
  - scanned
  - qualified
  - approved
  - sent
  - opened
  - clicked
  - replied

#### S1-T5. Analyse 7 jours
- analyser les résultats du batch;
- documenter les signaux:
  - open rate
  - click rate
  - bounce rate
  - reply rate

### Definition of done
- un batch réel a été envoyé;
- les métriques de base sont visibles;
- une courte note d'analyse existe.

## Sprint 2 — Ranking et pain points
### Objectif
Améliorer la qualité du ciblage commercial.

### Résultat attendu
- chaque lead a une position Maps exploitable;
- chaque lead qualifié a un `pain_point` et un `offer_angle`.

### Tâches
#### S2-T1. Capturer `ranking_position`
- stocker l'ordre d'apparition par requête;
- ajouter `ranking_query`.

#### S2-T2. Gérer plusieurs observations
- ajouter `ranking_observations`;
- calculer meilleure, pire et médiane.

#### S2-T3. Générer `ranking_pain_score`
- définir les règles de tranche;
- intégrer au scoring global.

#### S2-T4. Générer `pain_point`
- produire un texte court réutilisable commercialement.

#### S2-T5. Générer `offer_angle`
- relier pain point et type d'offre proposé.

#### S2-T6. Sync Airtable
- exposer `ranking_position`, `pain_point`, `offer_angle`.

### Definition of done
- les nouveaux champs sont visibles dans JSON, Airtable et dashboard.

## Sprint 3 — Audit local et intelligence commerciale
### Objectif
Passer du simple lead qualifié à une fiche commerciale réellement actionnable.

### Résultat attendu
- chaque lead qualifié peut avoir un mini audit local généré automatiquement.

### Tâches
#### S3-T1. Score de complétude GBP
- calculer `gbp_completeness_score`;
- lister les manques.

#### S3-T2. Snapshot concurrentiel
- récupérer `3-5` concurrents mieux classés;
- comparer signaux clés.

#### S3-T3. Pain points de conversion
- détecter:
  - pas de site;
  - site tiers;
  - socials sans conversion;
  - CTA faibles;
  - contenu pauvre.

#### S3-T4. Génération audit
- produire un artefact HTML ou Markdown;
- stocker `audit_url`.

#### S3-T5. Dashboard enrichi
- afficher ranking, audit, contact, preview et angle commercial.

### Definition of done
- un lead qualifié a un audit lisible qu'on peut montrer ou utiliser pour écrire un message.

## Sprint 4 — Outreach multicanal
### Objectif
Ne plus dépendre du seul email.

### Résultat attendu
- chaque lead qualifié a un canal principal et des fallbacks;
- le système sait générer un message par canal.

### Tâches
#### S4-T1. `primary_contact_channel`
- calculer le meilleur canal par lead.

#### S4-T2. `contact_strategy`
- définir la stratégie:
  - email
  - Instagram
  - Facebook
  - téléphone
  - formulaire

#### S4-T3. Templates par canal
- email;
- appel;
- Instagram DM;
- Facebook message.

#### S4-T4. Approbation humaine
- verrouiller l'envoi à l'état `approved`.

#### S4-T5. Relances
- définir des relances simples par canal.

### Definition of done
- un lead sans email reste contactable et peut recevoir une séquence adaptée.

## Sprint 5 — Delivery semi-automatique
### Objectif
Préparer la valeur récurrente après signature.

### Résultat attendu
- les premiers livrables post-signature peuvent être générés sans travail manuel lourd.

### Tâches
#### S5-T1. Posts GBP hebdo
- générer un mini calendrier éditorial;
- générer textes et CTA.

#### S5-T2. Recommandations GBP
- catégories;
- services;
- description;
- FAQ;
- idées photos.

#### S5-T3. Reporting simple
- produire un résumé mensuel simple côté client.

#### S5-T4. Évaluation outillage
- évaluer si une couche externe type GBP/local SEO doit être branchée.

### Definition of done
- un client signé peut recevoir une première valeur récurrente générée automatiquement.

## Liste de tâches immédiates
### Cette semaine
- S0-T1 Variantes d'email
- S0-T3 Preview orientée conversion
- S0-T4 Tracking minimal
- S0-T5 Vérification email

### Juste après
- S0-T6 Tests
- S1-T1 Vue Airtable pilote
- S1-T2 Envoi test interne

## Dépendances critiques
- le tracking doit exister avant le batch pilote;
- la vérification email doit exister avant un envoi réel;
- le ranking peut attendre la validation conversion;
- l'audit local devient bien plus utile une fois le canal validé.

## Indicateurs de passage au sprint suivant
### Passage Sprint 0 -> Sprint 1
- emails crédibles;
- previews crédibles;
- tracking minimum prêt;
- tests passants.

### Passage Sprint 1 -> Sprint 2
- batch réel envoyé;
- premiers taux visibles;
- pas de problème majeur de délivrabilité.

### Passage Sprint 2 -> Sprint 3
- ranking exploitable;
- pain points cohérents sur un batch.

### Passage Sprint 3 -> Sprint 4
- audits utiles commercialement;
- contacts suffisamment enrichis.

## Références
- roadmap de référence: [roadmap-complete.md](/Users/jeremy/dev/scraping-lab/docs/lead-finder/roadmap-complete.md)
- backlog détaillé: [execution-backlog.md](/Users/jeremy/dev/scraping-lab/docs/lead-finder/execution-backlog.md)
- doc technique: [technical-complete.md](/Users/jeremy/dev/scraping-lab/docs/lead-finder/technical-complete.md)

