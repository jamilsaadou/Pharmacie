# Guide d'Installation - Système de Gestion de Pharmacie (SFE)
## Version 1.0.0

---

## Table des Matières
1. [Prérequis Système](#prérequis-système)
2. [Installation des Dépendances](#installation-des-dépendances)
3. [Configuration de la Base de Données](#configuration-de-la-base-de-données)
4. [Configuration de l'Application](#configuration-de-lapplication)
5. [Démarrage de l'Application](#démarrage-de-lapplication)
6. [Vérification de l'Installation](#vérification-de-linstallation)
7. [Dépannage](#dépannage)
8. [Désinstallation](#désinstallation)

---

## Prérequis Système

### Configuration Matérielle Minimale
- **Processeur**: Intel Core i3 ou équivalent (2 GHz minimum)
- **RAM**: 4 GB minimum (8 GB recommandé)
- **Espace Disque**: 2 GB d'espace libre minimum
- **Écran**: Résolution minimale 1366x768 pixels

### Configuration Matérielle Recommandée
- **Processeur**: Intel Core i5 ou supérieur
- **RAM**: 8 GB ou plus
- **Espace Disque**: 10 GB d'espace libre
- **Écran**: Résolution 1920x1080 pixels ou supérieure

### Logiciels Requis

#### 1. Node.js
- **Version**: 18.x ou supérieur
- **Téléchargement**: https://nodejs.org/
- **Vérification**:
  ```bash
  node --version
  # Doit afficher v18.x.x ou supérieur
  ```

#### 2. MySQL
- **Version**: 8.0 ou supérieur
- **Téléchargement**: https://www.mysql.com/downloads/
- **Alternatives**: MAMP, XAMPP, ou tout serveur MySQL compatible
- **Vérification**:
  ```bash
  mysql --version
  # Doit afficher MySQL 8.x ou supérieur
  ```

#### 3. Git (Optionnel)
- **Version**: 2.x ou supérieur
- **Téléchargement**: https://git-scm.com/downloads

#### 4. Navigateur Web
- Chrome (recommandé) version 90+
- Firefox version 88+
- Safari version 14+
- Edge version 90+

---

## Installation des Dépendances

### Étape 1: Extraction des Fichiers

1. Extraire l'archive `SFE-Installation.zip` dans un répertoire de votre choix
2. Naviguer vers le répertoire extrait:
   ```bash
   cd pharmacie-app
   ```

### Étape 2: Installation des Packages Node.js

1. Ouvrir un terminal dans le répertoire du projet
2. Installer les dépendances:
   ```bash
   npm install
   ```
   
   Cette commande installe tous les packages nécessaires:
   - Next.js (Framework React)
   - Prisma (ORM pour base de données)
   - TailwindCSS (Framework CSS)
   - Lucide React (Bibliothèque d'icônes)
   - Et autres dépendances

3. Patienter pendant l'installation (peut prendre 2-5 minutes)

---

## Configuration de la Base de Données

### Étape 1: Préparation de MySQL

#### Option A: Utilisation de MAMP/XAMPP
1. Démarrer MAMP/XAMPP
2. Accéder à phpMyAdmin (http://localhost:8888/phpMyAdmin ou http://localhost/phpmyadmin)
3. Créer une nouvelle base de données nommée `pharmaapp`
4. Noter les informations de connexion:
   - Serveur: `localhost` (ou `localhost:8889` pour MAMP)
   - Utilisateur: `root`
   - Mot de passe: (selon votre configuration)

#### Option B: Installation MySQL Standard
1. Démarrer le service MySQL:
   ```bash
   # macOS
   brew services start mysql
   
   # Linux
   sudo systemctl start mysql
   
   # Windows
   # Via Services Windows ou MySQL Workbench
   ```

2. Créer la base de données:
   ```bash
   mysql -u root -p
   ```
   
   Dans la console MySQL:
   ```sql
   CREATE DATABASE pharmaapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   EXIT;
   ```

### Étape 2: Configuration de la Connexion

1. Dans le répertoire du projet, créer un fichier `.env`:
   ```bash
   # macOS/Linux
   touch .env
   
   # Windows
   type nul > .env
   ```

2. Ouvrir le fichier `.env` avec un éditeur de texte et ajouter:

   **Pour MAMP (Port 8889):**
   ```env
   DATABASE_URL="mysql://root:root@localhost:8889/pharmaapp"
   ```

   **Pour MySQL Standard (Port 3306):**
   ```env
   DATABASE_URL="mysql://root:votre_mot_de_passe@localhost:3306/pharmaapp"
   ```

   **Format général:**
   ```env
   DATABASE_URL="mysql://utilisateur:mot_de_passe@serveur:port/nom_base"
   ```

### Étape 3: Création des Tables

1. Générer le client Prisma:
   ```bash
   npx prisma generate
   ```

2. Synchroniser le schéma avec la base de données:
   ```bash
   npx prisma db push
   ```

3. Vérifier la création des tables:
   ```bash
   npx prisma studio
   ```
   
   Cela ouvrira Prisma Studio sur http://localhost:5555 où vous pourrez voir toutes les tables créées.

### Étape 4: Initialisation des Données

1. Initialiser les utilisateurs par défaut:
   ```bash
   npm run dev
   ```

2. Dans un navigateur, accéder à:
   ```
   http://localhost:3000/api/init-users
   ```

3. Vous verrez un message confirmant la création de 3 utilisateurs:
   - Admin (admin@pharmacie.com / Admin123!)
   - Pharmacien (pharmacien@pharmacie.com / Pharma123!)
   - Vendeur (vendeur@pharmacie.com / Vendeur123!)

---

## Configuration de l'Application

### Variables d'Environnement

Le fichier `.env` contient toutes les variables de configuration. Exemple complet:

```env
# Base de données
DATABASE_URL="mysql://root:root@localhost:8889/pharmaapp"

# Application (Optionnel - Valeurs par défaut)
NODE_ENV="development"
PORT=3000

# Sécurité (Pour production)
JWT_SECRET="votre_clé_secrète_très_longue_et_complexe"
SESSION_SECRET="votre_clé_session_secrète"
```

### Configuration Avancée

Pour personnaliser l'application, modifier le fichier `next.config.ts`:

```typescript
const nextConfig = {
  // Configuration personnalisée
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
};
```

---

## Démarrage de l'Application

### Mode Développement

Pour lancer l'application en mode développement avec rechargement automatique:

```bash
npm run dev
```

L'application sera accessible sur: **http://localhost:3000**

### Mode Production

Pour déployer en production:

1. Construire l'application:
   ```bash
   npm run build
   ```

2. Démarrer en mode production:
   ```bash
   npm start
   ```

### Démarrage Automatique (Production)

#### macOS/Linux avec systemd

1. Créer un service systemd `/etc/systemd/system/sfe-pharmacie.service`:
   ```ini
   [Unit]
   Description=SFE Pharmacie Application
   After=network.target mysql.service
   
   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/chemin/vers/pharmacie-app
   ExecStart=/usr/bin/npm start
   Restart=always
   Environment=NODE_ENV=production
   
   [Install]
   WantedBy=multi-user.target
   ```

2. Activer et démarrer le service:
   ```bash
   sudo systemctl enable sfe-pharmacie
   sudo systemctl start sfe-pharmacie
   ```

#### Windows avec PM2

1. Installer PM2 globalement:
   ```bash
   npm install -g pm2
   ```

2. Démarrer l'application:
   ```bash
   pm2 start npm --name "sfe-pharmacie" -- start
   pm2 save
   pm2 startup
   ```

---

## Vérification de l'Installation

### Liste de Contrôle

- [ ] Node.js installé et version correcte
- [ ] MySQL installé et en cours d'exécution
- [ ] Base de données `pharmaapp` créée
- [ ] Fichier `.env` configuré
- [ ] Dépendances npm installées
- [ ] Tables de base de données créées
- [ ] Utilisateurs initialisés
- [ ] Application démarre sans erreurs
- [ ] Page de connexion accessible

### Tests de Vérification

#### 1. Test de Connexion Base de Données

```bash
# Navigateur: http://localhost:3000/api/test-db
```

Réponse attendue:
```json
{
  "status": "success",
  "message": "Connexion à la base de données réussie",
  "database": "pharmaapp"
}
```

#### 2. Test de Connexion Application

1. Ouvrir http://localhost:3000
2. La page de connexion doit s'afficher
3. Se connecter avec:
   - Email: `admin@pharmacie.com`
   - Mot de passe: `Admin123!`
4. Le tableau de bord doit s'afficher

#### 3. Test des Modules

Vérifier l'accès à tous les modules depuis la sidebar:
- ✅ Dashboard
- ✅ Gestion du Stock
- ✅ Gestion des Rayons
- ✅ Ventes
- ✅ Clients
- ✅ Commandes
- ✅ Assurances
- ✅ Remboursements
- ✅ Fournisseurs
- ✅ Statistiques
- ✅ Alertes
- ✅ Journal d'Activité
- ✅ Utilisateurs

---

## Dépannage

### Problème: npm install échoue

**Solution 1**: Nettoyer le cache npm
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Solution 2**: Utiliser une autre version de Node.js
```bash
# Installer nvm (Node Version Manager)
# Puis installer Node.js 18
nvm install 18
nvm use 18
npm install
```

### Problème: Erreur de connexion à MySQL

**Symptôme**: `Error: Can't connect to MySQL server`

**Solutions**:
1. Vérifier que MySQL est démarré
2. Vérifier le port (8889 pour MAMP, 3306 pour MySQL standard)
3. Vérifier les credentials dans `.env`
4. Tester la connexion:
   ```bash
   mysql -u root -p -h localhost -P 8889
   ```

### Problème: Tables non créées

**Solution**:
```bash
# Forcer la recréation
npx prisma db push --force-reset
# ⚠️ Attention: Supprime toutes les données existantes
```

### Problème: Port 3000 déjà utilisé

**Solution**: Changer le port
```bash
# Sous macOS/Linux
PORT=3001 npm run dev

# Sous Windows
set PORT=3001 && npm run dev
```

Ou modifier `package.json`:
```json
"scripts": {
  "dev": "next dev -p 3001"
}
```

### Problème: Page blanche après connexion

**Solutions**:
1. Vérifier la console du navigateur (F12)
2. Vérifier les logs du serveur
3. Vider le cache du navigateur
4. Essayer en mode incognito
5. Réinitialiser les données utilisateur:
   ```bash
   # Dans la console navigateur
   localStorage.clear()
   sessionStorage.clear()
   ```

### Problème: Prisma Studio ne démarre pas

**Solution**:
```bash
# Régénérer le client Prisma
npx prisma generate
npx prisma studio
```

---

## Désinstallation

### Désinstallation Complète

1. Arrêter l'application (Ctrl+C dans le terminal)

2. Supprimer la base de données:
   ```sql
   mysql -u root -p
   DROP DATABASE pharmaapp;
   EXIT;
   ```

3. Supprimer le répertoire de l'application:
   ```bash
   cd ..
   rm -rf pharmacie-app
   ```

4. (Optionnel) Désinstaller Node.js et MySQL selon votre OS

### Désinstallation Partielle (Conservation des Données)

1. Arrêter l'application
2. Exporter les données:
   ```bash
   mysqldump -u root -p pharmaapp > backup_pharmacie.sql
   ```
3. Supprimer l'application mais conserver le fichier SQL

---

## Support Technique

### Contacts
- **Email Support**: support@sfe-pharmacie.com
- **Téléphone**: +227 XX XX XX XX
- **Horaires**: Lundi-Vendredi, 8h-18h (GMT+1)

### Ressources Supplémentaires
- Documentation complète: Voir fichiers joints
- Tutoriels vidéo: https://sfe-pharmacie.com/videos
- Forum communautaire: https://forum.sfe-pharmacie.com

---

## Historique des Versions

| Version | Date       | Changements                      |
|---------|------------|----------------------------------|
| 1.0.0   | 12/01/2025 | Version initiale                 |

---

**© 2025 SFE - Système de Gestion de Pharmacie. Tous droits réservés.**
