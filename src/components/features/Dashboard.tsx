'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  BarChart3,
  Activity
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { usePharmacieData } from '@/hooks/usePharmacieData';
import { formatPrice, formatDate } from '@/utils';

export default function Dashboard() {
  const [isHydrated, setIsHydrated] = useState(false);
  
  const { 
    medicaments, 
    ventes, 
    clients, 
    alertes, 
    statistiquesVente, 
    statistiquesStock 
  } = usePharmacieData();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const ventesParJour = useMemo(() => {
    const days = 7;
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const keyForDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const data = Array.from({ length: days }).map((_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = keyForDate(date);
      return {
        key,
        date,
        label: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        total: 0,
        count: 0,
      };
    });

    const lookup = new Map(data.map(item => [item.key, item]));
    ventes.forEach(vente => {
      const dateKey = keyForDate(vente.date);
      const bucket = lookup.get(dateKey);
      if (bucket && vente.statut==='terminee' && vente.factureESECeF?.statut==='certifiee') {
        bucket.total += (['FA','EA'].includes(vente.typeFacture||'')?-1:1)*Math.abs(vente.total);
        bucket.count += 1;
      }
    });

    const maxTotal = Math.max(1, ...data.map(item => item.total));
    const maxCount = Math.max(1, ...data.map(item => item.count));
    const totalWeek = data.reduce((sum, item) => sum + item.total, 0);
    const totalCount = data.reduce((sum, item) => sum + item.count, 0);

    const points = data.map((item, index) => {
      const x = (index / (days - 1)) * 100;
      const y = 100 - (item.count / maxCount) * 100;
      return { x, y };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
    const areaPath = `${linePath} L 100 100 L 0 100 Z`;

    return {
      data,
      maxTotal,
      maxCount,
      totalWeek,
      totalCount,
      linePath,
      areaPath,
      points,
      startLabel: data[0]?.label ?? '',
      endLabel: data[data.length - 1]?.label ?? '',
    };
  }, [ventes]);

  // Afficher un état de chargement pendant l'hydratation
  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="text-gray-600 mt-1">Chargement...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="fade-in">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Ventes du jour',
      value: formatPrice(statistiquesVente.ventesDuJour),
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      trend: 'Montant net validé',
      trendUp: true,
    },
    {
      title: 'Médicaments en stock',
      value: statistiquesStock.totalMedicaments.toString(),
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: 'Catalogue actif',
      trendUp: true,
    },
    {
      title: 'Clients enregistrés',
      value: clients.length.toString(),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      trend: 'Fiches enregistrées',
      trendUp: true,
    },
    {
      title: 'Alertes actives',
      value: alertes.length.toString(),
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      trend: 'Contrôles à effectuer',
      trendUp: false,
    },
  ];

  const ventesRecentes = [...ventes].sort((a,b)=>b.date.getTime()-a.date.getTime()).slice(0,5);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Vue d'ensemble de votre pharmacie - {formatDate(new Date())}
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
          <Calendar size={14} className="sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}</span>
          <span className="sm:hidden">{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="fade-in p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Ventes par jour</h3>
              <p className="text-sm text-gray-600">Ventes certifiées nettes des avoirs · 7 derniers jours</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 flex items-center justify-center">
              <BarChart3 size={18} />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-end gap-2 h-28">
              {ventesParJour.data.map((day) => (
                <div key={day.key} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full h-24 rounded-lg bg-emerald-50/70 flex items-end overflow-hidden">
                    <div
                      className="w-full rounded-lg bg-emerald-500/80"
                      style={{ height: `${(day.total / ventesParJour.maxTotal) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] uppercase text-gray-500">{day.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>{ventesParJour.startLabel}</span>
              <span className="font-medium text-gray-700">{formatPrice(ventesParJour.totalWeek)} total</span>
              <span>{ventesParJour.endLabel}</span>
            </div>
          </div>
        </Card>

        <Card className="fade-in p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Fréquence des ventes</h3>
              <p className="text-sm text-gray-600">Nombre de transactions par jour</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 flex items-center justify-center">
              <Activity size={18} />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-28 w-full">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <defs>
                  <linearGradient id="salesLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(59, 130, 246, 0.35)" />
                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                  </linearGradient>
                </defs>
                <path d={ventesParJour.areaPath} fill="url(#salesLine)" stroke="none" />
                <path d={ventesParJour.linePath} fill="none" stroke="rgba(59, 130, 246, 0.9)" strokeWidth="2" />
                {ventesParJour.points.map((point, index) => (
                  <circle key={index} cx={point.x} cy={point.y} r="2.2" fill="rgba(59, 130, 246, 0.9)" />
                ))}
              </svg>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>{ventesParJour.startLabel}</span>
              <span className="font-medium text-gray-700">
                {ventesParJour.totalCount} ventes / {ventesParJour.data.length} jours
              </span>
              <span>{ventesParJour.endLabel}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="fade-in">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    <div className="flex items-center mt-2">
                      {stat.trendUp ? (
                        <TrendingUp size={16} className="text-emerald-600 mr-1" />
                      ) : (
                        <TrendingDown size={16} className="text-red-600 mr-1" />
                      )}
                      <span className={`text-sm font-medium ${
                        stat.trendUp ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {stat.trend}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">vs hier</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon size={24} className={stat.color} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventes récentes */}
        <Card className="fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Ventes récentes</h3>
              <ShoppingCart size={20} className="text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            {ventesRecentes.length > 0 ? (
              <div className="space-y-4">
                {ventesRecentes.map((vente) => (
                  <div key={vente.id} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">#{vente.numeroFacture}</p>
                      <p className="text-sm text-gray-600">
                        {vente.client ? `${vente.client.prenom} ${vente.client.nom}` : 'Client anonyme'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(vente.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-600">
                        {formatPrice(vente.total)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {vente.items.length} article{vente.items.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                <p>Aucune vente récente</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertes stock */}
        <Card className="fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Alertes stock</h3>
              <AlertTriangle size={20} className="text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            {alertes.length > 0 ? (
              <div className="space-y-4">
                {alertes.slice(0, 5).map((alerte) => (
                  <div key={alerte.id} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg border border-red-100">
                    <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">
                        {alerte.medicament.nom}
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        {alerte.message}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      alerte.priorite === 'haute' 
                        ? 'bg-red-200 text-red-800'
                        : 'bg-yellow-200 text-yellow-800'
                    }`}>
                      {alerte.priorite}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package size={48} className="mx-auto mb-4 opacity-50" />
                <p>Aucune alerte stock</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Médicaments les plus vendus */}
      <Card className="fade-in">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Médicaments les plus vendus</h3>
        </CardHeader>
        <CardContent>
          {statistiquesVente.medicamentsPlusVendus.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statistiquesVente.medicamentsPlusVendus.map((item, index) => (
                <div key={item.medicament.id} className="flex items-center space-x-3 p-4 bg-emerald-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">#{index + 1}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {item.medicament.photo ? (
                      <img
                        src={item.medicament.photo}
                        alt={item.medicament.nom}
                        className="w-10 h-10 rounded-lg object-cover border border-emerald-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Package size={16} className="text-emerald-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.medicament.nom}</p>
                    <p className="text-sm text-gray-600">{item.quantiteVendue} unités vendues</p>
                    <p className="text-xs text-emerald-600 font-medium">
                      {formatPrice(item.medicament.prix * item.quantiteVendue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
              <p>Aucune donnée de vente disponible</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
