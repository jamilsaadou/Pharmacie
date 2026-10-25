'use client';

import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAssuranceData } from '@/hooks/useAssuranceData';
import { dateToInputValue, inputValueToDate, formatPrice } from '@/utils';
import { CheckCircle2, Clock, Download, Plus, FileText, BadgePercent, Search } from 'lucide-react';
import { AddRemboursementModal } from './AddRemboursementModal';

export default function RemboursementManagement() {
  const {
    assurances,
    dossiers,
    filtrerDossiers,
    calculerStatistiques,
    majStatutDossier,
    exporterDossiers,
  } = useAssuranceData();

  const [assuranceId, setAssuranceId] = useState('');
  const [dateDebut, setDateDebut] = useState(dateToInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [dateFin, setDateFin] = useState(dateToInputValue(new Date()));
  const [statut, setStatut] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const filtres = useMemo(() => ({
    assuranceId: assuranceId || undefined,
    dateDebut: dateDebut ? inputValueToDate(dateDebut) : undefined,
    dateFin: dateFin ? inputValueToDate(dateFin) : undefined,
    statut: (statut || undefined) as any,
  }), [assuranceId, dateDebut, dateFin, statut]);

  const dossiersFiltres = useMemo(() => filtrerDossiers(filtres), [filtrerDossiers, filtres]);
  const stats = useMemo(() => calculerStatistiques(filtres), [calculerStatistiques, filtres]);

  const statusMeta: Record<string, { label: string; badge: string; text: string }> = {
    en_attente: {
      label: 'En attente',
      badge: 'bg-amber-100 text-amber-700 border border-amber-200/70',
      text: 'text-amber-700',
    },
    partiel: {
      label: 'Partiel',
      badge: 'bg-sky-100 text-sky-700 border border-sky-200/70',
      text: 'text-sky-700',
    },
    rembourse: {
      label: 'Remboursé',
      badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200/70',
      text: 'text-emerald-700',
    },
  };

  const formatPeriod = (start: string | Date, end: string | Date) => {
    const startLabel = (start instanceof Date ? start : new Date(start)).toLocaleDateString('fr-FR');
    const endLabel = (end instanceof Date ? end : new Date(end)).toLocaleDateString('fr-FR');
    return `${startLabel} - ${endLabel}`;
  };

  return (
    <div className="remboursement-page relative space-y-6">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;600;700&family=Spectral:wght@600;700&display=swap');
        .remboursement-page {
          font-family: 'Libre Franklin', 'Segoe UI', sans-serif;
        }
        .remboursement-title {
          font-family: 'Spectral', 'Georgia', serif;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 right-[-6rem] h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-40 -left-16 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute bottom-[-6rem] right-12 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      <div className="relative space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-600">
              Remboursements
            </span>
            <h1 className="remboursement-title text-3xl sm:text-4xl text-slate-900">
              Gestion des dossiers
            </h1>
            <p className="text-sm text-slate-600">
              Suivez les remboursements, les montants couverts et les statuts en cours.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowAdd(true)} className="gap-2">
              <Plus size={16} />
              Nouveau dossier
            </Button>
            <Button variant="secondary" onClick={() => exporterDossiers(filtres)} className="gap-2">
              <Download size={16} />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Dossiers</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.totalDossiers}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <FileText size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Montant couvert</p>
                <p className="text-2xl font-semibold text-emerald-700">{formatPrice(stats.montantCouvert)}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <BadgePercent size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Remboursé</p>
                <p className="text-2xl font-semibold text-sky-700">{formatPrice(stats.montantRembourse)}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                <CheckCircle2 size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">En attente</p>
                <p className="text-2xl font-semibold text-amber-700">{formatPrice(stats.montantEnAttente)}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Clock size={20} />
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))] items-end">
            <Select label="Assurance" value={assuranceId} onChange={(e) => setAssuranceId(e.target.value)}>
              <option value="">Toutes</option>
              {assurances.map(a => (
                <option key={a.id} value={a.id}>{a.nom}</option>
              ))}
            </Select>
            <Input label="Début" type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            <Input label="Fin" type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            <Select label="Statut" value={statut} onChange={(e) => setStatut(e.target.value)}>
              <option value="">Tous</option>
              <option value="en_attente">En attente</option>
              <option value="partiel">Partiel</option>
              <option value="rembourse">Remboursé</option>
            </Select>
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-slate-200/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Dossiers filtrés</h2>
              <p className="text-xs text-slate-500">{dossiersFiltres.length} dossiers affichés</p>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Search size={14} />
              Période: {new Date(filtres.dateDebut || new Date()).toLocaleDateString('fr-FR')} - {new Date(filtres.dateFin || new Date()).toLocaleDateString('fr-FR')}
            </div>
          </div>

          <div className="xl:hidden p-4 space-y-3">
            {dossiersFiltres.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-500">
                <Clock className="mx-auto mb-2 text-slate-400" />
                Aucun dossier pour les filtres sélectionnés
              </div>
            ) : (
              dossiersFiltres.map((d) => {
                const a = assurances.find(x => x.id === d.assuranceId);
                const status = statusMeta[d.statut] || statusMeta.en_attente;
                return (
                  <div key={d.id} className="rounded-2xl border border-slate-200/80 bg-white/90 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{d.reference}</p>
                        <p className="text-xs text-slate-500">
                          {a?.nom || '—'} • Soumis le {new Date(d.dateSoumission).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.badge}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
                      <div>
                        <p className="text-xs text-slate-400">Période</p>
                        <p className="font-medium text-slate-700">{formatPeriod(d.periodeDebut, d.periodeFin)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Montant couvert</p>
                        <p className="font-semibold text-slate-900">{formatPrice(d.montantCouvert)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Remboursé</p>
                        <p className="font-semibold text-slate-900">{formatPrice(d.montantRembourse)}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      {d.statut !== 'rembourse' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-700 border-emerald-600 hover:bg-emerald-50"
                          onClick={() => majStatutDossier(d.id, 'rembourse', d.montantCouvert).catch(() => {})}
                        >
                          <CheckCircle2 size={16} className="mr-1" /> Marquer remboursé
                        </Button>
                      ) : (
                        <span className="inline-flex items-center text-sm font-medium text-emerald-700">
                          <CheckCircle2 size={16} className="mr-1" /> Remboursé
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div tabIndex={0} role="region" aria-label="Tableau de données à défilement horizontal" className="ph-table-scroll hidden xl:block px-4 pb-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-xs uppercase tracking-widest text-slate-400">
                  <th className="px-4 py-2 text-left">Référence</th>
                  <th className="px-4 py-2 text-left">Assurance</th>
                  <th className="px-4 py-2 text-left">Période</th>
                  <th className="px-4 py-2 text-right">Montant couvert</th>
                  <th className="px-4 py-2 text-right">Remboursé</th>
                  <th className="px-4 py-2 text-right">Statut</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {dossiersFiltres.map((d) => {
                  const a = assurances.find(x => x.id === d.assuranceId);
                  const status = statusMeta[d.statut] || statusMeta.en_attente;
                  return (
                    <tr
                      key={d.id}
                      className="bg-white/90 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.6)] ring-1 ring-slate-200/70"
                    >
                      <td className="rounded-l-2xl px-4 py-3">
                        <div className="text-sm font-semibold text-slate-900">{d.reference}</div>
                        <div className="text-xs text-slate-500">
                          Soumis le {new Date(d.dateSoumission).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{a?.nom || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatPeriod(d.periodeDebut, d.periodeFin)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        {formatPrice(d.montantCouvert)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">
                        {formatPrice(d.montantRembourse)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${status.badge}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="rounded-r-2xl px-4 py-3 text-right">
                        {d.statut !== 'rembourse' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-700 border-emerald-600 hover:bg-emerald-50"
                            onClick={() => majStatutDossier(d.id, 'rembourse', d.montantCouvert).catch(() => {})}
                          >
                            <CheckCircle2 size={16} className="mr-1" /> Marquer remboursé
                          </Button>
                        ) : (
                          <span className="inline-flex items-center text-sm font-medium text-emerald-700">
                            <CheckCircle2 size={16} className="mr-1" /> Remboursé
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {dossiersFiltres.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                      <Clock className="mx-auto mb-2 text-slate-400" /> Aucun dossier pour les filtres sélectionnés
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <AddRemboursementModal isOpen={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
