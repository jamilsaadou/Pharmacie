# 📋 DOCUMENTATION D'INTÉGRATION e-SECeF

## 📌 Vue d'ensemble

Cette documentation décrit l'intégration complète de l'API **e-SECeF** (Système Électronique Certifié de Facturation) dans votre application de gestion de pharmacie. L'intégration permet de certifier automatiquement les factures de vente conformément à la réglementation fiscale du Niger.

---

## 🎯 Fonctionnalités implémentées

### ✅ Configuration e-SECeF
- Interface utilisateur pour configurer les paramètres e-SECeF
- Stockage sécurisé des informations (NIF, NIM, Token, etc.)
- Support des environnements Test et Production
- Test de connexion avec l'API

### ✅ Certification de factures
- Certification automatique des factures de vente
- Gestion des erreurs et des tentatives
- Stockage des codes SECeF/DGI et codes QR
- Traçabilité complète des certifications

### ✅ Sécurité
- Chiffrement du token d'authentification
- Validation des données
- Gestion des erreurs robuste

---

## 📁 Fichiers créés

### 1. Types TypeScript
```
src/types/esecef.ts
```
Définit tous les types pour l'API e-SECeF.

### 2. Service e-SECeF
```
src/lib/esecef.service.ts
```
Gère toutes les communications avec l'API e-SECeF.

### 3. Modèles Prisma
```
prisma/schema.prisma (mis à jour)
```
Ajoute deux nouveaux modèles :
- `ConfigurationESECeF` : Stocke la configuration
- `FactureESECeF` : Stocke les factures certifiées

### 4. Routes API

#### Configuration
```
src/app/api/esecef/config/route.ts
```
- `GET` : Récupérer la configuration active
- `POST` : Créer une nouvelle configuration
- `PUT` : Mettre à jour la configuration
- `DELETE` : Supprimer une configuration

#### Certification
```
src/app/api/esecef/certify/route.ts
```
- `POST` : Certifier une facture
- `GET` : Récupérer le statut d'une facture

#### Test
```
src/app/api/esecef/test/route.ts
```
- `POST` : Tester la connexion avec l'API

### 5. Interface utilisateur
```
src/components/features/ESECeFConfiguration.tsx
```
Composant React pour gérer la configuration e-SECeF.

---

## 🚀 Guide de démarrage

### Étape 1 : Mise à jour de la base de données

La base de données a déjà été synchronisée avec `prisma db push`. Si vous devez créer une migration propre plus tard :

```bash
npx prisma migrate dev --name add_esecef_tables
```

### Étape 2 : Configuration initiale

1. **Accédez à l'interface de configuration**
   - Ajoutez le composant `ESECeFConfiguration` à votre interface
   - Ou créez une page dédiée dans votre sidebar

2. **Remplissez les informations requises**
   - **NIF** : Numéro d'Identification Fiscale (13 chiffres)
   - **NIM** : Numéro d'Identification du Module e-MCF (10 caractères)
   - **ISF** : Identifiant de votre Système de Facturation (ex: PHARMA-APP-001)
   - **Token** : Token d'authentification fourni par la plateforme e-SECeF
   - **Environnement** : Choisissez "Test" pour les essais

3. **Testez la connexion**
   - Cliquez sur "Tester la connexion"
   - Vérifiez que la connexion est réussie

### Étape 3 : Intégration avec le module de ventes

Pour certifier une facture après une vente :

```typescript
// Exemple d'utilisation dans votre composant de vente
const certifierFacture = async (venteId: string) => {
  try {
    const response = await fetch('/api/esecef/certify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        venteId,
        operatorName: utilisateurConnecte.nom, // Nom de l'opérateur
        taxGroup: 'A', // Groupe de taxation (à adapter selon vos produits)
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    const result = await response.json();
    console.log('Facture certifiée:', result.facture.codeSECeFDGI);
    
    // Afficher le QR code si nécessaire
    console.log('QR Code:', result.facture.qrCode);
  } catch (error) {
    console.error('Erreur de certification:', error);
  }
};
```

---

## 🔧 Configuration avancée

### Variables d'environnement

Ajoutez dans votre fichier `.env` :

```env
# Clé de chiffrement pour le token (optionnel, une clé par défaut est utilisée)
ENCRYPTION_KEY=votre-cle-secrete-tres-longue
```

### Groupes de taxation

L'API e-SECeF utilise des groupes de taxation (A-P). Vous devez mapper vos produits à ces groupes :

```typescript
// Exemple de mapping dans votre code
const getTaxGroup = (medicament: Medicament): TaxGroup => {
  // Médicaments essentiels : Groupe A (TVA 0%)
  if (medicament.categorie === 'essential') return 'A';
  
  // Médicaments standards : Groupe B (TVA 19%)
  if (medicament.categorie === 'standard') return 'B';
  
  // Par défaut
  return 'A';
};
```

### Personnalisation du code ISF

Le code ISF identifie votre système. Modifiez-le dans la configuration selon vos besoins.

---

## 📊 Base de données

### Table ConfigurationESECeF

| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | Identifiant unique |
| nif | String | NIF du contribuable |
| nim | String | NIM de l'e-MCF (unique) |
| token | Text | Token chiffré |
| environnement | String | 'test' ou 'production' |
| isf | String | Identifiant SFE |
| actif | Boolean | Configuration active |
| dateConfiguration | DateTime | Date de création |
| dateModification | DateTime | Dernière modification |

### Table FactureESECeF

| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | Identifiant unique |
| venteId | UUID | Référence à la vente (unique) |
| numeroFacture | String | Numéro de facture |
| statut | String | État de la certification |
| requestData | Text | Données envoyées (JSON) |
| uid | String | UID de transaction |
| codeSECeFDGI | String | Code de certification |
| qrCode | Text | Contenu du QR code |
| dateTimeCertification | DateTime | Date de certification |
| counters | String | Compteurs |
| errorCode | String | Code d'erreur éventuel |
| errorDescription | Text | Description de l'erreur |
| configurationId | UUID | Configuration utilisée |
| tentatives | Integer | Nombre de tentatives |
| derniereTentative | DateTime | Dernière tentative |

---

## 🔐 Sécurité

### Chiffrement du token

Le token d'authentification est chiffré avant d'être stocké dans la base de données :

```typescript
import { TokenCrypto } from '@/lib/esecef.service';

// Chiffrer
const encrypted = TokenCrypto.encrypt(token);

// Déchiffrer
const decrypted = TokenCrypto.decrypt(encrypted);
```

⚠️ **Important** : L'implémentation actuelle utilise Base64. En production, utilisez une bibliothèque de chiffrement robuste comme `crypto-js` ou `node-forge`.

### Recommandations

1. **Protégez l'accès à la configuration e-SECeF**
   - Réservez l'accès aux administrateurs uniquement
   - Implementez des contrôles d'accès basés sur les rôles

2. **Sécurisez le token**
   - Ne l'affichez jamais en clair
   - Changez-le régulièrement
   - Utilisez HTTPS en production

3. **Logs et audit**
   - Enregistrez toutes les tentatives de certification
   - Surveillez les erreurs récurrentes

---

## 🧪 Tests

### Test en environnement de test

1. Configurez avec l'environnement "Test"
2. Utilisez les URLs de test :
   - https://esecef-test.impots.gouv.ne

3. Créez une vente et certifiez-la :
```bash
# Créer une vente
POST /api/ventes
{
  "clientId": "...",
  "items": [...],
  "methodePaiement": "especes",
  ...
}

# Certifier la facture
POST /api/esecef/certify
{
  "venteId": "id-de-la-vente",
  "operatorName": "Pharmacien"
}
```

### Passage en production

1. Obtenez un nouveau token pour l'environnement de production
2. Mettez à jour la configuration avec :
   - Environnement : "production"
   - Nouveau token
3. Testez la connexion
4. Effectuez des tests de certification

---

## ❌ Gestion des erreurs

### Codes d'erreur e-SECeF

| Code | Description |
|------|-------------|
| 1 | Nombre maximum de factures en attente dépassé |
| 3 | Type de facture non valide |
| 4 | Référence de facture originale manquante |
| 6 | Valeur ISB non valide |
| 7 | Type de paiement non valide |
| 8 | Articles manquants |
| 9 | Groupe de taxation non valide |
| 20 | Facture inexistante ou déjà finalisée |
| 99 | Erreur lors du traitement |

### Gestion dans votre code

```typescript
const result = await fetch('/api/esecef/certify', {
  method: 'POST',
  body: JSON.stringify({ venteId }),
});

const data = await result.json();

if (!data.success) {
  // Gérer l'erreur
  console.error('Code:', data.error.code);
  console.error('Description:', data.error.description);
  
  // Afficher un message à l'utilisateur
  alert(`Erreur de certification: ${data.error.description}`);
}
```

---

## 📖 API e-SECeF

### Endpoints disponibles

Le service `ESECeFService` expose toutes les méthodes de l'API :

```typescript
import { ESECeFService } from '@/lib/esecef.service';

const service = new ESECeFService(config, environnement);

// Vérifier le statut
const status = await service.getStatus();

// Récupérer les groupes de taxation
const taxGroups = await service.getTaxGroups();

// Récupérer les types de factures
const invoiceTypes = await service.getInvoiceTypes();

// Récupérer les types de paiement
const paymentTypes = await service.getPaymentTypes();

// Certifier une facture (workflow complet)
const result = await service.certifyInvoice(invoiceData);
```

---

## 🎨 Personnalisation de l'interface

### Ajouter le module au Sidebar

```typescript
// Dans votre composant Sidebar
import { ESECeFConfiguration } from '@/components/features/ESECeFConfiguration';

// Ajoutez un élément de menu
{
  id: 'esecef',
  label: 'e-SECeF',
  icon: '🔐',
  component: <ESECeFConfiguration />,
  roles: ['admin'], // Réservé aux administrateurs
}
```

### Afficher le statut de certification dans les ventes

```typescript
// Dans votre composant de liste des ventes
const [factureESECeF, setFactureESECeF] = useState(null);

useEffect(() => {
  // Charger le statut de certification
  fetch(`/api/esecef/certify?venteId=${vente.id}`)
    .then(res => res.json())
    .then(data => setFactureESECeF(data))
    .catch(() => setFactureESECeF(null));
}, [vente.id]);

// Afficher le badge
{factureESECeF?.statut === 'certifiee' && (
  <span className="text-green-600">
    ✓ Certifiée ({factureESECeF.codeSECeFDGI})
  </span>
)}
```

---

## 📝 Checklist de mise en production

- [ ] Configuration e-SECeF enregistrée avec l'environnement "Test"
- [ ] Tests de connexion réussis
- [ ] Certification de plusieurs factures de test effectuée
- [ ] Vérification des codes SECeF/DGI et QR codes
- [ ] Configuration e-SECeF mise à jour avec l'environnement "Production"
- [ ] Tests de connexion en production réussis
- [ ] Première certification en production effectuée et vérifiée
- [ ] Formation des utilisateurs sur le nouveau système
- [ ] Documentation remise aux équipes
- [ ] Plan de gestion des erreurs en place
- [ ] Monitoring et alertes configurés

---

## 🆘 Support et ressources

### Liens officiels
- **Production** : https://esecef.impots.gouv.ne
- **Test** : https://esecef-test.impots.gouv.ne
- **Documentation API** : Consultez le PDF fourni (e-SECeF_API_v1.0.pdf)

### Contact DGI
Pour obtenir un compte e-SECeF et un token :
- Direction Générale des Impôts du Niger
- Service e-SECeF

---

## 🔄 Évolutions futures possibles

1. **Impression des factures certifiées**
   - Génération de PDF avec QR code
   - Template personnalisé

2. **Tableau de bord e-SECeF**
   - Statistiques de certification
   - Suivi des erreurs
   - Alertes en temps réel

3. **Synchronisation automatique**
   - Certification automatique à la finalisation de vente
   - File d'attente pour les certifications en masse

4. **Support des autres types de factures**
   - Factures d'avoir (FA)
   - Factures d'acompte (FT)
   - Factures d'exportation (EV, EA, ET)

5. **Amélioration de la sécurité**
   - Chiffrement AES pour le token
   - Rotation automatique des tokens
   - Audit détaillé

---

## 📞 Questions fréquentes (FAQ)

### Q: Puis-je avoir plusieurs configurations e-SECeF ?
**R:** Oui, mais une seule peut être active à la fois. L'application utilise toujours la configuration marquée comme active.

### Q: Que se passe-t-il si la certification échoue ?
**R:** La facture est enregistrée avec le statut "erreur" et le code/description de l'erreur. Vous pouvez réessayer la certification ultérieurement.

### Q: Le token expire-t-il ?
**R:** Oui, les tokens ont une durée de validité. Vérifiez régulièrement avec le test de connexion et renouvelez-le si nécessaire.

### Q: Comment imprimer le QR code sur mes factures ?
**R:** Le QR code est stocké dans la table FactureESECeF. Vous pouvez l'utiliser avec une bibliothèque comme `qrcode` pour le générer en image.

### Q: Puis-je certifier une vente existante ?
**R:** Oui, utilisez l'API `/api/esecef/certify` avec l'ID de la vente. La vente doit être au statut "terminee".

---

## ✅ Conclusion

L'intégration e-SECeF est maintenant complète et prête à être utilisée. Suivez les étapes de ce guide pour configurer et tester le système avant de passer en production.

**N'oubliez pas** :
- Commencez toujours en environnement TEST
- Testez abondamment avant la production
- Formez vos équipes
- Gardez vos tokens sécurisés

Bonne chance! 🚀
