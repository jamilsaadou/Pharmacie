# PharmaCare — reprise PostgreSQL et certification e‑MCF

Application locale reprise depuis `Pharmacie/pharmacie-app`. L’ancien dossier est conservé intact. Cette version est dans le dossier `Facturation certifié`.

## Démarrage

```sh
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Application : http://127.0.0.1:3100 (`/apercu` redirige vers l’application).

La connexion locale à **gestion_pharma** est configurée dans `.env` (ignoré par Git, permissions 0600). Cette base a été vérifiée vide avant l’installation des tables. Le fichier `.env.example` permet de préparer une autre installation. Ne pas remplacer ni perdre `ENCRYPTION_KEY` après l’enregistrement des jetons.

Au premier démarrage, créez votre compte administrateur dans l’écran d’accueil. Aucun utilisateur ni médicament d’exemple n’a été ajouté en base.

## Configuration e‑MCF

1. Connectez-vous comme administrateur.
2. Ouvrez **Paramètres → Facturation certifiée e‑MCF**, ou **Certification e‑MCF** dans la navigation.
3. Renseignez le nom, l’adresse, le NIF, le NIM, l’ISF de l’installation et l’environnement de test ou de production.
4. Le jeton fourni est déjà enregistré et chiffré en environnement de test ; l’ISF 45977 est conservé selon votre choix. Pour une autre installation, utilisez son propre jeton.
5. Enregistrez puis lancez **Tester & synchroniser**. L’application vérifie le NIF, le NIM actif, l’expiration du jeton et récupère les 16 groupes fiscaux, les quatre groupes ISB, les types de factures et les moyens de paiement.
6. Consultez les compteurs dans **Compteurs & suivi**. Ils sont alimentés par les confirmations e‑MCF, jamais saisis manuellement.

Le jeton est chiffré avec AES‑256‑GCM. Il n’est jamais renvoyé au navigateur. Les routes sensibles exigent une session signée et la modification de configuration exige un administrateur. Les mots de passe des nouveaux comptes sont hachés avec scrypt. Les anciens comptes à mot de passe en clair ne sont pas importés.

## Ventes et certification

Une vente est enregistrée **en cours**, avec réservation atomique du stock. Les articles expirés ou les stocks insuffisants sont bloqués. La certification utilise `POST /api/invoice`, conserve l’UID en base avant confirmation, puis utilise `PUT /api/invoice/{uid}/confirm`. Le statut **terminée** n’est attribué qu’après réception du code DGI, du contenu QR, du NIM, des compteurs et de la date e‑MCF. Les montants API sont des FCFA entiers, sans facteur 100.

Les certifications concurrentes d’une même vente sont bloquées. Un timeout ou un résultat incomplet conserve un statut `a_rapprocher` et interdit une nouvelle soumission automatique. Consultez le portail DGI et les demandes en attente pour résoudre cet état. Une facture certifiée nécessite un avoir ; elle ne peut pas être annulée comme une demande provisoire. Une annulation confirmée libère la réservation de stock une seule fois.

Les six types API sont FV, FT, FA, EV, ET et EA. Les copies sont des opérations locales et ne sont pas soumises comme de nouvelles factures.

## Vérifications

```sh
npm run typecheck
npm test
npm run build
```

Les 24 tests couvrent la recherche et la pagination de 200 articles, les totaux HT/TTC, les impressions de vente et d’avoir, le chiffrement, l’en-tête Authorization sans préfixe Bearer (conforme aux exemples fournis), les verbes POST/PUT, la persistance avant confirmation, les erreurs métier dans HTTP 200, les éléments de sécurité incomplets, les divergences de totaux et les montants en FCFA.

## Périmètre et validations restantes

Cette reprise fournit la configuration et le flux de certification, la nouvelle navigation et les modules existants de ventes, stock, clients, fournisseurs et commandes. Elle ne constitue pas une homologation SFE. Le contrôle de connexion en lecture a réussi avec votre jeton. Aucune facture n’a été soumise à la DGI.

Une émission complète reste à valider dans l’environnement de test. Le tableau de conformité et le PDF technique divergent sur le sens d’arrondi de la TVA ; les totaux officiels e‑MCF restent la référence et une divergence bloque la certification. Les cas d’ISB, de taxes spécifiques, de remboursements et d’exportation doivent être validés dans l’environnement de test avant la production. Les X/Z/A rapports et les commentaires réglementaires ne sont pas entièrement couverts par cette reprise.

Les modules **rayons, assurances, assurés et remboursements** sont raccordés aux API PostgreSQL. Les transferts préservent le stock total et la réception répétée d’une commande ne double pas les quantités. Les anciennes documentations MySQL décrivent le projet abandonné : utiliser ce README pour cette version.

L’application est maintenue en local ; aucun déploiement public n’est réalisé.

L’analyse détaillée, les règles métier et les limites restantes figurent dans [docs/ANALYSE_FONCTIONNELLE.md](docs/ANALYSE_FONCTIONNELLE.md).

Les avoirs se créent désormais depuis une vente certifiée sélectionnée : client, prix, remises et taxes historiques sont repris et le solde créditable est contrôlé. Les résultats des essais DGI, leurs limites et leurs pièces de preuve sont dans [output/validation-dgi-test/RAPPORT_TESTS.md](output/validation-dgi-test/RAPPORT_TESTS.md).
