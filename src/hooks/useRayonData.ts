'use client';
import { useState, useCallback, useEffect } from 'react';
import { useDataRefresh } from './useDataRefresh';
import { requestJson } from './useServerCollection';
import type { Rayon, MedicamentRayon, TransfertRayon, Medicament } from '@/types';
export function useRayonData() {
  const [rayons, setRayons] = useState<Rayon[]>([]);
  const [medicamentsRayons, setMedicamentsRayons] = useState<MedicamentRayon[]>([]);
  const [transferts, setTransferts] = useState<TransfertRayon[]>([]);
  const [medicaments, setMedicaments] = useState<Medicament[]>([]);
  const refresh = useCallback(async () => { const data = await requestJson('/api/rayons'); setRayons(data.rayons); setMedicamentsRayons(data.medicamentsRayons); setTransferts(data.transferts); setMedicaments(data.medicaments); }, []);
  useEffect(() => { void refresh().catch(() => {}); }, [refresh]);
  useDataRefresh(refresh);
  const ajouterRayon = async (data: Omit<Rayon, 'id' | 'dateCreation' | 'dateModification'>): Promise<Rayon> => { const saved = await requestJson('/api/collections/rayons', 'POST', { data }); return saved; };
  const modifierRayon = async (id: string, data: Partial<Rayon>) => { await requestJson('/api/collections/rayons', 'PUT', { id, data }); };
  const supprimerRayon = async (id: string) => { await requestJson('/api/collections/rayons?id='+encodeURIComponent(id), 'DELETE'); };
  const transfererMedicament = async (data: Omit<TransfertRayon, 'id' | 'date' | 'medicament' | 'rayon' | 'rayonDestination'>): Promise<TransfertRayon> => { const saved = await requestJson('/api/rayons', 'POST', data); return saved; };

  // Fonctions utilitaires
  const obtenirMedicamentsParRayon = useCallback((rayonId: string) => {
    return medicamentsRayons
      .filter(mr => mr.rayonId === rayonId)
      .map(mr => ({
        ...mr,
        medicament: medicaments.find(med => med.id === mr.medicamentId),
        rayon: rayons.find(r => r.id === mr.rayonId)
      }));
  }, [medicamentsRayons, medicaments, rayons]);

  const obtenirStatistiquesRayon = useCallback((rayonId: string) => {
    const medicamentsRayon = obtenirMedicamentsParRayon(rayonId);
    const rayon = rayons.find(r => r.id === rayonId);
    
    if (!rayon) return null;
    
    const quantiteTotale = medicamentsRayon.reduce((sum, mr) => sum + mr.quantiteEnRayon, 0);
    const pourcentageRemplissage = (quantiteTotale / rayon.capaciteMax) * 100;
    const nombreMedicamentsDifferents = medicamentsRayon.length;
    const valeurTotale = medicamentsRayon.reduce((sum, mr) => {
      const medicament = medicaments.find(med => med.id === mr.medicamentId);
      return sum + (medicament ? medicament.prix * mr.quantiteEnRayon : 0);
    }, 0);
    
    return {
      quantiteTotale,
      pourcentageRemplissage,
      nombreMedicamentsDifferents,
      valeurTotale,
      capaciteRestante: rayon.capaciteMax - quantiteTotale
    };
  }, [obtenirMedicamentsParRayon, rayons, medicaments]);

  return {
    // Données
    rayons,
    medicamentsRayons: medicamentsRayons.map(mr => ({
      ...mr,
      medicament: medicaments.find(med => med.id === mr.medicamentId),
      rayon: rayons.find(r => r.id === mr.rayonId)
    })),
    transferts: transferts.map(t => ({
      ...t,
      medicament: medicaments.find(med => med.id === t.medicamentId),
      rayon: rayons.find(r => r.id === t.rayonId),
      rayonDestination: t.rayonDestinationId ? rayons.find(r => r.id === t.rayonDestinationId) : undefined
    })),
    medicaments,
    
    // Actions rayons
    ajouterRayon,
    modifierRayon,
    supprimerRayon,
    
    // Actions transferts
    transfererMedicament,
    
    // Fonctions utilitaires
    obtenirMedicamentsParRayon,
    obtenirStatistiquesRayon,
  };
}
