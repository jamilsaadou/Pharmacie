'use client';

import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Bell, Search } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { usePharmacieData } from '@/hooks/usePharmacieData';
import { formatDate } from '@/utils';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Alerte } from '@/types';

export default function AlertsManagement() {
  const { alertes } = usePharmacieData();

  // Construit une clé stable indépendante de l'ID (qui est regénéré).
  const buildStableKey = (a: Alerte) => `${a.type}:${a.medicament.id}`;

  // Liste des alertes marquées comme lues (stockées par clé stable)
  const [readKeys, setReadKeys] = useLocalStorage<string[]>('alertesLuesKeys', []);

  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<'all' | 'stock_faible' | 'expiration' | 'rupture'>('all');
  const [showOnlyUnread, setShowOnlyUnread] = React.useState(false);

  const alertesAvecEtat = useMemo(() => {
    return alertes.map(a => ({
      ...a,
      lue: readKeys.includes(buildStableKey(a)) || a.lue,
    }));
  }, [alertes, readKeys]);

  const filtered = useMemo(() => {
    return alertesAvecEtat.filter(a => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (showOnlyUnread && a.lue) return false;
      if (search) {
        const term = search.toLowerCase();
        const hay = `${a.medicament.nom} ${a.message} ${a.type} ${a.priorite}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [alertesAvecEtat, search, typeFilter, showOnlyUnread]);

  const counts = useMemo(() => {
    return {
      total: alertesAvecEtat.length,
      unread: alertesAvecEtat.filter(a => !a.lue).length,
      stock: alertesAvecEtat.filter(a => a.type === 'stock_faible').length,
      expiration: alertesAvecEtat.filter(a => a.type === 'expiration').length,
      rupture: alertesAvecEtat.filter(a => a.type === 'rupture').length,
    };
  }, [alertesAvecEtat]);

  const markAsRead = (a: Alerte) => {
    const key = buildStableKey(a);
    if (!readKeys.includes(key)) setReadKeys([...readKeys, key]);
  };

  const markAllAsRead = () => {
    const allKeys = Array.from(new Set(alertesAvecEtat.map(buildStableKey)));
    setReadKeys(allKeys);
  };

  const clearRead = () => setReadKeys([]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertes</h1>
          <p className="text-gray-600 mt-1">Suivez les alertes de stock, d'expiration et de rupture</p>
        </div>
        <div className="mt-2 sm:mt-0 flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={markAllAsRead} className="shadow-sm">
            <CheckCircle2 size={16} className="mr-2" />
            Tout marquer comme lu
          </Button>
          <Button variant="ghost" onClick={clearRead}>
            Réinitialiser
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filtres</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <Input
              label="Recherche"
              placeholder="Rechercher une alerte..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search size={16} />}
            />
            <Select
              label="Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
            >
              <option value="all">Tous les types</option>
              <option value="stock_faible">Stock faible</option>
              <option value="expiration">Expiration</option>
              <option value="rupture">Rupture</option>
            </Select>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Statut</label>
              <label className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 h-10 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showOnlyUnread}
                  onChange={(e) => setShowOnlyUnread(e.target.checked)}
                  className="rounded border-emerald-200 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Afficher seulement non lues</span>
              </label>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Résumé</label>
              <div className="flex items-center justify-end h-10">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1 text-xs font-medium">
                  <Bell size={14} className="text-emerald-600" />
                  {counts.unread} non lues / {counts.total} total
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Stock faible</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{counts.stock}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 ring-1 ring-orange-100 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Expiration</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{counts.expiration}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Ruptures</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{counts.rupture}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des alertes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Alertes actives</h3>
            <span className="text-xs font-medium text-gray-500">{filtered.length} résultat(s)</span>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((a) => (
                <div
                  key={`${a.type}-${a.medicament.id}`}
                  className={`flex items-start space-x-3 p-4 rounded-xl border ${
                    a.type === 'expiration'
                      ? 'bg-red-50/70 border-red-100'
                      : a.type === 'rupture'
                        ? 'bg-rose-50/70 border-rose-100'
                        : 'bg-yellow-50/70 border-yellow-100'
                  }`}
                >
                  <AlertTriangle
                    size={18}
                    className={`mt-0.5 flex-shrink-0 ${
                      a.type === 'expiration'
                        ? 'text-red-600'
                        : a.type === 'rupture'
                          ? 'text-rose-600'
                          : 'text-yellow-600'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {a.medicament.nom}
                      </p>
                      <span
                        className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${
                          a.priorite === 'haute'
                            ? 'bg-red-200 text-red-800'
                            : 'bg-yellow-200 text-yellow-800'
                        }`}
                      >
                        {a.priorite === 'haute' ? 'Priorité haute' : 'Priorité moyenne'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 mt-1">{a.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(a.date)}</p>
                  </div>
                  <div className="flex items-center gap-2 self-start pt-0.5">
                    {!a.lue ? (
                      <Button size="sm" variant="secondary" onClick={() => markAsRead(a)}>
                        Marquer lu
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-500 flex items-center">
                        <CheckCircle2 size={14} className="mr-1 text-emerald-600" /> Lu
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
              <p>Aucune alerte trouvée</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
