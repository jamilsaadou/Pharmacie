# Documentation - Fonctionnalité d'Impression

## Vue d'ensemble

Ce document décrit les fonctionnalités d'impression ajoutées à l'application de gestion de pharmacie. Le système permet d'imprimer :
- **Bons de commande** fournisseurs
- **Factures de vente** clients

## Architecture

### 1. Utilitaire d'impression (`src/utils/printUtils.ts`)

Le système d'impression est centralisé dans un utilitaire réutilisable qui fournit :

#### Fonction principale : `printDocument()`

```typescript
printDocument({
  title: string,           // Titre du document (ex: "BON DE COMMANDE")
  documentNumber: string,  // Numéro du document (ex: "CMD-2024-001")
  date: string,           // Date d'émission
  headerInfo?: {          // Informations de la pharmacie (optionnel)
    pharmacieName: string,
    pharmacieAddress: string,
    pharmaciePhone: string,
    pharmacieEmail: string
  },
  content: string,        // Contenu HTML du document
  footer?: string        // Pied de page personnalisé (optionnel)
})
```

#### Fonction utilitaire : `formatStatutBadge()`

Formate les statuts avec des badges colorés :
- `en_attente` → Badge jaune
- `confirmee` → Badge bleu
- `livree` → Badge vert
- `annulee` → Badge rouge

### 2. Impression des Commandes

**Emplacement** : `src/components/features/CommandeManagement.tsx`

**Fonctionnalité** : 
- Bouton "Imprimer" disponible pour les commandes **confirmées** et **livrées**
- Génère un bon de commande professionnel avec :
  - Informations du fournisseur
  - Statut de la commande
  - Liste des articles commandés
  - Quantités commandées et reçues (si livrée)
  - Prix unitaires et sous-totaux
  - Montant total
  - Zones de signature pour le fournisseur et le pharmacien

**Code d'utilisation** :

```typescript
const handlePrintCommande = (commande: CommandeWithRelations) => {
  const { printDocument, formatStatutBadge } = require('@/utils/printUtils');
  
  printDocument({
    title: 'BON DE COMMANDE',
    documentNumber: commande.numeroCommande,
    date: formatDate(commande.date),
    content: /* HTML généré */
  });
};
```

### 3. Impression des Factures de Vente

**Emplacement** : `src/components/features/SalesManagement.tsx`

**Fonctionnalité** :
- Bouton d'impression (🖨️) dans la liste des ventes récentes
- Génère une facture de vente professionnelle avec :
  - Informations du client (ou "Client anonyme")
  - Détails de la vente (vendeur, méthode de paiement, statut)
  - Liste des articles vendus
  - Quantités, prix unitaires, remises
  - Calcul du sous-total, remise globale, TVA (18%)
  - Montant total
  - Zones de signature pour le client et le vendeur
  - Conditions de paiement

**Code d'utilisation** :

```typescript
const handlePrintFacture = (vente: Vente) => {
  const { printDocument, formatStatutBadge } = require('@/utils/printUtils');
  
  printDocument({
    title: 'FACTURE DE VENTE',
    documentNumber: vente.numeroFacture,
    date: new Date(vente.date).toLocaleDateString('fr-FR'),
    content: /* HTML généré */,
    footer: /* Pied de page personnalisé */
  });
};
```

## Caractéristiques du Système d'Impression

### Design Professionnel

1. **En-tête** :
   - Logo et nom de la pharmacie
   - Coordonnées complètes
   - Mise en forme élégante avec séparation visuelle

2. **Corps du document** :
   - Informations clairement structurées
   - Tableaux formatés avec alternance de couleurs
   - Badges de statut colorés
   - Typographie lisible

3. **Pied de page** :
   - Message de remerciement
   - Date et heure de génération
   - Conditions spécifiques (pour les factures)

### Mise en page responsive

- **Écran** : Aperçu avec boutons d'action
- **Impression** : Optimisé pour le format A4
- **Marges** : Configurées automatiquement
- **Couleurs** : Optimisées pour l'impression

### Interface utilisateur

1. **Aperçu avant impression** :
   - Le document s'ouvre dans une nouvelle fenêtre
   - Bouton "Imprimer" pour lancer l'impression
   - Bouton "Fermer" pour annuler

2. **Impression automatique** :
   - Dialogue d'impression s'ouvre automatiquement après 500ms
   - L'utilisateur peut configurer l'imprimante
   - Possibilité d'enregistrer en PDF

## Personnalisation

### Modifier les informations de la pharmacie

Éditer le fichier `src/utils/printUtils.ts` :

```typescript
const defaultHeaderInfo: PrintHeaderInfo = {
  pharmacieName: "Votre Pharmacie",
  pharmacieAddress: "Votre adresse complète",
  pharmaciePhone: "Votre téléphone",
  pharmacieEmail: "Votre email"
};
```

### Personnaliser le style

Le CSS est inclus directement dans `printUtils.ts`. Vous pouvez modifier :
- Les couleurs (variables CSS)
- Les tailles de police
- Les espacements
- Les bordures

### Ajouter des champs personnalisés

Pour ajouter des champs supplémentaires au document :

1. Modifier le contenu HTML dans la fonction `handlePrint*`
2. Ajouter les données nécessaires dans la structure
3. Mettre à jour le style si nécessaire

## Utilisation

### Pour les commandes :

1. Naviguer vers "Gestion des Commandes"
2. Localiser une commande confirmée ou livrée
3. Cliquer sur le bouton "Imprimer"
4. Le document s'ouvre dans une nouvelle fenêtre
5. Cliquer sur "🖨️ Imprimer" ou utiliser Ctrl+P
6. Sélectionner l'imprimante ou "Enregistrer au format PDF"

### Pour les factures de vente :

1. Naviguer vers "Point de Vente"
2. Faire défiler jusqu'à "Ventes récentes"
3. Cliquer sur le bouton 🖨️ à côté de la vente souhaitée
4. Le document s'ouvre dans une nouvelle fenêtre
5. Cliquer sur "🖨️ Imprimer" ou utiliser Ctrl+P
6. Sélectionner l'imprimante ou "Enregistrer au format PDF"

## Support Navigateur

La fonctionnalité d'impression est supportée par tous les navigateurs modernes :
- ✅ Chrome / Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Opera

## Dépannage

### Le document ne s'imprime pas

1. Vérifier que les fenêtres contextuelles ne sont pas bloquées
2. Autoriser les pop-ups pour l'application
3. Vérifier que l'imprimante est connectée et fonctionnelle

### Le style est incorrect à l'impression

1. Les styles sont optimisés pour l'impression avec `@media print`
2. Vérifier les paramètres d'impression du navigateur
3. S'assurer que "Imprimer les graphiques d'arrière-plan" est activé

### Problème de format PDF

1. Utiliser "Enregistrer au format PDF" dans le dialogue d'impression
2. Les marges sont automatiquement configurées
3. Le format A4 est utilisé par défaut

## Améliorations futures possibles

1. **Export PDF côté serveur** : Génération de PDF avec une bibliothèque comme `puppeteer` ou `jspdf`
2. **Modèles personnalisables** : Interface pour personnaliser les modèles d'impression
3. **Email automatique** : Envoi automatique des factures par email
4. **Codes-barres** : Ajout de codes-barres sur les documents
5. **Historique d'impression** : Suivi des documents imprimés
6. **Impression par lot** : Impression multiple de documents en une fois
7. **Signature électronique** : Intégration de signature numérique

## Sécurité

- Les documents sont générés côté client
- Aucune donnée sensible n'est stockée pendant l'impression
- Les fenêtres d'impression se ferment automatiquement
- Pas de transmission de données vers des serveurs externes

## Performance

- Génération instantanée des documents
- Pas d'appel API nécessaire
- Utilisation minimale de ressources
- Compatible avec les connexions lentes

## Conclusion

Le système d'impression est conçu pour être :
- **Simple** : Facile à utiliser et à maintenir
- **Professionnel** : Documents de qualité professionnelle
- **Flexible** : Facilement personnalisable
- **Performant** : Génération rapide sans latence
- **Fiable** : Fonctionne sur tous les navigateurs modernes

Pour toute question ou suggestion d'amélioration, veuillez consulter la documentation technique ou contacter l'équipe de développement.
