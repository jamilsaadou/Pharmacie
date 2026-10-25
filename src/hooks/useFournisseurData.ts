import { useDataRefresh } from './useDataRefresh';

import { fetchWithRefresh as fetch } from '@/lib/data-refresh';
import { useState, useEffect, useCallback } from 'react';
import { Fournisseur } from '@/types';
import { isValidEmail, exportToCSV } from '@/utils';

export interface StatistiquesFournisseur {
  totalFournisseurs: number;
  nouveauxCeMois: number;
}

export function useFournisseurData() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les fournisseurs depuis l'API
  const chargerFournisseurs = useCallback(async () => {
    try {

      setError(null);
      const response = await fetch('/api/fournisseurs');
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des fournisseurs');
      }

      const data = await response.json();
      
      // Conversion des dates
      const fournisseursWithDates = data.map((f: any) => ({
        ...f,
        dateAjout: new Date(f.dateAjout),
      }));

      setFournisseurs(fournisseursWithDates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur lors du chargement des fournisseurs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useDataRefresh(chargerFournisseurs);

  // CRUD
  const ajouterFournisseur = useCallback(async (data: Omit<Fournisseur, 'id' | 'dateAjout'>) => {
    try {
      setError(null);
      const response = await fetch('/api/fournisseurs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'ajout du fournisseur');
      }

      const nouveau = await response.json();
      const fournisseurWithDates = {
        ...nouveau,
        dateAjout: new Date(nouveau.dateAjout),
      };

      setFournisseurs(prev => [...prev, fournisseurWithDates]);
      return fournisseurWithDates;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur lors de l\'ajout du fournisseur:', err);
      throw err;
    }
  }, []);

  const modifierFournisseur = useCallback(async (id: string, modifications: Partial<Omit<Fournisseur, 'id' | 'dateAjout'>>) => {
    try {
      setError(null);
      const response = await fetch(`/api/fournisseurs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modifications),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la modification du fournisseur');
      }

      const modifie = await response.json();
      const fournisseurWithDates = {
        ...modifie,
        dateAjout: new Date(modifie.dateAjout),
      };

      setFournisseurs(prev => prev.map(f => f.id === id ? fournisseurWithDates : f));
      return fournisseurWithDates;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur lors de la modification du fournisseur:', err);
      throw err;
    }
  }, []);

  const supprimerFournisseur = useCallback(async (id: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/fournisseurs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression du fournisseur');
      }

      setFournisseurs(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur lors de la suppression du fournisseur:', err);
      throw err;
    }
  }, []);

  // Recherche et obtention
  const rechercherFournisseurs = useCallback((terme: string) => {
    if (!terme.trim()) return fournisseurs;
    const t = terme.toLowerCase().trim();
    return fournisseurs.filter(f =>
      f.nom.toLowerCase().includes(t) ||
      f.contact.toLowerCase().includes(t) ||
      f.telephone.toLowerCase().includes(t) ||
      (f.email?.toLowerCase().includes(t) ?? false) ||
      f.adresse.toLowerCase().includes(t)
    );
  }, [fournisseurs]);

  const obtenirFournisseur = useCallback((id: string) => fournisseurs.find(f => f.id === id), [fournisseurs]);

  // Validation
  const validerFournisseur = useCallback((data: Partial<Fournisseur>) => {
    const erreurs: string[] = [];

    if (!data.nom || !data.nom.trim()) erreurs.push('Le nom du fournisseur est obligatoire');
    if (!data.contact || !data.contact.trim()) erreurs.push('Le nom du contact est obligatoire');
    if (!data.telephone || !data.telephone.trim()) {
      erreurs.push('Le numéro de téléphone est obligatoire');
    } else if (!/^[0-9\s\-\+\(\)]{8,}$/.test(data.telephone)) {
      erreurs.push('Le numéro de téléphone n\'est pas valide');
    }
    if (data.email && !isValidEmail(data.email)) erreurs.push('L\'email n\'est pas valide');
    if (!data.adresse || !data.adresse.trim()) erreurs.push('L\'adresse est obligatoire');

    return { valide: erreurs.length === 0, erreurs };
  }, []);

  // Statistiques simples
  const statistiquesFournisseurs: StatistiquesFournisseur = (() => {
    const aujourd = new Date();
    const debutMois = new Date(aujourd.getFullYear(), aujourd.getMonth(), 1);
    const nouveauxCeMois = fournisseurs.filter(f => new Date(f.dateAjout) >= debutMois).length;
    return {
      totalFournisseurs: fournisseurs.length,
      nouveauxCeMois,
    };
  })();

  // Export CSV
  const exporterFournisseurs = useCallback(() => {
    exportToCSV(
      fournisseurs,
      `fournisseurs_${new Date().toISOString().split('T')[0]}`,
      {
        id: 'ID',
        nom: 'Nom',
        contact: 'Contact',
        telephone: 'Téléphone',
        email: 'Email',
        adresse: 'Adresse',
        dateAjout: 'Date ajout',
      }
    );
  }, [fournisseurs]);

  // Charger les fournisseurs au montage
  useEffect(() => {
    chargerFournisseurs();
  }, [chargerFournisseurs]);

  return {
    // Données
    fournisseurs,
    loading,
    error,
    statistiquesFournisseurs,

    // Actions CRUD
    ajouterFournisseur,
    modifierFournisseur,
    supprimerFournisseur,

    // Recherche
    rechercherFournisseurs,
    obtenirFournisseur,

    // Utilitaires
    validerFournisseur,
    exporterFournisseurs,
    chargerFournisseurs,
  };
}
