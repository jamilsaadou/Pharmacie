# 🔍 Troubleshooting 404 - API e-SECeF

## ❌ Erreur: HTTP 404 Not Found

Un 404 signifie: **l'URL n'existe pas** côté serveur. Ce n'est pas un problème de méthode (405), c'est **l'adresse qui est incorrecte**.

---

## 🎯 Diagnostic Rapide

### Étape 1: Identifier l'URL qui échoue

**Ouvrez la console du navigateur** (F12 → Onglet Network):
- Cherchez la requête qui donne 404
- Copiez l'URL complète
- Notez la méthode (GET/POST/PUT)

**Exemples de ce que vous pourriez voir:**

```
❌ 404 Not Found: http://localhost:3000/api/invoice/finalize
❌ 404 Not Found: https://esecef-test.impots.gouv.ne/api/invoice/abc-123/confirm
✅ 200 OK: https://esecef-test.impots.gouv.ne/api/invoice/abc-123/confirmer
```

---

## 🔧 Solutions selon l'URL

### CAS 1: 404 sur vos endpoints locaux (`http://localhost:3000/api/...`)

**URL qui échoue:** `http://localhost:3000/api/invoice/...`

**Causes possibles:**
1. Le serveur Next.js n'est pas démarré
2. Le fichier `route.ts` n'existe pas au bon endroit
3. Erreur de typo dans l'URL

**✅ Vérifications:**

```bash
# 1. Le serveur tourne?
npm run dev

# 2. Les fichiers existent?
ls src/app/api/invoice/calculate/route.ts
ls src/app/api/invoice/finalize/route.ts
ls src/app/api/invoice/pending/route.ts

# 3. Tester directement
curl http://localhost:3000/api/invoice/pending
```

**Si ça marche localement** → Le problème est dans l'appel à l'API e-SECeF externe (voir CAS 2).

---

### CAS 2: 404 sur l'API e-SECeF externe

**URL qui échoue:** `https://esecef-test.impots.gouv.ne/api/invoice/...`

#### A. Vérifier la Base URL

Il y a **2 bases URL différentes**:

```typescript
// ✅ FACTURATION (invoice)
TEST: https://esecef-test.impots.gouv.ne/api/invoice
PROD: https://esecef.impots.gouv.ne/api/invoice

// ✅ INFORMATION (info) - NE PAS utiliser pour certifier!
TEST: https://esecef-test.impots.gouv.ne/api/info
PROD: https://esecef.impots.gouv.ne/api/info
```

**❌ Erreurs fréquentes:**
```
https://esecef-test.impots.gouv.ne/api/info/abc-123/confirmer  ❌ Mauvaise base!
https://esecef-test.impots.gouv.ne/invoice/abc-123/confirmer   ❌ Manque /api/
https://esecef.impots.gouv.ne/api/invoice/...                  ❌ En test, pas prod!
```

#### B. Tester le Status d'abord

**Avant toute chose, testez que votre token fonctionne:**

```bash
curl -i "https://esecef-test.impots.gouv.ne/api/invoice/" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Accept: application/json"
```

**Réponses possibles:**
- `200 OK` → ✅ Token valide, base URL correcte
- `401 Unauthorized` → ❌ Token invalide/expiré
- `404 Not Found` → ❌ Base URL incorrecte
- `Timeout` → ❌ Problème réseau/firewall

#### C. URLs Exactes selon la Spec

**📍 Étape 1: POST Calculate (Demande de facture)**
```
URL: https://esecef-test.impots.gouv.ne/api/invoice/
Méthode: POST
Body: JSON avec InvoiceRequestDataDto
```

**📍 Étape 2: PUT Finalize (Confirmer ou annuler)**
```
URL: https://esecef-test.impots.gouv.ne/api/invoice/{UID}/confirmer
     https://esecef-test.impots.gouv.ne/api/invoice/{UID}/annuler
Méthode: PUT (pas POST!)
Body: AUCUN (juste l'URL)
```

**⚠️ IMPORTANT:**
- L'UID doit être le **vrai UID reçu** de l'étape 1 (36 caractères)
- L'action est dans l'URL: `/confirmer` ou `/annuler` (français!)
- **PAS** de `/confirm` ou `/cancel` (anglais)

**Exemple d'appel correct:**
```bash
# Étape 1: Calculate
curl -X POST "https://esecef-test.impots.gouv.ne/api/invoice/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --data '{
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
  }'

# Réponse: {"uid": "abc-def-123-...", ...}

# Étape 2: Finalize (dans les 2 minutes!)
curl -X PUT "https://esecef-test.impots.gouv.ne/api/invoice/abc-def-123-.../confirmer" \
  -H "Authorization: Bearer <token>" \
  -H "Accept: application/json"
```

#### D. Variations d'Action possibles

La spec mentionne `confirmer/annuler` mais certains serveurs acceptent aussi `confirm/cancel`:

**🧪 À tester dans cet ordre:**
1. `/confirmer` et `/annuler` (français - spec officielle)
2. `/confirm` et `/cancel` (anglais - exemples dans spec)

```bash
# Test 1 (français)
curl -X PUT "https://esecef-test.impots.gouv.ne/api/invoice/{UID}/confirmer" ...

# Test 2 (anglais) si le premier donne 404
curl -X PUT "https://esecef-test.impots.gouv.ne/api/invoice/{UID}/confirm" ...
```

---

### CAS 3: UID Invalide ou Expiré

**Symptôme:** L'URL semble correcte mais donne quand même 404

**Cause:** L'UID n'existe plus (expiré après 2 minutes ou déjà finalisé)

**✅ Vérification:**
```bash
# Récupérer les détails de la facture en attente
curl "https://esecef-test.impots.gouv.ne/api/invoice/{UID}" \
  -H "Authorization: Bearer <token>"
```

**Réponses possibles:**
- `200 OK` → ✅ L'UID existe encore
- `404 Not Found` → ❌ L'UID n'existe pas/plus
- `Erreur code 20` → ❌ Déjà finalisée ou annulée

**Solution:** Refaire un POST calculate pour obtenir un nouvel UID.

---

### CAS 4: Problème dans notre code (src/lib/esecef.service.ts)

**Vérifiez la construction de l'URL:**

```typescript
// ✅ CORRECT
async finalizeInvoice(uid: string, action: 'confirmer' | 'annuler') {
  return this.request(
    `${this.baseURLInvoice}/${uid}/${action}`,  // Pas de slash final!
    'PUT'
  );
}

// ❌ INCORRECT
`${this.baseURLInvoice}/${uid}/${action}/`  // Slash final = 404!
`${this.baseURLInvoice}/finalize/${uid}`     // Ordre inversé = 404!
`${this.baseURLInvoice}/${action}/${uid}`    // Ordre inversé = 404!
```

---

## 📋 Checklist de Dépannage

Suivez ces étapes **dans l'ordre**:

### ✅ Niveau 1: Configuration
- [ ] Token e-SECeF configuré dans ESECeFConfiguration
- [ ] Environnement = TEST (pas PROD pour débuter)
- [ ] NIF, NIM, ISF renseignés
- [ ] Token valide (tester avec GET /status)

### ✅ Niveau 2: Serveur Local
- [ ] `npm run dev` en cours d'exécution
- [ ] Fichiers `route.ts` existent dans `src/app/api/invoice/`
- [ ] Pas d'erreurs dans la console serveur

### ✅ Niveau 3: URLs
- [ ] Base URL = `https://esecef-test.impots.gouv.ne/api/invoice`
- [ ] Calculate = `POST /` (racine, pas `/calculate`)
- [ ] Finalize = `PUT /{uid}/confirmer` ou `PUT /{uid}/annuler`
- [ ] Pas de slash final dans les URLs

### ✅ Niveau 4: UID et Timing
- [ ] UID récupéré de l'étape calculate
- [ ] UID a 36 caractères (format UUID)
- [ ] Finalisation faite **avant 2 minutes**
- [ ] UID pas déjà utilisé (pas de réutilisation)

### ✅ Niveau 5: Réseau
- [ ] Connexion Internet active
- [ ] Pas de proxy/VPN bloquant
- [ ] Firewall autorise les requêtes vers impots.gouv.ne
- [ ] DNS résout esecef-test.impots.gouv.ne

---

## 🐛 Mode Debug Avancé

**Activer les logs détaillés:**

```typescript
// Dans src/lib/esecef.service.ts, méthode request():

private async request<T>(url: string, method: string, body?: any): Promise<T> {
  // 🔍 AJOUTER CES LOGS
  console.log('🔵 e-SECeF Request:');
  console.log('   URL:', url);
  console.log('   Method:', method);
  console.log('   Body:', body ? JSON.stringify(body, null, 2) : 'none');
  
  try {
    const response = await fetch(url, {...});
    
    // 🔍 AJOUTER CE LOG
    console.log('🟢 e-SECeF Response:', response.status, response.statusText);
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Error Response:', text);
      // ...
    }
    // ...
  }
}
```

**Résultat dans la console:**
```
🔵 e-SECeF Request:
   URL: https://esecef-test.impots.gouv.ne/api/invoice/abc-123/confirmer
   Method: PUT
   Body: none
❌ e-SECeF Response: 404 Not Found
   Error Response: {"message": "Not Found"}
```

→ Copier-coller ces logs pour diagnostiquer précisément le problème.

---

## 📞 Besoin d'Aide?

**Fournissez ces informations:**

1. **URL complète qui donne 404** (copier-coller depuis Network tab)
2. **Méthode HTTP** (GET/POST/PUT)
3. **Environnement** (TEST ou PROD)
4. **Étape où ça échoue** (calculate ou finalize)
5. **Logs de la console** (avec les 🔵🟢❌)

**Exemple de bon rapport:**
```
❌ Problème: 404 lors de la finalisation
📍 URL: https://esecef-test.impots.gouv.ne/api/invoice/abc-123-def/confirm
🔧 Méthode: PUT
📊 Environnement: TEST
🔍 Logs:
   🔵 e-SECeF Request: PUT .../abc-123-def/confirm
   ❌ e-SECeF Response: 404 Not Found
```

→ **Solution:** Remplacer `/confirm` par `/confirmer` (français!)

---

**Dernière Mise à Jour:** 13/12/2025  
**Version:** 1.0
