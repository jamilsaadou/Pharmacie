'use client';

import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  AlertTriangle,
  Calendar,
  Eye,
  FileDown,
  Layers,
  Coins
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useMedicamentData } from '@/hooks/useMedicamentData';
import { formatPrice, formatDate, isLowStock, isExpired, isExpiringSoon, searchInArray, sortArray } from '@/utils';
import { Medicament } from '@/types';
import AddMedicamentModal from './AddMedicamentModal';
import ViewMedicamentModal from './ViewMedicamentModal';
import EditMedicamentModal from './EditMedicamentModal';
import ProductGrid from './ProductGrid';

export default function StockManagement() {
  const { 
    medicaments, 
    loading: loadingMedicaments,
    error: errorMedicaments,
    supprimerMedicament 
  } = useMedicamentData();
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(12);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<keyof Medicament>('nom');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMedicament, setSelectedMedicament] = useState<Medicament | null>(null);

  // Filtrage et tri des médicaments
  const filteredMedicaments = useMemo(() => {
    let filtered = medicaments;

    // Recherche
    if (searchTerm) {
      filtered = searchInArray(filtered, searchTerm, ['nom', 'description', 'categorie', 'fournisseur', 'codeBarres']);
    }

    // Filtre par catégorie
    if (selectedCategory) {
      filtered = filtered.filter(med => med.categorie === selectedCategory);
    }

    // Tri
    filtered = sortArray(filtered, sortBy, sortDirection);

    return filtered;
  }, [medicaments, searchTerm, selectedCategory, sortBy, sortDirection]);

  // Catégories uniques
  const categories = useMemo(() => {
    return Array.from(new Set(medicaments.map(med => med.categorie))).sort();
  }, [medicaments]);

  const stats = useMemo(() => {
    const total = medicaments.length;
    const lowStock = medicaments.filter(med => isLowStock(med.quantiteStock, med.seuilAlerte)).length;
    const expiring = medicaments.filter(med => isExpired(med.dateExpiration) || isExpiringSoon(med.dateExpiration)).length;
    const outOfStock = medicaments.filter(med => med.quantiteStock === 0).length;
    const stockValue = medicaments.reduce((sum, med) => sum + med.prix * med.quantiteStock, 0);

    return { total, lowStock, expiring, outOfStock, stockValue };
  }, [medicaments]);

  const handleSort = (key: keyof Medicament) => {
    if (sortBy === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
  };

  const sortOptions = [
    { value: 'nom:asc', label: 'Nom (A-Z)' },
    { value: 'nom:desc', label: 'Nom (Z-A)' },
    { value: 'quantiteStock:asc', label: 'Stock (faible → élevé)' },
    { value: 'quantiteStock:desc', label: 'Stock (élevé → faible)' },
    { value: 'prix:asc', label: 'Prix (bas → haut)' },
    { value: 'prix:desc', label: 'Prix (haut → bas)' },
    { value: 'dateExpiration:asc', label: 'Expiration (proche)' },
    { value: 'dateExpiration:desc', label: 'Expiration (lointaine)' },
  ];

  const sortValue = `${sortBy}:${sortDirection}`;

  const handleSortSelect = (value: string) => {
    const [key, direction] = value.split(':');
    setSortBy(key as keyof Medicament);
    setSortDirection(direction as 'asc' | 'desc');
  };

  const exportToExcel = () => {
    if (filteredMedicaments.length === 0) {
      alert('Aucun médicament à exporter.');
      return;
    }

    const headers = [
      'Nom',
      'Code barre',
      'Categorie',
      'Fournisseur',
      'Prix',
      'Stock',
      'Seuil',
      'Expiration',
      'Prescription',
      'Forme',
      'Dosage',
    ];

    const escapeCSV = (value: string | number | null | undefined) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    const rows = filteredMedicaments.map((med) => [
      med.nom,
      med.codeBarres || '',
      med.categorie || '',
      med.fournisseur || '',
      med.prix,
      med.quantiteStock,
      med.seuilAlerte,
      formatDate(med.dateExpiration),
      med.prescription ? 'Oui' : 'Non',
      med.forme || '',
      med.dosage || '',
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(';'),
      ...rows.map((row) => row.map(escapeCSV).join(';')),
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `stock-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStockStatus = (medicament: Medicament) => {
    if (medicament.quantiteStock === 0) {
      return { status: 'rupture', color: 'text-red-600', bgColor: 'bg-red-100', label: 'Rupture' };
    }
    if (isLowStock(medicament.quantiteStock, medicament.seuilAlerte)) {
      return { status: 'faible', color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Stock faible' };
    }
    return { status: 'normal', color: 'text-emerald-600', bgColor: 'bg-emerald-100', label: 'En stock' };
  };

  const getExpirationStatus = (medicament: Medicament) => {
    if (isExpired(medicament.dateExpiration)) {
      return { status: 'expire', color: 'text-red-600', bgColor: 'bg-red-100', label: 'Expiré' };
    }
    if (isExpiringSoon(medicament.dateExpiration)) {
      return { status: 'bientot', color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Expire bientôt' };
    }
    return { status: 'valide', color: 'text-emerald-600', bgColor: 'bg-emerald-100', label: 'Valide' };
  };

  // Afficher un état de chargement
  if (loadingMedicaments) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="mx-auto text-gray-400 mb-4 animate-pulse" size={48} />
          <p className="text-gray-500">Chargement des médicaments...</p>
        </div>
      </div>
    );
  }

  // Afficher une erreur s'il y en a une
  if (errorMedicaments) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertTriangle className="text-red-500" size={48} />
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur de chargement</h3>
          <p className="text-gray-500">{errorMedicaments}</p>
        </div>
        <Button onClick={() => window.location.reload()}>
          Recharger la page
        </Button>
      </div>
    );
  }

  return (
    <div className="stock-page relative space-y-6">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');
        .stock-page {
          font-family: 'Manrope', 'Segoe UI', sans-serif;
        }
        .stock-title {
          font-family: 'Playfair Display', 'Georgia', serif;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 right-[-6rem] h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-48 -left-16 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute bottom-[-6rem] right-12 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      <div className="relative space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-600">
              Inventaire
            </span>
            <h1 className="stock-title text-3xl sm:text-4xl text-slate-900">Gestion du stock</h1>
            <p className="text-sm text-slate-600">
              Gérez vos médicaments, anticipez les ruptures et suivez les dates d&apos;expiration.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportToExcel} variant="secondary" className="gap-2">
              <FileDown size={16} />
              Exporter Excel
            </Button>
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus size={16} />
              Ajouter un médicament
            </Button>
          </div>
        </div>

        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">Les quantités affichées sont disponibles à la vente. Consultez « Lots &amp; inventaires » pour le stock physique, la qualification des lots, les péremptions et les corrections.</p>
        {/* Statistiques */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total médicaments</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-400 mt-1">{filteredMedicaments.length} affichés</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Layers size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Valeur du stock</p>
                <p className="text-2xl font-semibold text-slate-900">{formatPrice(stats.stockValue)}</p>
                <p className="text-xs text-slate-400 mt-1">Montant théorique</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                <Coins size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Stock faible</p>
                <p className="text-2xl font-semibold text-orange-600">{stats.lowStock}</p>
                <p className="text-xs text-slate-400 mt-1">Ruptures: {stats.outOfStock}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <AlertTriangle size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Expirés / Bientôt</p>
                <p className="text-2xl font-semibold text-rose-600">{stats.expiring}</p>
                <p className="text-xs text-slate-400 mt-1">Surveillance active</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <Calendar size={20} />
              </div>
            </div>
          </Card>
        </div>

        {/* Filtres et recherche */}
        <Card className="p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center">
            <Input
              placeholder="Rechercher un médicament, catégorie, fournisseur..."
              value={searchTerm}
              aria-label="Rechercher un produit"
              onChange={(e) => {setSearchTerm(e.target.value);setPage(1);}}
              icon={<Search size={16} />}
              className="rounded-full"
            />
            <select
              value={selectedCategory}
              aria-label="Catégorie de produit"
              onChange={(e) => {setSelectedCategory(e.target.value);setPage(1);}}
              className="flex h-10 w-full rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
            >
              <option value="">Toutes les catégories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select
              value={sortValue}
              aria-label="Trier les produits"
              onChange={(e) => {handleSortSelect(e.target.value);setPage(1);}}
              className="flex h-10 w-full rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Filter size={16} />
              {filteredMedicaments.length} résultat{filteredMedicaments.length > 1 ? 's' : ''}
            </div>
          </div>
        </Card>

        <ProductGrid products={filteredMedicaments} page={page} pageSize={pageSize} onPage={setPage} onPageSize={size=>{setPageSize(size);setPage(1);}} stockStatus={getStockStatus} expirationStatus={getExpirationStatus}
          onView={product=>{setSelectedMedicament(product);setShowViewModal(true);}}
          onEdit={product=>{setSelectedMedicament(product);setShowEditModal(true);}}
          onDelete={product=>{if(confirm('Supprimer ce produit ? Les références ayant un historique sont conservées.'))void supprimerMedicament(product.id);}}
        />

        {/* Modals */}
        <AddMedicamentModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
        
        <ViewMedicamentModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedMedicament(null);
          }}
          medicament={selectedMedicament}
        />
        
        <EditMedicamentModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedMedicament(null);
          }}
          medicament={selectedMedicament}
        />
      </div>
    </div>
  );
}
