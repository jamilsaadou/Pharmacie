# Configuration de la Base de Données MySQL

## Configuration effectuée

Votre application de pharmacie est maintenant connectée à une base de données MySQL avec les paramètres suivants :

- **Serveur** : localhost:8889
- **Base de données** : pharmaapp
- **Utilisateur** : root
- **Mot de passe** : root

## Structure de la base de données

Le schéma Prisma a créé les tables suivantes :

### Tables principales
- `Medicament` - Gestion des médicaments
- `Client` - Gestion des clients
- `Vente` - Gestion des ventes
- `ItemVente` - Détails des articles vendus
- `Fournisseur` - Gestion des fournisseurs
- `CommandeFournisseur` - Commandes aux fournisseurs
- `ItemCommande` - Détails des commandes
- `Alerte` - Alertes de stock et d'expiration
- `Utilisateur` - Gestion des utilisateurs
- `AuditLog` - Journal d'audit
- `Rayon` - Gestion des rayons
- `MedicamentRayon` - Médicaments par rayon
- `TransfertRayon` - Transferts entre rayons
- `Assurance` - Compagnies d'assurance
- `Assure` - Clients assurés
- `DossierRemboursement` - Dossiers de remboursement

## API Routes créées

### Médicaments
- `GET /api/medicaments` - Liste tous les médicaments
- `POST /api/medicaments` - Créer un nouveau médicament
- `GET /api/medicaments/[id]` - Récupérer un médicament
- `PUT /api/medicaments/[id]` - Mettre à jour un médicament
- `DELETE /api/medicaments/[id]` - Supprimer un médicament

### Clients
- `GET /api/clients` - Liste tous les clients
- `POST /api/clients` - Créer un nouveau client
- `GET /api/clients/[id]` - Récupérer un client
- `PUT /api/clients/[id]` - Mettre à jour un client
- `DELETE /api/clients/[id]` - Supprimer un client

### Test de connexion
- `GET /api/test-db` - Tester la connexion à la base de données

## Comment tester la connexion

1. Démarrez le serveur de développement :
```bash
cd pharmacie-app
npm run dev
```

2. Ouvrez votre navigateur et accédez à :
```
http://localhost:3000/api/test-db
```

Vous devriez voir une réponse JSON confirmant la connexion :
```json
{
  "status": "success",
  "message": "Connexion à la base de données réussie",
  "database": "pharmaapp",
  "counts": {
    "medicaments": 0,
    "clients": 0
  },
  "timestamp": "2025-10-31T22:18:00.000Z"
}
```

## Utilisation de Prisma

### Commandes utiles

```bash
# Générer le client Prisma après modification du schéma
npx prisma generate

# Synchroniser le schéma avec la base de données
npx prisma db push

# Ouvrir Prisma Studio (interface graphique)
npx prisma studio

# Créer une migration (recommandé pour la production)
npx prisma migrate dev --name nom_de_la_migration

# Voir l'état des migrations
npx prisma migrate status
```

### Accéder à Prisma Studio

Prisma Studio est une interface graphique pour gérer votre base de données :

```bash
cd pharmacie-app
npx prisma studio
```

Puis ouvrez : http://localhost:5555

## Prochaines étapes

Pour utiliser la base de données dans vos composants React :

1. Modifiez les hooks existants (comme `usePharmacieData.ts`, `useClientData.ts`) pour utiliser les API routes au lieu de localStorage

2. Exemple de modification d'un hook :

```typescript
// Au lieu de useState/localStorage
const [medicaments, setMedicaments] = useState<Medicament[]>([]);

// Utilisez fetch pour appeler l'API
const fetchMedicaments = async () => {
  const response = await fetch('/api/medicaments');
  const data = await response.json();
  setMedicaments(data);
};

useEffect(() => {
  fetchMedicaments();
}, []);
```

3. Pour créer un médicament :

```typescript
const addMedicament = async (medicament: Medicament) => {
  const response = await fetch('/api/medicaments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(medicament),
  });
  
  if (response.ok) {
    const newMedicament = await response.json();
    // Rafraîchir la liste
    fetchMedicaments();
  }
};
```

## Dépannage

### Erreur de connexion
Si vous obtenez une erreur de connexion :

1. Vérifiez que MySQL est en cours d'exécution sur le port 8889
2. Vérifiez que la base de données `pharmaapp` existe
3. Vérifiez les credentials dans le fichier `.env`

### Recreer la base de données

Si vous devez recréer la base de données :

```bash
cd pharmacie-app
npx prisma db push --force-reset
```

⚠️ Attention : Cette commande supprimera toutes les données existantes !

## Sécurité

Pour la production, n'oubliez pas de :

1. Changer les credentials de la base de données
2. Utiliser des variables d'environnement sécurisées
3. Ajouter l'authentification aux API routes
4. Implémenter la validation des données
5. Ajouter le fichier `.env` au `.gitignore`
