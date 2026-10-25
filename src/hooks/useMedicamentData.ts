'use client';

import { fetchWithRefresh as fetch } from '@/lib/data-refresh';

import { useState, useEffect, useCallback } from 'react';
import { useDataRefresh } from './useDataRefresh';
import { Medicament } from '@/types';

export function useMedicamentData() {
  const [medicaments, setMedicaments] = useState<Medicament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les médicaments
  const chargerMedicaments = useCallback(async () => {
    try {

      setError(null);
      const response = await fetch('/api/medicaments');
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Convertir les dates
      const medicamentsAvecDates = data.map((med: any) => ({
        ...med,
        dateExpiration: new Date(med.dateExpiration),
        dateAjout: new Date(med.dateAjout),
      }));
      
      setMedicaments(medicamentsAvecDates);
    } catch (err) {
      console.error('Erreur lors du chargement des médicaments:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  useDataRefresh(chargerMedicaments);

  // Ajouter un médicament
  const ajouterMedicament = useCallback(async (medicament: Omit<Medicament, 'id' | 'dateAjout' | 'dateModification'>) => {
    try {
      const response = await fetch('/api/medicaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(medicament),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      // Recharger la liste
      await chargerMedicaments();
      
      return data;
    } catch (err) {
      console.error('Erreur lors de l\'ajout du médicament:', err);
      throw err;
    }
  }, [chargerMedicaments]);

  // Modifier un médicament
  const modifierMedicament = useCallback(async (id: string, medicament: Partial<Medicament>) => {
    try {
      const response = await fetch(`/api/medicaments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(medicament),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      // Recharger la liste
      await chargerMedicaments();
      
      return data;
    } catch (err) {
      console.error('Erreur lors de la modification du médicament:', err);
      throw err;
    }
  }, [chargerMedicaments]);

  // Supprimer un médicament
  const supprimerMedicament = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/medicaments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      // Recharger la liste
      await chargerMedicaments();
    } catch (err) {
      console.error('Erreur lors de la suppression du médicament:', err);
      throw err;
    }
  }, [chargerMedicaments]);

  // Charger les médicaments au montage du composant
  useEffect(() => {
    chargerMedicaments();
  }, [chargerMedicaments]);

  // Statistiques
  const getStatistiques = useCallback(() => {
    const total = medicaments.length;
    const stockFaible = medicaments.filter(m => m.quantiteStock <= m.seuilAlerte).length;
    const expires = medicaments.filter(m => new Date() > new Date(m.dateExpiration)).length;
    const expireSoon = medicaments.filter(m => {
      const today = new Date();
      const expiration = new Date(m.dateExpiration);
      const diffDays = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 30 && diffDays > 0;
    }).length;

    return {
      total,
      stockFaible,
      expires,
      expireSoon,
    };
  }, [medicaments]);

  return {
    medicaments,
    loading,
    error,
    chargerMedicaments,
    ajouterMedicament,
    modifierMedicament,
    supprimerMedicament,
    getStatistiques,
  };
}
