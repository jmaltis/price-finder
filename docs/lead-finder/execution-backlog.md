# Signal Canvas Backlog Exécutable

## But du document
Transformer la roadmap et la doc technique en plan d'exécution concret.

Ce backlog doit permettre de:
- décider quoi construire ensuite;
- exécuter les travaux dans le bon ordre;
- déléguer à un dev humain ou à un agent IA;
- mesurer si chaque étape est vraiment terminée.

## Principes de priorisation
Ordre de priorité:
1. augmenter la valeur commerciale des leads;
2. fiabiliser le pipeline existant;
3. rendre la machine observable et pilotable;
4. automatiser l'outreach;
5. automatiser la delivery après signature.

Règle produit:
- une fonctionnalité n'est prioritaire que si elle améliore au moins un de ces axes:
  - nombre de leads qualifiés utilisables;
  - qualité du pain point détecté;
  - qualité de la démo montrable;
  - taux de contact effectif;
  - capacité à opérer à plus grand volume.

## Vue d'ensemble des lots
### Lot A. Discovery et ranking Maps
Objectif:
- passer de “leads sans site” à “business bien notés mais sous-positionnés”.

Résultat attendu:
- chaque lead a une position Maps exploitable par requête;
- chaque lead a un `pain_point` commercial clair.

### Lot B. Qualification et intelligence locale
Objectif:
- expliquer pourquoi le business sous-performe et quoi proposer.

Résultat attendu:
- chaque lead qualifié a un mini audit local.

### Lot C. Contactabilité multicanale
Objectif:
- rendre les leads effectivement actionnables même sans email.

Résultat attendu:
- chaque lead qualifié a un canal de contact prioritaire et des fallbacks.

### Lot D. Preview et preuves commerciales
Objectif:
- montrer une amélioration visible et crédible.

Résultat attendu:
- chaque lead approuvable a un kit commercial: preview, audit, angle d'offre.

### Lot E. Ops, Airtable et revue
Objectif:
- centraliser le pilotage commercial.

Résultat attendu:
- une vue unique pour suivre les leads, leurs artefacts et leur état.

### Lot F. Outreach
Objectif:
- envoyer les bons messages sur le bon canal, avec validation humaine.

Résultat attendu:
- un workflow `approved -> contacted` propre, traçable et répétable.

### Lot G. Delivery automatisée
Objectif:
- préparer l'après-vente et la production récurrente.

Résultat attendu:
- les premiers modules de delivery peuvent tourner semi-automatiquement.

## Lot A. Discovery et ranking Maps
### A1. Stocker la position Maps par requête
Statut:
- à faire

Pourquoi:
- c'est le coeur de la nouvelle proposition de valeur.

Travail:
- enrichir le scan Maps pour capturer l'ordre exact des résultats;
- conserver la requête source de chaque résultat;
- stocker `ranking_position` par lead;
- stocker aussi `ranking_query`.

Livrables:
- types mis à jour;
- JSON batch enrichi;
- champs Airtable correspondants.

Critères d'acceptation:
- chaque lead issu d'un scan a `ranking_position`;
- la position est visible dans Airtable;
- la review batch mentionne la position.

### A2. Gérer plusieurs requêtes pour un même business
Statut:
- à faire

Pourquoi:
- un même commerce peut être bien classé sur une requête et faible sur une autre.

Travail:
- stocker plusieurs observations de ranking;
- calculer un résumé:
  - meilleure position;
  - pire position;
  - position médiane;
  - nombre de requêtes où le lead apparaît.

Livrables:
- structure `ranking_observations`;
- agrégat de ranking dans `LeadQualified`.

Critères d'acceptation:
- un lead peut porter plusieurs positions;
- Airtable reçoit au moins un résumé simple.

### A3. Détecter automatiquement le ranking pain
Statut:
- à faire

Travail:
- définir des règles métier:
  - `1-3`: trop fort, faible priorité;
  - `4-6`: potentiel modéré;
  - `7-15`: cible forte;
  - `16-25`: cible secondaire;
  - `>25`: trop faible ou trop peu prouvé.
- générer un `ranking_pain_score`.

Critères d'acceptation:
- le scoring change si la position change;
- la priorité commerciale reflète le ranking pain.

### A4. Générer un `pain_point` lisible
Statut:
- à faire

Travail:
- produire un texte court par lead, par exemple:
  - “Très bien noté mais trop bas dans Google Maps pour sa catégorie.”
  - “Présence sociale active mais pas de site ni funnel de conversion.”
  - “Fiche locale riche, mais visibilité locale encore insuffisante.”

Critères d'acceptation:
- chaque lead qualifié a un `pain_point`;
- ce texte peut être repris tel quel dans une séquence commerciale.

## Lot B. Qualification et intelligence locale
### B1. Audit de complétude Google Business Profile
Statut:
- à faire

Travail:
- exploiter `businessDetails`;
- mesurer:
  - présence d'horaires;
  - attributs;
  - services;
  - photos;
  - avis;
  - website;
  - CTA visibles.

Livrables:
- `gbp_completeness_score`;
- `gbp_gaps`.

Critères d'acceptation:
- les manques sont visibles dans Airtable et dans l'audit.

### B2. Comparaison concurrentielle locale
Statut:
- à faire

Travail:
- pour chaque lead qualifié, capturer 3 à 5 concurrents mieux classés;
- comparer:
  - rating;
  - review count;
  - volume photo;
  - attributs;
  - website;
  - signaux de fraîcheur.

Livrables:
- `competitor_snapshot`;
- résumé des écarts.

Critères d'acceptation:
- l'audit contient au moins 3 concurrents quand disponibles;
- un angle de vente peut citer un écart concret.

### B3. Détection des pain points de conversion
Statut:
- à faire

Travail:
- déterminer:
  - pas de site;
  - site faible;
  - site tiers uniquement;
  - socials sans conversion;
  - CTA manquants;
  - contenu pauvre;
  - contact insuffisant.

Livrables:
- `conversion_pain_points`;
- `offer_angle`.

Critères d'acceptation:
- chaque lead qualifié a au moins un angle d'amélioration concret.

## Lot C. Contactabilité multicanale
### C1. Normaliser la stratégie de contact par lead
Statut:
- à faire

Travail:
- définir:
  - `primary_contact_channel`;
  - `fallback_channels`;
  - `contact_strategy`.
- priorités cibles:
  - email si fiable;
  - sinon Instagram/Facebook;
  - sinon téléphone;
  - sinon formulaire.

Critères d'acceptation:
- aucun lead qualifié n'a un statut “contact inconnu” sans tentative de fallback.

### C2. Approfondir l'extraction sociale
Statut:
- partiellement fait

Travail restant:
- améliorer l'extraction Facebook publique;
- mieux détecter les liens en bio Instagram;
- capter WhatsApp, réservation, Link-in-bio, commande;
- scorer les contacts par source.

Livrables:
- `contact_source_kind`;
- `contact_quality`.

Critères d'acceptation:
- la qualité d'un contact tiers est explicitement marquée;
- les faux positifs restent filtrés.

### C3. Enrichissement annuaires / registres
Statut:
- partiellement fait

Travail restant:
- rendre l'exploration `PagesJaunes`, `Pappers`, `Societe.com` plus structurée;
- distinguer raison sociale, marque commerciale et source de contact;
- ne pas confondre un email de plateforme et un email du business.

Critères d'acceptation:
- le moteur sait dire si l'email est:
  - business direct;
  - tiers marketplace;
  - annuaire;
  - inconnu.

### C4. Stratégie outreach sans email
Statut:
- à faire

Travail:
- préparer des séquences pour:
  - appel;
  - DM Instagram;
  - message Facebook.

Critères d'acceptation:
- un lead `qualified` sans email reste actionnable.

## Lot D. Preview et preuves commerciales
### D1. Améliorer la qualité visuelle des previews
Statut:
- partiellement fait

Travail restant:
- design plus premium;
- meilleures variantes restaurants / cafés / pâtisserie;
- meilleure hiérarchie éditoriale;
- meilleure intégration des images publiques.

Critères d'acceptation:
- la preview semble proche d'un vrai livrable commercial;
- elle peut être montrée sans explication lourde.

### D2. Générer un audit local montrable
Statut:
- à faire

Travail:
- produire un artefact HTML ou Markdown lisible avec:
  - position Maps;
  - note et avis;
  - signaux GBP;
  - manque principal;
  - recommandation;
  - comparaison rapide à la concurrence.

Critères d'acceptation:
- chaque lead qualifié approuvé a un audit exploitable.

### D3. Générer un plan d'amélioration GBP
Statut:
- à faire

Travail:
- créer:
  - description optimisée;
  - thèmes de posts hebdo;
  - FAQ locales;
  - recommandations photos;
  - catégories / services à compléter.

Critères d'acceptation:
- un commercial peut montrer “ce qu'on ferait” sans travail manuel supplémentaire.

### D4. Hébergement réel des previews
Statut:
- à faire

Travail:
- remplacer progressivement les `file:///...` par une URL publique;
- prévoir un hébergement temporaire simple et peu coûteux.

Critères d'acceptation:
- `preview_url` ouvre une vraie URL publique;
- le lien peut être envoyé par email ou DM.

## Lot E. Ops, Airtable et revue
### E1. Finaliser le modèle Airtable commercial
Statut:
- à faire

Travail:
- ajouter les champs:
  - `ranking_position`
  - `ranking_query`
  - `pain_point`
  - `offer_angle`
  - `gbp_completeness_score`
  - `contact_strategy`
  - `contact_quality`
  - `audit_url`

Critères d'acceptation:
- Airtable devient la source de pilotage commercial complète.

### E2. Dashboard centralisé plus riche
Statut:
- partiellement fait

Travail restant:
- afficher ranking, pain point, contactabilité, audit et preview;
- ajouter filtres par segment et par statut;
- ajouter raccourcis vers Maps, socials et artefacts.

Critères d'acceptation:
- on peut faire une revue batch sans ouvrir plusieurs fichiers.

### E3. Historique d'actions
Statut:
- à faire

Travail:
- stocker un log simple:
  - scan;
  - sync;
  - génération preview;
  - approbation;
  - contact;
  - relance.

Critères d'acceptation:
- chaque action commerciale importante est traçable.

## Lot F. Outreach
### F1. Génération de messages par canal
Statut:
- à faire

Travail:
- templates par type de canal;
- personnalisation à partir de:
  - ranking;
  - note;
  - pain point;
  - preview;
  - audit.

Critères d'acceptation:
- un brouillon est généré sans intervention manuelle.

### F2. Approbation humaine obligatoire
Statut:
- partiellement fait

Travail restant:
- verrouiller le passage `draft_ready -> approved -> contacted`;
- empêcher tout envoi sans approbation.

Critères d'acceptation:
- aucun envoi automatique n'est possible sans validation explicite.

### F3. Connecteur d'envoi
Statut:
- à faire

Décision à prendre:
- maison;
- ou outil tiers type Instantly / Apollo pour la couche envoi.

Travail:
- garder la logique métier maison;
- abstraire la couche d'envoi.

Critères d'acceptation:
- le moteur d'envoi peut être remplacé sans casser le pipeline.

### F4. Relances
Statut:
- à faire

Travail:
- définir règles de relance par canal;
- journaliser les tentatives;
- éviter les doublons.

Critères d'acceptation:
- chaque lead contacté a une séquence traçable.

## Lot G. Delivery automatisée
### G1. Génération de posts GBP
Statut:
- à faire

Travail:
- produire un calendrier hebdo;
- générer texte, CTA et visuel suggéré;
- préparer une intégration future à un outil d'exécution.

### G2. Optimisation GBP assistée par IA
Statut:
- à explorer

Travail:
- évaluer un moteur maison vs outils externes;
- produire un module interne de recommandations:
  - description;
  - catégories;
  - services;
  - FAQ;
  - posts.

### G3. Agents de delivery
Statut:
- à explorer

Travail:
- définir les rôles:
  - agent audit;
  - agent content;
  - agent posting;
  - agent reporting.

## Backlog immédiat recommandé
Ordre conseillé des 7 prochains chantiers:
1. améliorer l'outreach email:
   - variantes sujet;
   - first line personnalisée;
   - CTA dual;
   - footer propre;
2. améliorer la preview pour la conversion:
   - social proof;
   - copy bénéfice;
   - schema.org;
   - contrôle mobile;
3. ajouter le tracking minimal:
   - UTM;
   - champs Airtable;
   - événements d'ouverture / clic / bounce;
4. formaliser `primary_contact_channel` et `contact_strategy`;
5. ajouter `ranking_position` et `pain_point` dans le pipeline et Airtable;
6. produire un mini audit local automatique;
7. améliorer le dashboard pour centraliser audit + preview + contact.

## Tickets concrets à ouvrir maintenant
### Ticket 1. Ajouter des variantes d'outreach et un CTA dual
Definition of done:
- `OutreachDraft` porte une variante;
- le sujet n'est plus unique;
- la première ligne dépend du lead;
- le message contient un CTA soft et un CTA hard.

### Ticket 2. Améliorer la preview pour la conversion
Definition of done:
- une review remonte dans le hero ou au-dessus du pli;
- la copy est orientée bénéfice;
- `schema.org LocalBusiness` est présent;
- la preview passe un contrôle mobile manuel.

### Ticket 3. Ajouter le tracking minimal du funnel
Definition of done:
- les liens portent des UTM;
- Airtable expose les champs de suivi;
- l'ouverture, le clic ou le bounce sont journalisables.

### Ticket 4. Ajouter le ranking Maps au modèle de données
Definition of done:
- types mis à jour;
- scan mis à jour;
- JSON batch enrichi;
- tests ajoutés.

### Ticket 5. Ajouter les champs ranking/pain point dans Airtable
Definition of done:
- bootstrap Airtable mis à jour;
- sync Airtable mis à jour;
- données visibles en table.

### Ticket 6. Générer un `pain_point` et un `offer_angle`
Definition of done:
- champs calculés;
- visibles dans review, dashboard et Airtable.

### Ticket 7. Générer un audit local par lead qualifié
Definition of done:
- artefact généré localement;
- lien stocké;
- résumé lisible.

### Ticket 8. Implémenter une stratégie de contact multicanale
Definition of done:
- `primary_contact_channel` calculé;
- fallback défini;
- score de qualité visible.

### Ticket 9. Génération de messages d'outreach par canal
Definition of done:
- email, appel, Instagram DM et Facebook couverts;
- approbation humaine requise.

### Ticket 10. Héberger les previews
Definition of done:
- les previews ne dépendent plus d'un chemin local;
- le lien est partageable.

## Dépendances
Dépendances fortes:
- ranking avant audit local;
- audit local avant messages commerciaux très personnalisés;
- contact strategy avant outreach multicanal;
- URL publique avant outreach à grande échelle.

Dépendances faibles:
- amélioration design preview peut avancer en parallèle;
- enrichissement contact et dashboard peuvent avancer en parallèle.

## KPIs de pilotage
### KPIs acquisition
- leads scannés par batch;
- taux de leads qualifiés;
- taux de leads avec `ranking_position` valide;
- part de leads entre `7` et `25`.

### KPIs contactabilité
- taux de leads qualifiés avec email direct;
- taux de leads qualifiés avec au moins un canal actionnable;
- répartition email / téléphone / Instagram / Facebook.

### KPIs preuve commerciale
- taux de leads qualifiés avec preview;
- taux de leads qualifiés avec audit;
- délai moyen scan -> draft_ready.

### KPIs outreach
- taux d'approbation;
- taux d'envoi;
- taux de réponse;
- taux de rendez-vous.

## Ce qu'on ne fait pas tout de suite
- optimisation SEO locale complète après signature;
- agent autonome de posting en production;
- CRM complexe hors Airtable;
- orchestration multi-ville grande échelle;
- enrichissement payant lourd tant que la boucle de vente n'est pas validée.

## Recommandation nette
Le meilleur prochain sprint est:
1. email et preview orientés conversion;
2. tracking et mesure;
3. stratégie de contact;
4. ranking Maps et pain point;
5. audit local.

C'est le chemin le plus court vers une machine qui ne se contente pas de produire des leads, mais qui apprend réellement ce qui convertit.
