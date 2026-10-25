# Système de Gestion des Factures en Attente

## Vue d'ensemble

Le système de gestion des factures en attente permet de gérer les factures qui n'ont pas pu être certifiées par l'API e-SECeF, soit parce qu'elles sont encore en cours de traitement, soit parce qu'elles ont rencontré des erreurs.

## Fonctionnalités

### 1. Visualisation des factures
- **Liste complète** : Affiche toutes les factures en attente, en erreur ou soumises
- **Filtres** : Permet de filtrer par statut (toutes, en attente, erreur, soumise)
- **Détails complets** : Affiche les informations de vente, client, et erreurs

### 2. Gestion des statuts
Les factures peuvent avoir les statuts suivants :
- `en_attente` : Facture créée mais pas encore certifiée
- `soumise` : Facture envoyée à l'API e-SECeF en attente de réponse
- `erreur` : Erreur lors de la certification
- `certifiee` : Facture certifiée avec succès
- `annulee` : Facture annulée manuellement

### 3. Actions disponibles

#### Réessayer la certification
- Permet de relancer la certification d'une facture en erreur
- Incrémente automatiquement le compteur de tentatives
- Affiche un avertissement si plus de 3 tentatives

#### Annuler une facture
- Marque la facture comme annulée
- Action irréversible
- La vente reste dans le système

#### Supprimer une facture
- Deux options :
  - Supprimer uniquement la facture e-SECeF (la vente reste)
  - Supprimer la facture ET la vente associée

### 4. Monitoring API e-SECeF
- Statut de l'API en temps réel
- Nombre de requêtes en attente sur l'API
- Informations de configuration (NIF, version, etc.)

## Structure des fichiers

### APIs

#### `/api/invoice/pending/db` (GET, PUT, DELETE)
```typescript
// GET - Récupérer les factures en attente
GET /api/invoice/pending/db
GET /api/invoice/pending/db?statut=erreur

// PUT - Mettre à jour une facture
PUT /api/invoice/pending/db
Body: {
  factureId: string,
  action: 'retry' | 'cancel' | 'mark_error',
  errorDescription?: string
}

// DELETE - Supprimer une facture
DELETE /api/invoice/pending/db?id={factureId}&deleteVente={boolean}
```

#### `/api/invoice/retry` (POST)
```typescript
// Réessayer de certifier une facture
POST /api/invoice/retry
Body: {
  factureId: string
}
```

#### `/api/invoice/pending` (GET)
```typescript
// Récupérer le statut de l'API e-SECeF
GET /api/invoice/pending
```

### Composant UI

#### `PendingInvoicesManagement.tsx`
Composant React complet avec :
- Tableau des factures avec tri et filtres
- Modal de détails
- Actions inline (réessayer, annuler, supprimer)
- Affichage du statut API
- Mise à jour automatique après actions

## Utilisation

### 1. Accéder au module
Dans le menu de navigation, cliquez sur "Factures en Attente"

### 2. Filtrer les factures
Utilisez les boutons de filtre pour voir :
- Toutes les factures
- Uniquement les factures en attente
- Uniquement les erreurs
- Uniquement les factures soumises

### 3. Voir les détails
Cliquez sur "📋 Détails" pour voir :
- Informations complètes de la vente
- Données client
- Détails de l'erreur (si applicable)
- Informations de certification (si applicable)
- Nombre de tentatives

### 4. Réessayer une certification
1. Dans la liste, cliquez sur "🔄 Réessayer"
2. Confirmez l'action
3. Le système tente de recertifier la facture
4. Un message indique le succès ou l'échec

### 5. Gérer une facture problématique
Si une facture échoue plusieurs fois :
1. Consultez le message d'erreur dans les détails
2. Corrigez le problème (configuration, données, etc.)
3. Réessayez la certification
4. Si irréparable, annulez ou supprimez la facture

## Modèle de données

```typescript
interface FactureESECeF {
  id: string;
  venteId: string;
  numeroFacture: string;
  statut: 'en_attente' | 'soumise' | 'certifiee' | 'annulee' | 'erreur';
  
  // Données de certification
  uid?: string;
  codeSECeFDGI?: string;
  qrCode?: string;
  dateTimeCertification?: Date;
  
  // Gestion des erreurs
  errorCode?: string;
  errorDescription?: string;
  tentatives: number;
  derniereTentative?: Date;
  
  // Relations
  vente: Vente;
  configuration: ConfigurationESECeF;
}
```

## Flux de traitement

### Création d'une facture
```
1. Utilisateur crée une vente
2. Système crée une facture e-SECeF (statut: en_attente)
3. Tentative de certification automatique
   ├─ Succès → statut: certifiee
   └─ Échec → statut: erreur
```

### Nouvelle tentative
```
1. Utilisateur clique sur "Réessayer"
2. Système incrémente le compteur de tentatives
3. Nouvelle tentative de certification
   ├─ Succès → statut: certifiee
   └─ Échec → statut: erreur (tentatives++)
```

### Annulation
```
1. Utilisateur clique sur "Annuler"
2. Confirmation demandée
3. Statut mis à jour → annulee
4. La facture ne peut plus être certifiée
```

## Bonnes pratiques

### 1. Surveillance régulière
- Vérifiez quotidiennement les factures en erreur
- Résolvez les problèmes rapidement pour éviter l'accumulation

### 2. Gestion des erreurs récurrentes
- Si une facture échoue 3+ fois, vérifiez :
  - La configuration e-SECeF
  - La validité des données de la vente
  - Le statut de l'API e-SECeF
  - La connexion internet

### 3. Maintenance
- Archivez ou supprimez les anciennes factures annulées
- Gardez un historique des erreurs pour identifier les patterns

### 4. Monitoring API
- Surveillez le nombre de requêtes en attente
- Si ce nombre est élevé, l'API peut être surchargée
- Espacez les tentatives de certification

## Dépannage

### Problème : Facture toujours en "en_attente"
**Solution** : 
- Vérifiez que la configuration e-SECeF est active
- Vérifiez la connexion à l'API
- Réessayez manuellement la certification

### Problème : Erreur "Token invalide"
**Solution** :
- Allez dans le module e-SECeF
- Vérifiez la validité du token
- Renouvelez le token si nécessaire

### Problème : Multiple erreurs identiques
**Solution** :
- Consultez le code d'erreur dans les détails
- Référez-vous à la documentation e-SECeF
- Corrigez le problème de configuration

### Problème : Facture certifiée mais code SECeF manquant
**Solution** :
- Vérifiez les données dans la base
- Contactez le support e-SECeF si nécessaire
- Ne modifiez PAS manuellement les données

## Sécurité et permissions

### Accès au module
Le module "Factures en Attente" est accessible aux rôles :
- Admin : Accès complet
- Pharmacien : Accès complet
- Vendeur : Lecture seule (si configuré)

### Actions sensibles
- **Suppression** : Requiert une double confirmation
- **Annulation** : Irréversible, demande confirmation
- **Certification** : Journalisée dans les logs d'audit

## Intégration avec les autres modules

### Lien avec e-SECeF
- Utilise la configuration e-SECeF active
- Respecte les limites de l'API
- Journalise toutes les tentatives

### Lien avec les Ventes
- Chaque facture est liée à une vente
- Suppression en cascade possible
- Historique préservé

### Lien avec les Logs
- Toutes les actions sont journalisées
- Traces d'audit complètes
- Facilite le débogage

## Support

### En cas de problème
1. Consultez les logs système
2. Vérifiez la documentation e-SECeF
3. Contactez le support technique
4. Documentez l'erreur pour référence future

### Informations à fournir
- Numéro de facture
- Code d'erreur
- Message d'erreur complet
- Nombre de tentatives
- Configuration e-SECeF utilisée
