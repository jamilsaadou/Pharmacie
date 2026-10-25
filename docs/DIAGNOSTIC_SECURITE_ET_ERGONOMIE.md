# Réajustement visuel, exemples et sécurité — 17 octobre 2026

## Résultat livré

L’application locale dispose d’un menu **Parcours d’essai**. Il décrit douze parcours et ouvre les modules correspondants. Les données fictives sont présentes dans la base PostgreSQL utilisée par l’application, avec un marquage EXEMPLE. Aucun document n’a été envoyé automatiquement à la DGI pendant ce travail et aucun code de certification n’a été inventé.

Le jeu contient 120 références, 242 lots, 20 clients dont six entreprises avec NIF fictifs à quatre chiffres, cinq fournisseurs, trois rayons, quatre assurances, huit contrats, six commandes à différents stades, six dossiers de remboursement, six ventes en attente, douze conditionnements, huit alertes et un inventaire à compter. Il comprend des lots disponibles, proches de péremption, périmés, bloqués et à qualifier. Les six brouillons permettent de reprendre une vente sans remise, avec une remise en pourcentage ou avec un montant fixe. L’import est transactionnel et son marqueur évite les doublons lors d’une relance.

Les quantités et factures préexistantes n’ont pas été remplacées. Les nouveaux stocks fictifs participent toutefois aux listes et aux agrégats : le bandeau **Exemples actifs** le rappelle. Dans l’inventaire global d’exercice, ne modifier que les lignes EXEMPLE pour éviter toute correction des articles réels. Les factures déjà certifiées en test, notamment celles des entreprises Alpha et Bêta fictives, restent disponibles pour consulter l’historique et préparer des avoirs liés à une origine certifiée. Les nouveaux documents EX-VENTE sont des brouillons, sans certification.

Une création de vente utilisant les références ou clients EXEMPLE est refusée si la configuration active est en production. La certification d’une vente EXEMPLE est également refusée si sa configuration fiscale enregistrée est en production. Cette protection ne remplace pas la vérification du compteur avant une future mise en exploitation.

## Ergonomie

- Texte courant, tableaux et menu plus lisibles ; contrastes renforcés et champs confortables.
- Fenêtres partagées converties en boîtes de dialogue natives avec titre accessible, fermeture identifiée, navigation au clavier et maintien du focus dans la fenêtre.
- Libellés et messages d’erreur reliés aux champs des composants Input et Select.
- Présentation explicite des pages Clients et Fournisseurs, avec icônes et indication de leur fonction.
- Règlement réorganisé : libellé de l’article sur une ligne large, quantités et remises en dessous, actions identifiées pour les lecteurs d’écran.
- Inventaire avec recherche et pagination de quinze lignes, pour ne pas dérouler des centaines de lots dans la fenêtre.
- Checklist des essais conservée dans la session du navigateur pendant le passage d’un module à l’autre.
- Tableau de bord corrigé : plus de pourcentages de tendance écrits en dur ; montants fondés sur les ventes terminées et certifiées, nets des avoirs, avec exclusion des brouillons. Les dernières opérations sont triées par date.

## Défauts de sécurité corrigés

| Constat vérifié | Correction |
|---|---|
| Effacement global du journal demandé par un simple utilisateur connecté | Suppression refusée ; journal conservé et bouton retiré |
| Identité de certaines traces acceptée depuis le navigateur | Opérateur tiré de la session pour le journal, les modifications d’utilisateurs et la déconnexion ; traces déclarées par l’interface identifiées comme telles |
| Contrôle d’origine limité à l’installation | Contrôle commun à toutes les mutations API ; origine étrangère et contexte navigateur cross-site refusés |
| Pas de limite d’essais avant vérification du mot de passe | Huit essais par identité dans une fenêtre de quinze minutes, avant le calcul coûteux du hash |
| Session encore valide après modification du mot de passe | Session liée à une empreinte du secret enregistré ; ancien cookie refusé après changement |
| Structure de session insuffisamment validée | Taille, nombre de segments, identifiant et expiration contrôlés |
| Certains sous-droits de ventes contrôlés surtout dans le menu | Contrôles serveur sur création, avoir, certification et reprise/finalisation selon les actions configurées ; une liste vide ne donne aucun droit |
| Détails internes d’une erreur Prisma susceptibles d’être renvoyés | Réponse publique générique pour ces erreurs |
| Diagnostic de base lisible par tous les utilisateurs | Route réservée à l’administrateur |
| En-têtes de protection incomplets | Interdiction d’intégration dans une frame et d’objets actifs, prévention de détection de type, politique de référent et absence de cache des réponses API |

Le chiffrement du jeton et des sauvegardes, les mots de passe scrypt, les cookies HttpOnly et SameSite, les droits stock/caisse et la protection de l’historique fiscal restent en place. Le mot de passe d’un compte réel n’a pas été changé par cette intervention. Le nouveau format de session impose une reconnexion aux anciennes sessions.

## Dépendances : résultats et alertes restantes

Au début de cette passe, l’audit des dépendances de production signalait dix entrées : neuf élevées et une modérée. Les corrections compatibles ont mis à jour notamment Next.js en 15.5.28, Prisma/client en 6.19.3, PostCSS en 8.5.30 et plusieurs dépendances transitives. L’audit complet intermédiaire avait également signalé une entrée critique dans l’outillage de développement ; elle n’est plus présente dans le résultat final.

**Résultat final : trois entrées élevées dans l’audit de production, neuf entrées élevées développement compris ; aucune entrée critique.** Ces compteurs sont ceux de npm et peuvent compter plusieurs paquets d’une même chaîne de dépendances : ils ne constituent pas neuf attaques démontrées sur l’application.

Les trois entrées de production concernent la chaîne Prisma → configuration → deepmerge-ts. L’[avis publié par deepmerge-ts](https://github.com/RebeccaStevens/deepmerge-ts/security/advisories/GHSA-ggr8-5vv4-36mx) décrit un épuisement de pile lors du traitement de graphes d’objets récursifs ; il précise que du JSON seul ne crée pas cette condition. Aucun chemin utilisant une entrée HTTP de l’application pour construire de tels graphes n’a été établi pendant cette revue. Cela ne supprime pas l’alerte : la correction proposée par npm passe par une migration majeure de Prisma, à valider séparément.

Les autres alertes concernent notamment l’expansion de motifs de fichiers dans la chaîne ESLint/Next. Une correction forcée proposée par npm implique des changements majeurs ou un retour de version ; elle n’a pas été appliquée aveuglément. Éviter de lancer les outils de construction ou d’analyse sur du code provenant de sources non fiables avant résolution. Les rapports JSON finaux sont conservés dans `output/diagnostic-securite/`.

Le correctif PostCSS installé couvre notamment le problème documenté de lecture de fichiers de source maps décrit dans l’[avis officiel PostCSS](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp).

## Vérifications et limites

Compilation optimisée et vérification TypeScript réussies. Les 27 tests automatisés réussissent et couvrent les montants, remises, impression, protocole e-MCF simulé, chiffrement, rafraîchissement, origine des requêtes, limitation de connexion, sessions et sous-droits de vente. Les 20 scénarios PostgreSQL isolés réussissent et vérifient la gestion, l’import idempotent des exemples, le maintien du stock préexistant, la conservation du journal, les origines étrangères refusées, l’identité de l’opérateur, l’invalidation d’une ancienne session et le refus des exemples en production. Aucun appel DGI n’est nécessaire dans ces essais.

Ce diagnostic porte sur le code local, les dépendances installées et les scénarios exécutés. Il ne constitue pas un test d’intrusion complet ni une homologation fiscale. Les règles de lecture des données, les journaux d’accès et la séparation des rôles doivent être revus avec les profils réels de l’officine avant un déploiement multi-utilisateur.

La limitation de connexion est propre au processus local ; un déploiement à plusieurs instances exige un compteur partagé. La déconnexion retire le cookie du navigateur, mais il n’y a pas de registre central de révocation individuelle des cookies copiés ; l’expiration et le changement de mot de passe restent les mécanismes de révocation. L’authentification multifacteur n’est pas intégrée. Un mot de passe unique et confidentiel reste nécessaire. Le service reste lié à l’adresse locale ; toute exposition réseau doit être accompagnée de HTTPS, de restrictions réseau, de comptes PostgreSQL adaptés et d’une revue du déploiement. Les sauvegardes locales demandent toujours une copie externe et la conservation séparée de la clé.

Contrôle visuel final : comptoir avec recherche exacte et ajout au panier, règlement réorganisé sur grand écran et sur une largeur de 390 pixels, fermeture par Échap sans émission fiscale. Captures dans `output/ergonomie-exemples/`.
