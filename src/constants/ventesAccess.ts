import type { VentesAccessId } from '@/types';

export const VENTES_ACCESS_OPTIONS: { id: VentesAccessId; label: string; description?: string }[] = [
  { id: 'ventes', label: 'Point de vente', description: 'Vente standard' },
  { id: 'facture-vente', label: 'Facture de vente (FV)' },
  { id: 'facture-acompte', label: "Facture d'acompte (FT)" },
  { id: 'facture-avoir', label: "Facture d'avoir (FA)" },
  { id: 'facture-export', label: 'Facture export (EV)' },
  { id: 'facture-prestation', label: 'Facture de prestation (ISB)' },
  { id: 'pending-invoices', label: 'Factures en attente' },
  { id: 'certified-invoices', label: 'Factures certifiées' },
];

export const ALL_VENTES_ACCESS = VENTES_ACCESS_OPTIONS.map((option) => option.id);

export const isVentesAccessId = (value: string): value is VentesAccessId =>
  ALL_VENTES_ACCESS.includes(value as VentesAccessId);
