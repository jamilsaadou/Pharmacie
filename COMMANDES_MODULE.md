# Module de Gestion des Commandes - Documentation

## Vue d'ensemble

Le module de gestion des commandes permet de gérer l'intégralité du cycle de vie des commandes fournisseurs, de la création à la livraison, incluant la facturation.

## Fonctionnalités Principales

### 1. Création de Commandes
- Sélection du fournisseur
- Ajout de plusieurs médicaments à la commande
- Calcul automatique du total
- Génération automatique du numéro de commande (format: CMD20250111-XXXX)

### 2. Gestion du Statut des Commandes
Les commandes peuvent avoir 4 statuts différents:
- **En attente**: Commande créée mais pas encore confirmée
- **Confirmée**: Commande validée et envoyée au fournisseur
- **Livrée**: Commande réceptionnée avec mise à jour du stock
- **Annulée**: Commande annulée

### 3. Réception de Commandes
- Validation des quantités reçues
- Mise à jour automatique du stock des médicaments
- Enregistrement de la date de réception
- Gestion des réceptions partielles

### 4. Facturation
- Génération de factures pour les commandes livrées
- Détail complet de la commande avec prix unitaires et totaux
- Format PDF (à implémenter)
- Export en CSV

### 5. Statistiques et Tableaux de Bord
- Nombre total de commandes
- Commandes en attente
- Commandes livrées
- Montant total des commandes
- Montant total livré

### 6. Filtres et Recherche
- Recherche par numéro de commande ou nom du fournisseur
- Filtre par fournisseur
- Filtre par statut
- Filtre par période

## Structure Technique

### API Routes

#### GET /api/commandes
Récupère toutes les commandes avec filtres optionnels.

**Paramètres de requête:**
- `fournisseurId` (optionnel): Filtrer par fournisseur
- `statut` (optionnel): Filtrer par statut
- `dateDebut` (optionnel): Date de début
- `dateFin` (optionnel): Date de fin

**Réponse:**
```json
[
  {
    "id": "uuid",
    "numeroCommande": "CMD20250111-0001",
    "date": "2025-01-11T00:00:00.000Z",
    "statut": "confirmee",
    "total": 150000,
    "dateReception": null,
    "fournisseur": {
      "id": "uuid",
      "nom": "Pharmacie Centrale",
      "contact": "Jean Dupont",
      "telephone": "+227 20 12 34 56"
    },
    "items": [
      {
        "id": "uuid",
        "quantiteCommandee": 100,
        "quantiteRecue": null,
        "prixUnitaire": 1500,
        "sousTotal": 150000,
        "medicament": {
          "id": "uuid",
          "nom": "Paracétamol 500mg",
          "description": "..."
        }
      }
    ]
  }
]
```

#### POST /api/commandes
Crée une nouvelle commande.

**Corps de la requête:**
```json
{
  "fournisseurId": "uuid",
  "items": [
    {
      "medicamentId": "uuid",
      "quantiteCommandee": 100,
      "prixUnitaire": 1500
    }
  ],
  "dateReception": "2025-01-15T00:00:00.000Z" // optionnel
}
```

**Réponse:** Objet commande créé (même structure que GET)

#### PATCH /api/commandes
Met à jour le statut d'une commande.

**Corps de la requête:**
```json
{
  "id": "uuid",
  "statut": "livree",
  "dateReception": "2025-01-15T00:00:00.000Z",
  "items": [
    {
      "id": "uuid",
      "medicamentId": "uuid",
      "quantiteRecue": 95
    }
  ]
}
```

**Note:** Lors du passage au statut "livree", le stock des médicaments est automatiquement mis à jour.

#### DELETE /api/commandes?id=uuid
Supprime une commande.

**Restrictions:**
- Seules les commandes avec statut "en_attente" ou "annulee" peuvent être supprimées
- Les commandes "livree" ne peuvent pas être supprimées

### Hook useCommandeData

Le hook `useCommandeData` fournit toutes les fonctionnalités nécessaires pour gérer les commandes:

```typescript
const {
  commandes,           // Liste des commandes
  loading,            // État de chargement
  error,              // Erreur éventuelle
  loadCommandes,      // Recharger les commandes avec filtres
  createCommande,     // Créer une nouvelle commande
  updateCommandeStatut, // Mettre à jour le statut
  deleteCommande,     // Supprimer une commande
  getStatistiques,    // Obtenir les statistiques
} = useCommandeData();
```

### Composant CommandeManagement

Le composant principal `CommandeManagement.tsx` affiche:
- Tableau de bord avec statistiques
- Liste des commandes avec filtres
- Actions selon le statut de chaque commande
- Modals pour les différentes opérations (à implémenter)

## Schéma de Base de Données

### Table CommandeFournisseur
```sql
CREATE TABLE CommandeFournisseur (
  id VARCHAR(36) PRIMARY KEY,
  numeroCommande VARCHAR(255) UNIQUE NOT NULL,
  fournisseurId VARCHAR(36) NOT NULL,
  date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  statut ENUM('en_attente', 'confirmee', 'livree', 'annulee') NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  dateReception DATETIME NULL,
  FOREIGN KEY (fournisseurId) REFERENCES Fournisseur(id)
);
```

### Table ItemCommande
```sql
CREATE TABLE ItemCommande (
  id VARCHAR(36) PRIMARY KEY,
  commandeId VARCHAR(36) NOT NULL,
  medicamentId VARCHAR(36) NOT NULL,
  quantiteCommandee INT NOT NULL,
  quantiteRecue INT NULL,
  prixUnitaire DECIMAL(10,2) NOT NULL,
  sousTotal DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (commandeId) REFERENCES CommandeFournisseur(id) ON DELETE CASCADE,
  FOREIGN KEY (medicamentId) REFERENCES Medicament(id)
);
```

## Modals à Implémenter

### 1. AddCommandeModal
- Formulaire de création de commande
- Sélection du fournisseur
- Ajout dynamique d'items (médicaments)
- Calcul en temps réel du total

### 2. ViewCommandeModal
- Affichage détaillé d'une commande
- Informations du fournisseur
- Liste des items avec quantités et prix
- Historique des modifications de statut

### 3. ReceptionCommandeModal
- Formulaire de réception de commande
- Validation des quantités reçues par item
- Option de réception partielle
- Date de réception
- Mise à jour automatique du stock

### 4. FactureCommandeModal
- Génération de facture PDF
- Détails complets de la commande
- Informations du fournisseur
- Totaux et sous-totaux
- Option d'impression et d'export

## Workflow Type

1. **Création**: L'utilisateur crée une commande avec statut "en_attente"
2. **Confirmation**: L'utilisateur confirme la commande → statut "confirmee"
3. **Réception**: Lorsque la commande arrive, l'utilisateur la réceptionne → statut "livree"
   - Les quantités reçues sont enregistrées
   - Le stock est mis à jour automatiquement
4. **Facturation**: Une facture peut être générée pour les commandes livrées

## Intégration avec les Autres Modules

### Avec le Module Stock
- Mise à jour automatique des quantités en stock lors de la réception
- Vérification du stock disponible avant création de commande

### Avec le Module Fournisseurs
- Sélection du fournisseur lors de la création
- Affichage des informations du fournisseur
- Statistiques par fournisseur

### Avec le Module Médicaments
- Sélection des médicaments à commander
- Affichage des informations des médicaments
- Mise à jour du stock des médicaments

### Avec le Module Logs
- Enregistrement de toutes les actions sur les commandes
- Traçabilité complète des modifications
- Historique des réceptions

## Sécurité et Permissions

### Permissions Recommandées
- **Admin**: Toutes les opérations
- **Pharmacien**: Création, confirmation, réception, consultation
- **Vendeur**: Consultation uniquement

### Validations
- Vérification que le fournisseur existe
- Vérification que les médicaments existent
- Validation des quantités (> 0)
- Validation des prix (> 0)
- Empêcher la suppression des commandes livrées

## Améliorations Futures

1. **Notifications**
   - Alerte quand une commande confirmée n'est pas reçue après X jours
   - Notification au fournisseur lors de la confirmation

2. **Rapports**
   - Rapport mensuel des commandes
   - Analyse des délais de livraison par fournisseur
   - Comparaison commande/livré

3. **Intégration Email**
   - Envoi automatique de la commande au fournisseur
   - Accusé de réception par email

4. **Gestion des Retours**
   - Module de retour de produits défectueux
   - Avoir fournisseur

5. **Prédiction**
   - Suggestions de commandes basées sur les ventes
   - Calcul automatique des quantités optimales

## Support et Maintenance

Pour toute question ou problème:
1. Vérifier les logs dans le module Logs
2. Consulter la documentation API
3. Vérifier la connexion à la base de données
4. Contacter le support technique

## Licence

Ce module fait partie de l'application de gestion de pharmacie.
