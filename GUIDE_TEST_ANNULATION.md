# Guide de Test - Système d'Annulation des Factures

## Tests Manuels via l'Interface

### Test 1 : Annulation d'une facture avec UID (API e-SECeF)

**Objectif :** Vérifier l'annulation d'une facture sur l'API e-SECeF

**Prérequis :**
- Facture en statut `soumise` avec un UID
- Configuration e-SECeF active

**Étapes :**
1. Aller dans "Factures en Attente"
2. Trouver une facture avec statut "Soumise" (a un UID)
3. Cliquer sur "📋 Détails"
4. Cliquer sur "🚫 Annuler sur e-SECeF"
5. Confirmer l'action

**Résultat attendu :**
- Message : "✅ Facture annulée sur l'API e-SECeF et en base de données"
- Statut de la facture passe à "Annulée"
- Badge gris "ANNULEE" dans le tableau

---

### Test 2 : Annulation d'une facture sans UID (locale)

**Objectif :** Vérifier l'annulation locale d'une facture en erreur

**Prérequis :**
- Facture en statut `erreur` sans UID

**Étapes :**
1. Aller dans "Factures en Attente"
2. Filtrer par "Erreurs"
3. Trouver une facture en erreur sans UID
4. Cliquer sur "📋 Détails"
5. Cliquer sur "❌ Annuler localement"
6. Confirmer l'action

**Résultat attendu :**
- Message : "✅ Facture annulée en base de données"
- Statut de la facture passe à "Annulée"

---

### Test 3 : Annulation d'une facture expirée

**Objectif :** Vérifier la gestion des factures expirées (> 2 minutes)

**Prérequis :**
- Facture soumise depuis plus de 2 minutes

**Étapes :**
1. Soumettre une facture à l'API e-SECeF
2. Attendre 2 minutes sans la finaliser
3. Aller dans "Factures en Attente"
4. Tenter d'annuler cette facture

**Résultat attendu :**
- L'API retourne code erreur 20
- Le système traite ça comme un succès
- Facture marquée comme annulée localement

---

### Test 4 : Vérification du modal de détails

**Objectif :** S'assurer que les informations sont complètes

**Étapes :**
1. Sélectionner une facture en attente
2. Cliquer sur "📋 Détails"
3. Vérifier toutes les sections

**Résultat attendu :**
- Informations générales : Statut, date, tentatives, vendeur
- Informations client (si présent)
- UID affiché si disponible
- Erreurs affichées si présentes
- Boutons d'action corrects selon le statut

---

### Test 5 : Annulation après plusieurs tentatives

**Objectif :** Vérifier la gestion des factures avec erreurs répétées

**Prérequis :**
- Facture avec 3+ tentatives échouées

**Étapes :**
1. Créer une facture avec données invalides
2. Réessayer 3 fois (échecs)
3. Annuler la facture
4. Vérifier les logs

**Résultat attendu :**
- Compteur de tentatives visible (rouge si > 3)
- Annulation réussie
- Logs détaillés de l'annulation

---

## Tests API via cURL/Postman

### Test API 1 : POST /api/invoice/cancel

```bash
# Avec UID
curl -X POST http://localhost:3000/api/invoice/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "factureId": "YOUR_FACTURE_ID",
    "uid": "YOUR_UID"
  }'

# Sans UID
curl -X POST http://localhost:3000/api/invoice/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "factureId": "YOUR_FACTURE_ID"
  }'
```

**Réponse attendue (succès) :**
```json
{
  "success": true,
  "message": "Facture annulée sur l'API e-SECeF et en base de données",
  "facture": { ... },
  "cancelledOnApi": true,
  "apiError": null
}
```

---

### Test API 2 : PUT /api/invoice/cancel (Annulation en masse)

```bash
curl -X PUT http://localhost:3000/api/invoice/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "factureIds": ["ID1", "ID2", "ID3"]
  }'
```

**Réponse attendue :**
```json
{
  "success": true,
  "message": "3/3 factures annulées",
  "results": {
    "total": 3,
    "cancelled": 3,
    "errors": 0,
    "details": [...]
  }
}
```

---

### Test API 3 : Gestion des erreurs

**Test 3.1 : Facture inexistante**
```bash
curl -X POST http://localhost:3000/api/invoice/cancel \
  -H "Content-Type: application/json" \
  -d '{"factureId": "INVALID_ID"}'
```

**Réponse attendue :**
```json
{
  "error": "Facture non trouvée"
}
```
Status: 404

---

**Test 3.2 : ID manquant**
```bash
curl -X POST http://localhost:3000/api/invoice/cancel \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Réponse attendue :**
```json
{
  "error": "ID de facture manquant"
}
```
Status: 400

---

## Tests de Scénarios Complexes

### Scénario 1 : Workflow complet

1. **Créer une vente** avec certification e-SECeF
2. **Vérifier** qu'elle apparaît dans "Factures en Attente"
3. **Consulter** les détails
4. **Annuler** la facture
5. **Vérifier** le changement de statut
6. **Supprimer** la facture (optionnel)

### Scénario 2 : Erreur réseau simulée

1. **Couper la connexion Internet**
2. **Tenter d'annuler** une facture avec UID
3. **Vérifier** que l'annulation locale fonctionne
4. **Vérifier** le message d'erreur API enregistré

### Scénario 3 : Token expiré

1. **Expirer le token** e-SECeF
2. **Tenter d'annuler** une facture avec UID
3. **Vérifier** la gestion de l'erreur 401
4. **Vérifier** que l'annulation locale s'effectue quand même

---

## Vérifications Base de Données

### Après annulation avec succès

```sql
-- Vérifier le statut
SELECT id, numeroFacture, statut, uid, errorCode, errorDescription
FROM FactureESECeF
WHERE id = 'YOUR_FACTURE_ID';

-- Résultat attendu :
-- statut = 'annulee'
-- derniereTentative = [timestamp récent]
-- errorCode = NULL (si succès API) ou 'CANCEL_API_ERROR' (si erreur)
```

---

## Logs à Vérifier

### Console serveur

Après une annulation réussie, vous devriez voir :

```
✅ Facture e5af2ff9-0ac8-4924-b8b7-cc9da3a17db8 annulée sur l'API e-SECeF

📋 Facture annulée: FAC-2024-001
   - Client: DUPONT Jean
   - Montant: 25000 FCFA
   - UID: e5af2ff9-0ac8-4924-b8b7-cc9da3a17db8
   - Annulée sur API: Oui
```

Après une erreur API :

```
⚠️ Erreur API e-SECeF: Token non autorisé ou expiré
⚠️ Erreur de connexion, annulation locale seulement

📋 Facture annulée: FAC-2024-001
   - Client: DUPONT Jean
   - Montant: 25000 FCFA
   - UID: e5af2ff9-0ac8-4924-b8b7-cc9da3a17db8
   - Annulée sur API: Non
   - Erreur API: Token non autorisé ou expiré
```

---

## Checklist de Test Final

- [ ] Annulation avec UID réussie
- [ ] Annulation sans UID réussie
- [ ] Gestion de l'erreur code 20 (traité comme succès)
- [ ] Gestion des timeouts
- [ ] Annulation en masse fonctionnelle
- [ ] Modal de détails affiche correctement
- [ ] Boutons d'action corrects selon statut
- [ ] Messages de confirmation appropriés
- [ ] Logs détaillés générés
- [ ] Statut mis à jour en base de données
- [ ] Gestion des erreurs API
- [ ] Token invalide géré correctement
- [ ] Facture inexistante gérée
- [ ] Interface réactive et sans bugs

---

## Cas Limites à Tester

1. **Annulation d'une facture déjà annulée**
   - Devrait retourner succès avec message approprié

2. **Annulation d'une facture certifiée**
   - Le bouton ne devrait pas être disponible

3. **10 factures en attente sur l'API**
   - Vérifier le message d'avertissement

4. **Annulation pendant un rechargement de page**
   - Vérifier que l'état est cohérent

5. **Double-clic sur bouton d'annulation**
   - Vérifier que l'action n'est pas dupliquée (disabled pendant traitement)

---

## Performance

### Tests de charge

1. **Annulation de 100 factures en masse**
   - Utiliser l'endpoint PUT avec 100 IDs
   - Vérifier le temps de réponse
   - Vérifier que toutes sont traitées

2. **Annulations simultanées**
   - Plusieurs utilisateurs annulant des factures en même temps
   - Vérifier l'intégrité des données

---

## Tests de Sécurité

1. **Injection SQL**
   - Tenter d'injecter du SQL dans factureId
   - Devrait être bloqué par Prisma

2. **XSS**
   - Tenter d'injecter du script dans les messages
   - Devrait être échappé par React

3. **Authorization**
   - Vérifier que seuls les utilisateurs autorisés peuvent annuler
   - (À implémenter si nécessaire)

---

## Rapport de Test

Après avoir effectué tous les tests, remplir ce rapport :

```
DATE : __________
TESTEUR : __________

TESTS RÉUSSIS : ___ / ___
TESTS ÉCHOUÉS : ___ / ___

BUGS TROUVÉS :
1. _____________________
2. _____________________

AMÉLIORATIONS SUGGÉRÉES :
1. _____________________
2. _____________________

CONCLUSION :
[ ] Système prêt pour la production
[ ] Corrections nécessaires
[ ] Tests supplémentaires requis
```

---

## Outils de Test Recommandés

- **Postman/Insomnia** : Tests API
- **Browser DevTools** : Inspection réseau et console
- **MySQL Workbench** : Vérification base de données
- **React DevTools** : Inspection des états React

---

## Support et Dépannage

Si un test échoue :

1. Vérifier les logs serveur
2. Vérifier les logs navigateur (Console)
3. Vérifier l'état en base de données
4. Consulter SYSTEME_ANNULATION_FACTURES.md
5. Vérifier la configuration e-SECeF
6. Tester la connectivité réseau
