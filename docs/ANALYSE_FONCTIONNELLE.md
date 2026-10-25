# PharmaCare — analyse fonctionnelle de la plateforme réelle

## Finalité

Une application de pharmacie centralise le catalogue, les entrées, le stock, les emplacements, les ventes, la certification e‑MCF, les clients, les assurances et les remboursements. PostgreSQL `gestion_pharma` porte les données métier. Le navigateur ne conserve pas les registres métier. La route historique `/apercu` renvoie vers l’application réelle.

## Acteurs et accès

| Acteur | Activités |
|---|---|
| Administrateur | Installation, équipe, configuration fiscale, paramètres, exploitation |
| Pharmacien | Catalogue, stock, commandes, rayons, clients, assurances, ventes, suivi |
| Vendeur | Comptoir, client, paiement et suivi des ventes selon les accès attribués |

La première installation crée un administrateur choisi par l’utilisateur. Les sessions sont signées, limitées à huit heures et portées par un cookie HttpOnly. Les nouveaux mots de passe sont hachés avec scrypt. Le jeton fiscal est chiffré avec AES‑256‑GCM et n’est jamais renvoyé dans les réponses destinées au navigateur.

## Parcours de travail

### 1. Catalogue

Créer une référence : nom, code-barres, catégorie, dosage, forme, fournisseur, prescription, prix, groupe fiscal A–P, seuil d’alerte, quantité et péremption. Le groupe fiscal est choisi par l’exploitant ; les taux proviennent du compteur DGI. Les données sont persistées dans PostgreSQL.

### 2. Entrées et réception

Créer une commande avec son fournisseur et ses lignes. Confirmer puis réceptionner les quantités effectivement reçues. Le serveur vérifie l’appartenance des lignes à la commande, les quantités et les doublons. Une réception déjà enregistrée ne crédite pas une deuxième fois le stock. L’incrément est réalisé dans la même transaction que la mise à jour des lignes et du statut.

Une réception est actuellement finale pour une commande. Les livraisons fractionnées successives doivent faire l’objet d’un parcours distinct avant d’être proposées comme fonctionnalité complète.

### 3. Rayons

`quantiteStock` représente le stock total de la référence dans la pharmacie, y compris les rayons. Les emplacements indiquent la répartition physique. Le stock de réserve vaut le total moins les quantités affectées aux rayons.

Un transfert réserve → rayon vérifie le stock non affecté et la capacité. Un retour en réserve libère l’affectation. Un transfert entre rayons vérifie le stock source et la capacité destination. Ces opérations ne changent pas le stock total. Les ventes retirent d’abord les quantités affectées aux rayons puis la réserve. Un rayon avec un historique ou du stock ne peut pas être supprimé.

### 4. Comptoir et catalogues importants

Le poste de vente affiche une liste compacte, sans grandes cartes répétées. La recherche couvre le nom, le dosage, la forme, la catégorie et le code-barres, sans distinction d’accents ou de casse. Les résultats sont triés et paginés par 12 ou 24 lignes. Un filtre limite la vue aux articles disponibles ; les ruptures et péremptions restent consultables en désactivant ce filtre.

Le panier reste visible sur ordinateur. L’utilisateur ajuste les quantités ou retire une ligne directement. Ctrl/Cmd K place le curseur dans la recherche ; les flèches sélectionnent un résultat, Entrée l’ajoute, F2 ouvre le règlement. Un scanner clavier terminant par Entrée recherche le code-barres exact, y compris hors du filtre de catégorie. Un code-barres ambigu n’ajoute aucun article automatiquement.

Pour 100–200 références, le catalogue est chargé une fois par ouverture du module et seules les lignes de la page sont rendues. Une recherche SQL paginée côté serveur sera nécessaire pour des catalogues très volumineux ou des photos lourdes ; cette évolution ne doit pas être présentée comme déjà livrée.

### 5. Vente et paiement

Composer le panier, choisir éventuellement le client, les remises, le moyen de paiement et le type de facture. Les prix sont interprétés en TTC ou HT selon la configuration active. Les estimations utilisent les groupes fiscaux synchronisés. Les montants envoyés à e‑MCF sont des FCFA entiers.

Le serveur identifie le vendeur avec la session, contrôle les articles et les prix du catalogue, bloque la péremption et réserve le stock atomiquement. Le statut initial est `en_cours`. Le paiement et la facture utilisent ensuite les totaux fiscaux officiels.

### 6. Certification

1. Vérifier la disponibilité et l’identité du compteur.
2. POST `/api/invoice` : recevoir les totaux et l’UID.
3. Conserver l’UID et les totaux en base avant toute confirmation.
4. Comparer le total au paiement attendu.
5. PUT `/api/invoice/{uid}/confirm` : recevoir code DGI, contenu QR, NIM, compteurs et date officielle.
6. Marquer la facture certifiée et la vente terminée ; conserver l’instantané des articles, du client, de l’entreprise, des taxes et des éléments de sécurité.

Une confirmation incomplète, un timeout ou un résultat incertain produit `a_rapprocher` et interdit une nouvelle soumission automatique. Une divergence de total demande une annulation explicite e‑MCF ; la réservation est libérée uniquement lorsque cette annulation est confirmée. Une erreur 20 ne prouve pas qu’une facture a été annulée.

### 7. Avoir et duplicata

Les types FA et EA exigent la référence de la facture d’origine. Le format de référence reprend le NIM et le compteur total de l’original, comme dans les exemples fournis. Les quantités API restent positives ; à l’impression de l’avoir, les quantités et montants sont négatifs. Un duplicata porte la mention DUPLICATA et réutilise les éléments de sécurité existants sans nouvelle certification.

Un retour physique au stock est distinct de l’avoir fiscal. Les contrôles de quantités déjà remboursées et la traçabilité par lot doivent être renforcés avant les retours complexes en production.

### 8. Assurance et remboursement

Créer une assurance et son taux de couverture, rattacher un assuré à un client et à une police avec des dates de validité. Enregistrer un dossier de remboursement, sa période, les parts couvertes et payées par le client. Les montants sont validés côté serveur. Les contrats et dossiers sont conservés en PostgreSQL ; les suppressions d’assurances avec un historique sont refusées. Les états en attente, partiel et remboursé se calculent à partir des montants saisis, sans décision médicale automatique.

## Format d’impression livré

Format A4 par défaut, suivant les deux PDF fournis. Ordre : identité légale et point de vente à gauche ; cadre CLIENT à droite ; titre et numéro ; référence d’origine pour l’avoir ; tableau numéro/désignation avec groupe fiscal/prix TTC/quantité/montant ; nombre d’articles et paiement ; HT et TVA par groupe ; TVA totale et TTC ; montant en lettres ; cadre de sécurité avec QR, code DGI, NIM, compteurs, heure et ISF.

Le QR est généré localement. Les textes dynamiques sont échappés pour éviter leur interprétation comme HTML. Le format thermique reste disponible lorsque sa largeur est spécifiée. Le navigateur permet l’impression ou l’enregistrement en PDF.

## Configuration actuelle vérifiée

Le jeton fourni a été enregistré chiffré. Une vérification DGI en lecture seule a confirmé le NIF, le compteur actif, la validité et les référentiels. Il correspond à l’environnement de test. Les exemples PDF correspondent à un compteur de production ; leurs éléments fiscaux ne sont jamais réutilisés pour fabriquer une nouvelle facture.

L’ISF `45977` est conservé à la demande explicite de l’utilisateur. Les exemples fournis portent `DGI-NRE-01` ; cette différence est documentée, sans modifier le choix de l’utilisateur.

## Limites à lever avant une exploitation pharmaceutique complète

| Sujet | État |
|---|---|
| PostgreSQL, configuration, catalogue, commandes, ventes et suivi | Raccordés à la base réelle |
| Rayons, assurances et remboursements | Raccordés à PostgreSQL dans cette reprise |
| Comptoir pour 100–200 références | Liste compacte, recherche, scan et pagination |
| Factures/avoirs A4 et duplicatas | Générateur partagé, à valider sur un échantillon fiscal réel |
| Création d’une facture DGI pendant les travaux | Aucune facture émise ; seul le contrôle de connexion est réel |
| Homologation SFE | Non acquise par ces travaux |
| Lots, plusieurs dates de péremption par référence, FEFO par lot, rappels | Modèle actuel : une péremption par référence ; parcours par lot à développer |
| X/Z/A réglementaires, clôtures de caisse et archivage inaltérable | À compléter et vérifier contre le cahier de certification |
| Taxes spécifiques, ISB avancé, exportation et retours complexes | Contrats et tests fiscaux détaillés à compléter |
| Livraisons fractionnées successives | À compléter |
| Sauvegarde/restauration, multi-sites, multi-caisses et migration des anciennes données | À préparer selon le déploiement choisi |

Cette analyse sépare les fonctions raccordées et vérifiées des exigences qui restent à développer. Elle ne déclare pas la plateforme homologuée ni prête pour tous les scénarios réglementaires.

## Vérification finale du 14 octobre 2026

Compilation de production et contrôle TypeScript réussis. Les 15 tests automatisés passent. Le contrôle HTTP sur une base temporaire isolée couvre 200 articles, les accès, les transferts, la réception idempotente, les assurances et remboursements. Le navigateur confirme la connexion, la recherche sans accents et l’ajout au panier. Les modèles de vente et d’avoir ont été inspectés visuellement. La base de contrôle est supprimée ensuite ; aucune facture DGI n’a été émise.

Next.js a été mis à jour en 15.5.27. L’installation npm signale encore des alertes de dépendances ; l’audit distant détaillé n’a pas pu aboutir. Leur résolution reste nécessaire avant un déploiement public.

## Avoirs rattachés et essais complémentaires

Le menu Avoir / retour impose la sélection d’une vente certifiée avec son instantané fiscal complet. Le client, le NIF, les prix nets et les modifications de prix, les groupes fiscaux, le mode HT/TTC et l’identité de l’émetteur sont repris depuis l’original. Une modification ultérieure des fiches n’altère pas les informations de l’avoir. Le solde tient compte des avoirs certifiés et des demandes en attente ; les demandes annulées libèrent ce solde. Le retour physique au stock est explicite et désactivé par défaut. Les créations répétées avec la même clé renvoient le même avoir. La création générique de ventes de type FA/EA est refusée. Les cas avec ISB ou taxes spécifiques nécessitent encore un traitement dédié.

Les remises conservent désormais leur type, leur valeur et leur montant d’origine dans Vente et ItemVente, en complément du pourcentage équivalent. L’interface expose l’ajustement résultant de l’arrondi des prix unitaires. Dix documents ont été certifiés sur le bac à sable DGI avec des entreprises et NIF fictifs dans une base locale isolée. Voir le rapport de tests pour les montants, le rejet initial d’un avoir puis sa reprise et les limites d’arrondi. Les 24 tests automatisés et la compilation passent.
