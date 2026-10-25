# Ajustements responsive — 17 octobre 2026

## Modifications
- Grilles de formulaires corrigées (certification, remboursements, prestations) et colonnes flexibles.
- Composants partagés : champs et cartes peuvent rétrécir sans déborder ; les textes longs passent à la ligne.
- Menu mobile replié hors navigation, fermeture par Échap, blocage du défilement arrière-plan et rétablissement lors du passage sur ordinateur.
- En-tête mobile : boutons et indicateurs sur plusieurs lignes, espace réservé au menu.
- Comptoir : articles sur plusieurs lignes sur téléphone, nom et prix lisibles, ajout accessible ; panier sous le catalogue aux largeurs intermédiaires.
- Règlement : quantité et remise empilées sur téléphone.
- Fiche client : historique ajusté, filtres et pagination flexibles ; fermeture toujours à droite du titre.
- Factures certifiées, assurances et remboursements en cartes jusqu’à 1279 px ; tableaux sur les grands écrans.
- Tableaux et détails de commandes : défilement local, zone accessible au clavier, indication de glissement sur mobile, boutons d’action conservés lisibles.

## Vérification
Compilation de production et validation TypeScript réussies.

Contrôles dans le navigateur :
- 320 px : pages principales (tableau de bord, produits, lots, caisse, rayons, clients, commandes, fournisseurs, assurances, remboursements, statistiques, alertes, journal, certification, équipe, paramètres, ventes).
- 390 px : tableau de bord et comptoir ; vérification visuelle.
- 768 px : produits, lots, clients, commandes, assurances, statistiques, certification, comptoir.
- 1100 px : pages principales et parcours de facturation.
- 1440 px : registre des factures certifiées, en-tête et tableau.
- Fenêtres à 320 px : création de client et historique ; défilement vertical et fermeture accessibles.
- Passage du menu mobile ouvert au bureau : défilement de page rétabli.

Les grands tableaux conservent volontairement leur défilement horizontal local ; la page reste contenue dans la largeur de l’écran. Ces contrôles portent sur la présentation, sans émission de facture ni modification des stocks.

Captures : `output/responsive/`.
