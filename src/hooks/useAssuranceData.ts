'use client';

import { useCallback, useMemo } from 'react';
import { useServerCollection } from './useServerCollection';
import { Assurance, Assure, Client, DossierRemboursement, FiltresRemboursement, StatutRemboursement } from '@/types';
import { generateId, exportToCSV } from '@/utils';

export interface StatistiquesRemboursement {
  totalDossiers: number;
  montantTotal: number;
  montantCouvert: number;
  montantRembourse: number;
  montantEnAttente: number;
  parAssurance: {
    assurance: Assurance;
    totalDossiers: number;
    montantCouvert: number;
    montantRembourse: number;
  }[];
}

export function useAssuranceData() {
  const assuranceStore = useServerCollection<Assurance>('/api/collections/assurances');
  const assureStore = useServerCollection<Assure>('/api/collections/assures');
  const dossierStore = useServerCollection<DossierRemboursement>('/api/collections/dossiers');
  const clientStore = useServerCollection<Client>('/api/clients');
  const assurances = assuranceStore.items, assures = assureStore.items, dossiers = dossierStore.items, clients = clientStore.items;
  const ajouterAssurance = assuranceStore.create, modifierAssurance = assuranceStore.update, supprimerAssurance = assuranceStore.remove;
  const ajouterAssure = assureStore.create, modifierAssure = assureStore.update, supprimerAssure = assureStore.remove;
  const creerDossier = dossierStore.create, supprimerDossier = dossierStore.remove;
  const majStatutDossier = (id: string, statut: StatutRemboursement, montantRembourse?: number) => dossierStore.update(id, { statut, montantRembourse });

  // Validation simple Assurance
  const validerAssurance = useCallback((data: Partial<Assurance>) => {
    const erreurs: string[] = [];
    if (!data.nom || !data.nom.trim()) erreurs.push('Le nom de l\'assurance est obligatoire');
    if (data.tauxCouverture == null || data.tauxCouverture < 0 || data.tauxCouverture > 100) {
      erreurs.push('Le taux de couverture doit être entre 0 et 100');
    }
    return { valide: erreurs.length === 0, erreurs };
  }, []);

  const obtenirClientPourAssure = useCallback((assure: Assure) => {
    return clients.find(c => c.id === assure.clientId);
  }, [clients]);

  // Recherche/filtrage dossiers
  const filtrerDossiers = useCallback((filtres: FiltresRemboursement) => {
    return dossiers.filter(d => {
      if (filtres.assuranceId && d.assuranceId !== filtres.assuranceId) return false;
      if (filtres.statut && d.statut !== filtres.statut) return false;
      if (filtres.dateDebut && d.periodeDebut < filtres.dateDebut) return false;
      if (filtres.dateFin && d.periodeFin > filtres.dateFin) return false;
      return true;
    });
  }, [dossiers]);

  // Statistiques de remboursement
  const calculerStatistiques = useCallback((filtres?: FiltresRemboursement): StatistiquesRemboursement => {
    const base = filtres ? filtrerDossiers(filtres) : dossiers;
    const totalDossiers = base.length;
    const montantTotal = base.reduce((s, d) => s + d.montantTotal, 0);
    const montantCouvert = base.reduce((s, d) => s + d.montantCouvert, 0);
    const montantRembourse = base.reduce((s, d) => s + d.montantRembourse, 0);
    const montantEnAttente = Math.max(0, montantCouvert - montantRembourse);

    const parAssuranceMap = new Map<string, { assurance: Assurance; totalDossiers: number; montantCouvert: number; montantRembourse: number }>();
    base.forEach(d => {
      const a = assurances.find(x => x.id === d.assuranceId);
      if (!a) return;
      const ex = parAssuranceMap.get(a.id);
      if (ex) {
        ex.totalDossiers += 1;
        ex.montantCouvert += d.montantCouvert;
        ex.montantRembourse += d.montantRembourse;
      } else {
        parAssuranceMap.set(a.id, { assurance: a, totalDossiers: 1, montantCouvert: d.montantCouvert, montantRembourse: d.montantRembourse });
      }
    });

    return {
      totalDossiers,
      montantTotal,
      montantCouvert,
      montantRembourse,
      montantEnAttente,
      parAssurance: Array.from(parAssuranceMap.values()),
    };
  }, [dossiers, assurances, filtrerDossiers]);

  // Export dossiers CSV
  const exporterDossiers = useCallback((filtres?: FiltresRemboursement) => {
    const base = filtres ? filtrerDossiers(filtres) : dossiers;
    exportToCSV(
      base as any,
      `dossiers_remboursement_${new Date().toISOString().split('T')[0]}`,
      {
        id: 'ID',
        reference: 'Référence',
        assuranceId: 'Assurance',
        assureId: 'Assuré',
        venteId: 'Vente',
        dateSoumission: 'Soumission',
        periodeDebut: 'Période début',
        periodeFin: 'Période fin',
        montantTotal: 'Montant total',
        montantCouvert: 'Montant couvert',
        montantPayeClient: 'Part client',
        montantRembourse: 'Remboursé',
        statut: 'Statut',
        commentaire: 'Commentaire',
      }
    );
  }, [dossiers, filtrerDossiers]);

  return {
    // Données
    assurances,
    assures,
    dossiers,

    // CRUD assurances
    ajouterAssurance,
    modifierAssurance,
    supprimerAssurance,
    validerAssurance,

    // CRUD assurés
    ajouterAssure,
    modifierAssure,
    supprimerAssure,
    obtenirClientPourAssure,

    // Dossiers
    creerDossier,
    majStatutDossier,
    supprimerDossier,
    filtrerDossiers,
    calculerStatistiques,
    exporterDossiers,
  };
}

