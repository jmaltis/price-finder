# Signal Canvas Roadmap Consolidée

Date de consolidation:
- `2026-04-18`

## But du document
Faire de ce document la roadmap de référence pour Signal Canvas.

Cette version consolide:
- la vision long terme;
- le positionnement commercial;
- l'état actuel du pipeline;
- les vrais gaps de conversion;
- la séquence d'exécution recommandée.

## Résumé exécutif
Signal Canvas ne doit pas être pensé comme un simple moteur pour “trouver des business sans site”.

Le système cible est:
- une machine de détection de business locaux déjà validés par le marché;
- capable d'identifier un vrai manque de visibilité ou de conversion;
- capable de générer une amélioration démontrable;
- capable de convertir cette amélioration en rendez-vous, puis en prestation récurrente.

La vraie priorité n'est donc pas de complexifier le produit trop tôt.

La vraie priorité est:
1. trouver des leads vraiment vendables;
2. produire une preuve crédible;
3. mesurer si le canal convertit;
4. itérer avant d'industrialiser.

## Vision
Construire une machine d'acquisition locale qui détecte des business déjà appréciés par le marché mais sous-exploités digitalement, produit une amélioration visible et crédible, puis convertit cette amélioration en rendez-vous et en vente.

Le coeur du système devient:
- trouver des business locaux déjà validés par le marché;
- identifier ce qui limite leur visibilité ou leur conversion;
- générer une amélioration démontrable;
- proposer une offre largement plus accessible qu'un achat de trafic Google Ads.

## Positionnement de l'offre
### Promesse
Offrir à des commerces locaux une amélioration mesurable de leur présence locale Google et de leur conversion, pour un coût inférieur à une stratégie Google Ads classique.

### Angle commercial
- “Vous êtes déjà un bon business.”
- “Votre visibilité et votre fiche locale sous-performent par rapport à votre potentiel.”
- “Le top ranking via Google Ads coûte cher.”
- “On peut améliorer votre présence locale et votre conversion pour 5 à 10 fois moins cher qu'une dépendance à Google Ads.”

### Ce qu'on vend réellement
- amélioration de la fiche Google Business Profile;
- amélioration du contenu local;
- cadence d'updates et de posts;
- amélioration de la conversion locale;
- option site vitrine / landing page si pertinent;
- visibilité et activation, pas seulement design.

## ICP prioritaire
### Cible V1
- business locaux food;
- zone pilote: Lyon;
- catégories initiales: restaurants, cafés, brunch, pâtisseries, boulangeries, bars à tapas.

### Critères business
- note Google Maps entre `4.0` et `5.0`;
- volume d'avis suffisant pour montrer un business réel;
- position locale Maps typiquement entre `7` et `25`;
- ni chaîne ni franchise;
- présence digitale insuffisante ou mal exploitée.

### Typologies de pain points
- pas de site propriétaire;
- présence sociale sans funnel clair;
- fiche Google Business incomplète ou mal optimisée;
- peu ou pas de posts réguliers;
- contenu visuel sous-exploité;
- informations peu structurées;
- mauvais levier de conversion locale;
- business bien noté mais trop bas dans le ranking local.

## Où on en est aujourd'hui
Le pipeline `src/lead-finder/` est déjà fonctionnel sur la boucle:
- scan Maps;
- qualification;
- enrichissement contact;
- sync Airtable;
- génération preview;
- préparation outreach.

### Ce qui est déjà solide
- scraping Maps résilient;
- enrichissement email et contact scoré;
- qualification modulaire;
- Airtable robuste;
- preview HTML exploitable;
- séparation entre qualification auto et validation humaine.

### Ce qui manque encore pour valider commercialement
- email trop statique;
- tracking quasi nul;
- pas de vraie vérification email avant envoi;
- preview pas encore pensée comme un vrai outil de conversion;
- pas de funnel de mesure complet;
- pas de test formel des variantes;
- pas encore de preuve que le canal répond.

## Proposition de valeur détaillée
### Offre principale
Amélioration de ranking local et de conversion locale sans dépendre d'un budget Ads élevé.

### Sous-promesses
- meilleure fiche Google Business;
- plus d'activité perçue par Google;
- meilleure cohérence locale;
- meilleure preuve sociale;
- meilleur clic / appel / visite;
- meilleur support commercial pour une acquisition récurrente.

### Preuves à montrer
- score actuel du business;
- position ranking actuelle;
- comparaison avec concurrents mieux positionnés;
- audit des points manquants;
- preview d'amélioration;
- exemple de posts/updates prêts à publier.

## Produit cible
### Module 1. Lead Discovery
Entrées:
- ville;
- catégories;
- mots-clés de recherche.

Sorties:
- business détectés;
- ranking position;
- note;
- volume d'avis;
- coordonnées;
- site / socials;
- statut digital;
- signaux de pain point.

### Module 2. Lead Intelligence
Sorties attendues:
- diagnostic de visibilité;
- diagnostic de conversion;
- diagnostic GBP;
- diagnostic contenu;
- diagnostic contactabilité;
- diagnostic “site absent / faible / inutile / suffisant”.

### Module 3. Improvement Engine
Artefacts:
- preview de site ou landing page;
- suggestions d'optimisation GBP;
- calendrier de posts hebdo;
- copy locale;
- description optimisée;
- services / produits mieux structurés;
- suggestions d'images / catégories / FAQ.

### Module 4. Outreach Engine
Canaux:
- email;
- téléphone;
- Instagram DM;
- Facebook;
- WhatsApp si visible.

### Module 5. Delivery Engine
Livrables:
- updates fiche GBP;
- posts hebdo;
- réponse / gestion d'avis potentiellement assistée;
- génération de contenu local;
- landing pages locales;
- reporting simple.

## Gaps de conversion à traiter avant de scale
### 1. Email trop générique
Aujourd'hui, l'outreach n'est pas assez spécifique au lead.

Ce qu'il faut:
- plusieurs variantes de sujet;
- une première ligne ancrée sur un fait réel du business;
- un CTA dual:
  - voir la démo;
  - réserver un créneau.

### 2. Preview pas encore assez orientée conversion
La preview doit montrer un bénéfice, pas seulement un site “propre”.

Ce qu'il faut:
- hero avec preuve sociale;
- angle vertical par catégorie;
- copy orientée bénéfice mobile / conversion locale;
- schema.org `LocalBusiness`;
- contrôle qualité mobile.

### 3. Tracking trop faible
Sans tracking, on n'apprend rien.

Ce qu'il faut:
- UTM dans les liens;
- tracking ouverture / clic / bounce;
- champs Airtable associés;
- dashboard funnel.

### 4. Vérification contact trop faible
Le score de confiance ne suffit pas.

Ce qu'il faut:
- validation email avant envoi;
- stratégie de fallback par canal;
- marquage clair des leads à vérifier à la main.

### 5. Pas encore de boucle d'expérimentation
On a un pipeline, mais pas encore une machine d'itération mesurable.

Ce qu'il faut:
- A/B test;
- holdout;
- relances;
- suivi des réponses.

## Roadmap par phases
### Phase 0. Fondation
Objectif:
- obtenir une boucle complète discovery -> qualification -> preview -> sync -> revue.

Déjà largement atteint:
- scan Google Maps;
- qualification locale;
- enrichissement contacts;
- preview HTML;
- sync Airtable;
- dashboard local.

### Phase P0. Validation conversion avant premier vrai batch
Objectif:
- rendre le canal mesurable et crédible avant volume.

À faire:
- améliorer l'email:
  - variantes d'objet;
  - first line personnalisée;
  - CTA dual;
  - footer propre et conformité minimale;
- améliorer la preview:
  - hook vertical;
  - social proof;
  - schema.org;
  - copie plus bénéfice;
- ajouter le tracking minimal:
  - UTM;
  - webhooks ou fallback tracking;
  - champs Airtable;
- vérifier les emails avant envoi;
- ajouter tests preview + outreach.

Livrable attendu:
- un batch pilote de `10-15` leads réellement mesurable.

### Phase P1. Validation du canal
Objectif:
- comprendre ce qui convertit réellement.

À faire:
- A/B test formel sur sujets et previews;
- holdout d'une partie des leads;
- relances J+5 / J+10;
- dashboard funnel complet;
- segmentation par verticale:
  - restaurant;
  - café;
  - boulangerie / pâtisserie.

Livrable attendu:
- premier signal fiable d'open rate, click rate, reply rate et rendez-vous.

### Phase P2. Discovery commerciale robuste
Objectif:
- passer de “bons business sans site” à “bons business sous-exploités”.

À faire:
- calculer la position ranking Maps proprement;
- stocker la position par requête;
- gérer plusieurs observations par lead;
- séparer `ranking pain` et `website pain`;
- générer un `pain_point` commercial lisible;
- générer un `offer_angle`.

Livrable attendu:
- fiche lead avec `ranking_position`, `pain_point`, `offer_angle`.

### Phase P3. Intelligence locale
Objectif:
- comprendre précisément ce qui peut être amélioré.

À faire:
- analyser la complétude GBP;
- analyser catégories et attributs;
- analyser fréquence des posts;
- analyser fraîcheur des photos;
- analyser cohérence horaires / services / CTA;
- comparer à `3-5` concurrents locaux mieux classés.

Livrable attendu:
- mini audit local automatisé.

### Phase P4. Improvement Preview
Objectif:
- montrer une amélioration claire avant même l'appel.

À faire:
- générer une preview plus crédible;
- générer une preview d'optimisation GBP;
- générer un plan éditorial hebdomadaire;
- générer une série d'updates/posts prêts à publier.

Livrable attendu:
- preuve visuelle;
- preuve SEO locale;
- preuve d'activité continue.

### Phase P5. Outreach multicanal
Objectif:
- ne plus dépendre uniquement de l'email.

À faire:
- détecter le meilleur canal par lead;
- générer un message adapté par canal;
- brancher un moteur d'envoi;
- gérer séquences et relances.

Choix probables:
- logique métier maison;
- couche délivrabilité possiblement externe.

### Phase P6. Exécution client automatisée
Objectif:
- une fois signé, produire la valeur récurrente automatiquement.

À faire:
- programmation des posts GBP;
- génération de texte local;
- propositions d'updates hebdo;
- synchronisation avec outils externes;
- reporting.

### Phase P7. Agents et opérations autonomes
Objectif:
- réduire progressivement le travail manuel.

Agents envisagés:
- agent discovery;
- agent qualification;
- agent audit;
- agent preview;
- agent outreach;
- agent delivery.

Principe:
- garder une approbation humaine au début;
- réduire progressivement l'intervention humaine.

## Machine commerciale cible
1. Chercher un segment local.
2. Récupérer les business bien notés mais sous-exploités.
3. Calculer ranking, potentiel et pain points.
4. Enrichir les contacts.
5. Générer audit + preview + angle commercial.
6. Choisir le canal de contact.
7. Envoyer la séquence.
8. Qualifier la réponse.
9. Convertir.
10. Exécuter automatiquement le service signé.

## KPIs cibles
### Acquisition
- nombre de leads par batch;
- part de leads rank `7-25`;
- part de leads avec pain point clair;
- part de leads contactables.

### Outreach
- open rate;
- click rate;
- bounce rate;
- reply rate;
- taux de rendez-vous.

### Delivery commerciale
- délai scan -> draft_ready;
- part de leads avec preview;
- part de leads avec audit;
- coût par lead exploitable.

## Ordre recommandé maintenant
L'ordre de travail le plus rationnel est:
1. verrouiller la conversion de base;
2. rendre le canal mesurable;
3. ensuite seulement enrichir ranking/pain point à grande échelle;
4. puis industrialiser l'audit et la delivery.

En pratique, cela veut dire:
1. email + preview + tracking + validation email;
2. batch pilote mesuré;
3. ranking Maps + pain point + audit local;
4. outreach multicanal;
5. delivery automatisée.

## Références associées
- plan de sprints: [sprint-plan.md](/Users/jeremy/dev/scraping-lab/docs/lead-finder/sprint-plan.md)
- board des tâches: [task-board.md](/Users/jeremy/dev/scraping-lab/docs/lead-finder/task-board.md)
- backlog détaillé: [execution-backlog.md](/Users/jeremy/dev/scraping-lab/docs/lead-finder/execution-backlog.md)
- doc technique: [technical-complete.md](/Users/jeremy/dev/scraping-lab/docs/lead-finder/technical-complete.md)
- benchmark génération de contenu: [content-generation-benchmark.md](/Users/jeremy/dev/scraping-lab/docs/lead-finder/content-generation-benchmark.md)
