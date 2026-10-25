'use client';

import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Calendar,
  Filter,
  Package,
  MapPin,
  ArrowRightLeft,
  PieChart,
  Activity,
  ShoppingCart,
  DollarSign,
  Wallet
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Rayon, MedicamentRayon, TransfertRayon, Medicament } from '@/types';
import { cn, formatPrice } from '@/utils';
import { usePharmacieData } from '@/hooks/usePharmacieData';

interface StatistiquesRayonsProps {
  rayons: Rayon[];
  medicamentsRayons: MedicamentRayon[];
  transferts: TransfertRayon[];
  medicaments: Medicament[];
}

interface FiltresStatistiques {
  periode: 'jour' | 'semaine' | 'mois' | 'trimestre' | 'annee' | 'personnalisee';
  dateDebut?: string;
  dateFin?: string;
  rayonId?: string;
  medicamentId?: string;
  typeTransfert?: TransfertRayon['typeTransfert'] | 'tous';
}

export default function StatistiquesRayons({ 
  rayons, 
  medicamentsRayons, 
  transferts, 
  medicaments 
}: StatistiquesRayonsProps) {
  const { ventes } = usePharmacieData();
  const [filtres, setFiltres] = useState<FiltresStatistiques>({
    periode: 'mois',
    typeTransfert: 'tous'
  });

  // Calcul des dates selon la période
  const dateRange = useMemo(() => {
    const aujourd = new Date();
    let dateDebut: Date;
    let dateFin = new Date(aujourd);

    switch (filtres.periode) {
      case 'jour':
        dateDebut = new Date(aujourd);
        dateDebut.setHours(0, 0, 0, 0);
        break;
      case 'semaine':
        dateDebut = new Date(aujourd);
        dateDebut.setDate(aujourd.getDate() - 7);
        break;
      case 'mois':
        dateDebut = new Date(aujourd.getFullYear(), aujourd.getMonth(), 1);
        break;
      case 'trimestre':
        const trimestre = Math.floor(aujourd.getMonth() / 3);
        dateDebut = new Date(aujourd.getFullYear(), trimestre * 3, 1);
        break;
      case 'annee':
        dateDebut = new Date(aujourd.getFullYear(), 0, 1);
        break;
      case 'personnalisee':
        dateDebut = filtres.dateDebut ? new Date(filtres.dateDebut) : new Date(aujourd.getFullYear(), 0, 1);
        dateFin = filtres.dateFin ? new Date(filtres.dateFin) : aujourd;
        break;
      default:
        dateDebut = new Date(aujourd.getFullYear(), aujourd.getMonth(), 1);
    }

    return { dateDebut, dateFin };
  }, [filtres.periode, filtres.dateDebut, filtres.dateFin]);

  // Filtrage des transferts selon les critères
  const transfertsFiltres = useMemo(() => {
    return transferts.filter(transfert => {
      // Filtre par date
      const dateTransfert = new Date(transfert.date);
      if (dateTransfert < dateRange.dateDebut || dateTransfert > dateRange.dateFin) {
        return false;
      }

      // Filtre par rayon
      if (filtres.rayonId && transfert.rayonId !== filtres.rayonId) {
        return false;
      }

      // Filtre par médicament
      if (filtres.medicamentId && transfert.medicamentId !== filtres.medicamentId) {
        return false;
      }

      // Filtre par type de transfert
      if (filtres.typeTransfert && filtres.typeTransfert !== 'tous' && transfert.typeTransfert !== filtres.typeTransfert) {
        return false;
      }

      return true;
    });
  }, [transferts, dateRange, filtres]);

  const ventesFiltrees = useMemo(() => {
    return ventes.filter(vente => {
      const dateVente = new Date(vente.date);
      if (dateVente < dateRange.dateDebut || dateVente > dateRange.dateFin) {
        return false;
      }
      return true;
    });
  }, [ventes, dateRange]);

  const ventesStats = useMemo(() => {
    const start = new Date(dateRange.dateDebut);
    const end = new Date(dateRange.dateFin);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);

    const data = Array.from({ length: days }).map((_, index) => {
      const date = new Date(start.getTime() + index * dayMs);
      const key = date.toISOString().split('T')[0];
      return {
        key,
        date,
        label: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        total: 0,
        count: 0,
      };
    });

    const lookup = new Map(data.map(item => [item.key, item]));
    ventesFiltrees.forEach(vente => {
      const key = new Date(vente.date).toISOString().split('T')[0];
      const bucket = lookup.get(key);
      if (bucket) {
        bucket.total += vente.total;
        bucket.count += 1;
      }
    });

    const maxTotal = Math.max(1, ...data.map(item => item.total));
    const maxCount = Math.max(1, ...data.map(item => item.count));
    const totalRevenue = data.reduce((sum, item) => sum + item.total, 0);
    const totalTransactions = ventesFiltrees.length;
    const avgPanier = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const peakDay = data.reduce(
      (acc, item) => (item.total > acc.total ? item : acc),
      data[0] || { total: 0, label: '-' }
    );

    const denom = data.length > 1 ? data.length - 1 : 1;
    const points = data.map((item, index) => {
      const x = data.length > 1 ? (index / denom) * 100 : 50;
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
      totalRevenue,
      totalTransactions,
      avgPanier,
      peakDay,
      linePath,
      areaPath,
      points,
      startLabel: data[0]?.label ?? '',
      endLabel: data[data.length - 1]?.label ?? '',
    };
  }, [ventesFiltrees, dateRange.dateDebut, dateRange.dateFin]);

  const paiementDistribution = useMemo(() => {
    const counts = {
      especes: 0,
      carte: 0,
      cheque: 0,
      virement: 0
    };
    ventesFiltrees.forEach(vente => {
      if (vente.methodePaiement in counts) {
        counts[vente.methodePaiement as keyof typeof counts] += 1;
      }
    });
    const total = Math.max(1, ventesFiltrees.length);
    const items = [
      { id: 'especes', label: 'Espèces', value: counts.especes, color: 'emerald' },
      { id: 'carte', label: 'Carte', value: counts.carte, color: 'blue' },
      { id: 'cheque', label: 'Chèque', value: counts.cheque, color: 'amber' },
      { id: 'virement', label: 'Virement', value: counts.virement, color: 'purple' },
    ];
    return {
      total: ventesFiltrees.length,
      items: items.map(item => ({
        ...item,
        percent: Math.round((item.value / total) * 100),
      })),
    };
  }, [ventesFiltrees]);

  const topProduitsVendus = useMemo(() => {
    const map = new Map<string, { medicament: Medicament; quantite: number; total: number }>();
    ventesFiltrees.forEach(vente => {
      vente.items.forEach(item => {
        const med = item.medicament || medicaments.find(m => m.id === item.medicamentId);
        if (!med) return;
        const existing = map.get(med.id);
        if (existing) {
          existing.quantite += item.quantite;
          existing.total += item.sousTotal;
        } else {
          map.set(med.id, {
            medicament: med,
            quantite: item.quantite,
            total: item.sousTotal,
          });
        }
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 5);
  }, [ventesFiltrees, medicaments]);

  // Statistiques calculées
  const statistiques = useMemo(() => {
    const totalTransferts = transfertsFiltres.length;
    const quantiteTotaleTransferee = transfertsFiltres.reduce((sum, t) => sum + t.quantiteTransferee, 0);
    
    // Transferts par type
    const transfertsParType = {
      stock_vers_rayon: transfertsFiltres.filter(t => t.typeTransfert === 'stock_vers_rayon').length,
      rayon_vers_stock: transfertsFiltres.filter(t => t.typeTransfert === 'rayon_vers_stock').length,
      rayon_vers_rayon: transfertsFiltres.filter(t => t.typeTransfert === 'rayon_vers_rayon').length,
    };

    // Rayons les plus actifs
    const activiteParRayon = new Map<string, { rayon: Rayon; transferts: number; quantite: number }>();
    transfertsFiltres.forEach(transfert => {
      const rayon = rayons.find(r => r.id === transfert.rayonId);
      if (rayon) {
        const existing = activiteParRayon.get(transfert.rayonId);
        if (existing) {
          existing.transferts += 1;
          existing.quantite += transfert.quantiteTransferee;
        } else {
          activiteParRayon.set(transfert.rayonId, {
            rayon,
            transferts: 1,
            quantite: transfert.quantiteTransferee
          });
        }
      }
    });

    const rayonsLesPlus = Array.from(activiteParRayon.values())
      .sort((a, b) => b.transferts - a.transferts)
      .slice(0, 5);

    // Médicaments les plus transférés
    const medicamentsTransferes = new Map<string, { medicament: Medicament; transferts: number; quantite: number }>();
    transfertsFiltres.forEach(transfert => {
      const medicament = medicaments.find(m => m.id === transfert.medicamentId);
      if (medicament) {
        const existing = medicamentsTransferes.get(transfert.medicamentId);
        if (existing) {
          existing.transferts += 1;
          existing.quantite += transfert.quantiteTransferee;
        } else {
          medicamentsTransferes.set(transfert.medicamentId, {
            medicament,
            transferts: 1,
            quantite: transfert.quantiteTransferee
          });
        }
      }
    });

    const medicamentsLesPlusTransferes = Array.from(medicamentsTransferes.values())
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 5);

    // Évolution des transferts (par jour sur la période)
    const evolutionTransferts = new Map<string, number>();
    transfertsFiltres.forEach(transfert => {
      const dateStr = transfert.date.toISOString().split('T')[0];
      evolutionTransferts.set(dateStr, (evolutionTransferts.get(dateStr) || 0) + 1);
    });

    // Taux d'occupation des rayons
    const occupationRayons = rayons.map(rayon => {
      const medicamentsRayon = medicamentsRayons.filter(mr => mr.rayonId === rayon.id);
      const quantiteTotale = medicamentsRayon.reduce((sum, mr) => sum + mr.quantiteEnRayon, 0);
      const tauxOccupation = (quantiteTotale / rayon.capaciteMax) * 100;
      
      return {
        rayon,
        quantiteTotale,
        tauxOccupation,
        nombreMedicaments: medicamentsRayon.length
      };
    }).sort((a, b) => b.tauxOccupation - a.tauxOccupation);

    return {
      totalTransferts,
      quantiteTotaleTransferee,
      transfertsParType,
      rayonsLesPlus,
      medicamentsLesPlusTransferes,
      evolutionTransferts,
      occupationRayons
    };
  }, [transfertsFiltres, rayons, medicaments, medicamentsRayons]);

  const periodeLabel = useMemo(() => {
    const labels = {
      jour: "Aujourd'hui",
      semaine: '7 derniers jours',
      mois: 'Ce mois',
      trimestre: 'Ce trimestre',
      annee: 'Cette année',
      personnalisee: 'Période personnalisée'
    };
    return labels[filtres.periode] ?? 'Période';
  }, [filtres.periode]);

  const dateRangeLabel = useMemo(() => {
    const format = (date: Date) =>
      date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    const start = format(dateRange.dateDebut);
    const end = format(dateRange.dateFin);
    return start === end ? start : `${start} → ${end}`;
  }, [dateRange.dateDebut, dateRange.dateFin]);

  const evolutionSerie = useMemo(() => {
    const start = new Date(dateRange.dateDebut);
    const end = new Date(dateRange.dateFin);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);

    const data = Array.from({ length: days }).map((_, index) => {
      const date = new Date(start.getTime() + index * dayMs);
      const key = date.toISOString().split('T')[0];
      const count = statistiques.evolutionTransferts.get(key) || 0;
      return {
        date,
        label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        count,
      };
    });

    const max = Math.max(1, ...data.map(item => item.count));
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const average = total / data.length;
    const denom = data.length > 1 ? data.length - 1 : 1;

    const points = data.map((item, index) => {
      const x = data.length > 1 ? (index / denom) * 100 : 50;
      const y = 100 - (item.count / max) * 100;
      return { x, y };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
    const areaPath = `${linePath} L 100 100 L 0 100 Z`;

    return {
      data,
      max,
      total,
      average,
      linePath,
      areaPath,
      points,
      startLabel: data[0]?.label ?? '',
      endLabel: data[data.length - 1]?.label ?? ''
    };
  }, [statistiques.evolutionTransferts, dateRange.dateDebut, dateRange.dateFin]);

  const typeDistribution = useMemo(() => {
    const total = Math.max(1, statistiques.totalTransferts);
    const items = [
      {
        id: 'stock_vers_rayon',
        label: 'Stock → Rayon',
        value: statistiques.transfertsParType.stock_vers_rayon,
        bar: 'bg-emerald-500/80',
        dot: 'bg-emerald-500',
        text: 'text-emerald-700'
      },
      {
        id: 'rayon_vers_stock',
        label: 'Rayon → Stock',
        value: statistiques.transfertsParType.rayon_vers_stock,
        bar: 'bg-amber-500/80',
        dot: 'bg-amber-500',
        text: 'text-amber-700'
      },
      {
        id: 'rayon_vers_rayon',
        label: 'Rayon → Rayon',
        value: statistiques.transfertsParType.rayon_vers_rayon,
        bar: 'bg-sky-500/80',
        dot: 'bg-sky-500',
        text: 'text-sky-700'
      }
    ];
    return {
      total: statistiques.totalTransferts,
      items: items.map(item => ({
        ...item,
        percent: Math.round((item.value / total) * 100)
      }))
    };
  }, [statistiques]);

  const insights = useMemo(() => {
    const topDay = evolutionSerie.data.reduce(
      (acc, item) => (item.count > acc.count ? item : acc),
      evolutionSerie.data[0] || { label: '-', count: 0 }
    );
    const topRayon = statistiques.rayonsLesPlus[0];
    const topMedicament = statistiques.medicamentsLesPlusTransferes[0];
    return { topDay, topRayon, topMedicament };
  }, [evolutionSerie.data, statistiques.rayonsLesPlus, statistiques.medicamentsLesPlusTransferes]);

  const maxRayonTransferts = Math.max(1, ...statistiques.rayonsLesPlus.map(r => r.transferts));
  const maxMedicamentQuantite = Math.max(1, ...statistiques.medicamentsLesPlusTransferes.map(m => m.quantite));
  const maxProduitQuantite = Math.max(1, ...topProduitsVendus.map(p => p.quantite));
  const showSalesLabels = ventesStats.data.length <= 14;

  // Fonction d'export
  const exporterDonnees = (format: 'csv' | 'json') => {
    const donnees = {
      periode: filtres.periode,
      dateDebut: dateRange.dateDebut.toISOString(),
      dateFin: dateRange.dateFin.toISOString(),
      statistiques,
      transferts: transfertsFiltres.map(t => ({
        date: t.date.toISOString(),
        medicament: t.medicament?.nom,
        rayon: t.rayon?.nom,
        type: t.typeTransfert,
        quantite: t.quantiteTransferee,
        utilisateur: t.utilisateur,
        commentaire: t.commentaire
      }))
    };

    if (format === 'csv') {
      // Export CSV des transferts
      const headers = ['Date', 'Médicament', 'Rayon', 'Type', 'Quantité', 'Utilisateur', 'Commentaire'];
      const csvContent = [
        headers.join(','),
        ...donnees.transferts.map(t => [
          t.date,
          t.medicament || '',
          t.rayon || '',
          t.type,
          t.quantite,
          t.utilisateur,
          t.commentaire || ''
        ].map(field => `"${field}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `statistiques-rayons-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } else {
      // Export JSON
      const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `statistiques-rayons-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-600 font-semibold">Analytics</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Statistiques des Rayons</h1>
          <p className="text-sm text-gray-600 mt-1">
            Suivez les transferts, l’activité et l’occupation des rayons.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-3 py-1.5 text-sm text-gray-600">
            <Calendar size={14} className="text-emerald-600" />
            <span className="font-medium text-gray-800">{periodeLabel}</span>
            <span className="text-gray-500">• {dateRangeLabel}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-sm text-gray-600">
            <Activity size={14} className="text-blue-600" />
            <span>{statistiques.totalTransferts} transferts</span>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filtres et Période</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            label="Période"
            value={filtres.periode}
            onChange={(e) => setFiltres({ ...filtres, periode: e.target.value as any })}
          >
            <option value="jour">Aujourd'hui</option>
            <option value="semaine">7 derniers jours</option>
            <option value="mois">Ce mois</option>
            <option value="trimestre">Ce trimestre</option>
            <option value="annee">Cette année</option>
            <option value="personnalisee">Période personnalisée</option>
          </Select>

          {filtres.periode === 'personnalisee' && (
            <>
              <Input
                label="Date de début"
                type="date"
                value={filtres.dateDebut || ''}
                onChange={(e) => setFiltres({ ...filtres, dateDebut: e.target.value })}
              />
              <Input
                label="Date de fin"
                type="date"
                value={filtres.dateFin || ''}
                onChange={(e) => setFiltres({ ...filtres, dateFin: e.target.value })}
              />
            </>
          )}

          <Select
            label="Rayon"
            value={filtres.rayonId || ''}
            onChange={(e) => setFiltres({ ...filtres, rayonId: e.target.value || undefined })}
          >
            <option value="">Tous les rayons</option>
            {rayons.map(rayon => (
              <option key={rayon.id} value={rayon.id}>
                {rayon.nom}
              </option>
            ))}
          </Select>

          <Select
            label="Médicament"
            value={filtres.medicamentId || ''}
            onChange={(e) => setFiltres({ ...filtres, medicamentId: e.target.value || undefined })}
          >
            <option value="">Tous les médicaments</option>
            {medicaments.map(medicament => (
              <option key={medicament.id} value={medicament.id}>
                {medicament.nom}
              </option>
            ))}
          </Select>

          <Select
            label="Type de transfert"
            value={filtres.typeTransfert || 'tous'}
            onChange={(e) => setFiltres({ ...filtres, typeTransfert: e.target.value as any })}
          >
            <option value="tous">Tous les types</option>
            <option value="stock_vers_rayon">Stock → Rayon</option>
            <option value="rayon_vers_stock">Rayon → Stock</option>
            <option value="rayon_vers_rayon">Rayon → Rayon</option>
          </Select>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => exporterDonnees('csv')}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Exporter CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => exporterDonnees('json')}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Exporter JSON
          </Button>
        </div>
      </Card>

      {/* Statistiques des ventes */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShoppingCart size={20} className="text-emerald-600" />
          <h2 className="text-xl font-semibold text-gray-900">Statistiques des ventes</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatPrice(ventesStats.totalRevenue)}</p>
                <p className="text-xs text-gray-500 mt-1">{ventesStats.totalTransactions} vente(s)</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Transactions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{ventesStats.totalTransactions}</p>
                <p className="text-xs text-gray-500 mt-1">sur la période</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Panier moyen</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatPrice(ventesStats.avgPanier)}</p>
                <p className="text-xs text-gray-500 mt-1">par transaction</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Meilleure journée</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {ventesStats.totalRevenue > 0 ? ventesStats.peakDay.label : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {ventesStats.totalRevenue > 0 ? formatPrice(ventesStats.peakDay.total) : 'Aucune vente'}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Chiffre d'affaires par jour</h3>
                <p className="text-sm text-gray-600">Montant total des ventes</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 flex items-center justify-center">
                <BarChart3 size={18} />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-end gap-2 h-28">
                {ventesStats.data.map((day) => (
                  <div key={day.key} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full h-24 rounded-lg bg-emerald-50/70 flex items-end overflow-hidden">
                      <div
                        className="w-full rounded-lg bg-emerald-500/80"
                        style={{ height: `${(day.total / ventesStats.maxTotal) * 100}%` }}
                      />
                    </div>
                    {showSalesLabels && (
                      <span className="text-[10px] uppercase text-gray-500">{day.label}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>{ventesStats.startLabel}</span>
                <span className="font-medium text-gray-700">{formatPrice(ventesStats.totalRevenue)} total</span>
                <span>{ventesStats.endLabel}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Fréquence des ventes</h3>
                <p className="text-sm text-gray-600">Nombre de transactions par jour</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 flex items-center justify-center">
                <Activity size={18} />
              </div>
            </div>
            <div className="mt-4 h-28 w-full">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <defs>
                  <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(59, 130, 246, 0.35)" />
                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                  </linearGradient>
                </defs>
                <path d={ventesStats.areaPath} fill="url(#salesArea)" stroke="none" />
                <path d={ventesStats.linePath} fill="none" stroke="rgba(59, 130, 246, 0.9)" strokeWidth="2" />
                {ventesStats.points.map((point, index) => (
                  <circle key={index} cx={point.x} cy={point.y} r="2.2" fill="rgba(59, 130, 246, 0.9)" />
                ))}
              </svg>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>{ventesStats.startLabel}</span>
              <span className="font-medium text-gray-700">{ventesStats.totalTransactions} ventes</span>
              <span>{ventesStats.endLabel}</span>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Méthodes de paiement</h3>
                <p className="text-sm text-gray-600">{paiementDistribution.total} ventes</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 flex items-center justify-center">
                <Wallet size={18} />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
                {paiementDistribution.items.map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      item.color === 'emerald' && 'bg-emerald-500/80',
                      item.color === 'blue' && 'bg-blue-500/80',
                      item.color === 'amber' && 'bg-amber-500/80',
                      item.color === 'purple' && 'bg-purple-500/80'
                    )}
                    style={{ width: `${item.percent}%` }}
                  />
                ))}
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {paiementDistribution.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full',
                          item.color === 'emerald' && 'bg-emerald-500',
                          item.color === 'blue' && 'bg-blue-500',
                          item.color === 'amber' && 'bg-amber-500',
                          item.color === 'purple' && 'bg-purple-500'
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                    <span className="font-medium text-gray-700">
                      {item.value} · {item.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-5 lg:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Produits les plus vendus</h3>
                <p className="text-sm text-gray-600">Top 5 sur la période</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 flex items-center justify-center">
                <Package size={18} />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {topProduitsVendus.map((item, index) => (
                <div key={item.medicament.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{index + 1}. {item.medicament.nom}</p>
                      <p className="text-xs text-gray-600">{item.quantite} unités · {formatPrice(item.total)}</p>
                    </div>
                    <span className="text-xs text-gray-500">{item.medicament.forme}</span>
                  </div>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-blue-100">
                    <div
                      className="h-1.5 rounded-full bg-blue-500/80"
                      style={{ width: `${(item.quantite / maxProduitQuantite) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {topProduitsVendus.length === 0 && (
                <p className="text-gray-500 text-center py-4">Aucune vente sur cette période</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Activity size={20} className="text-emerald-600" />
        <h2 className="text-xl font-semibold text-gray-900">Statistiques des rayons</h2>
      </div>

      {/* Indicateurs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Total Transferts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{statistiques.totalTransferts}</p>
              <p className="text-xs text-gray-500 mt-1">sur la période</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Quantité Transférée</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{statistiques.quantiteTotaleTransferee}</p>
              <p className="text-xs text-gray-500 mt-1">unités totales</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Stock → Rayon</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{statistiques.transfertsParType.stock_vers_rayon}</p>
              <p className="text-xs text-gray-500 mt-1">transferts entrants</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Rayon → Stock</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{statistiques.transfertsParType.rayon_vers_stock}</p>
              <p className="text-xs text-gray-500 mt-1">transferts sortants</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Graphiques et analyses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Évolution des transferts</h3>
              <p className="text-sm text-gray-600">Nombre de transferts par jour</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 flex items-center justify-center">
              <Activity size={18} />
            </div>
          </div>
          <div className="mt-4 h-36 w-full">
            <svg viewBox="0 0 100 100" className="h-full w-full">
              <defs>
                <linearGradient id="transfertArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(16, 185, 129, 0.35)" />
                  <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
                </linearGradient>
              </defs>
              <path d={evolutionSerie.areaPath} fill="url(#transfertArea)" stroke="none" />
              <path d={evolutionSerie.linePath} fill="none" stroke="rgba(16, 185, 129, 0.9)" strokeWidth="2" />
              {evolutionSerie.points.map((point, index) => (
                <circle key={index} cx={point.x} cy={point.y} r="2.2" fill="rgba(16, 185, 129, 0.9)" />
              ))}
            </svg>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>{evolutionSerie.startLabel}</span>
            <span className="font-medium text-gray-700">
              {evolutionSerie.total} transferts · moyenne {evolutionSerie.average.toFixed(1)}/jour
            </span>
            <span>{evolutionSerie.endLabel}</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Répartition par type</h3>
              <p className="text-sm text-gray-600">{typeDistribution.total} transferts</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 flex items-center justify-center">
              <PieChart size={18} />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
              {typeDistribution.items.map(item => (
                <div
                  key={item.id}
                  className={item.bar}
                  style={{ width: `${item.percent}%` }}
                />
              ))}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {typeDistribution.items.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                    <span>{item.label}</span>
                  </div>
                  <span className={`font-medium ${item.text}`}>
                    {item.value} · {item.percent}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-emerald-50/70 p-3 text-xs text-gray-700">
            <div className="flex items-center justify-between">
              <span>Jour le plus actif</span>
              <span className="font-semibold text-gray-900">
                {insights.topDay?.label ?? '-'} ({insights.topDay?.count ?? 0})
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span>Rayon le plus actif</span>
              <span className="font-semibold text-gray-900">
                {insights.topRayon?.rayon.nom ?? '-'}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span>Médicament le plus transféré</span>
              <span className="font-semibold text-gray-900">
                {insights.topMedicament?.medicament.nom ?? '-'}
              </span>
            </div>
          </div>
        </Card>

        {/* Rayons les plus actifs */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Rayons les Plus Actifs</h3>
          </div>
          <div className="space-y-3">
            {statistiques.rayonsLesPlus.map((item, index) => (
              <div key={item.rayon.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-emerald-600 font-semibold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.rayon.nom}</p>
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <MapPin size={12} className="text-gray-400" />
                        {item.rayon.emplacement}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{item.transferts} transferts</p>
                    <p className="text-xs text-gray-600">{item.quantite} unités</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full rounded-full bg-emerald-100">
                  <div
                    className="h-1.5 rounded-full bg-emerald-500/80"
                    style={{ width: `${(item.transferts / maxRayonTransferts) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {statistiques.rayonsLesPlus.length === 0 && (
              <p className="text-gray-500 text-center py-4">Aucun transfert sur cette période</p>
            )}
          </div>
        </Card>

        {/* Médicaments les plus transférés */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={20} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Médicaments les Plus Transférés</h3>
          </div>
          <div className="space-y-3">
            {statistiques.medicamentsLesPlusTransferes.map((item, index) => (
              <div key={item.medicament.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.medicament.nom}</p>
                      <p className="text-xs text-gray-600">{item.medicament.forme}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{item.quantite} unités</p>
                    <p className="text-xs text-gray-600">{item.transferts} transferts</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full rounded-full bg-blue-100">
                  <div
                    className="h-1.5 rounded-full bg-blue-500/80"
                    style={{ width: `${(item.quantite / maxMedicamentQuantite) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {statistiques.medicamentsLesPlusTransferes.length === 0 && (
              <p className="text-gray-500 text-center py-4">Aucun transfert sur cette période</p>
            )}
          </div>
        </Card>
      </div>

      {/* Taux d'occupation des rayons */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Taux d'Occupation des Rayons</h3>
        </div>
        <div className="space-y-4">
          {statistiques.occupationRayons.map(item => (
            <div key={item.rayon.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{item.rayon.nom}</p>
                  <p className="text-sm text-gray-600">{item.rayon.emplacement}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {item.quantiteTotale} / {item.rayon.capaciteMax}
                  </p>
                  <p className="text-sm text-gray-600">{item.tauxOccupation.toFixed(1)}%</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={cn(
                    "h-3 rounded-full transition-all",
                    item.tauxOccupation > 90 ? "bg-red-500" :
                    item.tauxOccupation > 70 ? "bg-yellow-500" : "bg-green-500"
                  )}
                  style={{ width: `${Math.min(item.tauxOccupation, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {item.nombreMedicaments} médicament(s) différent(s)
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
