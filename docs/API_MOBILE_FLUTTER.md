# API mobile PharmaCare v1 — Flutter

Le backend fournit `/api/mobile/v1`. Cette API partage la base PostgreSQL, les réservations de stock, les comptes utilisateurs et la certification e‑MCF de l’application web. Les comptes sont créés et habilités par l’administrateur dans l’application web.

Livrables : [contrat OpenAPI](openapi-mobile-v1.json), [client Dart Android/iOS](flutter/pharmacare_api.dart). Le client est une base d’intégration ; l’interface Flutter n’est pas incluse.

## Installation serveur

```sh
npm install
npm run db:generate
npm run db:migrate
npm run build
npm start -- --hostname 0.0.0.0 --port 3100
```

La migration `20261026120000_mobile_sessions` ajoute les sessions mobiles et un index des ventes par opérateur. Elle ne modifie pas les ventes existantes. `DATABASE_URL`, `ENCRYPTION_KEY` et `SESSION_SECRET` restent sur le serveur. Le jeton DGI reste également sur le serveur ; il ne doit jamais être intégré à Flutter.

Configurer et synchroniser e‑MCF depuis l’application web avant de vendre. Pour un téléphone physique, utiliser l’adresse réseau du serveur et autoriser ce port sur le réseau de développement. `127.0.0.1` sur le téléphone désigne le téléphone. Le script `npm run dev` écoute seulement en boucle locale ; pour un essai réseau lancer `npm run dev -- --hostname 0.0.0.0`. En production, exposer le backend derrière HTTPS et conserver PostgreSQL privé. Aucun déploiement ni envoi fiscal réel ne sont effectués par ce développement.

## Authentification et droits

```http
POST /api/mobile/v1/auth/login
Content-Type: application/json

{"email":"vendeur@pharmacie.example","motDePasse":"votre-mot-de-passe","appareil":"Samsung A54 — caisse 1"}
```

```json
{
  "accessToken": "pm_<jeton-opaque>",
  "tokenType": "Bearer",
  "expiresIn": 28800,
  "expiresAt": "2026-10-26T18:00:00.000Z",
  "utilisateur": {
    "id": "agent-id", "nom": "Saadou", "prenom": "Agent",
    "email": "vendeur@pharmacie.example", "role": "vendeur",
    "modulesSupplementaires": [], "ventesAccess": null
  }
}
```

Toutes les autres routes exigent `Authorization: Bearer <accessToken>`. Aucun cookie n’est nécessaire. Un jeton dure huit heures, est propre à une connexion/appareil et est stocké uniquement sous forme de condensat côté serveur. `POST /auth/logout` révoque immédiatement le jeton courant et renvoie `{"success":true}`. Une désactivation du compte ou un changement du mot de passe invalide ses connexions mobiles. Aucun renouvellement silencieux n’est fourni : après expiration, afficher la connexion. Le rôle et les habilitations sont relus à chaque requête.

Conserver le jeton dans le stockage sécurisé du téléphone (Keychain/Keystore), jamais dans les logs ni dans le code source. La limitation des connexions est commune au web et au mobile : huit tentatives par email sur quinze minutes, en mémoire de l’instance serveur ; un déploiement multi-instance nécessite un limiteur partagé.

Un vendeur peut consulter le stock nécessaire à ses ventes même sans permission de modification du stock. Les modules `ventes`, `caisse`, `clients` et les habilitations de facture sont contrôlés côté serveur. Chaque utilisateur, y compris l’administrateur via cette API mobile, voit uniquement **ses propres ventes et ses propres caisses**. Le stock est celui de la pharmacie, commun aux agents : aucune affectation physique individuelle de stock n’est créée. Les anciennes ventes sans `operateurId` ne sont pas attribuées rétroactivement à un vendeur.

## Routes

| Méthode | Chemin après `/api/mobile/v1` | Fonction |
|---|---|---|
| POST | `/auth/login` | Connexion et jeton mobile |
| POST | `/auth/logout` | Révocation du jeton courant |
| GET | `/me` | Profil et expiration de la session |
| GET | `/me/situation` | Activité et encaissements de l’agent |
| GET | `/stock` | Catalogue et disponibilités réelles |
| GET | `/clients` | Recherche de clients existants |
| GET | `/ventes` | Historique personnel paginé |
| POST | `/ventes` | Vente avec tentative automatique de certification |
| GET | `/ventes/{id}` | État à jour d’une vente personnelle |
| POST | `/ventes/{id}/certification` | Relance d’une demande non soumise |
| GET | `/ventes/{id}/document` | Données de la facture officielle, QR et code DGI |
| GET | `/caisse` | Caisse ouverte et historique personnel |
| POST | `/caisse` | Ouverture, mouvement ou clôture |

Les listes utilisent `page` (défaut 1) et `limit` (défaut 30, maximum 100), et renvoient `{"data":[],"total":0,"page":1,"limit":30}`. Les ventes sont triées par date décroissante et identifiant, le stock et les clients par nom et identifiant. Les listes sont rafraîchies par le client ; cette version ne fournit ni WebSocket ni notification push. Les pages peuvent se déplacer si de nouvelles ventes sont créées entre deux lectures.

## Stock et clients

`GET /stock?q=paracetamol&page=1&limit=30` recherche par nom, code-barres exact ou code-barres d’un conditionnement actif. `q` est limité à 100 caractères. Une réponse contient :

```json
{
  "data": [{
    "id": "medicament-id", "nom": "Paracétamol 500 mg", "prix": 500,
    "codeBarres": "1234567890123", "dosage": "500 mg", "forme": "comprimé",
    "prescription": false, "groupeTaxation": "B", "seuilAlerte": 10,
    "conditionnements": [{"id":"boite-id","medicamentId":"medicament-id","nom":"Boîte","facteur":10,"codeBarres":"9876543210123","prixVente":4500,"actif":true}],
    "stock": {"disponible": 80,"reserve": 5,"bloque": 0,"perime": 2,"aQualifier": 3,"total": 90}
  }], "total": 1, "page": 1, "limit": 30
}
```

Les quantités sont exprimées dans l’unité de base. Une boîte de facteur 10 consomme dix unités. `disponible` exclut les réservations, les lots périmés, bloqués et non qualifiés ; c’est la quantité vendable. La péremption suit la journée métier du Niger (UTC+1). Le serveur recontrôle disponibilité et prix dans la transaction de vente ; une lecture du stock n’est pas une réservation.

`GET /clients?q=nom` recherche nom, prénom ou téléphone. Chaque entrée contient `id`, `nom`, `prenom`, `nif`, `telephone`, `adresse`. Le client est facultatif pour une vente au comptant. La création de clients se fait dans le web pour cette version.

## Vente et reprise après coupure réseau

Ouvrir une caisse avant de vendre. Créer une `requestKey` aléatoire (16 à 100 caractères `A-Z a-z 0-9 _ -`) et **enregistrer durablement cette clé et le panier avant le premier envoi**.

```http
POST /api/mobile/v1/ventes
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "requestKey": "vente-20261026-unique-0001",
  "clientId": "client-id",
  "methodePaiement": "especes",
  "items": [
    {"medicamentId":"medicament-id","quantite":2},
    {"medicamentId":"autre-medicament-id","conditionnementId":"boite-id","quantite":1}
  ]
}
```

Omettre `clientId` pour un client de passage. Les moyens de paiement sont `especes`, `carte`, `cheque`, `virement`. Il faut 1 à 100 lignes, avec une quantité entière positive. Les prix viennent du catalogue serveur. Les champs prix, taxe, total, remise, vendeur, opérateur, caisse et type de facture ne sont pas acceptés dans le corps mobile. Cette version crée des ventes `FV` sans remise ; les avoirs, exports, ISB, prestations et remises restent dans le web.

Le serveur attribue l’opérateur connecté, sa caisse ouverte, le numéro de facture et les lots FEFO. La vérification d’une caisse ouverte se fait sous le même verrou que sa clôture. La vente est enregistrée avec réservation du stock avant la tentative de certification.

| HTTP | Sens |
|---|---|
| 201 | Nouvelle vente certifiée ; état final relu en base |
| 202 | Vente enregistrée, certification non achevée ; consulter son statut |
| 200 | Clé déjà enregistrée avec le même contenu ; vente existante renvoyée |
| 409 | Clé réutilisée avec un contenu différent |

La réponse est `{"vente":{...},"replayed":false}`. `vente` contient notamment `id`, `numeroFacture`, `date`, `operateurId`, `vendeur`, `caisseId`, `client`, `items`, `statut`, `total`, `tva`, `methodePaiement`, `factureESECeF`, `encaissement`, `documentUrl`. Les identifiants internes d’idempotence ne sont pas exposés.

`factureESECeF` contient `id`, `statut`, `uid`, `codeSECeFDGI`, `qrCode`, `dateTimeCertification`, `counters`, `errorDescription`. Une vente n’est aboutie que si `vente.statut == "terminee"` **et** `factureESECeF.statut == "certifiee"`. Les montants d’une vente en cours sont provisoires ; les totaux officiels sont enregistrés après certification. Tous les montants sont des FCFA, sans multiplication par 100.

Après timeout, renvoyer **exactement le même panier et la même clé**. La réponse réutilise la vente existante sans relancer automatiquement la certification, même si les prix ont changé ou la caisse a fermé. Modifier le panier impose une nouvelle clé, après vérification du résultat de la première demande. Une coupure n’est jamais une preuve d’échec.

`GET /ventes/{id}` sert à suivre une vente. `GET /ventes?statut=en_cours` retrouve les demandes personnelles à traiter. `POST /ventes/{id}/certification` peut relancer uniquement `en_attente` ou `erreur` **sans UID**. Pour `confirmation_en_cours`, `soumise`, `a_rapprocher` ou un UID déjà présent, le serveur renvoie `409 RECONCILIATION_REQUIRED`. Un responsable résout alors la demande depuis le web/portail e‑MCF. Ne pas lancer une relance automatique en boucle. Une réservation reste immobilisée pendant une certification incertaine.

## Facture et impression Flutter

`GET /ventes/{id}/document` est disponible uniquement après certification. `?copie=1` marque une copie. Il renvoie un **objet JSON**, utilisable pour construire un reçu ou un PDF dans Flutter : identité émetteur, client, opérateur, lignes, totaux par groupe fiscal, total TVA/TTC, paiements, et :

```json
{
  "securityElements": {
    "codeSECeFDGI": "code-officiel",
    "nim": "nim-officiel",
    "compteurs": "compteurs-officiels",
    "dateHeure": "horodatage-officiel",
    "qrCodeData": "contenu-qr-officiel"
  }
}
```

Afficher et encoder le contenu `qrCodeData` tel que renvoyé. Ne pas fabriquer un QR ou code DGI en cas d’erreur. `documentUrl` est un chemin relatif protégé : le télécharger avec l’en-tête Bearer, pas avec un simple navigateur externe. Cette route ne renvoie pas de PDF binaire.

## Caisse personnelle

```json
{"action":"ouvrir","montant":10000}
```

La réponse donne l’`id` de la session. Une seule caisse ouverte par agent est autorisée. Le fonds est un entier FCFA compris entre 0 et 1 000 000 000.

```json
{"action":"mouvement","id":"caisse-id","cle":"mouvement-unique-0001","type":"sortie","montant":1000,"motif":"Petite dépense justifiée"}
```

`type` vaut `entree` ou `sortie`. Montant entier strictement positif, motif requis (maximum 1000 caractères), `cle` au même format que `requestKey`. Le rejeu identique ne double pas le mouvement ; un contenu différent est refusé. Un retrait supérieur au solde espèces attendu est interdit.

```json
{"action":"cloturer","id":"caisse-id","montant":14500,"motif":"Écart expliqué après comptage"}
```

`montant` est le comptage physique des espèces. Un motif est obligatoire en cas d’écart. Une caisse comportant des ventes encore `en_cours` ne peut pas être clôturée. Après timeout d’ouverture ou de clôture, appeler `GET /caisse` pour vérifier l’état avant d’agir à nouveau ; ces deux actions n’ont pas de clé de rejeu.

`GET /caisse` renvoie `current` (caisse ouverte ou `null`), `data` (historique paginé), `total`, `page`, `limit`. Chaque caisse inclut ses mouvements, encaissements et `summary` :

```json
{"byMode":{"especes":5500,"carte":2000},"deposits":0,"withdrawals":1000,"expected":14500}
```

`expected = fondOuverture + encaissements espèces + entrées − sorties`. Les autres paiements restent séparés. Les encaissements sont générés une seule fois après la certification ; une vente en attente ne compte pas comme paiement encaissé. Les avoirs issus du web peuvent produire des encaissements négatifs.

## Situation de l’agent

`GET /me/situation?from=2026-10-26T00:00:00%2B01:00&to=2026-10-27T00:00:00%2B01:00`

`from` est inclus, `to` exclu. Les bornes sont facultatives ; sans bornes, le cumul couvre tout l’historique personnel. Fournir des dates ISO 8601 avec fuseau. Pour une journée à Niamey, utiliser minuit UTC+1, pas minuit UTC. Encoder `+` en `%2B` dans une URL construite à la main. `/ventes` accepte les mêmes bornes et un filtre `statut` (`en_cours`, `terminee`, `annulee`).

```json
{
  "operateurId":"agent-id",
  "periode":{"from":"2026-10-25T23:00:00.000Z","to":"2026-10-26T23:00:00.000Z"},
  "ventesParStatut":[{"statut":"terminee","nombre":8},{"statut":"en_cours","nombre":1}],
  "ventesCertifiees":{"nombre":8,"total":45000,"montantVentes":45000,"montantAvoirs":0},
  "encaissementsParMode":[{"mode":"especes","montant":30000,"nombre":6},{"mode":"carte","montant":15000,"nombre":2}]
}
```

Les ventes sont filtrées sur leur date de création ; les encaissements sur leur propre date. Une certification différée peut donc apparaître dans une autre période d’encaissement. `ventesCertifiees.total` est le montant net : `montantVentes − montantAvoirs`. Les documents FA/EA sont déduits même si leurs montants fiscaux sont positifs. `nombre` compte tous les documents certifiés, y compris les avoirs. Pour la caisse physique, utiliser `summary.expected` et les encaissements signés. Les relevés ne sont pas des rapports fiscaux X/Z.

## Erreurs et comportement Flutter

```json
{"error":{"code":"UNAUTHENTICATED","message":"Session expirée ou invalide. Reconnectez-vous."}}
```

| HTTP | Code ou situation | Traitement |
|---|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_JSON`, `BUSINESS_ERROR` | Corriger les champs ou afficher le message métier (stock, prix, caisse) |
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` | Redemander une connexion |
| 403 | `FORBIDDEN` | Accès non autorisé |
| 404 | `NOT_FOUND` | Ressource absente ou appartenant à un autre agent |
| 409 | `IDEMPOTENCY_CONFLICT`, `NOT_CERTIFIED`, `RECONCILIATION_REQUIRED` | Vérifier l’état existant ; intervention d’un responsable si nécessaire |
| 413 / 415 | `PAYLOAD_TOO_LARGE` / `UNSUPPORTED_MEDIA_TYPE` | Maximum 64 Ko de JSON pour les corps lus par cette API |
| 429 | `RATE_LIMITED` | Respecter `Retry-After: 900` |
| 500 | `INTERNAL_ERROR` | Réessayer les lectures ; pour une vente, garder la même clé |

Une réponse `202` est une vente enregistrée en attente, pas une erreur de transport. Toujours inspecter les statuts métier, y compris après un rejeu en `200`.

## Intégration Flutter

Copier `flutter/pharmacare_api.dart` dans le projet. Il utilise les bibliothèques standard Dart et cible Android/iOS. Raccorder `onTokenChanged` au stockage sécurisé choisi par le projet et restaurer le jeton au lancement via `restoreToken`.

```dart
final api = PharmaCareApi('https://votre-serveur/api/mobile/v1/',
  onTokenChanged: (token) async {
    // Enregistrer ou supprimer token dans Keychain/Keystore.
  });
await api.login(email, motDePasse, 'Android caisse 1');
final stock = await api.stock(q: 'Paracétamol');
final caisse = await api.cash();
if (caisse['current'] == null) await api.openCash(10000);
final requestKey = PharmaCareApi.newRequestKey();
// Sauvegarder requestKey et items localement avant l’appel.
final result = await api.sell(requestKey: requestKey,
  items: [{'medicamentId': medicamentId, 'quantite': 2}]);
final vente = result['vente'] as Map<String, dynamic>;
final facture = vente['factureESECeF'] as Map<String, dynamic>?;
if (vente['statut'] == 'terminee' && facture?['statut'] == 'certifiee') {
  final document = await api.document(vente['id'] as String);
  // Afficher le reçu à partir de document.
}
```

Écrans suggérés : connexion → situation personnelle → catalogue/panier → résultat de vente et reçu ; onglets historique et caisse. Afficher les ventes en attente avec une action de consultation. Le mode hors ligne peut préparer un panier ; il ne peut ni garantir le stock ni certifier une facture. Le client fourni n’effectue aucune relance automatique d’écriture.

## Vérifications livrées

```sh
npm run typecheck
npm test
npm run build
node scripts/qa-mobile-api.cjs
dart analyze docs/flutter/pharmacare_api.dart
```

Le script d’intégration exige PostgreSQL et un compte ayant le droit de créer une base temporaire. Il démarre le serveur de production compilé sur le port 3103 (`MOBILE_QA_PORT` permet de le changer), applique les migrations dans une base dédiée, vérifie les accès et les transactions, puis supprime cette base. Il ne soumet aucune facture à la DGI : l’absence de taxes synchronisées arrête la certification avant tout appel externe. Les documents certifiés utilisés pour vérifier les totaux nets sont des fixtures synthétiques dans cette base temporaire.
