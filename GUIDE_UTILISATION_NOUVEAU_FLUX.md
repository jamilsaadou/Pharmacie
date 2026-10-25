# Guide d'Utilisation du Nouveau Flux de Facturation

## 📋 Résumé du Changement

### ❌ Ancien Flux (À NE PLUS UTILISER)
```
POST /api/esecef/certify → Tout en une fois → Code SECeF/DGI
```
**Problème**: Ne respecte pas le flux officiel de l'API e-SECeF

### ✅ Nouveau Flux (À UTILISER)
```
POST /api/invoice/calculate  → UID + Totaux (PENDING)
         ↓
   Prévisualisation
         ↓
POST /api/invoice/finalize  → Code SECeF/DGI (FINALIZED)
```
**Avantage**: Conforme à la spécification officielle e-SECeF

---

## 🔧 Migration du Code Existant

### Avant (Ancien flux)
```typescript
// ❌ NE PLUS FAIRE COMME ÇA
const certifyResponse = await fetch('/api/esecef/certify', {
  method: 'POST',
  body: JSON.stringify({
    venteId: vente.id,
    typeFacture: 'FV',
  })
});

const { securityElements } = await certifyResponse.json();
// On a directement le Code SECeF/DGI
```

### Après (Nouveau flux en 3 étapes)

#### Étape 1: Calculer (POST calculate)
```typescript
// 1️⃣ Préparer les données de facture
const invoiceData = {
  nif: config.nif,
  mode: 'TTC',
  isf: config.isf,
  type: 'FV', // Type de facture
  operator: {
    name: 'Nom Vendeur',
    id: '01'
  },
  items: cart.map(item => ({
    name: item.medicament.nom,
    code: item.medicament.id,
    price: item.medicament.prix * 100, // En centimes!
    quantity: item.quantite,
    taxGroup: 'B' // Groupe de taxation
  })),
  payment: [{
    name: 'ESPECES',
    amount: total * 100 // En centimes!
  }],
  client: selectedClient ? {
    nif: selectedClient.nif,
    name: `${selectedClient.nom} ${selectedClient.prenom}`,
    contact: selectedClient.telephone,
    address: selectedClient.adresse
  } : undefined
};

// 2️⃣ Appeler calculate
const calculateResponse = await fetch('/api/invoice/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ invoiceData })
});

const { uid, totals } = await calculateResponse.json();

// ⚠️ La facture est maintenant en statut PENDING
// ⚠️ Vous avez 2 MINUTES pour finaliser
```

#### Étape 2: Afficher Prévisualisation
```typescript
// 📊 Afficher les totaux calculés par l'API
console.log('Total TTC:', totals.total / 100, 'FCFA');
console.log('Total TVA:', totals.vtotal / 100, 'FCFA');
console.log('UID:', uid);

// 🔴 IMPORTANT: Comparer avec vos propres calculs
const monTotal = calculerTotalLocal(cart);
if (Math.abs(monTotal - totals.total / 100) > 1) {
  console.warn('⚠️ Différence entre calcul local et API!');
}

// Afficher modal de confirmation avec:
// - UID
// - Totaux de l'API
// - Boutons "Confirmer" / "Annuler"
// - Compteur de temps (2 min max)
```

#### Étape 3: Finaliser (POST finalize)
```typescript
// 3️⃣ Option A: Confirmer la facture
const finalizeResponse = await fetch('/api/invoice/finalize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    uid: uid,
    action: 'confirm' // 👈 ou 'cancel'
  })
});

const { securityElements } = await finalizeResponse.json();

// ✅ Maintenant vous avez:
console.log('Code SECeF/DGI:', securityElements.codeSECeFDGI);
console.log('QR Code:', securityElements.qrCode);
console.log('DateTime:', securityElements.dateTime);
console.log('Compteurs:', securityElements.counters);
console.log('NIM:', securityElements.nim);

// 🖨️ Vous pouvez maintenant imprimer la facture
```

---

## 💡 Exemple Complet d'Implémentation React

```typescript
import { useState } from 'react';

function InvoiceCreationComponent() {
  const [invoiceStatus, setInvoiceStatus] = useState<'DRAFT' | 'PENDING' | 'FINALIZED'>('DRAFT');
  const [uid, setUid] = useState<string>('');
  const [totalsAPI, setTotalsAPI] = useState<any>(null);
  const [securityElements, setSecurityElements] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes

  // Étape 1: Calculer
  const handleCalculate = async () => {
    try {
      setInvoiceStatus('calculating...');
      
      const response = await fetch('/api/invoice/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceData: {
            // ... vos données
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const { uid, totals } = await response.json();
      
      setUid(uid);
      setTotalsAPI(totals);
      setInvoiceStatus('PENDING');
      
      // Démarrer le timer de 2 minutes
      startTimer();
      
    } catch (error) {
      console.error('Erreur calcul:', error);
      alert(error.message);
    }
  };

  // Étape 2: Timer
  const startTimer = () => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setInvoiceStatus('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Étape 3: Finaliser
  const handleFinalize = async (action: 'confirm' | 'cancel') => {
    try {
      const response = await fetch('/api/invoice/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, action })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const { securityElements: se } = await response.json();
      
      if (action === 'confirm') {
        setSecurityElements(se);
        setInvoiceStatus('FINALIZED');
        // Imprimer la facture
        printInvoice(se);
      } else {
        setInvoiceStatus('CANCELLED');
      }
      
    } catch (error) {
      console.error('Erreur finalisation:', error);
      alert(error.message);
    }
  };

  return (
    <div>
      {/* DRAFT: Composition du panier */}
      {invoiceStatus === 'DRAFT' && (
        <div>
          {/* Votre interface de panier */}
          <button onClick={handleCalculate}>
            Certifier (Calculer)
          </button>
        </div>
      )}

      {/* PENDING: Prévisualisation */}
      {invoiceStatus === 'PENDING' && (
        <div>
          <h2>Prévisualisation de la Facture</h2>
          <p>UID: {uid}</p>
          <p>Temps restant: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</p>
          
          <div>
            <h3>Totaux calculés par l'API:</h3>
            <p>Total TTC: {totalsAPI?.total / 100} FCFA</p>
            <p>Total TVA: {totalsAPI?.vtotal / 100} FCFA</p>
          </div>

          <button onClick={() => handleFinalize('confirm')}>
            ✅ Confirmer
          </button>
          <button onClick={() => handleFinalize('cancel')}>
            ❌ Annuler
          </button>
        </div>
      )}

      {/* FINALIZED: Facture certifiée */}
      {invoiceStatus === 'FINALIZED' && (
        <div>
          <h2>✅ Facture Certifiée!</h2>
          <p>Code SECeF/DGI: {securityElements?.codeSECeFDGI}</p>
          <p>DateTime: {securityElements?.dateTime}</p>
          <button onClick={() => printInvoice(securityElements)}>
            🖨️ Imprimer
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## ⚠️ Points d'Attention Critiques

### 1. Conversion des Montants
```typescript
// ❌ ERREUR fréquente
price: medicament.prix  // Non! L'API attend des centimes

// ✅ CORRECT
price: medicament.prix * 100  // 5000 FCFA → 500000 centimes
```

### 2. Timer de 2 Minutes
```typescript
// ⏱️ Après POST calculate, vous avez 2 MINUTES max
// Sinon la facture expire automatiquement

// Recommandation: Afficher un compte à rebours
const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
```

### 3. Gestion des Erreurs
```typescript
// Toujours vérifier response.ok
if (!response.ok) {
  const error = await response.json();
  
  // Afficher errorCode + errorDesc de l'API
  if (error.errorCode) {
    console.error(`Erreur ${error.errorCode}:`, error.error);
  }
}
```

### 4. Maximum 10 Factures en Attente
```typescript
// ⚠️ L'API refuse si vous avez déjà 10 factures PENDING
// Vérifier avant:
const pendingResponse = await fetch('/api/invoice/pending');
const { pendingRequestsCount } = await pendingResponse.json();

if (pendingRequestsCount >= 10) {
  alert('Trop de factures en attente. Finalisez-les d\'abord!');
  return;
}
```

---

## 🐛 Débogage

### Vérifier le statut de l'API
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://esecef-test.impots.gouv.ne/api/invoice/
```

### Logs à Activer
```typescript
console.log('🔵 CALCULATE Request:', invoiceData);
console.log('🟢 CALCULATE Response:', { uid, totals });
console.log('🔵 FINALIZE Request:', { uid, action });
console.log('🟢 FINALIZE Response:', securityElements);
```

### Erreurs Communes

| Erreur | Cause | Solution |
|--------|-------|----------|
| "UID manquant" | Oubli de `uid` dans finalize | Passer l'UID reçu de calculate |
| "Token non autorisé" | Token invalide/expiré | Vérifier config e-SECeF |
| "Facture déjà finalisée" | UID déjà utilisé | Ne pas réutiliser un UID |
| "Timeout" | > 2 minutes | Refaire POST calculate |
| "Max pending dépassé" | > 10 factures PENDING | Finaliser les anciennes |

---

## 📊 Tester le Nouveau Flux

### Test Manuel via Postman/cURL

```bash
# 1️⃣ Calculate
curl -X POST http://localhost:3000/api/invoice/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceData": {
      "nif": "9999900000001",
      "mode": "TTC",
      "isf": "PHARMA-APP-001",
      "type": "FV",
      "operator": {"name": "Test"},
      "items": [{
        "name": "Test",
        "price": 100000,
        "quantity": 1,
        "taxGroup": "B"
      }],
      "payment": [{"name": "ESPECES", "amount": 100000}]
    }
  }'

# Réponse: {"uid": "abc-123", "totals": {...}}

# 2️⃣ Finalize (dans les 2 minutes!)
curl -X POST http://localhost:3000/api/invoice/finalize \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "abc-123",
    "action": "confirm"
  }'

# Réponse: {"securityElements": {...}}
```

---

## 📚 Ressources

- **Spécification API**: `e-SECeF_API_v1.0.pdf`
- **Documentation**: `NOUVEAU_SYSTEME_FACTURATION.md`
- **Code Examples**: `src/app/api/invoice/*/route.ts`

---

## ✅ Checklist de Migration

- [ ] Remplacer tous les appels à `/api/esecef/certify`
- [ ] Implémenter l'écran de prévisualisation (PENDING)
- [ ] Ajouter le timer de 2 minutes
- [ ] Convertir les montants en centimes (× 100)
- [ ] Tester avec l'environnement TEST d'abord
- [ ] Gérer les 13 codes d'erreur de l'API
- [ ] Afficher les badges de statut (DRAFT/PENDING/FINALIZED)
- [ ] Implémenter la réimpression des factures certifiées
- [ ] Former les utilisateurs au nouveau flux

---

**Version**: 1.0  
**Date**: 13/12/2025  
**Contact Support**: Voir `TROUBLESHOOTING_ESECEF.md`
