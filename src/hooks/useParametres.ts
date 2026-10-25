'use client';

import { useCallback, useEffect, useState } from 'react';

export interface Parametre {
  id?: string;
  cle: string;
  valeur: string;
  description?: string;
  categorie: string;
  isDefault?: boolean;
  dateCreation?: Date;
  dateModification?: Date;
}

// Valeurs par défaut côté client
const DEFAULT_VALUES: Record<string, string> = {
  'app.nom': 'PharmaCare',
  'app.slogan': 'Gestion Pharmaceutique',
  'facturation.prefixe': 'FAC',
  'facturation.timbre.seuil': '5000',
  'facturation.timbre.montant': '0',
  'impression.entete': '',
  'impression.piedDePage': '',
};

export function useParametres() {
  const [parametres, setParametres] = useState<Parametre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger tous les paramètres
  const loadParametres = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/parametres');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des paramètres');
      }

      const data = await response.json();
      setParametres(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur lors du chargement des paramètres:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les paramètres au montage
  useEffect(() => {
    loadParametres();
  }, [loadParametres]);

  // Récupérer la valeur d'un paramètre
  const getParametre = useCallback(
    (cle: string): string => {
      const param = parametres.find((p) => p.cle === cle);
      return param?.valeur ?? DEFAULT_VALUES[cle] ?? '';
    },
    [parametres]
  );

  // Sauvegarder un paramètre
  const setParametre = useCallback(
    async (cle: string, valeur: string, description?: string, categorie?: string) => {
      try {
        const response = await fetch('/api/parametres', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cle, valeur, description, categorie }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
        }

        const updatedParam = await response.json();

        // Mettre à jour l'état local
        setParametres((prev) => {
          const index = prev.findIndex((p) => p.cle === cle);
          if (index >= 0) {
            const newParams = [...prev];
            newParams[index] = { ...updatedParam, isDefault: false };
            return newParams;
          }
          return [...prev, { ...updatedParam, isDefault: false }];
        });

        return updatedParam;
      } catch (err) {
        console.error('Erreur lors de la sauvegarde du paramètre:', err);
        throw err;
      }
    },
    []
  );

  // Sauvegarder plusieurs paramètres
  const saveParametres = useCallback(
    async (paramsToSave: Array<{ cle: string; valeur: string; description?: string; categorie?: string }>) => {
      try {
        const response = await fetch('/api/parametres', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ parametres: paramsToSave }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
        }

        // Recharger les paramètres
        await loadParametres();
      } catch (err) {
        console.error('Erreur lors de la sauvegarde des paramètres:', err);
        throw err;
      }
    },
    [loadParametres]
  );

  // Raccourcis pour les paramètres courants
  const appNom = getParametre('app.nom');
  const appSlogan = getParametre('app.slogan');
  const facturationPrefixe = getParametre('facturation.prefixe');
  const timbreSeuil = getParametre('facturation.timbre.seuil');
  const timbreMontant = getParametre('facturation.timbre.montant');
  const impressionEntete = getParametre('impression.entete');
  const impressionPiedDePage = getParametre('impression.piedDePage');

  return {
    // Données
    parametres,
    loading,
    error,

    // Actions
    loadParametres,
    getParametre,
    setParametre,
    saveParametres,

    // Raccourcis
    appNom,
    appSlogan,
    facturationPrefixe,
    timbreSeuil,
    timbreMontant,
    impressionEntete,
    impressionPiedDePage,
  };
}
