'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { FileBarChart2, Printer, Lock, RefreshCw } from 'lucide-react';
import { ModuleHeading } from '@/components/ui/ModuleHeading';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import type { SalesReport, ArticleReport } from '@/lib/reports';
import { printSalesReport, printArticleReport } from '@/utils/printReport';

type Tab = 'x' | 'z' | 'a';

const fcfa = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' FCFA';
const dt = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur lors de la génération du rapport.');
  return data as T;
}

function Notice({ message }: { message: string }) {
  return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>;
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SalesPreview({ report }: { report: SalesReport }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Période" value={<span className="text-sm">{dt(report.debut)} → {dt(report.fin)}</span>} />
        <Kpi label="Factures certifiées" value={report.nombreFactures} />
        <Kpi label="Réductions commerciales" value={fcfa(report.reductionsCommerciales)} />
        <Kpi label="Ventes incomplètes" value={report.nombreVentesIncompletes} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Par type de facture et groupe de taxation</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-center font-medium">Groupe</th>
                <th className="px-3 py-2 text-right font-medium">Taux</th>
                <th className="px-3 py-2 text-right font-medium">Montant total</th>
                <th className="px-3 py-2 text-right font-medium">Taxable</th>
                <th className="px-3 py-2 text-right font-medium">Taxe</th>
              </tr>
            </thead>
            <tbody>
              {report.parTypeEtGroupe.length ? (
                report.parTypeEtGroupe.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2">{r.type} — {r.typeLabel}</td>
                    <td className="px-3 py-2 text-center">{r.groupe}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.taux}%</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fcfa(r.montantTotal)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fcfa(r.montantTaxable)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fcfa(r.montantTaxe)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-500">Aucune facture certifiée sur la période.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Nombre de factures par type</h3>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100"><tr><th className="px-3 py-2 text-left font-medium">Type</th><th className="px-3 py-2 text-right font-medium">Nombre</th><th className="px-3 py-2 text-right font-medium">Total</th></tr></thead>
              <tbody>
                {report.parType.map((t) => (
                  <tr key={t.type} className="border-t border-slate-100">
                    <td className="px-3 py-2">{t.type}{t.estAvoir ? ' (avoir)' : ''}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{t.nombre}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fcfa(t.montantTotal)}</td>
                  </tr>
                ))}
                {!report.parType.length && <tr><td colSpan={3} className="px-3 py-4 text-center text-slate-500">—</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Totaux par mode de paiement</h3>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100"><tr><th className="px-3 py-2 text-left font-medium">Mode</th><th className="px-3 py-2 text-right font-medium">Montant</th></tr></thead>
              <tbody>
                {report.parPaiement.map((p) => (
                  <tr key={p.mode} className="border-t border-slate-100"><td className="px-3 py-2">{p.libelle}</td><td className="px-3 py-2 text-right tabular-nums">{fcfa(p.montant)}</td></tr>
                ))}
                {!report.parPaiement.length && <tr><td colSpan={2} className="px-3 py-4 text-center text-slate-500">—</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Total taxable net (HT)" value={fcfa(report.totaux.montantTaxableNet)} />
        <Kpi label="Total taxe nette (TVA)" value={fcfa(report.totaux.montantTaxeNet)} />
        <Kpi label="Total net (TTC)" value={fcfa(report.totaux.montantTotalNet)} />
      </div>
    </div>
  );
}

function ArticlePreview({ report }: { report: ArticleReport }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Kpi label="Période" value={<span className="text-sm">{new Date(report.debut).toLocaleDateString('fr-FR')} → {new Date(report.fin).toLocaleDateString('fr-FR')}</span>} />
        <Kpi label="Articles" value={report.nombreArticles} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Code</th>
              <th className="px-3 py-2 text-left font-medium">Désignation</th>
              <th className="px-3 py-2 text-right font-medium">Prix unit.</th>
              <th className="px-3 py-2 text-right font-medium">Taux</th>
              <th className="px-3 py-2 text-right font-medium">Vendue</th>
              <th className="px-3 py-2 text-right font-medium">Retournée</th>
              <th className="px-3 py-2 text-right font-medium">En stock</th>
            </tr>
          </thead>
          <tbody>
            {report.articles.length ? (
              report.articles.map((a, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2">{a.code}</td>
                  <td className="px-3 py-2">{a.nom}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fcfa(a.prixUnitaire)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{a.tauxImpot}%</td>
                  <td className="px-3 py-2 text-right tabular-nums">{a.quantiteVendue}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{a.quantiteRetournee}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{a.quantiteStock === null ? '—' : a.quantiteStock}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={7} className="px-3 py-4 text-center text-slate-500">Aucun article vendu sur la période.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ZHistorique { id: string; numero: number; debut: string; fin: string; genereePar: string; dateCreation: string }

export default function ReportsManagement() {
  const [tab, setTab] = useState<Tab>('x');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // X
  const [xMode, setXMode] = useState<'quotidien' | 'periode'>('quotidien');
  const [xDebut, setXDebut] = useState('');
  const [xFin, setXFin] = useState('');
  const [xReport, setXReport] = useState<SalesReport | null>(null);

  // Z
  const [zPreview, setZPreview] = useState<SalesReport | null>(null);
  const [zHistorique, setZHistorique] = useState<ZHistorique[]>([]);
  const [confirmZ, setConfirmZ] = useState(false);
  const [closing, setClosing] = useState(false);

  // A
  const [aDebut, setADebut] = useState('');
  const [aFin, setAFin] = useState('');
  const [aReport, setAReport] = useState<ArticleReport | null>(null);

  const loadZ = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [preview, historique] = await Promise.all([
        fetchJson<SalesReport>('/api/rapports/z'),
        fetchJson<ZHistorique[]>('/api/rapports/z/historique'),
      ]);
      setZPreview(preview); setZHistorique(historique);
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (tab === 'z' && !zPreview) void loadZ(); }, [tab, zPreview, loadZ]);

  const generateX = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ mode: xMode });
      if (xMode === 'periode') { params.set('debut', new Date(xDebut).toISOString()); params.set('fin', new Date(xFin + 'T23:59:59').toISOString()); }
      setXReport(await fetchJson<SalesReport>(`/api/rapports/x?${params}`));
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    finally { setLoading(false); }
  };

  const generateA = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (aDebut) params.set('debut', new Date(aDebut).toISOString());
      if (aFin) params.set('fin', new Date(aFin + 'T23:59:59').toISOString());
      setAReport(await fetchJson<ArticleReport>(`/api/rapports/a?${params}`));
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    finally { setLoading(false); }
  };

  const doCloseZ = async () => {
    setClosing(true); setError('');
    try {
      const report = await fetchJson<SalesReport>('/api/rapports/z', { method: 'POST' });
      setConfirmZ(false);
      printSalesReport(report);
      await loadZ();
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur.'); }
    finally { setClosing(false); }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'x', label: 'X-rapport' },
    { id: 'z', label: 'Z-rapport (clôture)' },
    { id: 'a', label: 'A-rapport (articles)' },
  ];

  return (
    <div className="space-y-6">
      <ModuleHeading icon={FileBarChart2} title="Rapports fiscaux" description="Rapports X, Z et A conformes aux exigences SFE de la DGI, imprimables pour l’homologation." />

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setError(''); }}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${tab === t.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <Notice message={error} />}

      {tab === 'x' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Portée</span>
              <select value={xMode} onChange={(e) => setXMode(e.target.value as 'quotidien' | 'periode')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="quotidien">Quotidien (depuis le dernier Z)</option>
                <option value="periode">Période choisie</option>
              </select>
            </label>
            {xMode === 'periode' && (
              <>
                <label className="text-sm"><span className="mb-1 block text-slate-600">Du</span><input type="date" value={xDebut} onChange={(e) => setXDebut(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
                <label className="text-sm"><span className="mb-1 block text-slate-600">Au</span><input type="date" value={xFin} onChange={(e) => setXFin(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
              </>
            )}
            <Button onClick={generateX} loading={loading} disabled={xMode === 'periode' && (!xDebut || !xFin)}>Générer</Button>
            {xReport && <Button variant="outline" onClick={() => printSalesReport(xReport)}><Printer size={16} className="mr-1" />Imprimer</Button>}
          </div>
          {xReport && <SalesPreview report={xReport} />}
        </div>
      )}

      {tab === 'z' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="flex-1 text-sm text-amber-800">
              Le Z-rapport <strong>clôture définitivement</strong> la période en cours et devient le point de départ du prochain X quotidien et du prochain Z. Vérifiez l’aperçu avant de clôturer.
            </p>
            <Button variant="outline" onClick={loadZ} loading={loading}><RefreshCw size={16} className="mr-1" />Rafraîchir</Button>
            <Button variant="danger" onClick={() => setConfirmZ(true)} disabled={!zPreview}><Lock size={16} className="mr-1" />Clôturer la période (Z)</Button>
          </div>
          {zPreview && (
            <>
              <p className="text-sm text-slate-600">Prochaine clôture : <strong>Z n° {zPreview.numeroZ}</strong>{zPreview.dernierZ ? ` · dernier Z n° ${zPreview.dernierZ.numero} le ${dt(zPreview.dernierZ.fin)}` : ' · aucune clôture antérieure'}</p>
              <SalesPreview report={zPreview} />
            </>
          )}
          {zHistorique.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">Historique des clôtures Z</h3>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100"><tr><th className="px-3 py-2 text-left font-medium">N°</th><th className="px-3 py-2 text-left font-medium">Période</th><th className="px-3 py-2 text-left font-medium">Clôturée par</th></tr></thead>
                  <tbody>
                    {zHistorique.map((z) => (
                      <tr key={z.id} className="border-t border-slate-100"><td className="px-3 py-2">{z.numero}</td><td className="px-3 py-2">{dt(z.debut)} → {dt(z.fin)}</td><td className="px-3 py-2">{z.genereePar}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'a' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <label className="text-sm"><span className="mb-1 block text-slate-600">Du (optionnel)</span><input type="date" value={aDebut} onChange={(e) => setADebut(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <label className="text-sm"><span className="mb-1 block text-slate-600">Au (optionnel)</span><input type="date" value={aFin} onChange={(e) => setAFin(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
            <Button onClick={generateA} loading={loading}>Générer</Button>
            {aReport && <Button variant="outline" onClick={() => printArticleReport(aReport)}><Printer size={16} className="mr-1" />Imprimer</Button>}
          </div>
          {aReport && <ArticlePreview report={aReport} />}
        </div>
      )}

      <Modal isOpen={confirmZ} onClose={() => setConfirmZ(false)} title="Clôturer la période (Z-rapport)" size="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Cette action enregistre une clôture Z <strong>irréversible</strong>. La période en cours sera figée et le rapport sera imprimé.
            {zPreview && <> Elle couvre {zPreview.nombreFactures} facture(s) pour un total net de <strong>{fcfa(zPreview.totaux.montantTotalNet)}</strong>.</>}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmZ(false)} disabled={closing}>Annuler</Button>
            <Button variant="danger" onClick={doCloseZ} loading={closing}>Confirmer la clôture</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
