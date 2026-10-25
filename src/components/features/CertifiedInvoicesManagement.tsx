'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { BadgeCheck, Calendar, Eye, FileText, Printer, RefreshCw, Search, UserRound } from 'lucide-react';

interface VenteItem {
  id: string;
  quantite: number;
  prixUnitaire: number;
  remise: number;
  sousTotal: number;
  libelle?: string | null;
  code?: string | null;
  medicament: {
    id: string;
    nom: string;
    code?: string;
  } | null;
}

interface FactureCertifiee {
  id: string;
  numeroFacture: string;
  uid: string;
  codeSECeFDGI: string;
  qrCode: string;
  counters: string;
  typeFacture: string;
  dateTimeCertification: string;
  dateCreation: string;
  isbGroup?: string | null;
  vente: {
    id: string;
    numeroFacture: string;
    date: string;
    total: number;
    vendeur: string;
    modePaiement: string;
    client: {
      id: string;
      nom: string;
      prenom: string;
      telephone?: string;
      nif?: string;
    } | null;
    items: VenteItem[];
    itemsCount: number;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CertifiedInvoicesManagementProps {
  filterIsb?: boolean;
  showIsbColumn?: boolean;
  titleOverride?: string;
  descriptionOverride?: string;
}

const TYPE_META: Record<string, { label: string; shortLabel: string; badge: string }> = {
  FV: { label: 'Facture de Vente', shortLabel: 'Vente', badge: 'border-emerald-200/70 bg-emerald-50 text-emerald-700' },
  FT: { label: "Facture d'Acompte", shortLabel: 'Acompte', badge: 'border-amber-200/70 bg-amber-50 text-amber-700' },
  FA: { label: "Facture d'Avoir", shortLabel: 'Avoir', badge: 'border-rose-200/70 bg-rose-50 text-rose-700' },
  EV: { label: "Facture d'Exportation", shortLabel: 'Export', badge: 'border-sky-200/70 bg-sky-50 text-sky-700' },
  ET: { label: "Facture d'Acompte Export", shortLabel: 'Acompte Exp.', badge: 'border-indigo-200/70 bg-indigo-50 text-indigo-700' },
  EA: { label: "Facture d'Avoir Export", shortLabel: 'Avoir Exp.', badge: 'border-purple-200/70 bg-purple-50 text-purple-700' },
};

const moneyFormatter = new Intl.NumberFormat('fr-FR');

const formatMoney = (value?: number) => moneyFormatter.format(value ?? 0);

const formatShortCode = (code?: string) => {
  if (!code) return '—';
  if (code.length <= 12) return code;
  return `${code.slice(0, 8)}…${code.slice(-4)}`;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const ISB_RATES: Record<string, number> = { A: 2, B: 5 };

const formatIsbLabel = (group?: string | null) => {
  if (!group) return '—';
  const rate = ISB_RATES[group];
  return rate ? `${group} (${rate}%)` : `${group} (taux config)`;
};

export function CertifiedInvoicesManagement({
  filterIsb = false,
  showIsbColumn = false,
  titleOverride,
  descriptionOverride,
}: CertifiedInvoicesManagementProps) {
  const [factures, setFactures] = useState<FactureCertifiee[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedFacture, setSelectedFacture] = useState<FactureCertifiee | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const stats = useMemo(() => {
    const totalAmount = factures.reduce((sum, facture) => sum + (facture.vente?.total ?? 0), 0);
    const avoirCount = factures.filter((facture) => facture.typeFacture === 'FA' || facture.typeFacture === 'EA').length;
    const isbCount = factures.filter((facture) => facture.isbGroup).length;
    const today = new Date();
    const todayCount = factures.filter((facture) => {
      if (!facture.dateTimeCertification) return false;
      return isSameDay(new Date(facture.dateTimeCertification), today);
    }).length;

    return { totalAmount, avoirCount, todayCount, isbCount };
  }, [factures]);

  useEffect(() => {
    loadFactures();
  }, [pagination.page, search, dateFrom, dateTo, filterIsb]);

  const loadFactures = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search) params.append('search', search);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      if (filterIsb) params.append('isbOnly', '1');
      const response = await fetch(`/api/invoice/certified?${params}`);
      const data = await response.json();

      if (data.success) {
        setFactures(data.factures);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des factures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadFactures();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeLabel = (type: string) => {
    return TYPE_META[type]?.label || type;
  };

  const getTypeShortLabel = (type: string) => {
    return TYPE_META[type]?.shortLabel || getTypeLabel(type);
  };

  const getTypeBadge = (type: string) => {
    return TYPE_META[type]?.badge || 'border-slate-200/70 bg-slate-50 text-slate-700';
  };

  const showDetails = (facture: FactureCertifiee) => {
    setSelectedFacture(facture);
    setShowDetailModal(true);
  };

  const handlePrint = async (facture: FactureCertifiee) => { const { printStoredCertifiedInvoice } = await import('@/utils/printCertifiedInvoice'); await printStoredCertifiedInvoice(facture.id, true, true); };

  return (
    <div className="certified-page relative space-y-6">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        .certified-page {
          font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
        }
        .certified-title {
          font-family: 'Fraunces', 'Georgia', serif;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 right-[-6rem] h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-40 -left-16 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute bottom-[-6rem] right-12 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      <div className="relative space-y-6">
        {/* En-tête */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-600">
              Registre certifié
            </span>
            <h1 className="certified-title text-3xl sm:text-4xl text-slate-900">
              {titleOverride || 'Factures certifiées'}
            </h1>
            <p className="text-sm text-slate-600">
              {descriptionOverride || 'Historique des factures certifiées par e-SECeF.'}
              <span className="ml-2 font-semibold text-slate-900">{pagination.total}</span>
              <span className="ml-1">factures enregistrées.</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={loadFactures} disabled={loading} variant="secondary" className="gap-2">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total certifié</p>
                <p className="text-2xl font-semibold text-slate-900">{pagination.total}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <BadgeCheck size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Montant certifié</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {formatMoney(stats.totalAmount)} FCFA
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                <FileText size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Certifiées aujourd&apos;hui</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.todayCount}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Avoirs: {stats.avoirCount}{showIsbColumn ? ` • ISB: ${stats.isbCount}` : ''}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Calendar size={20} />
              </div>
            </div>
          </Card>
        </div>

        {/* Filtres de recherche */}
        <Card className="p-4">
          <form onSubmit={handleSearch} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par N° facture, code SECeF ou UID..."
                className="w-full rounded-full border border-slate-200/80 bg-white/90 px-10 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-full border border-slate-200/80 bg-white/90 px-9 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-full border border-slate-200/80 bg-white/90 px-9 py-2 text-sm text-slate-700 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <Button type="submit" className="gap-2">
              <Search size={16} />
              Rechercher
            </Button>
          </form>
        </Card>

        {/* Liste des factures */}
        <Card className="p-0">
          <div className="flex flex-col gap-2 border-b border-slate-200/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Dernières factures</h2>
              <p className="text-xs text-slate-500">Affichage des factures certifiées les plus récentes.</p>
            </div>
            <div className="text-xs text-slate-500">
              Page {pagination.page} sur {pagination.totalPages || 1}
            </div>
          </div>

          {/* Mobile cards */}
          <div className="xl:hidden p-4 space-y-3">
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-500">Chargement...</div>
            ) : factures.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                <FileText className="mx-auto mb-2 text-slate-300" size={32} />
                Aucune facture certifiée trouvée
              </div>
            ) : (
              factures.map((facture) => (
                <div
                  key={facture.id}
                  className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.6)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-400">N° Facture</p>
                      <p className="text-lg font-semibold text-slate-900">{facture.numeroFacture}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${getTypeBadge(
                        facture.typeFacture
                      )}`}
                    >
                      {getTypeShortLabel(facture.typeFacture)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div>
                      <p className="text-xs text-slate-400">Date</p>
                      <p className="font-medium text-slate-800">{formatDate(facture.dateTimeCertification)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Montant</p>
                      <p className="font-semibold text-slate-900">
                        {formatMoney(facture.vente?.total)} FCFA
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Client</p>
                      <p className="font-medium text-slate-800">
                        {facture.vente?.client
                          ? `${facture.vente.client.nom} ${facture.vente.client.prenom}`
                          : 'Client anonyme'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Code SECeF/DGI</p>
                      <p className="font-mono text-xs text-slate-700" title={facture.codeSECeFDGI}>
                        {formatShortCode(facture.codeSECeFDGI)}
                      </p>
                    </div>
                    {showIsbColumn && (
                      <div>
                        <p className="text-xs text-slate-400">ISB</p>
                        <p className="font-medium text-slate-800">{formatIsbLabel(facture.isbGroup)}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => showDetails(facture)} variant="secondary" size="sm" className="flex-1 gap-2">
                      <Eye size={14} />
                      Détails
                    </Button>
                    <Button onClick={() => handlePrint(facture)} variant="outline" size="sm" className="flex-1 gap-2">
                      <Printer size={14} />
                      Imprimer
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div tabIndex={0} role="region" aria-label="Tableau de données à défilement horizontal" className="ph-table-scroll hidden xl:block px-4 pb-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-xs uppercase tracking-widest text-slate-400">
                  <th className="px-4 py-2 text-left">N° Facture</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Client</th>
                  <th className="px-4 py-2 text-left">Montant</th>
                  {showIsbColumn && <th className="px-4 py-2 text-left">ISB</th>}
                  <th className="px-4 py-2 text-left">Code SECeF/DGI</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={showIsbColumn ? 8 : 7} className="px-6 py-8 text-center text-sm text-slate-500">
                      Chargement...
                    </td>
                  </tr>
                ) : factures.length === 0 ? (
                  <tr>
                    <td colSpan={showIsbColumn ? 8 : 7} className="px-6 py-8 text-center text-sm text-slate-500">
                      Aucune facture certifiée trouvée
                    </td>
                  </tr>
                ) : (
                  factures.map((facture) => (
                    <tr
                      key={facture.id}
                      className="bg-white/90 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.6)] ring-1 ring-slate-200/70"
                    >
                      <td className="rounded-l-2xl px-4 py-3 text-sm font-semibold text-slate-900">
                        {facture.numeroFacture}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${getTypeBadge(
                            facture.typeFacture
                          )}`}
                        >
                          {getTypeShortLabel(facture.typeFacture)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(facture.dateTimeCertification)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {facture.vente?.client
                          ? `${facture.vente.client.nom} ${facture.vente.client.prenom}`
                          : 'Client anonyme'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {formatMoney(facture.vente?.total)} FCFA
                      </td>
                      {showIsbColumn && (
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatIsbLabel(facture.isbGroup)}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-600" title={facture.codeSECeFDGI}>
                          {formatShortCode(facture.codeSECeFDGI)}
                        </span>
                      </td>
                      <td className="rounded-r-2xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button onClick={() => showDetails(facture)} variant="ghost" size="sm" className="gap-2">
                            <Eye size={14} />
                            Détails
                          </Button>
                          <Button onClick={() => handlePrint(facture)} variant="outline" size="sm" className="gap-2">
                            <Printer size={14} />
                            Imprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-slate-200/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500">
                Page {pagination.page} sur {pagination.totalPages} ({pagination.total} factures)
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                  variant="secondary"
                  size="sm"
                >
                  Précédent
                </Button>
                <Button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  variant="secondary"
                  size="sm"
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Modal Détails */}
        {selectedFacture && (
          <Modal
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedFacture(null);
            }}
            title={`Facture Certifiée - ${selectedFacture.numeroFacture}`}
          >
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <BadgeCheck size={18} />
                      <h4 className="font-semibold">Certification e-SECeF</h4>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-slate-400">Code SECeF/DGI</span>
                        <p className="mt-1 rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-700 break-all">
                          {selectedFacture.codeSECeFDGI}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs uppercase tracking-wider text-slate-400">UID</span>
                        <p className="mt-1 rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-700 break-all">
                          {selectedFacture.uid}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Compteurs</span>
                        <span className="font-semibold text-slate-800">{selectedFacture.counters}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Date certification</span>
                        <span>{formatDate(selectedFacture.dateTimeCertification)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <FileText size={16} />
                      <h4 className="font-semibold">Informations générales</h4>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Type</span>
                        <span className="font-semibold text-slate-800">{getTypeLabel(selectedFacture.typeFacture)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Vendeur</span>
                        <span>{selectedFacture.vente?.vendeur || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Mode de paiement</span>
                        <span>{selectedFacture.vente?.modePaiement || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Articles</span>
                        <span>{selectedFacture.vente?.itemsCount || 0}</span>
                      </div>
                      {showIsbColumn && (
                        <div className="flex items-center justify-between">
                          <span>ISB</span>
                          <span>{formatIsbLabel(selectedFacture.isbGroup)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                        <span>Total TTC</span>
                        <span>{formatMoney(selectedFacture.vente?.total)} FCFA</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedFacture.vente?.client && (
                    <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4">
                      <div className="flex items-center gap-2 text-slate-700">
                        <UserRound size={16} />
                        <h4 className="font-semibold">Client</h4>
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <div className="flex items-center justify-between">
                          <span>Nom</span>
                          <span className="font-semibold text-slate-800">
                            {selectedFacture.vente.client.nom} {selectedFacture.vente.client.prenom}
                          </span>
                        </div>
                        {selectedFacture.vente.client.telephone && (
                          <div className="flex items-center justify-between">
                            <span>Téléphone</span>
                            <span>{selectedFacture.vente.client.telephone}</span>
                          </div>
                        )}
                        {selectedFacture.vente.client.nif && (
                          <div className="flex items-center justify-between">
                            <span>NIF</span>
                            <span className="font-mono text-slate-700">{selectedFacture.vente.client.nif}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4">
                    <h4 className="font-semibold text-slate-700">Code QR</h4>
                    <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
                      <p className="font-mono text-xs text-slate-600 break-all">{selectedFacture.qrCode}</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedFacture.vente?.items && selectedFacture.vente.items.length > 0 && (
                <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4">
                  <h4 className="font-semibold text-slate-700 mb-3">Articles</h4>
                  <div tabIndex={0} role="region" aria-label="Tableau de données à défilement horizontal" className="ph-table-scroll overflow-x-auto rounded-xl border border-slate-200/60">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="px-3 py-2 text-left">Article</th>
                          <th className="px-3 py-2 text-right">Qté</th>
                          <th className="px-3 py-2 text-right">Prix</th>
                          <th className="px-3 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedFacture.vente.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2">{item.medicament?.nom || item.libelle || 'Article'}</td>
                            <td className="px-3 py-2 text-right">{item.quantite}</td>
                            <td className="px-3 py-2 text-right">{formatMoney(item.prixUnitaire)}</td>
                            <td className="px-3 py-2 text-right font-semibold">{formatMoney(item.sousTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-emerald-50/60">
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-right font-semibold text-slate-700">
                            TOTAL TTC:
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-700">
                            {formatMoney(selectedFacture.vente.total)} FCFA
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-slate-200/70 pt-4 sm:flex-row">
                <Button onClick={() => handlePrint(selectedFacture)} variant="primary" className="flex-1 gap-2">
                  <Printer size={16} />
                  Imprimer la facture
                </Button>
                <Button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedFacture(null);
                  }}
                  variant="secondary"
                >
                  Fermer
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
