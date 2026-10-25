# Plan d’évolution de la pharmacie — validé

Ce document propose le périmètre global des prochaines modifications. Le périmètre est validé par l’utilisateur (« procède »). Le développement suit l’ordre prévu. La facturation, les documents certifiés et leur historique seront conservés.

## 1. Fiche client et historique des achats

L’écran client actuel contient les fonctions de consultation, mais son historique n’est pas alimenté depuis PostgreSQL. Le premier travail est de raccorder les ventes et leurs avoirs au client concerné.

Au clic sur un client, ouvrir une seule fenêtre composée de deux panneaux accolés :

- **À gauche : la fiche client** — nom ou entreprise, NIF s’il existe, coordonnées et informations d’assurance déjà disponibles.
- **À droite : son historique** — achats, dates, références, articles et quantités, remises, montants et état de certification ; les avoirs apparaissent liés à leur facture de vente d’origine.

Prévoir une recherche et des filtres de période et de type de document, une pagination, l’accès au détail et l’impression d’une pièce certifiée. Afficher le nombre d’achats validés, le dernier achat et le total net des avoirs. Les ventes en cours, les opérations annulées et les paiements ne doivent pas être confondus avec les achats définitivement validés. Un achat anonyme ne sera pas attribué automatiquement à une personne.

Sur un petit écran, les deux panneaux deviennent deux onglets « Informations » et « Historique ». Le rafraîchissement conserve les filtres et la position de lecture.

**Option incluse dans la proposition :** un bouton « Parcours » ouvre une vue React Flow, en lecture seule et chargée à la demande. Une vente et ses avoirs sont reliés ; chaque élément ouvre son détail. La liste chronologique reste la vue principale.

**Validation attendue :** seuls les achats du client sélectionné apparaissent ; les avoirs réduisent correctement le total net ; une modification de la fiche client ne réécrit pas l’identité figurant sur les factures déjà certifiées.

## 2. Lots, péremptions et traçabilité du stock

Ajouter plusieurs lots par médicament : numéro de lot, fournisseur, réception, péremption, emplacement et quantités. Distinguer les quantités disponibles, réservées pour des ventes en attente, bloquées et périmées.

À la vente, proposer d’abord le lot disponible qui expire le plus tôt, avec contrôle serveur contre les sorties concurrentes et le stock négatif. Bloquer les lots périmés et permettre le suivi des lots à retirer. Un retour client est lié à la vente et à son lot ; sa remise en stock vendable exige un contrôle explicite.

Conserver un journal des mouvements avec date, utilisateur, motif et document associé. La reprise du stock existant doit être rapprochée des quantités actuelles : aucun numéro de lot fabricant ne sera inventé, et les lots non identifiés seront signalés pour qualification.

**Validation attendue :** deux lots d’un même article conservent leurs quantités et péremptions distinctes ; une vente débite le bon lot ; un transfert ne change pas le stock total ; la reprise d’une certification ne débite pas une deuxième fois le stock.

## 3. Entrées, réceptions partielles et inventaires

Permettre plusieurs réceptions pour une commande fournisseur. Chaque réception enregistre les quantités réellement reçues et leurs lots, sans doubler une entrée si elle est renvoyée deux fois.

Créer des séances d’inventaire avec quantité théorique, quantité comptée et écart. Une correction nécessite un motif et les droits adaptés ; elle crée un mouvement traçable plutôt qu’une modification silencieuse du stock.

**Validation attendue :** une commande reçue en deux fois augmente le stock du total effectivement livré ; une réception répétée reste sans effet supplémentaire ; un écart d’inventaire est explicable dans le journal.

## 4. Conditionnements et vente à l’unité

Définir les conditionnements par article : boîte, plaquette ou unité, selon les produits. Configurer leurs conversions et leurs codes-barres éventuels. Les achats, ventes et inventaires utilisent une unité de stock commune pour éviter les doubles comptages.

**Validation attendue :** une vente à l’unité puis une vente par boîte produisent des quantités cohérentes, avec des prix et remises clairement affichés.

## 5. Caisse, sécurité et continuité

Compléter les sessions de caisse : ouverture, encaissements par moyen de paiement, avoirs, clôture et écarts justifiés. Vérifier séparément les rapports fiscaux requis dans le dossier de certification : une clôture interne ne sera pas présentée comme un rapport DGI homologué.

Vérifier les droits côté serveur, programmer des sauvegardes et éprouver la restauration sur une base isolée. Tester les coupures DGI et les reprises, sans duplication de facture ni de mouvement de stock.

**Validation attendue :** le montant de caisse est rapprochable de ses opérations ; les actions sensibles sont réservées aux rôles autorisés ; une sauvegarde peut être restaurée et vérifiée.

## Ordre proposé et validation globale

1. Livrer la fiche client avec les deux panneaux et l’historique réel.
2. Construire les lots et le journal de stock, puis les raccorder aux ventes et retours.
3. Ajouter les réceptions partielles et les inventaires.
4. Ajouter les conditionnements et conversions.
5. Finaliser les clôtures, sauvegardes et contrôles de continuité.
6. Ajouter la vue React Flow après stabilisation de l’historique client, sans retarder la liste principale.

À chaque étape : migrations préservant les données, vérifications métier sur une base isolée, puis contrôle des écrans. Les essais DGI restent dans l’environnement de test. Aucune bascule en production n’est incluse dans cette validation de développement.

**Statut : validé ; évolutions intégrées et vérifiées localement.**

Voir le compte rendu `LIVRAISON_EVOLUTION_PHARMACIE.md` pour les parcours livrés, les preuves de test et les actions préalables d’exploitation, notamment la qualification des lots repris.
