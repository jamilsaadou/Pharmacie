# Guide d'Impression des Factures Certifiées e-SECeF

## 📋 Vue d'ensemble

Ce guide explique comment utiliser le nouveau système d'impression de factures certifiées conforme aux spécifications officielles e-SECeF (Système Électronique Certifié de Facturation) du Niger.

## 🎯 Conformité

Le format de facture implémenté respecte :
- ✅ Spécifications techniques e-SECeF v1.0
- ✅ Décret sur les factures certifiées au Niger
- ✅ Format obligatoire des factures avec tous les éléments de sécurité

## 📝 Éléments Inclus dans la Facture Certifiée

### Informations du Contribuable
- Nom de l'entreprise
- NIF (Numéro d'Identification Fiscale)
- RCCM (optionnel)
- Adresse du point de vente
- Téléphone et email

### Type de Facture
Le système supporte tous les types de factures :
- **FV** : Facture de Vente
- **FT** : Facture d'Acompte
- **FA** : Facture d'Avoir
- **EV** : Facture de Vente à l'Exportation
- **ET** : Facture d'Acompte à l'Exportation
- **EA** : Facture d'Avoir à l'Exportation

Avec mentions spéciales :
- COPIE (pour les duplicatas)
- ANNULÉE (pour les factures annulées)
- EXPORTATION (pour les factures export)

### Informations Opérationnelles
- Nom de l'opérateur/vendeur
- ISF (Identifiant du Système de Facturation d'Entreprise)
- Numéro de facture interne

### Informations Client (optionnel)
- NIF du client
- Nom du client
- Adresse
- Contact

### Détails des Articles
Pour chaque article :
- Nom et code (optionnel)
- Quantité et prix unitaire
- Montant total
- **Groupe de taxation** (A-P avec étiquette) :
  - A : EXO (Exonéré)
  - B : TAX1 (TVA 19%)
  - C-P : Autres groupes fiscaux
- Taxe spécifique (si applicable)
- ISB (Impôt Spécial sur les Boissons) par article si applicable
- Modifications de prix avec description

### Totaux par Groupe Fiscal
- Total HT par groupe avec taux
- Total TVA par groupe
- Total TVA global
- Taxe spécifique totale
- Précompte ISB total (si applicable)
- **TOTAL TTC** (en gras)

### Modes de Paiement
Types supportés :
- ESPECES
- VIREMENT
- CARTEBANCAIRE
- MOBILEMONEY
- CHEQUES
- CREDIT
- AUTRE

### Éléments de Sécurité e-SECeF
- **CODE SECeF/DGI** : Code de certification unique
- **NIM** : Numéro de série du module e-MCF
- **Compteurs** : FC/TC FT (Format: numéro_facture/total type_facture)
- **Date et heure** : Horodatage certifié par e-MCF
- **QR Code** : Code QR contenant les données de vérification

### Commentaires
Jusqu'à 8 lignes de commentaires optionnels

## 💻 Utilisation dans le Code

### Import
```typescript
import { printCertifiedInvoice, CertifiedInvoiceData } from '@/utils/printCertifiedInvoice';
```

### Exemple d'utilisation

```typescript
// Préparer les données de la facture
const factureData: CertifiedInvoiceData = {
  // Informations pharmacie
  pharmacieName: "SUPERMARCHÉ CENTRAL",
  nif: "2354662756352",
  rccm: "RC/12.345-E FG 12/13/14",
  adresse: "BOULEVARD D'ANANAS, NIAMEY",
  telephone: "21330571",
  email: "info@supercent.ne",
  
  // Type et numéro
  typeFacture: "FV", // FV, FA, FT, EV, EA, ET
  numeroFacture: "12223",
  isCopie: false,
  isAnnulee: false,
  
  // Opérateur
  operateur: "JACQUES",
  
  // ISF
  isf: "AB01710090",
  
  // Client (optionnel)
  client: {
    nif: "1234567890123",
    nom: "TECHNOSPEC SARL",
    adresse: "Niamey",
    contact: "+227 XX XX XX XX"
  },
  
  // Articles
  items: [
    {
      nom: "EAU Viva",
      code: "EAUV500",
      quantite: 5,
      prixUnitaire: 720,
      montant: 3600,
      groupeTaxation: "A", // Exonéré
    },
    {
      nom: "LAIT JAGO GR",
      quantite: 1,
      prixUnitaire: 420,
      montant: 500,
      groupeTaxation: "B", // TVA 19%
    }
  ],
  
  // Totaux par groupe
  totauxParGroupe: {
    "A": {
      totalHT: 3600,
      totalTVA: 0,
      tauxTVA: 0
    },
    "B": {
      totalHT: 420,
      totalTVA: 80,
      tauxTVA: 19
    }
  },
  
  // Totaux globaux
  totalTVA: 80,
  isbTotal: 82, // Si applicable
  isbTaux: "A", // A = 2%, B = 5%
  totalTTC: 4182,
  
  // Paiements
  paiements: [
    {
      type: "ESPECES",
      montant: 4182
    }
  ],
  
  // Éléments de sécurité (obtenus de l'API e-SECeF)
  securityElements: {
    codeSECeFDGI: "XIA3-ODK3-HQBA-X2F3-K22N-MDYR",
    nim: "AB01710090-1",
    compteurs: "3/9 FV",
    dateHeure: "15/03/2018 13:11:44",
    qrCodeData: "F;AB01710090-1;XIA3-ODK3-HQBA-X2F3-K22N-MDYR;2354662756352;20180315131144"
  },
  
  // Commentaires optionnels
  commentaires: [
    "Client exonéré, réf: CERT/2024/001"
  ]
};

// Imprimer la facture
printCertifiedInvoice(factureData);
```

## 🔐 Intégration avec l'API e-SECeF

### Étapes pour obtenir les éléments de sécurité

1. **Tester la configuration e-SECeF**
```typescript
const config = await fetch('/api/esecef/config');
if (!config.ok) {
  console.error('Configuration e-SECeF manquante');
  return;
}
```

2. **Certifier la facture via l'API**
```typescript
const response = await fetch('/api/esecef/certify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nif: "2354662756352",
    typeFacture: "FV",
    items: items,
    client: client,
    // ... autres données
  })
});

const { securityElements } = await response.json();
```

3. **Utiliser les éléments de sécurité dans la facture**
```typescript
const factureData = {
  // ... données de la facture
  securityElements: securityElements
};

printCertifiedInvoice(factureData);
```

## 📄 Format du QR Code

Le QR Code contient les données au format :
```
F;{NIM};{CODE_SECEF};{NIF};{DATETIME}
```

Exemple :
```
F;AB01710090-1;XIA3-ODK3-HQBA-X2F3-K22N-MDYR;2354662756352;20180315131144
```

## 🎨 Personnalisation

### Tailles de papier supportées
- **80mm** : Tickets de caisse (par défaut)
- Optimisé pour les imprimantes thermiques

### Styles modifiables
Les styles CSS dans `printCertifiedInvoice.ts` peuvent être personnalisés :
- Police : Courier New (monospace)
- Taille de police : 11px
- Espacement et marges
- Bordures et séparateurs

## ⚠️ Points Importants

### Obligations légales
1. ✅ Toutes les factures DOIVENT être certifiées par e-SECeF
2. ✅ Le CODE SECeF/DGI DOIT être visible
3. ✅ Le QR Code DOIT être imprimé
4. ✅ Le NIM DOIT être affiché
5. ✅ Les compteurs DOIVENT être présents

### Groupes de Taxation
- Groupe **A** (EXO) : Articles exonérés
- Groupe **B-E** (TAX1-4) : Articles taxables à taux fixes
- Groupe **F** (EXP) : Exportations
- Groupe **G** (MP) : Régime dérogatoire (avec certificat d'exonération)
- Groupe **H** (IS) : Régime fiscal IS
- Groupes **I-P** : Autres usages spécifiques

### ISB (Impôt Spécial sur les Boissons)
- Groupe A : 2%
- Groupe B : 5%
- Peut être appliqué au niveau facture OU article (pas les deux)

### Taxe Spécifique
- Par montant : Valeur fixe par article
- Par pourcentage : X% du montant
- Doit être clairement indiquée

## 🧪 Test

Pour tester l'impression :
```typescript
// Exemple de test avec données factices
import { printCertifiedInvoice } from '@/utils/printCertifiedInvoice';

const testData = {
  // Données minimales pour test
  pharmacieName: "TEST PHARMACIE",
  nif: "0000000000000",
  adresse: "Test Address",
  telephone: "00000000",
  email: "test@test.ne",
  typeFacture: "FV",
  numeroFacture: "TEST-001",
  operateur: "TEST",
  isf: "TEST-ISF-01",
  items: [{
    nom: "Article Test",
    quantite: 1,
    prixUnitaire: 1000,
    montant: 1000,
    groupeTaxation: "B"
  }],
  totauxParGroupe: {
    "B": { totalHT: 840, totalTVA: 160, tauxTVA: 19 }
  },
  totalTVA: 160,
  totalTTC: 1000,
  paiements: [{ type: "ESPECES", montant: 1000 }],
  securityElements: {
    codeSECeFDGI: "TEST-CODE-SECEF-DGI",
    nim: "TEST-NIM-001",
    compteurs: "1/1 FV",
    dateHeure: new Date().toLocaleString('fr-FR'),
    qrCodeData: "F;TEST;CODE;NIF;20240101120000"
  }
};

printCertifiedInvoice(testData);
```

## 📚 Références

- [ESECEF_INTEGRATION.md](./ESECEF_INTEGRATION.md) - Guide d'intégration e-SECeF
- [ESECEF_QUICKSTART.md](./ESECEF_QUICKSTART.md) - Démarrage rapide
- Spécifications techniques e-SECeF v1.0 (PDF officiel DGI)

## 🆘 Support

Pour toute question sur l'impression des factures certifiées :
1. Vérifier que la configuration e-SECeF est active
2. Tester la connexion à l'API e-SECeF
3. Vérifier que tous les champs obligatoires sont remplis
4. Consulter les logs pour les erreurs

---

**Version** : 1.0  
**Date** : 11/12/2025  
**Conforme à** : Spécifications e-SECeF v1.0
