# Système de Gestion d'Annulation des Factures en Attente

## Vue d'ensemble

Ce document décrit le système complet de gestion et d'annulation des factures en attente de certification e-SECeF.

## Architecture

### 1. Types d'annulation

Le système gère **deux types d'annulation** :

#### A. Annulation sur l'API e-SECeF (avec UID)
- **Quand ?** Lorsque la facture a été soumise à l'API e-SECeF et possède un UID
- **Comment ?** Appel à l'endpoint de finalisation avec l'action `annuler`
- **Résultat ?** La facture est annulée sur le serveur DGI ET en base de données locale

#### B. Annulation locale (sans UID)
- **Quand ?** Lorsque la facture est en erreur locale ou n'a jamais été soumise
- **Comment ?** Mise à jour du statut en base de données uniquement
- **Résultat ?** La facture est marquée comme annulée localement

---

## API Routes

### 1. `/api/invoice/cancel` (POST)

Annule une facture individuellement.

**Request Body:**
```json
{
  "factureId": "uuid-de-la-facture",
  "uid": "uid-optionnel"  // UID de la transaction e-SECeF
}
```

**Response (succès):**
```json
{
  "success": true,
  "message": "Facture annulée sur l'API e-SECeF et en base de données",
  "facture": { /* objet facture mis à jour */ },
  "cancelledOnApi": true,
  "apiError": null
}
```

**Workflow:**
1. Récupère la facture en base de données
2. Si un UID existe:
   - Tente d'annuler sur l'API e-SECeF via `finalizeInvoice(uid, 'annuler')`
   - Gère les erreurs (code 20 = déjà finalisée/annulée = succès)
3. Met à jour le statut à `annulee` en base de données
4. Log l'action avec détails

**Cas spéciaux:**
- Si erreur code `20` (facture inexistante ou déjà finalisée) → Considéré comme succès
- Si timeout/erreur réseau → Annulation locale (la facture expirera après 2 minutes sur l'API)

---

### 2. `/api/invoice/cancel` (PUT) - Annulation en masse

Annule plusieurs factures en une seule opération.

**Request Body:**
```json
{
  "factureIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "3/3 factures annulées",
  "results": {
    "total": 3,
    "cancelled": 3,
    "errors": 0,
    "details": [
      {
        "factureId": "uuid1",
        "success": true,
        "cancelledOnApi": true
      },
      // ...
    ]
  }
}
```

**Utilisation:**
- Annulation de plusieurs factures expirées
- Nettoyage de factures en erreur
- Opérations de maintenance

---

## Composant UI

### `PendingInvoicesManagement.tsx`

Le composant offre une interface complète pour gérer les factures en attente.

#### Fonctionnalités principales

1. **Affichage des factures**
   - Filtres : Toutes, En attente, Erreurs, Soumises
   - Tableau avec détails : N° facture, date, client, montant, statut, tentatives
   - Badge de statut avec code couleur

2. **Actions disponibles**
   - 🔄 **Réessayer** : Tente une nouvelle certification
   - 🚫 **Annuler sur e-SECeF** : Annule avec UID (appel API)
   - ❌ **Annuler localement** : Annule sans UID (local uniquement)
   - 🗑️ **Supprimer** : Supprime définitivement la facture

3. **Modal de détails**
   - Informations générales (statut, tentatives, dates)
   - Informations client
   - Détails de certification (Code SECeF/DGI, UID, QR code)
   - Erreurs détaillées
   - Actions contextuelles

#### Interface d'annulation

```typescript
const handleCancel = async (factureId: string, uid?: string) => {
  const facture = factures.find(f => f.id === factureId);
  const hasUid = uid || facture?.uid;
  
  // Message différent selon qu'il y a un UID ou non
  const message = hasUid
    ? 'Annulera sur l\'API e-SECeF ET en base de données'
    : 'Annulera en base de données uniquement';
  
  // Appel à l'API d'annulation
  const response = await fetch('/api/invoice/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ factureId, uid: hasUid })
  });
  
  // Gestion de la réponse...
}
```

---

## Service e-SECeF

### Méthode `finalizeInvoice`

```typescript
async finalizeInvoice(
  uid: string,
  action: 'confirmer' | 'annuler'
): Promise<SecurityElementsDto>
```

**Selon l'API e-SECeF (Section 1.3):**
- **URL:** `{API_FACTURATION_URL}/{UID}/{ACTION}`
- **Méthode:** PUT
- **Action:** `annuler`
- **Réponse:** Objet `SecurityElementsDto` (vide si annulation)

**Exemple:**
```typescript
const result = await esecefService.finalizeInvoice(
  'e5af2ff9-0ac8-4924-b8b7-cc9da3a17db8',
  'annuler'
);

// Si succès: result.errorCode === undefined
// Si erreur 20: Facture déjà finalisée/annulée → Traiter comme succès
```

---

## Workflow Complet

### Scénario 1 : Annulation d'une facture avec UID

```
┌──────────────────────────────────────────────────────────┐
│ 1. Utilisateur clique "Annuler sur e-SECeF"             │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 2. Confirmation utilisateur                              │
│    "Cette action annulera sur l'API e-SECeF ET en BDD"  │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 3. POST /api/invoice/cancel                              │
│    Body: { factureId, uid }                              │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 4. Récupération de la facture en BDD                     │
│    - Vérification de l'existence                         │
│    - Récupération de l'UID                               │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 5. Appel API e-SECeF                                     │
│    PUT {API_URL}/{uid}/annuler                           │
│    - Si succès : cancelledOnApi = true                   │
│    - Si erreur 20 : cancelledOnApi = true (déjà annulée)│
│    - Si timeout : cancelledOnApi = false (expire auto)   │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 6. Mise à jour en BDD                                    │
│    - statut = 'annulee'                                  │
│    - derniereTentative = now()                           │
│    - errorCode/Description si erreur API                 │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 7. Réponse et notification utilisateur                   │
│    "✅ Facture annulée sur l'API e-SECeF et en BDD"     │
└──────────────────────────────────────────────────────────┘
```

### Scénario 2 : Annulation locale (sans UID)

```
┌──────────────────────────────────────────────────────────┐
│ 1. Utilisateur clique "Annuler localement"              │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 2. POST /api/invoice/cancel                              │
│    Body: { factureId } (pas d'UID)                       │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 3. Mise à jour directe en BDD                            │
│    - statut = 'annulee'                                  │
│    - Pas d'appel API e-SECeF                             │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│ 4. Réponse                                               │
│    "✅ Facture annulée en base de données"              │
└──────────────────────────────────────────────────────────┘
```

---

## Gestion des Erreurs

### Codes d'erreur e-SECeF

| Code | Description | Action |
|------|-------------|--------|
| `20` | La facture n'existe pas ou est déjà finalisée/annulée | Traiter comme succès |
| `99` | Erreur lors du traitement de la demande | Réessayer ou annuler localement |
| `timeout` | Délai d'attente dépassé | Annuler localement (expire après 2 min) |

### Stratégies de récupération

1. **Erreur code 20** : Considérer l'annulation réussie
2. **Timeout/Erreur réseau** : Annuler localement + info utilisateur
3. **Erreur API autre** : Sauvegarder l'erreur + permettre réessai

---

## Cas d'Usage

### 1. Facture expirée (2 minutes dépassées)

**Problème:** Facture soumise mais pas finalisée dans les 2 minutes

**Solution:**
1. L'API e-SECeF l'a déjà marquée comme expirée
2. Utiliser l'annulation pour nettoyer en BDD locale
3. L'appel API retournera probablement code 20 → succès

### 2. Facture en erreur après plusieurs tentatives

**Problème:** Erreur répétée (ex: erreur de validation)

**Solution:**
1. Analyser l'erreur via le modal de détails
2. Si erreur persistante, annuler la facture
3. Créer une nouvelle vente/facture avec données corrigées

### 3. Nettoyage de masse

**Problème:** Plusieurs factures à annuler (maintenance)

**Solution:**
1. Utiliser l'endpoint PUT `/api/invoice/cancel`
2. Passer un tableau de `factureIds`
3. Le système traite toutes les factures en une opération

### 4. Facture doublon

**Problème:** Facture créée par erreur

**Solution:**
1. Annuler via l'interface
2. Ou supprimer complètement avec DELETE

---

## Statuts des Factures

| Statut | Description | Actions disponibles |
|--------|-------------|---------------------|
| `en_attente` | En attente de certification | Réessayer, Annuler, Supprimer |
| `soumise` | Soumise avec UID mais pas finalisée | Réessayer, Annuler (API), Supprimer |
| `erreur` | Erreur lors de la certification | Réessayer, Annuler, Supprimer |
| `certifiee` | Certifiée avec succès | Voir détails |
| `annulee` | Annulée (API ou locale) | Supprimer |

---

## Logs et Audit

Chaque annulation génère des logs détaillés :

```
📋 Facture annulée: FAC-2024-001
   - Client: DUPONT Jean
   - Montant: 25000 FCFA
   - UID: e5af2ff9-0ac8-4924-b8b7-cc9da3a17db8
   - Annulée sur API: Oui
```

---

## Bonnes Pratiques

### Pour les administrateurs

1. **Vérifier d'abord** : Toujours consulter les détails avant d'annuler
2. **Privilégier le réessai** : Pour les erreurs temporaires
3. **Annulation avec UID** : Si la facture est sur l'API e-SECeF
4. **Nettoyage régulier** : Supprimer les factures annulées anciennes

### Pour les développeurs

1. **Toujours gérer le code 20** : Considérer comme succès
2. **Timeout = expiration** : Annuler localement sans erreur
3. **Logs détaillés** : Pour le débogage
4. **Transaction atomique** : Annulation API + BDD

---

## Limitations

1. **Délai de 2 minutes** : L'API e-SECeF expire les factures après 2 minutes
2. **Maximum 10 factures en attente** : Sur l'API e-SECeF simultanément
3. **Pas de récupération** : Une facture annulée ne peut pas être réactivée
4. **Annulation irréversible** : L'action ne peut pas être annulée

---

## Tests

### Test 1 : Annulation avec UID valide
```bash
curl -X POST http://localhost:3000/api/invoice/cancel \
  -H "Content-Type: application/json" \
  -d '{"factureId":"uuid","uid":"valid-uid"}'
```

### Test 2 : Annulation sans UID
```bash
curl -X POST http://localhost:3000/api/invoice/cancel \
  -H "Content-Type: application/json" \
  -d '{"factureId":"uuid"}'
```

### Test 3 : Annulation en masse
```bash
curl -X PUT http://localhost:3000/api/invoice/cancel \
  -H "Content-Type: application/json" \
  -d '{"factureIds":["uuid1","uuid2"]}'
```

---

## Dépannage

### Problème : "Facture non trouvée"
**Solution :** Vérifier que l'ID est correct et que la facture existe

### Problème : "Token non autorisé"
**Solution :** Vérifier la configuration e-SECeF et le token

### Problème : Timeout répété
**Solution :** 
- Vérifier la connexion Internet
- Utiliser l'annulation locale
- La facture expirera automatiquement après 2 minutes

### Problème : Erreur code 20 mais échec
**Solution :** C'est normal, la facture était déjà finalisée/annulée

---

## Références

- **API e-SECeF Documentation** : Section 1.3 - Demande de finalisation
- **Code source** : `/src/app/api/invoice/cancel/route.ts`
- **Composant UI** : `/src/components/features/PendingInvoicesManagement.tsx`
- **Service** : `/src/lib/esecef.service.ts`

---

## Support

Pour toute question ou problème :
1. Consulter les logs de l'application
2. Vérifier le statut de l'API e-SECeF
3. Consulter cette documentation
4. Contacter l'équipe de support technique
