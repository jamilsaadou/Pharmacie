'use client';

import React, { useMemo, useState } from 'react';
import { Assurance, Assure } from '@/types';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAssuranceData } from '@/hooks/useAssuranceData';
import { AddAssuranceModal } from './AddAssuranceModal';
import { AddAssureModal } from './AddAssureModal';
import { Plus, Trash2, Shield, UserCheck, Search, Users, BadgePercent, Calendar, Mail, Phone } from 'lucide-react';

export default function AssuranceManagement() {
  const {
    assurances,
    assures,
    supprimerAssurance,
    supprimerAssure,
  } = useAssuranceData();

  const [searchAssurance, setSearchAssurance] = useState('');
  const [searchAssure, setSearchAssure] = useState('');
  const [assuranceFilter, setAssuranceFilter] = useState('');
  const [showAddAssurance, setShowAddAssurance] = useState(false);
  const [showAddAssure, setShowAddAssure] = useState(false);

  const assuranceById = useMemo(() => {
    return new Map(assurances.map((assurance) => [assurance.id, assurance]));
  }, [assurances]);

  const assurancesFiltrees = useMemo(() => {
    const t = searchAssurance.trim().toLowerCase();
    if (!t) return assurances;
    return assurances.filter(a =>
      a.nom.toLowerCase().includes(t) ||
      (a.code?.toLowerCase().includes(t) ?? false) ||
      (a.email?.toLowerCase().includes(t) ?? false)
    );
  }, [assurances, searchAssurance]);

  const assuresFiltres = useMemo(() => {
    const t = searchAssure.trim().toLowerCase();
    return assures.filter(s => {
      if (assuranceFilter && s.assuranceId !== assuranceFilter) return false;
      if (!t) return true;
      const matchPolice = s.numeroPolice.toLowerCase().includes(t);
      return matchPolice;
    });
  }, [assures, searchAssure, assuranceFilter]);

  const stats = useMemo(() => {
    const today = new Date();
    const totalAssurances = assurances.length;
    const totalAssures = assures.length;
    const activeAssures = assures.filter((s) => {
      const start = new Date(s.dateDebut);
      const end = s.dateFin ? new Date(s.dateFin) : null;
      if (Number.isNaN(start.getTime())) return false;
      if (start > today) return false;
      if (end && end < today) return false;
      return true;
    }).length;

    const coverageValues = assures.map((s) => {
      if (typeof s.tauxCouverture === 'number') return s.tauxCouverture;
      return assuranceById.get(s.assuranceId)?.tauxCouverture ?? 0;
    });
    const averageCoverage = coverageValues.length
      ? Math.round(coverageValues.reduce((sum, v) => sum + v, 0) / coverageValues.length)
      : 0;

    return { totalAssurances, totalAssures, activeAssures, averageCoverage };
  }, [assurances, assures, assuranceById]);

  const formatPeriod = (start: string | Date, end?: string | Date | null) => {
    const startLabel = (start instanceof Date ? start : new Date(start)).toLocaleDateString('fr-FR');
    const endLabel = end ? (end instanceof Date ? end : new Date(end)).toLocaleDateString('fr-FR') : '—';
    return `${startLabel} - ${endLabel}`;
  };

  return (
    <div className="assurance-page relative space-y-6">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Domine:wght@600;700&family=Sora:wght@400;500;600;700&display=swap');
        .assurance-page {
          font-family: 'Sora', 'Segoe UI', sans-serif;
        }
        .assurance-title {
          font-family: 'Domine', 'Georgia', serif;
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
              Couverture
            </span>
            <h1 className="assurance-title text-3xl sm:text-4xl text-slate-900">Gestion des assurances</h1>
            <p className="text-sm text-slate-600">
              Suivez vos partenaires d&apos;assurance, vos assurés et les couvertures en cours.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowAddAssurance(true)} variant="secondary" className="gap-2">
              <Plus size={16} />
              Nouvelle assurance
            </Button>
            <Button onClick={() => setShowAddAssure(true)} className="gap-2">
              <Plus size={16} />
              Nouvel assuré
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Assurances actives</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.totalAssurances}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Shield size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Assurés enregistrés</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.totalAssures}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                <Users size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Assurés actifs</p>
                <p className="text-2xl font-semibold text-emerald-700">{stats.activeAssures}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <UserCheck size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Couverture moyenne</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.averageCoverage}%</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <BadgePercent size={20} />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200/70 bg-slate-50/70 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <Shield size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Assurances</h2>
                  <p className="text-xs text-slate-500">{assurancesFiltrees.length} organismes</p>
                </div>
              </div>
              <Button onClick={() => setShowAddAssurance(true)} variant="secondary" size="sm" className="gap-2">
                <Plus size={14} />
                Ajouter
              </Button>
            </div>

            <div className="p-4 space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchAssurance}
                  onChange={(e) => setSearchAssurance(e.target.value)}
                  placeholder="Rechercher une assurance, code, email..."
                  className="w-full rounded-full border border-slate-200/80 bg-white/90 px-10 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>

            <div className="xl:hidden px-4 pb-4 space-y-3">
              {assurancesFiltrees.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">Aucune assurance</div>
              ) : (
                assurancesFiltrees.map((a) => (
                  <div key={a.id} className="rounded-2xl border border-slate-200/80 bg-white/90 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{a.nom}</p>
                        <p className="text-xs text-slate-500">Code: {a.code || '—'}</p>
                      </div>
                      <span className="rounded-full border border-emerald-200/70 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        {a.tauxCouverture}%
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      {a.telephone && (
                        <div className="flex items-center gap-2">
                          <Phone size={12} />
                          {a.telephone}
                        </div>
                      )}
                      {a.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={12} />
                          {a.email}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (window.confirm(`Supprimer l'assurance "${a.nom}" ? Cette action supprimera aussi ses assurés et dossiers.`)) {
                            supprimerAssurance(a.id).catch(() => {});
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div tabIndex={0} role="region" aria-label="Tableau de données à défilement horizontal" className="ph-table-scroll hidden xl:block px-4 pb-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-xs uppercase tracking-widest text-slate-400">
                    <th className="px-4 py-2 text-left">Nom</th>
                    <th className="px-4 py-2 text-left">Code</th>
                    <th className="px-4 py-2 text-left">Taux</th>
                    <th className="px-4 py-2 text-left">Contact</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assurancesFiltrees.map((a) => (
                    <tr
                      key={a.id}
                      className="bg-white/90 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.6)] ring-1 ring-slate-200/70"
                    >
                      <td className="rounded-l-2xl px-4 py-3 text-sm font-semibold text-slate-900">{a.nom}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{a.code || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{a.tauxCouverture}%</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div className="flex flex-col gap-1">
                          {a.telephone && (
                            <span className="flex items-center gap-1">
                              <Phone size={12} /> {a.telephone}
                            </span>
                          )}
                          {a.email && (
                            <span className="flex items-center gap-1">
                              <Mail size={12} /> {a.email}
                            </span>
                          )}
                          {!a.telephone && !a.email && <span>—</span>}
                        </div>
                      </td>
                      <td className="rounded-r-2xl px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (window.confirm(`Supprimer l'assurance "${a.nom}" ? Cette action supprimera aussi ses assurés et dossiers.`)) {
                              supprimerAssurance(a.id).catch(() => {});
                            }
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {assurancesFiltrees.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                        Aucune assurance
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200/70 bg-slate-50/70 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Assurés</h2>
                  <p className="text-xs text-slate-500">{assuresFiltres.length} dossiers</p>
                </div>
              </div>
              <Button onClick={() => setShowAddAssure(true)} variant="secondary" size="sm" className="gap-2">
                <Plus size={14} />
                Ajouter
              </Button>
            </div>

            <div className="p-4 grid gap-3 lg:grid-cols-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchAssure}
                  onChange={(e) => setSearchAssure(e.target.value)}
                  placeholder="Rechercher par N° police..."
                  className="w-full rounded-full border border-slate-200/80 bg-white/90 px-10 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <Select value={assuranceFilter} onChange={(e) => setAssuranceFilter(e.target.value)}>
                <option value="">Toutes les assurances</option>
                {assurances.map(a => (
                  <option key={a.id} value={a.id}>{a.nom}</option>
                ))}
              </Select>
            </div>

            <div className="xl:hidden px-4 pb-4 space-y-3">
              {assuresFiltres.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">Aucun assuré</div>
              ) : (
                assuresFiltres.map((s) => {
                  const assurance = assuranceById.get(s.assuranceId);
                  const taux = s.tauxCouverture ?? assurance?.tauxCouverture;
                  return (
                    <div key={s.id} className="rounded-2xl border border-slate-200/80 bg-white/90 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-base font-semibold text-slate-900">{assurance?.nom || '—'}</p>
                          <p className="text-xs text-slate-500">Police: {s.numeroPolice}</p>
                        </div>
                        <span className="rounded-full border border-sky-200/70 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                          {taux ?? '—'}{taux != null ? '%' : ''}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                        <Calendar size={12} />
                        {formatPeriod(s.dateDebut, s.dateFin)}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (window.confirm('Supprimer cet assuré ?')) supprimerAssure(s.id).catch(() => {});
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
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
                    <th className="px-4 py-2 text-left">Assurance</th>
                    <th className="px-4 py-2 text-left">N° Police</th>
                    <th className="px-4 py-2 text-left">Taux</th>
                    <th className="px-4 py-2 text-left">Période</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assuresFiltres.map((s) => {
                    const assurance = assuranceById.get(s.assuranceId);
                    const taux = s.tauxCouverture ?? assurance?.tauxCouverture;
                    return (
                      <tr
                        key={s.id}
                        className="bg-white/90 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.6)] ring-1 ring-slate-200/70"
                      >
                        <td className="rounded-l-2xl px-4 py-3 text-sm font-semibold text-slate-900">
                          {assurance?.nom || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{s.numeroPolice}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {taux ?? '—'}{taux != null ? '%' : ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatPeriod(s.dateDebut, s.dateFin)}
                        </td>
                        <td className="rounded-r-2xl px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (window.confirm('Supprimer cet assuré ?')) supprimerAssure(s.id).catch(() => {});
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {assuresFiltres.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                        Aucun assuré
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <AddAssuranceModal isOpen={showAddAssurance} onClose={() => setShowAddAssurance(false)} />
        <AddAssureModal isOpen={showAddAssure} onClose={() => setShowAddAssure(false)} />
      </div>
    </div>
  );
}
