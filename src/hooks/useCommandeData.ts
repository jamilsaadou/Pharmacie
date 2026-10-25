import { useDataRefresh } from './useDataRefresh';

import { fetchWithRefresh as fetch } from '@/lib/data-refresh';
import { useState, useEffect, useCallback } from 'react';
import { CommandeFournisseur, ItemCommande, Fournisseur, Medicament } from '@/types';

interface CommandeWithRelations extends Omit<CommandeFournisseur, 'fournisseur' | 'items'> {
  fournisseur: Fournisseur;
  items: (ItemCommande & { medicament: Medicament })[];
}

export const useCommandeData = () => {
  const [commandes, setCommandes] = useState<CommandeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les commandes
  const loadCommandes = useCallback(async (filters?: {
    fournisseurId?: string;
    statut?: string;
    dateDebut?: string;
    dateFin?: string;
  }) => {
    try {

      setError(null);

      const params = new URLSearchParams();
      if (filters?.fournisseurId) params.append('fournisseurId', filters.fournisseurId);
      if (filters?.statut) params.append('statut', filters.statut);
      if (filters?.dateDebut) params.append('dateDebut', filters.dateDebut);
      if (filters?.dateFin) params.append('dateFin', filters.dateFin);

      const response = await fetch(`/api/commandes?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des commandes');
      }

      const data = await response.json();
      
      // Conversion des dates
      const commandesWithDates = data.map((commande: any) => ({
        ...commande,
        date: new Date(commande.date),
        dateReception: commande.dateReception ? new Date(commande.dateReception) : null,
        fournisseur: {
          ...commande.fournisseur,
          dateAjout: new Date(commande.fournisseur.dateAjout),
        },
        items: commande.items.map((item: any) => ({
          ...item,
          medicament: {
            ...item.medicament,
            dateExpiration: new Date(item.medicament.dateExpiration),
            dateAjout: new Date(item.medicament.dateAjout),
            dateModification: new Date(item.medicament.dateModification),
          },
        })),
      }));

      setCommandes(commandesWithDates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur lors du chargement des commandes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useDataRefresh(() => loadCommandes());

  // Créer une nouvelle commande
  const createCommande = async (data: {
    fournisseurId: string;
    items: {
      medicamentId: string;
      quantiteCommandee: number;
      prixUnitaire: number;
    }[];
    dateReception?: Date;
  }) => {
    try {
      setError(null);

      const response = await fetch('/api/commandes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          dateReception: data.dateReception?.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création de la commande');
      }

      const newCommande = await response.json();
      
      // Conversion des dates
      const commandeWithDates = {
        ...newCommande,
        date: new Date(newCommande.date),
        dateReception: newCommande.dateReception ? new Date(newCommande.dateReception) : null,
        fournisseur: {
          ...newCommande.fournisseur,
          dateAjout: new Date(newCommande.fournisseur.dateAjout),
        },
        items: newCommande.items.map((item: any) => ({
          ...item,
          medicament: {
            ...item.medicament,
            dateExpiration: new Date(item.medicament.dateExpiration),
            dateAjout: new Date(item.medicament.dateAjout),
            dateModification: new Date(item.medicament.dateModification),
          },
        })),
      };

      setCommandes((prev) => [commandeWithDates, ...prev]);
      return commandeWithDates;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur lors de la création de la commande:', err);
      throw err;
    }
  };

  // Mettre à jour le statut d'une commande
  const updateCommandeStatut = async (
    id: string,
    statut: 'en_attente' | 'confirmee' | 'livree' | 'annulee',
    dateReception?: Date,
    items?: { id: string; medicamentId: string; quantiteRecue: number }[]
  ) => {
    try {
      setError(null);

      const response = await fetch('/api/commandes', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          statut,
          dateReception: dateReception?.toISOString(),
          items,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour de la commande');
      }

      const updatedCommande = await response.json();
      
      // Conversion des dates
      const commandeWithDates = {
        ...updatedCommande,
        date: new Date(updatedCommande.date),
        dateReception: updatedCommande.dateReception ? new Date(updatedCommande.dateReception) : null,
        fournisseur: {
          ...updatedCommande.fournisseur,
          dateAjout: new Date(updatedCommande.fournisseur.dateAjout),
        },
        items: updatedCommande.items.map((item: any) => ({
          ...item,
          medicament: {
            ...item.medicament,
            dateExpiration: new Date(item.medicament.dateExpiration),
            dateAjout: new Date(item.medicament.dateAjout),
            dateModification: new Date(item.medicament.dateModification),
          },
        })),
      };

      setCommandes((prev) =>
        prev.map((cmd) => (cmd.id === id ? commandeWithDates : cmd))
      );

      return commandeWithDates;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur lors de la mise à jour de la commande:', err);
      throw err;
    }
  };

  // Supprimer une commande
  const deleteCommande = async (id: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/commandes?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression de la commande');
      }

      setCommandes((prev) => prev.filter((cmd) => cmd.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur lors de la suppression de la commande:', err);
      throw err;
    }
  };

  // Calculer les statistiques des commandes
  const getStatistiques = () => {
    const total = commandes.length;
    const enAttente = commandes.filter((c) => c.statut === 'en_attente').length;
    const confirmees = commandes.filter((c) => c.statut === 'confirmee').length;
    const livrees = commandes.filter((c) => c.statut === 'livree').length;
    const annulees = commandes.filter((c) => c.statut === 'annulee').length;

    const montantTotal = commandes.reduce((acc, cmd) => acc + cmd.total, 0);
    const montantLivrees = commandes
      .filter((c) => c.statut === 'livree')
      .reduce((acc, cmd) => acc + cmd.total, 0);

    return {
      total,
      enAttente,
      confirmees,
      livrees,
      annulees,
      montantTotal,
      montantLivrees,
    };
  };

  // Charger les commandes au montage du composant
  useEffect(() => {
    loadCommandes();
  }, [loadCommandes]);

  return {
    commandes,
    loading,
    error,
    loadCommandes,
    createCommande,
    updateCommandeStatut,
    deleteCommande,
    getStatistiques,
  };
};
