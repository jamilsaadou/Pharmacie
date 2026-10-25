# Guide de dépannage e-SECeF

## Problème : Les factures ne parviennent pas au SECeF et ne sont pas enregistrées

### Vérifications à effectuer :

#### 1. Vérifier la configuration e-SECeF
```bash
# Ouvrir MySQL et vérifier s'il y a une configuration
SELECT * FROM ConfigurationESECeF WHERE actif = 1;
```

Si aucune configuration n'existe, créer une depuis l'interface :
- Aller dans le menu "e-SECeF"
- Créer une nouvelle configuration
- Activer la configuration

#### 2. Vérifier les logs de l'application
Les logs devraient afficher :
```
Certification automatique vente FAC-XXX: Succès/Échec
```

Si vous voyez "Échec", vérifier les erreurs détaillées.

#### 3. Vérifier que les tables existent
```bash
# Dans MySQL
SHOW TABLES LIKE '%SECeF%';
```

Devrait retourner :
- ConfigurationESECeF
- FactureESECeF

#### 4. Vérifier les enregistrements de factures
```bash
# Vérifier les ventes
SELECT id, numeroFacture, date, total FROM Vente ORDER BY date DESC LIMIT 5;

# Vérifier les factures e-SECeF
SELECT 
  id, 
  venteId, 
  numeroFacture, 
  statut, 
  codeSECeFDGI, 
  errorCode, 
  errorDescription,
  dateCreation 
FROM FactureESECeF 
ORDER BY dateCreation DESC 
LIMIT 5;
```

### Solutions courantes :

#### Solution 1 : Pas de configuration active
1. Aller dans "e-SECeF" dans le menu
2. Créer une configuration avec :
   - NIF : votre numéro NIF
   - NIM : votre numéro NIM (fourni par la DGI)
   - Token : votre token d'authentification
   - ISF : identifiant de votre système (ex: PHARMA-APP-001)
   - Environnement : Test ou Production
3. Activer la configuration

#### Solution 2 : Erreur de certification
Si `errorCode` n'est pas null dans FactureESECeF :
- Code 1 : Trop de factures en attente (max 10)
- Code 3 : Type de facture invalide
- Code 11 : Référence facture invalide (pour factures d'avoir)
- Voir `errorDescription` pour plus de détails

#### Solution 3 : Token expiré
Si vous voyez "Token non autorisé ou expiré" :
1. Obtenir un nouveau token depuis la plateforme e-SECeF
2. Mettre à jour la configuration
3. Réessayer

#### Solution 4 : Problème de connexion
Si vous voyez des erreurs de timeout :
- Vérifier votre connexion Internet
- Vérifier que l'URL de l'API est correcte
- Tester la connexion : aller dans "e-SECeF" > "Tester la connexion"

### Test manuel

Pour tester manuellement la création d'une facture :

1. Ouvrir la console du navigateur (F12)
2. Aller dans "Gestion des Ventes" > "Point de Vente"
3. Ajouter des articles au panier
4. Confirmer la vente
5. Observer les logs dans la console :
   - Devrait afficher "Certification automatique vente..."
   - Si succès, devrait proposer d'imprimer
   - Si échec, observer le message d'erreur

### Logs détaillés

Pour activer les logs détaillés, ouvrir la console du navigateur et exécuter :
```javascript
// Voir les appels API
localStorage.setItem('debug', 'true');

// Créer une vente et observer
```

### Contact support

Si le problème persiste après avoir suivi ces étapes :
1. Noter le message d'erreur exact
2. Noter le `errorCode` et `errorDescription` de la table FactureESECeF
3. Vérifier que la configuration e-SECeF est correcte
4. Contacter le support technique de la DGI
