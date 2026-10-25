# Nouveau Système de Facturation e-SECeF

## Vue d'ensemble

Ce document décrit le nouveau système de facturation intégré avec l'API e-SECeF de la DGI du Niger. Le système implémente un flux en 3 étapes basé sur les spécifications officielles de l'API.

## Architecture du Système

### Flux de Facturation (3 Étapes)

```
┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 1: POS - Composition du Panier                       │
│ ─────────────────────────────────────────────────────────── │
│ • Recherche et sélection de produits                        │
│ • Ajout au panier avec quantités                            │
│ • Application de remises par article et globale             │
│ • Sélection du client (optionnel)                           │
│ • Sélection du mode de paiement                             │
│ • Validation des données requises                           │
│                                                              │
│ Action: Bouton "Certifier (Calculer)"                       │
│ → Appel POST /api/invoice/calculate                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 2: Prévisualisation & Finalisation                   │
│ ─────────────────────────────────────────────────────────── │
│ • Affichage du récapitulatif de la facture                  │
│ • Comparaison des totaux calculés par l'API                 │
│ • Statut: PENDING (facture en attente)                      │
│ • UID reçu de l'API                                          │
│ • Timeout: 2 minutes max pour finaliser                      │
│                                                              │
│ Actions:                                                     │
│ → "Confirmer" : POST /api/invoice/finalize {action:confirm} │
│ → "Annuler"   : POST /api/invoice/finalize {action:cancel}  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ ÉTAPE 3: Facture Finale Certifiée                          │
│ ─────────────────────────────────────────────────────────── │
│ • Statut: FINALIZED                                          │
│ • Code SECeF/DGI (29 caractères)                            │
│ • QR Code (66 caractères)                                    │
│ • DateTime de certification                                  │
│ • Compteurs (ex: "23/56 FV")                                 │
│ • NIM de l'e-MCF                                             │
│                                                              │
│ Action: Impression/PDF de la facture officielle             │
└─────────────────────────────────────────────────────────────┘
```

## Endpoints API

### 1. POST /api/invoice/calculate
**Étape 1: Soumettre la facture et obtenir les totaux calculés**

**Request Body:**
```json
{
  "invoiceData": {
    "nif": "9999900000001",
    "mode": "TTC",
    "isf": "PHARMA-APP-001",
    "type": "FV",
    "operator": {
      "name": "Nom Opérateur",
      "id": "01"
    },
    "items": [
      {
        "name": "Médicament A",
        "code": "MED001",
        "price": 500000,
        "quantity": 2,
        "taxGroup": "B"
      }
    ],
    "payment": [
      {
        "name": "ESPECES",
        "amount": 1000000
      }
    ],
    "client": {
      "nif": "1234567890123",
      "name": "Client Test",
      "contact": "77123456",
      "address": "Niamey"
    },
    "reference": "AB01000001-1-123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "uid": "ac33f8fe-9735-4ed6-a9c3-df58a908ccd3",
  "totals": {
    "uid": "ac33f8fe-9735-4ed6-a9c3-df58a908ccd3",
    "tb": 19,
    "tab": 1000000,
    "hab": 840336,
    "vab": 159664,
    "total": 1000000,
    "vtotal": 159664
  },
  "message": "Facture calculée avec succès. Veuillez confirmer ou annuler dans les 2 minutes."
}
```

### 2. POST /api/invoice/finalize
**Étape 2: Confirmer ou annuler une facture en attente**

**Request Body:**
```json
{
  "uid": "ac33f8fe-9735-4ed6-a9c3-df58a908ccd3",
  "action": "confirm"
}
```

**Response (Confirmation):**
```json
{
  "success": true,
  "action": "confirm",
  "securityElements": {
    "dateTime": "13/12/2025 14:30:45",
    "qrCode": "F;9999900000001;...",
    "codeSECeFDGI": "AB01000001-1-123",
    "counters": "23/56 FV",
    "nim": "AB01000001"
  },
  "message": "Facture confirmée et certifiée avec succès"
}
```

**Response (Annulation):**
```json
{
  "success": true,
  "action": "cancel",
  "securityElements": {
    "dateTime": "13/12/2025 14:30:45",
    "nim": "AB01000001"
  },
  "message": "Facture annulée avec succès"
}
```

### 3. GET /api/invoice/pending
**Récupérer le statut de l'API et les factures en attente**

**Response:**
```json
{
  "success": true,
  "apiStatus": true,
  "version": "1.0",
  "nif": "9999900000001",
  "nim": "AB01000001",
  "tokenValidUntil": "2025-12-31T23:59:59",
  "serverDateTime": "2025-12-13T14:30:45",
  "pendingRequestsCount": 2,
  "pendingRequestsList": [
    {
      "date": "2025-12-13T14:28:30",
      "uid": "ac33f8fe-9735-4ed6-a9c3-df58a908ccd3"
    }
  ]
}
```

## États de Facturation

Le système utilise une machine d'état pour suivre le cycle de vie des factures:

```typescript
type InvoiceStatus = 
  | 'DRAFT'       // Panier en cours (local)
  | 'PENDING'     // POST envoyé, uid reçu, en attente de finalisation
  | 'FINALIZED'   // Confirmé, QR + Code reçus
  | 'CANCELLED'   // Annulé
  | 'EXPIRED'     // Expiré (non finalisé dans les 2 minutes)
  | 'ERROR';      // Erreur API
```

## Validations UI

### Avant POST (calculate)
- ✅ Panier non vide
- ✅ Quantité > 0 pour chaque article
- ✅ Prix > 0 pour chaque article  
- ✅ Mode de prix défini (TTC/HT)
- ✅ Type de facture défini
- ✅ Opérateur renseigné
- ✅ Référence obligatoire pour FA/EA (factures d'avoir)

### Avant Finalisation (confirm)
- ✅ UID obligatoire
- ✅ Afficher les totaux retournés par l'API
- ✅ Demander confirmation utilisateur
- ✅ Respecter le délai de 2 minutes

## Gestion des Erreurs

Le système gère tous les codes d'erreur de l'API e-SECeF:

| Code | Description |
|------|-------------|
| 1 | Le nombre maximum de factures en attente est dépassé (max 10) |
| 3 | Type de facture n'est pas valide |
| 4 | La référence de la facture originale est manquante |
| 5 | La référence de la facture originale ne comporte pas 24 caractères |
| 6 | La valeur de l'ISB n'est pas valide |
| 7 | Le type de paiement n'est pas valide |
| 8 | La facture doit contenir les articles |
| 9 | Le groupe de taxation au niveau des articles n'est pas valide |
| 10 | La référence ne peut pas être validée, réessayer plus tard |
| 11 | La référence n'est pas valide (facture originale introuvable) |
| 12 | Montant d'avoir dépasse le montant de la facture originale |
| 20 | La facture n'existe pas ou elle est déjà finalisée/annulée |
| 99 | Erreur lors du traitement de la demande |

### Affichage des Erreurs

Les erreurs sont affichées avec:
1. **Toast court**: Message d'erreur principal
2. **Détail expandable**: Code + message complet
3. **Badge de statut**: Indication visuelle de l'état

## Types de Factures Supportés

| Type | Description | Nécessite Référence |
|------|-------------|---------------------|
| FV | Facture de vente | Non |
| FT | Facture d'acompte | Non |
| FA | Facture d'avoir | **Oui** (24 car) |
| EV | Facture de vente à l'exportation | Non |
| ET | Facture d'acompte à l'exportation | Non |
| EA | Facture d'avoir à l'exportation | **Oui** (24 car) |

## Impression de Facture

La facture finale DOIT obligatoirement afficher:
- ✅ Code SECeF/DGI (29 caractères)
- ✅ QR Code (en graphique)
- ✅ DateTime de certification
- ✅ Compteurs (si fourni)
- ✅ NIM de l'e-MCF

## Format de Données

### Montants
L'API e-SECeF utilise des **centimes (integer)**:
- Prix de 5000 FCFA → `500000` (centimes)
- Conversion: `montant_fcfa * 100`

### Types de Paiement
Mapping entre l'application et l'API:
```typescript
especes  → ESPECES
carte    → CARTEBANCAIRE
cheque   → CHEQUES
virement → VIREMENT
```

### Groupes de Taxation
16 groupes disponibles: A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P

Par défaut en pharmacie:
- Groupe **B**: 19% TVA (médicaments standards)
- Groupe **A**: 0% TVA (médicaments exonérés)

## Configuration e-SECeF

Configuration requise (via `/api/esecef/config`):
```json
{
  "nif": "9999900000001",
  "nim": "AB01000001",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "isf": "PHARMA-APP-001",
  "environnement": "test"
}
```

## Environnements

### Test
- Facturation: `https://esecef-test.impots.gouv.ne/api/invoice`
- Info: `https://esecef-test.impots.gouv.ne/api/info`

### Production
- Facturation: `https://esecef.impots.gouv.ne/api/invoice`
- Info: `https://esecef.impots.gouv.ne/api/info`

## Bonnes Pratiques

1. **Vérifier le statut de l'API** avant de soumettre (optionnel mais recommandé)
2. **Valider les données côté client** avant l'envoi
3. **Respecter le timeout de 2 minutes** pour les factures PENDING
4. **Afficher clairement les totaux** calculés par l'API
5. **Gérer gracieusement les erreurs** avec messages clairs
6. **Garder le token secret** et ne jamais l'exposer côté client
7. **Limiter à 10 factures en attente** maximum

## Sécurité

- ✅ Token JWT stocké de manière sécurisée
- ✅ Headers obligatoires pour toutes les requêtes
- ✅ Validation des données côté serveur
- ✅ Gestion des erreurs 401 (token expiré/invalide)
- ✅ Timeout des requêtes (30 secondes)

## Historique et Liste des Factures

L'écran "Historique" permet de:
- 📋 Lister toutes les factures avec filtres
- 🔍 Rechercher par numéro, date, client
- 🖨️ Réimprimer les factures certifiées
- 📊 Afficher les badges de statut
- 🔄 Voir les factures en attente (PENDING)
- ❌ Voir les factures annulées/erreur

## Migration depuis l'Ancien Système

Le nouveau système est **rétrocompatible**:
- Les anciennes factures restent accessibles
- Le système détecte automatiquement le type de facture
- Les données sont préservées dans localStorage et DB

## Support et Documentation

- **Spécification API**: `/e-SECeF_API_v1.0.pdf`
- **Guide intégration**: `ESECEF_INTEGRATION.md`
- **Quick Start**: `ESECEF_QUICKSTART.md`
- **Troubleshooting**: `TROUBLESHOOTING_ESECEF.md`
- **Guide facture certifiée**: `FACTURE_CERTIFIEE_GUIDE.md`

---

**Version**: 1.0  
**Date**: 13/12/2025  
**Auteur**: Système de Gestion Pharmacie Garkuwa
