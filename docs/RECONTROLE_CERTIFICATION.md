# Recontrôle ciblé : certification et actualisation des données

## Résultats établis

- Contrôle DGI réel en lecture seule réussi : identité concordante, jeton valide et compteur actif dans l’environnement de test. Aucune facture émise par ce contrôle.
- 20 tests passent : protocole POST/PUT, UID enregistré avant confirmation, erreurs métier, réponses de sécurité incomplètes, annulation incertaine, recherche de catalogue, impressions et actualisation.
- Compilation de production et contrôle TypeScript réussis.
- Ancienne route générique de modification/suppression des demandes neutralisée : elle ne permet plus de réinitialiser un statut fiscal, de supprimer une facture ou sa vente. Les opérations doivent passer par les routes dédiées.
- Bouton de suppression retiré des demandes en attente. La relance n’est proposée que sans UID et dans un état pouvant être repris. Un résultat incertain doit être rapproché avec la DGI.

## Actualisation

Les écritures réussies dans les modules médicaments, ventes, clients, fournisseurs, commandes, rayons et assurances déclenchent une actualisation des écrans consommateurs. Les lectures seules et les écritures HTTP refusées ne la déclenchent pas. Les changements dans un autre onglet du même navigateur, le retour dans l’onglet et le retour du réseau sont également pris en compte. Les signaux rapprochés sont regroupés et les actualisations déclenchées sont exécutées successivement. Le panier et les formulaires ne sont pas réinitialisés.

Cela ne constitue pas une diffusion en temps réel entre ordinateurs : un poste resté continuellement au premier plan nécessite encore une stratégie de synchronisation serveur ou une lecture périodique pour détecter les écritures faites sur un autre poste.

## Limites de cette vérification

Ce contrôle ciblé n’est pas un audit de sécurité exhaustif ni une homologation. Une émission complète et les scénarios de coupure à chaque étape doivent encore être validés dans le bac à sable. Les remises fixes non divisibles par les quantités, les arrondis, les avoirs partiels, la cohérence du timbre en mode HT et les règles de réintégration des retours restent à couvrir par des tests métier détaillés. Les alertes de dépendances signalées à l’installation restent à analyser.

Le stock est débité lors de l’enregistrement d’une vente, avant certification. Une coupure DGI ne doit pas annuler silencieusement ce débit. L’annulation dédiée d’une demande non certifiée libère la réservation une seule fois ; une facture certifiée exige un avoir. Les avoirs peuvent réintégrer des quantités suivant l’option de retour physique choisie ; le contrôle des retours pharmaceutiques par lot et de leur remise en vente reste à compléter.

## Scénario accompagné validé

Après confirmation explicite de l’utilisateur, une vente de test de deux paracétamols à 500 FCFA avec remise globale de 10 % a été certifiée. Total DGI confirmé : 900 FCFA. Vente terminée ; stock affiché et enregistré passé de 13 à 11 unités. Les éléments de sécurité sont complets. Cette validation concerne le bac à sable DGI uniquement ; elle ne valide ni les codes ni le fonctionnement de production. Le code est restitué tel que renvoyé par le service, sans transformation du préfixe.

Le modèle d’impression a été redessiné en noir et blanc et un PDF A4 d’une page a été rendu et inspecté. Les tests de coupure, les remises fixes et les cas de timbre restent distincts de ce scénario réussi.
