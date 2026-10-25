import { useDataRefresh } from './useDataRefresh';

import { fetchWithRefresh as fetch } from '@/lib/data-refresh';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Client, Vente } from '@/types';
import { useAuditLog } from './useAuditLog';

export interface StatistiquesClient {
  totalClients: number;
  nouveauxClientsMois: number;
  clientsActifs: number;
  clientsFideles: Client[];
  repartitionParAge: {
    tranche: string;
    nombre: number;
  }[];
}

export function useClientData() {
  const [clients, setClients] = useState<Client[]>([]);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [loading, setLoading] = useState(true);
  const { addLog } = useAuditLog();

  // Charger les données au démarrage
  const loadData = useCallback(async () => {
      try {

        
        // Charger les clients
        const clientResponse = await fetch('/api/clients');
        if (clientResponse.ok) {
          const clientData = await clientResponse.json();
          setClients(clientData.map((c: any) => ({
            ...c,
            dateInscription: new Date(c.dateInscription),
            dateNaissance: c.dateNaissance ? new Date(c.dateNaissance) : undefined,
          })));
        }

        // TODO: Charger les ventes quand l'API sera créée
        
      } catch (error) {
        console.error('Erreur lors du chargement des clients:', error);
      } finally {
        setLoading(false);
      }
  }, []);
  useEffect(() => { void loadData(); }, [loadData]);
  useDataRefresh(loadData);

  // Ajouter un nouveau client
  const ajouterClient = useCallback(async (clientData: Omit<Client, 'id' | 'dateInscription'>) => {
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      if (response.ok) {
        const nouveauClient = await response.json();
        const clientFormate: Client = {
          ...nouveauClient,
          dateInscription: new Date(nouveauClient.dateInscription),
          dateNaissance: nouveauClient.dateNaissance ? new Date(nouveauClient.dateNaissance) : undefined,
        };
        setClients(prev => [...prev, clientFormate]);
        addLog({
          module: 'clients',
          action: 'create',
          targetType: 'Client',
          targetId: clientFormate.id,
          message: `Création du client ${clientFormate.prenom} ${clientFormate.nom}`,
          details: { clientId: clientFormate.id }
        });
        return clientFormate;
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du client:', error);
    }
  }, [addLog]);

  // Modifier un client existant
  const modifierClient = useCallback(async (id: string, modifications: Partial<Omit<Client, 'id' | 'dateInscription'>>) => {
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modifications),
      });

      if (response.ok) {
        const clientMisAJour = await response.json();
        setClients(prev => 
          prev.map(client => 
            client.id === id 
              ? {
                  ...clientMisAJour,
                  dateInscription: new Date(clientMisAJour.dateInscription),
                  dateNaissance: clientMisAJour.dateNaissance ? new Date(clientMisAJour.dateNaissance) : undefined,
                }
              : client
          )
        );
        addLog({
          module: 'clients',
          action: 'update',
          targetType: 'Client',
          targetId: id,
          message: `Modification du client #${id}`,
          details: { modifications }
        });
      }
    } catch (error) {
      console.error('Erreur lors de la modification du client:', error);
    }
  }, [addLog]);

  // Supprimer un client
  const supprimerClient = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setClients(prev => prev.filter(client => client.id !== id));
        addLog({
          module: 'clients',
          action: 'delete',
          targetType: 'Client',
          targetId: id,
          message: `Suppression du client #${id}`,
        });
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du client:', error);
    }
  }, [addLog]);

  // Rechercher des clients
  const rechercherClients = useCallback((terme: string) => {
    if (!terme.trim()) return clients;
    
    const termeNormalise = terme.toLowerCase().trim();
    return clients.filter(client => 
      client.nom.toLowerCase().includes(termeNormalise) ||
      client.prenom.toLowerCase().includes(termeNormalise) ||
      client.telephone?.includes(termeNormalise) ||
      client.email?.toLowerCase().includes(termeNormalise) ||
      client.numeroSecu?.includes(termeNormalise) ||
      client.nif?.toLowerCase().includes(termeNormalise)
    );
  }, [clients]);

  // Obtenir un client par ID
  const obtenirClient = useCallback((id: string) => {
    return clients.find(client => client.id === id);
  }, [clients]);

  // Obtenir l'historique des achats d'un client
  const obtenirHistoriqueClient = useCallback((clientId: string) => {
    return ventes.filter(vente => vente.client?.id === clientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ventes]);

  // Calculer le total des achats d'un client
  const calculerTotalAchatsClient = useCallback((clientId: string) => {
    return clients.find(client=>client.id===clientId)?.totalAchatsNet || 0;
  }, [clients]);

  // Calculer l'âge d'un client
  const calculerAge = useCallback((dateNaissance?: Date) => {
    if (!dateNaissance) return null;
    const aujourd = new Date();
    const age = aujourd.getFullYear() - dateNaissance.getFullYear();
    const moisDiff = aujourd.getMonth() - dateNaissance.getMonth();
    
    if (moisDiff < 0 || (moisDiff === 0 && aujourd.getDate() < dateNaissance.getDate())) {
      return age - 1;
    }
    return age;
  }, []);

  // Statistiques des clients
  const statistiquesClients = useMemo((): StatistiquesClient => {
    const aujourd = new Date();
    const debutMois = new Date(aujourd.getFullYear(), aujourd.getMonth(), 1);

    // Nouveaux clients ce mois
    const nouveauxClientsMois = clients.filter(client => 
      new Date(client.dateInscription) >= debutMois
    ).length;

    const clientsActifs=clients.filter(c=>(c.nombreAchats||0)>0).length;
    const clientsFideles=clients.filter(c=>(c.nombreAchats||0)>=5).sort((a,b)=>(b.nombreAchats||0)-(a.nombreAchats||0)).slice(0,10);

    // Répartition par âge
    const tranches = {
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56-65': 0,
      '65+': 0,
      'Non renseigné': 0
    };

    clients.forEach(client => {
      const age = calculerAge(client.dateNaissance);
      if (age === null) {
        tranches['Non renseigné']++;
      } else if (age <= 25) {
        tranches['18-25']++;
      } else if (age <= 35) {
        tranches['26-35']++;
      } else if (age <= 45) {
        tranches['36-45']++;
      } else if (age <= 55) {
        tranches['46-55']++;
      } else if (age <= 65) {
        tranches['56-65']++;
      } else {
        tranches['65+']++;
      }
    });

    const repartitionParAge = Object.entries(tranches).map(([tranche, nombre]) => ({
      tranche,
      nombre
    }));

    return {
      totalClients: clients.length,
      nouveauxClientsMois,
      clientsActifs,
      clientsFideles,
      repartitionParAge,
    };
  }, [clients, ventes, calculerAge]);

  // Valider les données d'un client
  const validerClient = useCallback((clientData: Partial<Client>) => {
    const erreurs: string[] = [];

    if (!clientData.nom?.trim()) {
      erreurs.push('Le nom est obligatoire');
    }

    if (!clientData.prenom?.trim()) {
      erreurs.push('Le prénom est obligatoire');
    }

    if (clientData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.email)) {
      erreurs.push('L\'email n\'est pas valide');
    }

    if (clientData.telephone && !/^[0-9\s\-\+\(\)]{8,}$/.test(clientData.telephone)) {
      erreurs.push('Le numéro de téléphone n\'est pas valide');
    }

    if (clientData.numeroSecu && clientData.numeroSecu.length !== 13) {
      erreurs.push('Le numéro de sécurité sociale doit contenir 13 chiffres');
    }

    return {
      valide: erreurs.length === 0,
      erreurs
    };
  }, []);

  // Exporter les données clients
  const exporterClients = useCallback(() => {
    const donneesExport = clients.map(client => ({
      ...client,
      age: calculerAge(client.dateNaissance),
      totalAchats: calculerTotalAchatsClient(client.id),
      nombreAchats: obtenirHistoriqueClient(client.id).length,
    }));

    const csv = [
      'ID,Nom,Prénom,NIF,Téléphone,Email,Adresse,Âge,Date d\'inscription,Total achats,Nombre d\'achats',
      ...donneesExport.map(client => 
        `${client.id},"${client.nom}","${client.prenom}","${client.nif || ''}","${client.telephone || ''}","${client.email || ''}","${client.adresse || ''}",${client.age || ''},${client.dateInscription.toLocaleDateString()},${client.totalAchats},${client.nombreAchats}`
      )
    ].join('\n');

    addLog({
      module: 'clients',
      action: 'export',
      targetType: 'Client',
      message: `Export des clients (${donneesExport.length} enregistrements)`,
    });

    return csv;
  }, [clients, calculerAge, calculerTotalAchatsClient, obtenirHistoriqueClient, addLog]);

  return {
    // Données
    clients,
    statistiquesClients,
    loading,

    // Actions CRUD
    ajouterClient,
    modifierClient,
    supprimerClient,

    // Recherche et filtrage
    rechercherClients,
    obtenirClient,

    // Historique et statistiques
    obtenirHistoriqueClient,
    calculerTotalAchatsClient,
    calculerAge,

    // Utilitaires
    validerClient,
    exporterClients,
  };
}
