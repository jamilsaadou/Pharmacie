# Évolutions de la pharmacie — livraison locale du 16 octobre 2026

Le périmètre validé dans le plan global est intégré à l’application locale, servie sur http://127.0.0.1:3100. La migration PostgreSQL a été vérifiée sur une copie temporaire de gestion_pharma, puis appliquée à cette base après sauvegarde chiffrée. Les factures historiques sont conservées. Aucune bascule DGI en production ni nouvelle émission DGI n’a eu lieu pendant cette évolution.

## Utilisation

### Clients : fiche et achats côte à côte

Dans **Clients**, le bouton avec l’œil ouvre une fiche composée de deux panneaux : coordonnées et assurances à gauche ; achats et avoirs à droite. Sur petit écran, les onglets Informations et Historique remplacent les panneaux. Les recherches, filtres de dates et de type, le détail et l’impression d’une copie certifiée sont accessibles dans cet écran.

Les indicateurs comptent les ventes FV/EV terminées et certifiées. Les avoirs FA/EA certifiés diminuent le total net ; les opérations en attente et annulées restent distinguées. Les achats anonymes ne sont pas attribués à un client. Les coordonnées de la fiche peuvent changer sans réécrire les données historiques d’une facture certifiée.

Le bouton **Parcours** charge une vue React Flow en lecture seule et relie les avoirs à leurs ventes. Elle affiche au maximum 200 documents correspondant aux filtres ; la liste paginée reste le mode principal. Les rafraîchissements conservent les filtres.

### Lots et inventaires

Le nouveau menu **Lots & inventaires** propose Lots, Mouvements, Inventaires et Conditionnements. Le stock physique inclut les unités réservées. Seuls les lots qualifiés, disponibles et non périmés alimentent le catalogue vendable. La vente réserve d’abord les lots expirant le plus tôt ; sa confirmation consomme la réservation sans débiter une seconde fois. Une annulation confirmée libère la réservation une seule fois. Les transmissions fiscales incertaines restent à rapprocher.

**Action préalable sur le stock repris :** à la migration, 14 unités libres et 4 réservées ont été conservées, soit 18 unités physiques. Le numéro fabricant n’étant pas présent dans l’ancien modèle, les lots sont marqués « À qualifier ». Vérifier les emballages, puis renseigner le numéro réel et la péremption dans **Qualifier**, avec un motif. Aucun numéro fabricant n’a été inventé. Une vente en attente réservant un tel lot exige sa qualification avant certification.

Une entrée demande un article, un numéro de lot, une péremption, une quantité en unités de stock et un motif. Un lot périmé est exclu des ventes. Les déplacements conservent la quantité physique totale. Les corrections passent par un inventaire justifié, jamais par l’édition silencieuse de la quantité du médicament.

Un inventaire photographie les quantités libres et réservées. Le comptage porte sur les unités physiquement présentes, réservations incluses. Chaque écart exige un motif. Un mouvement ou l’arrivée d’un nouveau lot pendant le comptage bloque la validation : **Rebaser et recommencer le comptage** remet les lignes à jour et ajoute les nouveaux lots. La validation produit des mouvements traçables.

Un retour physique est lié à la vente d’origine, à son conditionnement et à ses lots. La case de remise en stock exige un contrôle explicite des produits. Les retours historiques sans lot identifiable sont placés à qualifier. Le mouvement physique est distinct de la certification financière de l’avoir : une annulation fiscale ultérieure ne fait pas disparaître des produits déjà revenus. Les quantités physiquement retournées restent plafonnées pour empêcher une double rentrée.

### Commandes et conditionnements

Une commande confirmée peut être réceptionnée en plusieurs fois, y compris plusieurs lots par article. Les quantités reçues sont plafonnées au reliquat et le renvoi d’une même réception ne double pas le stock. Les états Partiellement reçue et Livrée sont établis par les réceptions.

Les conditionnements définissent un nom, un nombre entier d’unités de stock, un prix en FCFA entiers et un code-barres facultatif. Par exemple, une boîte de cinq consomme cinq unités, tandis qu’une vente à l’unité en consomme une. Ils partagent le même stock et les contrôles serveur s’opposent aux sorties excessives. Une modification ultérieure du conditionnement ne modifie pas les quantités enregistrées dans les ventes historiques.

### Caisse

Ouvrir **Caisse** avant les prochaines ventes pour rattacher leurs encaissements à la session de l’opérateur. Une seule caisse peut être ouverte par opérateur. Les moyens de paiement sont distingués ; seuls les encaissements en espèces interviennent dans le montant d’espèces attendu. Les avoirs sont négatifs. Les apports et retraits exigent un motif.

La clôture compare les espèces comptées aux espèces attendues, exige un motif en cas d’écart et refuse les sessions avec des ventes en attente. Les anciennes factures restent sans session ; elles ne sont pas affectées artificiellement à une nouvelle ouverture. Une clôture interne n’est pas un rapport fiscal DGI homologué.

### Sauvegardes

Dans **Paramètres → Sauvegardes**, un administrateur peut créer une archive PostgreSQL chiffrée et vérifier sa restauration. La vérification crée une base temporaire distincte, restaure l’archive, contrôle les tables, puis nettoie la base temporaire. Elle n’écrase jamais gestion_pharma.

Les fichiers se trouvent dans le dossier local `backups/`, avec accès restreint. Le script `scripts/database-backup.cjs` utilise AES-256-GCM et les outils PostgreSQL 17 installés dans `/Library/PostgreSQL/17/bin` ; `PG_BIN` permet d’adapter ce chemin. La clé est BACKUP_ENCRYPTION_KEY si définie, sinon ENCRYPTION_KEY. Les secrets ne sont pas affichés par le script.

Une automatisation Codex « Sauvegarde quotidienne pharmacie » est active chaque jour à 02 h, avec création puis vérification de restauration et alerte en cas d’échec. **Le Mac et l’application Codex doivent rester allumés et la base accessible pour l’exécution locale.** Ce mécanisme n’est pas un service de sauvegarde indépendant du poste.

Conserver séparément une copie externe des archives et la clé de chiffrement pour une reprise après perte du Mac. Les anciennes archives ne sont pas supprimées automatiquement. L’écran ne permet pas de restaurer par erreur par-dessus la base active.

## Vérifications réalisées

- Compilation optimisée Next.js et vérification TypeScript réussies.
- 24 tests automatisés existants réussis : montants, remises, impression, protocole e-MCF simulé, chiffrement, droits d’origine des requêtes et rafraîchissement.
- 16 scénarios d’intégration PostgreSQL réussis dans une base isolée : lots périmés, ouverture de caisse, réservation FEFO, doubles envois, concurrence, annulation, réception partielle, transfert, inventaire et ses écarts, inventaire devenu obsolète, arrivée de nouveaux lots, conditionnements, consommation unique, avoir lié à l’origine, historique client, caisse et droits vendeur.
- La certification utilisée dans ces scénarios d’intégration est simulée uniquement dans la base isolée ; aucun appel DGI n’est envoyé par `scripts/qa-evolution.cjs`.
- Migration sur copie de la base : 16 ventes et 16 enregistrements de facturation conservés, 14 unités libres et 4 réservées préservées, aucun numéro fabricant créé artificiellement.
- Sauvegarde avant migration restaurée avec succès sur base temporaire ; sauvegarde après migration également restaurée avec succès.
- Création et vérification de restauration également exécutées avec succès depuis l’écran Sauvegardes, avec journalisation de l’administrateur.
- Contrôle visuel : fiche client sur petit et grand écran, parcours avec lien vente/avoir, lots repris, caisse et paramètres de sauvegarde.

Les bases de contrôle sont supprimées après les essais. Les évolutions sont accessibles dans la base locale, pas dans une nouvelle base de démonstration.

## Limites de cette livraison

Les lots de reprise demandent leur qualification avec les emballages réels. Les sauvegardes sont locales et nécessitent une copie externe et la conservation de la clé. Les rapports fiscaux réglementaires spécifiques et la certification en production restent des validations distinctes. Les succès des tests ne constituent ni une homologation fiscale ni un audit de sécurité exhaustif de toutes les dépendances.
