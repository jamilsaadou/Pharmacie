# Documentation - Système de Logs de Connexion et Gestion Utilisateurs

## 🎯 Vue d'ensemble

Le système de logs est maintenant complètement opérationnel et intégré avec MySQL. Il enregistre automatiquement toutes les actions importantes :

- **Connexions/Déconnexions** des utilisateurs
- **Création** d'utilisateurs
- **Modification** d'utilisateurs
- **Suppression** d'utilisateurs
- Toutes les **actions métier** (via le hook `useAuditLog`)

## 📊 Structure des Logs

Chaque log contient :
- **id** : Identifiant unique
- **date** : Date et heure de l'action
- **module** : Module concerné ('system', 'utilisateurs', 'stock', etc.)
- **action** : Type d'action ('login', 'logout', 'create', 'update', 'delete', etc.)
- **userId** : ID de l'utilisateur qui a effectué l'action
- **userName** : Nom complet de l'utilisateur
- **targetType** : Type d'entité ciblée (ex: 'utilisateur', 'medicament')
- **targetId** : ID de l'entité ciblée
- **message** : Description de l'action
- **details** : Détails JSON supplémentaires

## 🚀 Initialisation des Données de Test

### Utilisateurs créés :

1. **Admin** - admin@pharmacare.com (mot de passe: `admin123`)
   - Rôle: admin
   - Accès à tous les modules

2. **Aïcha Diallo** - aicha.diallo@pharmacare.com (mot de passe: `pharma123`)
   - Rôle: pharmacien
   - Accès à la plupart des modules sauf utilisateurs

3. **Ibrahim Oumar** - ibrahim.oumar@pharmacare.com (mot de passe: `vendeur123`)
   - Rôle: vendeur
   - Accès limité (dashboard, ventes, clients, alertes)

### Commande d'initialisation :
```bash
curl -X POST http://localhost:3000/api/init-users
```

## 🔌 API Endpoints

### 1. Logs

#### GET /api/logs
Récupère les logs avec filtres optionnels

**Paramètres de requête :**
- `module` : Filtrer par module
- `action` : Filtrer par action
- `userId` : Filtrer par utilisateur
- `dateDebut` : Date de début (ISO)
- `dateFin` : Date de fin (ISO)
- `q` : Recherche textuelle

**Exemple :**
```bash
curl "http://localhost:3000/api/logs?module=system&action=login"
```

#### POST /api/logs
Créer un nouveau log

**Body :**
```json
{
  "module": "utilisateurs",
  "action": "create",
  "userId": "xxx",
  "userName": "John Doe",
  "targetType": "utilisateur",
  "targetId": "yyy",
  "message": "Création d'un nouvel utilisateur",
  "details": { "email": "test@example.com" }
}
```

#### DELETE /api/logs
Supprimer tous les logs (vider le journal)

```bash
curl -X DELETE http://localhost:3000/api/logs
```

### 2. Authentification

#### POST /api/auth/login
Connexion utilisateur (enregistre un log)

**Body :**
```json
{
  "email": "admin@pharmacare.com",
  "motDePasse": "admin123"
}
```

**Réponse :**
```json
{
  "success": true,
  "utilisateur": {
    "id": "xxx",
    "nom": "Admin",
    "prenom": "Pharmacie",
    "email": "admin@pharmacare.com",
    "role": "admin",
    "actif": true,
    "modulesSupplementaires": []
  }
}
```

#### POST /api/auth/logout
Déconnexion utilisateur (enregistre un log)

**Body :**
```json
{
  "userId": "xxx",
  "userName": "Pharmacie Admin"
}
```

### 3. Gestion des Utilisateurs

#### GET /api/utilisateurs
Récupère tous les utilisateurs (sans mots de passe)

#### POST /api/utilisateurs
Créer un utilisateur (enregistre un log)

**Body :**
```json
{
  "nom": "Doe",
  "prenom": "John",
  "email": "john.doe@example.com",
  "motDePasse": "password123",
  "role": "vendeur",
  "actif": true,
  "modulesSupplementaires": ["clients"],
  "currentUserId": "xxx",
  "currentUserName": "Pharmacie Admin"
}
```

#### PUT /api/utilisateurs/[id]
Modifier un utilisateur (enregistre un log)

**Body :**
```json
{
  "nom": "Doe Updated",
  "actif": false,
  "currentUserId": "xxx",
  "currentUserName": "Pharmacie Admin"
}
```

#### DELETE /api/utilisateurs/[id]
Supprimer un utilisateur (enregistre un log)

**Query params :**
- `currentUserId` : ID de l'utilisateur qui effectue la suppression
- `currentUserName` : Nom de l'utilisateur qui effectue la suppression

```bash
curl -X DELETE "http://localhost:3000/api/utilisateurs/xxx?currentUserId=yyy&currentUserName=Admin"
```

## 💻 Utilisation dans le Code

### Hook useAuditLog

```typescript
import { useAuditLog } from '@/hooks/useAuditLog';

function MyComponent() {
  const { logs, addLog, clearLogs, filterLogs, loading, error } = useAuditLog();

  // Ajouter un log
  const handleAction = async () => {
    await addLog({
      module: 'stock',
      action: 'update',
      targetType: 'medicament',
      targetId: 'med_123',
      message: 'Modification du stock de Paracétamol',
      details: { quantite: 100 }
    });
  };

  // Filtrer les logs
  const filteredLogs = filterLogs({
    module: 'utilisateurs',
    dateDebut: new Date('2025-01-01'),
    q: 'création'
  });

  return (
    <div>
      {loading ? 'Chargement...' : (
        <ul>
          {logs.map(log => (
            <li key={log.id}>{log.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Hook useUserData

```typescript
import { useUserData } from '@/hooks/useUserData';

function AuthComponent() {
  const { 
    utilisateurCourant, 
    login, 
    logout,
    ajouterUtilisateur,
    modifierUtilisateur,
    supprimerUtilisateur
  } = useUserData();

  // Connexion (crée un log automatiquement)
  const handleLogin = async () => {
    try {
      const user = await login('admin@pharmacare.com', 'admin123');
      console.log('Connecté:', user);
    } catch (error) {
      console.error('Erreur de connexion:', error);
    }
  };

  // Déconnexion (crée un log automatiquement)
  const handleLogout = async () => {
    await logout();
  };

  // Créer un utilisateur (crée un log automatiquement)
  const handleCreateUser = async () => {
    try {
      const newUser = await ajouterUtilisateur({
        nom: 'Dupont',
        prenom: 'Marie',
        email: 'marie@example.com',
        motDePasse: 'pass123',
        role: 'vendeur',
        actif: true,
        modulesSupplementaires: []
      });
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  return (
    <div>
      {utilisateurCourant ? (
        <div>
          <p>Connecté en tant que: {utilisateurCourant.prenom} {utilisateurCourant.nom}</p>
          <button onClick={handleLogout}>Déconnexion</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Connexion</button>
      )}
    </div>
  );
}
```

## 📱 Interface Utilisateur

L'interface de gestion des logs est accessible via le module "Journal" dans la sidebar :

### Fonctionnalités :
- **Filtres** : Module, Action, Utilisateur, Date
- **Recherche** : Recherche textuelle dans tous les champs
- **Affichage** : Tableau avec tous les détails des logs
- **Actions** : Vider le journal

### Accès :
- Utilisez la navigation dans la sidebar
- Cliquez sur "Journal" (icône Activity)
- Les logs se chargent automatiquement

## 🔐 Sécurité

⚠️ **Important pour la production :**

1. **Hasher les mots de passe** : Actuellement les mots de passe sont en clair
   ```bash
   npm install bcryptjs
   npm install --save-dev @types/bcryptjs
   ```

2. **Implémenter JWT** : Pour une vraie gestion de session
   ```bash
   npm install jsonwebtoken
   npm install --save-dev @types/jsonwebtoken
   ```

3. **Variables d'environnement** : Ne jamais commiter le `.env`

4. **Rate limiting** : Limiter les tentatives de connexion

## ✅ Tests Effectués

1. ✅ Initialisation des utilisateurs de test
2. ✅ Création automatique des logs d'initialisation
3. ✅ Connexion avec logging automatique
4. ✅ Récupération des logs via API
5. ✅ Filtrage des logs
6. ✅ Hooks React fonctionnels

## 📝 Prochaines Étapes (Optionnelles)

1. Créer une page de connexion dédiée
2. Implémenter la protection des routes
3. Ajouter l'authentification JWT
4. Hasher les mots de passe avec bcrypt
5. Ajouter des tests automatisés
6. Implémenter la pagination des logs
7. Ajouter l'export des logs en CSV/Excel

## 🆘 Support

Pour toute question ou problème :
1. Vérifier que MySQL est bien démarré
2. Vérifier les variables d'environnement dans `.env`
3. Consulter les logs du serveur avec `npm run dev`
4. Vérifier la console du navigateur pour les erreurs frontend

## 📊 Exemples de Logs

### Log de connexion :
```json
{
  "id": "xxx",
  "date": "2025-11-05T22:33:15.616Z",
  "module": "system",
  "action": "login",
  "userId": "bdf02000-accf-4259-a62b-93f9600526ee",
  "userName": "Pharmacie Admin",
  "message": "Connexion réussie pour admin@pharmacare.com",
  "details": "{\"email\":\"admin@pharmacare.com\",\"role\":\"admin\"}"
}
```

### Log de création d'utilisateur :
```json
{
  "id": "xxx",
  "date": "2025-11-05T22:32:57.156Z",
  "module": "system",
  "action": "create",
  "userId": "bdf02000-accf-4259-a62b-93f9600526ee",
  "userName": "Pharmacie Admin",
  "targetType": "utilisateur",
  "targetId": "new_user_id",
  "message": "Initialisation du compte utilisateur Pharmacie Admin",
  "details": "{\"email\":\"admin@pharmacare.com\",\"role\":\"admin\"}"
}
