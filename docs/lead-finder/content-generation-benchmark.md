# Signal Canvas Benchmark — Génération de contenu et de sites

Date de vérification:
- `2026-04-17`

## But
Comparer les solutions existantes pour la génération de contenu et surtout de sites web dans le contexte Signal Canvas.

Le contexte visé n'est pas:
- créer un site unique à la main pour un seul client.

Le contexte visé est:
- générer vite une démo crédible;
- pouvoir personnaliser suffisamment;
- garder une possibilité d'automatisation à grande échelle;
- limiter le lock-in produit si on veut ensuite opérer nous-mêmes la delivery.

## Question stratégique
Le vrai sujet n'est pas seulement “quel builder est le meilleur ?”.

Le vrai sujet est:
- quelle partie on achète;
- quelle partie on garde en interne;
- quelle couche doit rester sous notre contrôle si on veut automatiser la production.

## Grille d'évaluation
Chaque solution a été regardée selon:
- vitesse de génération;
- qualité visuelle de sortie;
- niveau de customisation;
- capacité d'automatisation;
- intérêt agence / multi-sites / white-label;
- lock-in;
- pricing;
- pertinence pour notre cas.

## Résumé exécutif
### Ce qui ressort nettement
Pour notre use case, il y a en réalité 4 familles de solutions:

1. builders IA “tout-en-un” très rapides
- `Durable`
- `Hostinger`
- `Wix`
- `WordPress.com AI`

2. builders design premium
- `Framer`
- `Webflow`

3. solutions plus agence / white-label / industrialisation
- `Dorik`
- `10Web`
- `Elementor / WordPress`

4. couches de génération ou de prototypage, pas idéales comme moteur principal de livraison SMB
- `Relume`
- `v0`
- `Lovable`

### Recommandation nette
Pour Signal Canvas, la meilleure direction n'est probablement pas de déléguer toute la génération de site à un builder tiers unique.

La meilleure architecture cible est plutôt:
- garder notre modèle de contenu, notre scoring, notre logique de pain point et notre moteur de génération en interne;
- utiliser un outil externe seulement si son rôle est très clair:
  - hébergement rapide;
  - rendu premium;
  - export;
  - white-label;
  - ou industrialisation WordPress.

En pratique:
- pour des démos ultra-rapides: `Hostinger` ou `Durable`;
- pour des sites premium montrables: `Framer`;
- pour une industrialisation agence / white-label: `Dorik` ou `10Web`;
- pour des livrables réellement durables et très custom: notre générateur interne ou une base `WordPress/Elementor`.

## Analyse détaillée par solution
## 1. Durable
### Positionnement
Builder IA tout-en-un ultra-rapide pour petites entreprises.

### Ce que Durable fait bien
- génération très rapide;
- hébergement inclus;
- CRM inclus;
- réservation et paiements;
- angle “business launch” plus large que le simple site;
- orientation forte sur SEO et visibilité IA.

### Limites
- customisation HTML limitée;
- peu adapté si on veut un rendu vraiment premium ou sur-mesure;
- lock-in assez fort;
- moins bon si on veut une vraie base technique durable pour la suite.

### Pricing observé
Source officielle vérifiée le `2026-04-17`:
- `Free`: `$0`
- `Launch`: `$25/mo` en mensuel, affiché aussi à `$22/mo` dans le tableau comparatif annuel
- `Grow`: `$99/mo` en mensuel, affiché aussi à `$85/mo` dans le tableau comparatif annuel

### Signaux utiles
- domaine custom inclus selon plan;
- trafic illimité;
- génération d'images;
- chat IA orienté business;
- “AI visibility ranking” hebdo ou quotidien selon plan.

### Verdict
Très bon outil pour:
- sortir une démo vite;
- tester une offre;
- livrer du “good enough” à des TPE.

Moins bon comme brique principale si on veut:
- un rendu haut de gamme;
- une grande liberté technique;
- une vraie stack industrialisable sous notre contrôle.

## 2. Hostinger AI Website Builder
### Positionnement
Builder IA très agressif en prix, orienté SMB, avec hébergement inclus.

### Ce que Hostinger fait bien
- coût d'entrée très bas;
- peut gérer plusieurs sites;
- beaucoup d'outils IA inclus;
- bon rapport capacité/prix;
- intéressant pour une logique de factory.

### Limites
- les prix affichés sont très promotionnels et liés à un engagement long;
- rendu visuel correct mais moins premium que Framer/Webflow;
- personnalisation plus limitée qu'une stack code-first;
- risque de dépendre d'une UX builder assez fermée.

### Pricing observé
Source officielle vérifiée le `2026-04-17`:
- `Premium Website Builder`: `$2.99/mo` sur 48 mois, renouvellement `$10.99/mo`
- `Business Website Builder`: `$3.99/mo` sur 48 mois, renouvellement `$16.99/mo`

### Signaux utiles
- jusqu'à `3` sites sur Premium;
- jusqu'à `50` sites sur Business;
- AI writer, AI image, AI blog, AI SEO assistant, AI logo;
- emails inclus temporairement;
- e-commerce sur Business.

### Verdict
Très intéressant pour:
- produire beaucoup de sites pas trop chers;
- faire une offre très compétitive;
- garder un coût de delivery bas.

Moins intéressant si notre différenciation centrale doit être:
- design premium;
- personnalisation profonde;
- migration propre vers une stack maison.

## 3. Wix AI Website Builder
### Positionnement
Builder généraliste, très riche fonctionnellement, avec AI builder et éditeur drag-and-drop.

### Ce que Wix fait bien
- écosystème mature;
- rendez-vous, e-commerce, blog, CRM, formulaires;
- bonne autonomie client final;
- personnalisation correcte côté non-tech.

### Limites
- moins agréable à industrialiser en mode “pipeline maison”;
- lock-in fort;
- moins adapté à un workflow fortement programmatique;
- les prix et promos varient selon pays / taxes / campagnes.

### Pricing observé
Source officielle vérifiée le `2026-04-17`:
- la page affichait des prix incluant GST et une promo en cours;
- `Light`: `17.77/mo`
- `Core`: `29.77/mo`
- plan supérieur vu sur la page: `39.77/mo`

### Signal important
J'interprète ces montants comme des prix promotionnels/localisés, pas comme une base stable universelle.

### Verdict
Bon si on veut:
- livrer des sites que le client gère lui-même;
- bénéficier d'un écosystème business complet.

Moins bon si on veut:
- automatiser fortement la production;
- maîtriser proprement l'export ou la stack;
- opérer une vraie factory à grande échelle.

## 4. Framer
### Positionnement
Builder orienté marketing sites très design, plus premium visuellement.

### Ce que Framer fait bien
- excellente qualité visuelle;
- très bon pour landing pages et vitrines modernes;
- rapide pour itérer;
- bon compromis entre vitesse et rendu premium.

### Limites
- moins orienté CRM / business ops que Wix ou Durable;
- moins naturel pour une logique “des dizaines de SMB sites standardisés avec process interne”;
- industrialisation plus limitée qu'un moteur maison ou WordPress API-first.

### Pricing observé
Source officielle vérifiée le `2026-04-17`:
- `Basic`: `$10/mo`
- éditeurs additionnels:
  - `$20/editor` sur Basic
  - `$40/editor` sur plans supérieurs
- add-ons:
  - traduction IA: `$20 / locale`
  - A/B testing / funnels: `$50 / 500,000 events`
  - advanced hosting: `$200`

### Signal utile
Le plan Basic visible dans l'extrait inclut:
- domaine custom;
- `30` pages;
- `1` collection CMS;
- `1,000` items CMS;
- `10 GB` de bande passante.

### Verdict
Très bon candidat si on veut:
- une démo ou un site final très beau;
- une offre premium pour restos/cafés haut de gamme;
- impressionner dès la preview.

Si on choisit Framer, il vaut mieux le réserver:
- aux leads à fort potentiel;
- ou comme couche de démonstration premium.

## 5. Webflow
### Positionnement
Plateforme plus puissante, plus structurée, meilleure pour marketing/CMS sérieux.

### Ce que Webflow fait bien
- forte customisation;
- CMS robuste;
- niveau pro/agence élevé;
- bon pour sites marketing structurés;
- bonne image premium.

### Limites
- plus coûteux et plus complexe à opérer;
- plus lourd pour une factory très simple;
- pas idéal si on veut “cracher des démos locales” à très faible coût.

### Pricing observé
Source officielle vérifiée le `2026-04-17`:
- `Starter`: `Free`
- `Basic`: `$14/mo` facturé annuellement
- `CMS`: `$23/mo` facturé annuellement
- `Business`: `$39/mo` facturé annuellement
- `Workspace Core`: `$19/mo` facturé annuellement
- `Workspace Growth`: `$49/mo` facturé annuellement

### Verdict
Très bon si on vise:
- une vraie offre premium récurrente;
- des sites marketing structurés;
- une équipe qui veut un outil pro.

Moins bon comme base V1 si l'objectif premier est:
- vitesse;
- bas coût par lead;
- automatisation simple.

## 6. Dorik
### Positionnement
Builder plus agence-friendly, avec white-label et code export.

### Ce que Dorik fait bien
- offre agence lisible;
- white-label dashboard;
- client billing;
- génération IA illimitée sur plans payants;
- code export.

### Limites
- moins “premium brand” que Framer/Webflow;
- moins écosystème grand public que Wix;
- design et extensibilité à tester plus en profondeur avant décision finale.

### Pricing observé
Source officielle vérifiée le `2026-04-17`:
- `Free`: `$0`
- `Pro`: `$49/mo` ou `$468/an`
- `Agency`: `$99/mo` ou `$948/an`

### Signaux utiles
- AI website generation illimitée sur plans payants;
- white-label dashboard;
- white-label documentation;
- client billing;
- code export limité sur Pro, illimité sur Agency.

### Verdict
Une des options les plus intéressantes si on veut:
- opérer en mode agence;
- garder une présentation white-label;
- créer beaucoup de sites;
- rester plus souple qu'avec Wix/Durable.

## 7. 10Web
### Positionnement
WordPress + IA + industrialisation, avec angle API / partenaires.

### Ce que 10Web fait bien
- plus adapté à une logique programme/agence;
- base WordPress plus portable;
- angle API très pertinent pour automatisation;
- bon compromis entre IA et stack standard.

### Limites
- stack WordPress donc plus d'opérations qu'un builder ultra fermé;
- rendu et workflow à valider selon nos exigences de design;
- documentation / offre enterprise à creuser avant engagement.

### Pricing observé
Source officielle vérifiée le `2026-04-17`:
- API builder enterprise: “starts at `$5/site`”;
- peut descendre à `$3.5/site/month` à l'échelle.

### Verdict
Très intéressant si notre vraie ambition est:
- lancer une usine à sites;
- automatiser la génération;
- rester sur une base plus standard que Durable/Wix;
- garder une sortie WordPress.

Probablement l'une des pistes les plus sérieuses à creuser.

## 8. WordPress.com AI Website Builder
### Positionnement
Builder IA sur base WordPress.com managé.

### Ce que WordPress.com fait bien
- AI builder utilisable gratuitement pour démarrer;
- publication sur plans payants;
- base WordPress familière;
- meilleur potentiel de pérennité que certains builders plus fermés.

### Limites
- moins “agency factory” que Dorik/10Web;
- moins premium visuellement qu'un bon Framer;
- moins simple à standardiser qu'un moteur 100% interne.

### Pricing observé
Sources officielles vérifiées le `2026-04-17`:
- l'AI builder peut être utilisé gratuitement pour créer;
- pour publier il faut passer sur un plan payant;
- `Personal`: `$4/mo` annuel
- `Premium`: `$8/mo` annuel
- `Business`: `$25/mo` annuel

### Verdict
Option sérieuse si on veut:
- une base WordPress managée;
- plus de solidité qu'un builder purement marketing;
- un coût encore raisonnable.

## 9. Elementor / WordPress
### Positionnement
Option plus flexible et plus durable sur WordPress, avec IA intégrée dans l'éditeur.

### Ce que Elementor fait bien
- customisation forte;
- très bon pour une vraie production client;
- IA intégrée pour copy, code, images et layouts;
- un abonnement IA peut couvrir plusieurs sites;
- bon potentiel si on veut garder le contrôle de la delivery.

### Limites
- plus d'opérations que des builders fermés;
- plus de décisions techniques;
- moins instantané pour produire des previews jetables en masse;
- pricing actuel moins lisible dans les extraits officiels.

### Pricing observé
Sources officielles vérifiées le `2026-04-17`:
- la page officielle actuelle masque mal certains montants dans l'extraction;
- l'aide officielle mentionne qu'un ancien plan AI Write coûtait `$2.99/mo` avant évolution;
- le blog officiel Elementor mentionne un tarif régulier de `$3.99/mo` pour l'offre AI d'entrée de gamme dans une promo anniversaire;
- la page pricing officielle confirme surtout la structure:
  - IA;
  - crédits partagés;
  - offre `One` avec expérience complète site + IA.

### Verdict
À considérer si on veut:
- une vraie capacité de customisation;
- une base WordPress plus durable;
- de la production récurrente.

Mais ce n'est probablement pas notre meilleur point de départ pour la démo V1.

## 10. Relume
### Positionnement
Génération de sitemap, wireframes, copy et composants. Ce n'est pas un moteur de site final à lui seul.

### Ce que Relume fait bien
- excellent pour la structuration;
- rapide pour passer d'un brief à un sitemap;
- export Figma, Webflow, React + HTML;
- utile comme couche de planning UI.

### Limites
- pas le meilleur choix comme moteur principal de livraison SMB;
- suppose ensuite un builder ou un framework en sortie;
- pricing exact peu lisible dans l'extrait officiel accessible.

### Pricing observé
Source officielle vérifiée le `2026-04-17`:
- plans visibles: `Free`, `Starter`, `Pro`, `Team`
- l'extrait accessible montre les capacités, mais pas les montants de manière fiable

### Verdict
Très utile comme couche amont:
- cadrage du site;
- wireframing rapide;
- export vers une stack plus sérieuse.

Pas adapté comme plateforme centrale unique pour Signal Canvas.

## 11. v0
### Positionnement
Générateur UI/app code-first, plus proche d'un copilote de dev que d'un site builder SMB.

### Ce que v0 fait bien
- rapidité de prototypage;
- génération code/UI;
- connexion naturelle à une stack moderne;
- très bon pour créer des templates internes.

### Limites
- demande ensuite une vraie couche de déploiement/maintenance;
- moins adapté au mode “client final autonome dans un builder”;
- pas la solution la plus simple si on veut industrialiser des sites SMB très répétitifs sans équipe produit.

### Pricing observé
Source officielle vérifiée le `2026-04-17`:
- `Free`: `$0/month`
- `Premium`: `$20/month`
- `Team`: `$30/user/month`
- `Business`: `$100/user/month`

### Verdict
Très bon pour:
- construire notre propre moteur/templates;
- accélérer le développement interne.

Pas idéal comme produit final livré en direct à de petits commerces sans couche supplémentaire.

## 12. Lovable
### Positionnement
Génération d'apps/sites plus généraliste, proche d'un constructeur produit/app.

### Ce que Lovable fait bien
- collaboration;
- génération par conversation;
- sync GitHub;
- utile pour des interfaces ou outils internes plus riches qu'un simple site vitrine.

### Limites
- moins centré sur le cas “site vitrine local SMB”;
- coût et logique crédits plus adaptés à des apps qu'à une usine de sites vitrines.

### Pricing observé
Source officielle vérifiée le `2026-04-17`:
- `Free`: `$0/month`
- `Pro`: `$25/month`
- `Business`: `$50/month`
- cloud et AI ensuite partiellement usage-based

### Verdict
Très intéressant pour:
- des dashboards;
- des outils internes;
- des portails;
- des workflows de delivery.

Moins pertinent comme brique principale de génération de vitrines locales.

## Solutions plus orientées SEO local / GBP que génération de site
## Localo
### Intérêt
Pas un vrai moteur principal de création de site, mais très intéressant pour:
- ranking local;
- tâches hebdo;
- audits GBP;
- génération et publication de posts;
- lead generation agence.

### Pricing observé
Source officielle vérifiée le `2026-04-17`:
- `Single Business`: `$39/mo` facturé annuellement
- `Pro`: `$149/mo` facturé annuellement
- `Enterprise`: sur devis

### Signal utile
Localo met en avant:
- AI agent;
- rank checker;
- client acquisition;
- reports;
- bulk content posting;
- website builder basé sur le profil Google Business.

### Verdict
Très intéressant à creuser pour:
- l'optimisation GBP;
- l'opération récurrente après signature;
- les audits et leads.

Probablement plus pertinent comme couche d'optimisation locale que comme moteur principal de site.

## GrowthPro AI
### Intérêt
Plateforme plus large de SEO local, AI search visibility et automation multi-location.

### Pricing observé
Source officielle vérifiée le `2026-04-17`:
- `Single Location`: `$300/mo`
- `2-100 locations`: `$60/location/mo`
- `101-300`: `$40/location/mo`
- `301+`: `$20/location/mo`
- add-ons:
  - WhatsApp automation: `$75/mo`
  - AI voice agent: `$0.8/min`

### Verdict
Très orienté optimisation locale et opérations récurrentes, moins adapté à notre besoin immédiat de génération de site démo low-cost.

## Comparatif synthétique
| Solution | Vitesse | Customisation | Automatisation | White-label / agence | Lock-in | Pertinence Signal Canvas |
|---|---|---:|---:|---:|---:|---|
| Durable | Très forte | Faible à moyenne | Faible à moyenne | Faible | Fort | Bien pour démos rapides |
| Hostinger | Très forte | Moyenne | Moyenne | Moyenne | Moyen à fort | Très bon pour volume low-cost |
| Wix | Forte | Moyenne | Faible à moyenne | Moyenne | Fort | Bon pour livrer en autonomie client |
| Framer | Forte | Moyenne à forte | Moyenne | Moyenne | Moyen | Excellent pour previews premium |
| Webflow | Moyenne | Forte | Moyenne | Forte | Moyen | Très bon premium, plus lourd |
| Dorik | Forte | Moyenne | Moyenne | Forte | Moyen | Très bon candidat agence |
| 10Web | Moyenne | Forte | Forte | Forte | Moyen | Très bon candidat industrialisation |
| WordPress.com | Moyenne | Moyenne | Moyenne | Moyenne | Moyen | Correct, plus sage que sexy |
| Elementor/WordPress | Moyenne | Très forte | Forte | Forte | Faible à moyen | Très bon pour delivery durable |
| Relume | Forte | N/A | Moyenne | Moyenne | Faible | Très bon en couche amont |
| v0 | Forte | Très forte | Forte | Faible | Faible | Très bon pour moteur interne |
| Lovable | Moyenne | Forte | Forte | Moyenne | Faible à moyen | Plutôt outil interne/app |

## Recommandation par scénario
## Scénario A. Démo commerciale ultra-rapide
But:
- scanner;
- qualifier;
- sortir une démonstration visuelle vite.

Options les plus crédibles:
- `Hostinger`
- `Durable`
- `Framer` si on privilégie la qualité perçue.

Mon avis:
- `Framer` pour les meilleurs leads;
- `Hostinger` si on veut un coût d'expérimentation très bas;
- `Durable` seulement si on veut tester une production “presque sans design”.

## Scénario B. Offre premium “site vitrine + visibilité locale”
But:
- vendre plus cher;
- impressionner;
- avoir un vrai rendu premium.

Options les plus crédibles:
- `Framer`
- `Webflow`
- `Elementor/WordPress`

Mon avis:
- `Framer` est probablement le meilleur compromis démo premium / vitesse;
- `WordPress/Elementor` est plus durable en delivery si le client signe.

## Scénario C. Factory de sites semi-automatique
But:
- produire beaucoup;
- standardiser;
- opérer comme agence automatisée.

Options les plus crédibles:
- `Dorik`
- `10Web`
- `Hostinger`

Mon avis:
- `10Web` est la piste la plus sérieuse si on veut automatiser proprement;
- `Dorik` est très intéressant pour l'angle agence white-label;
- `Hostinger` est le meilleur pari si on cherche le coût minimal.

## Scénario D. Moteur interne propriétaire
But:
- garder la logique de génération chez nous;
- ne pas dépendre d'un builder fermé;
- pouvoir orchestrer tout le pipeline via agents.

Options les plus crédibles:
- générateur interne actuel;
- `v0` comme accélérateur de templates;
- éventuellement `WordPress/Elementor` ou `10Web` comme couche de sortie.

Mon avis:
- c'est probablement la meilleure direction à moyen terme.

## Conclusion franche
Si on veut seulement valider le business vite:
- il faut probablement accepter un outil externe.

Si on veut construire un vrai avantage durable:
- il faut garder notre moteur de contenu, nos règles métier et notre logique de génération en interne.

La combinaison la plus prometteuse aujourd'hui me paraît être:
1. pipeline de discovery/qualification interne;
2. moteur de contenu interne;
3. sortie preview premium sur `Framer` ou HTML statique interne;
4. piste parallèle à creuser pour industrialisation:
   - `10Web`
   - `Dorik`
   - ou `WordPress/Elementor`.

## Décision recommandée maintenant
Je recommande de ne pas choisir tout de suite un builder unique pour tout.

Je recommande plutôt de tester 3 rails:
1. `Framer` pour la preview premium;
2. `10Web` pour la piste industrialisation / API;
3. `Dorik` pour la piste agence white-label.

Ensuite, on compare sur un petit benchmark interne:
- temps de génération;
- qualité perçue;
- facilité de personnalisation;
- facilité de scaling;
- coût réel par site livré.

## Sources officielles
- [Durable pricing](https://durable.com/pricing)
- [Wix pricing](https://www.wix.com/plans)
- [Framer pricing](https://www.framer.com/pricing)
- [Webflow pricing](https://webflow.com/pricing)
- [Hostinger AI Website Builder](https://www.hostinger.com/ai-website-builder)
- [Dorik pricing](https://dorik.com/pricing)
- [10Web AI Website Builder API announcement](https://10web.io/press-kit/press-release-website-builder-api/)
- [WordPress.com plans](https://wordpress.com/plans)
- [WordPress.com AI website builder support](https://wordpress.com/support/ai-website-builder/)
- [Elementor AI](https://elementor.com/elementor-ia/)
- [Elementor pricing](https://elementor.com/pricing)
- [Relume pricing](https://www.relume.io/pricing)
- [v0 pricing](https://chat.v0.dev/pricing)
- [Lovable pricing](https://lovable.dev/pricing)
- [Localo pricing](https://localo.com/pricing)
- [GrowthPro AI pricing](https://growthproai.com/pricing)
