'use client';

import React, { useState, useMemo } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  Plus,
  Printer,
  Search,
  Trash2,
  Truck,
  X,
  Package
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useCommandeData } from '@/hooks/useCommandeData';
import { useFournisseurData } from '@/hooks/useFournisseurData';
import { formatDate, formatCurrency } from '@/utils';
import { AddCommandeModal } from './AddCommandeModal';
import { ViewCommandeModal } from './ViewCommandeModal';
import { ReceptionCommandeModal } from './ReceptionCommandeModal';

interface CommandeWithRelations {
  id: string;
  numeroCommande: string;
  date: Date;
  statut: 'en_attente' | 'confirmee' | 'partielle' | 'livree' | 'annulee';
  total: number;
  dateReception?: Date | null;
  fournisseur: {
    id: string;
    nom: string;
    contact: string;
    telephone: string;
    email?: string;
    adresse: string;
  };
  items: Array<{
    id: string;
    quantiteCommandee: number;
    quantiteRecue?: number | null;
    prixUnitaire: number;
    sousTotal: number;
    medicament: {
      id: string;
      nom: string;
      description: string;
    };
  }>;
}

export default function CommandeManagement() {
  const {
    commandes,
    loading,
    error,
    updateCommandeStatut,
    deleteCommande,
    getStatistiques,
  } = useCommandeData();
  
  const { fournisseurs, loading: loadingFournisseurs, error: errorFournisseurs } = useFournisseurData();

  // Debug logs
  console.log('CommandeManagement - Commandes:', commandes);
  console.log('CommandeManagement - Loading:', loading);
  console.log('CommandeManagement - Error:', error);
  console.log('CommandeManagement - Fournisseurs:', fournisseurs);
  console.log('CommandeManagement - Loading Fournisseurs:', loadingFournisseurs);
  console.log('CommandeManagement - Error Fournisseurs:', errorFournisseurs);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFournisseur, setSelectedFournisseur] = useState('all');
  const [selectedStatut, setSelectedStatut] = useState('all');
  const [selectedCommande, setSelectedCommande] = useState<CommandeWithRelations | null>(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isReceptionModalOpen, setIsReceptionModalOpen] = useState(false);

  // Filtrer les commandes
  const commandesFiltrees = useMemo(() => {
    return commandes.filter((commande) => {
      const matchSearch =
        commande.numeroCommande.toLowerCase().includes(searchTerm.toLowerCase()) ||
        commande.fournisseur.nom.toLowerCase().includes(searchTerm.toLowerCase());

      const matchFournisseur =
        selectedFournisseur === 'all' || commande.fournisseur.id === selectedFournisseur;

      const matchStatut =
        selectedStatut === 'all' || commande.statut === selectedStatut;

      return matchSearch && matchFournisseur && matchStatut;
    });
  }, [commandes, searchTerm, selectedFournisseur, selectedStatut]);

  // Statistiques
  const stats = getStatistiques();

  // Gérer la confirmation d'une commande
  const handleConfirmCommande = async (id: string) => {
    if (confirm('Confirmer cette commande ?')) {
      try {
        await updateCommandeStatut(id, 'confirmee');
      } catch (err) {
        alert('Erreur lors de la confirmation de la commande');
      }
    }
  };

  // Gérer l'annulation d'une commande
  const handleCancelCommande = async (id: string) => {
    if (confirm('Annuler cette commande ?')) {
      try {
        await updateCommandeStatut(id, 'annulee');
      } catch (err) {
        alert('Erreur lors de l\'annulation de la commande');
      }
    }
  };

  // Gérer la suppression d'une commande
  const handleDeleteCommande = async (id: string) => {
    if (confirm('Supprimer cette commande ? Cette action est irréversible.')) {
      try {
        await deleteCommande(id);
      } catch (err) {
        alert('Erreur lors de la suppression de la commande');
      }
    }
  };

  // Ouvrir le modal de réception
  const handleOpenReception = (commande: CommandeWithRelations) => {
    setSelectedCommande(commande);
    setIsReceptionModalOpen(true);
  };

  // Ouvrir le modal de visualisation
  const handleViewCommande = (commande: CommandeWithRelations) => {
    setSelectedCommande(commande);
    setIsViewModalOpen(true);
  };

  // Imprimer la commande
  const handlePrintCommande = (commande: CommandeWithRelations) => {
    const { printDocument, formatStatutBadge, generateQRCode } = require('@/utils/printUtils');
    
    // Générer les données pour le QR code
    const qrData = `CMD-${commande.numeroCommande}|${formatDate(commande.date)}|${commande.fournisseur.nom}|${formatCurrency(commande.total)}`;
    const qrCodeUrl = generateQRCode(qrData, 150);
    
    const content = `
      <div class="info-box">
        <h3>📋 Informations Fournisseur</h3>
        <p><strong>Nom:</strong> ${commande.fournisseur.nom}</p>
        <p><strong>Contact:</strong> ${commande.fournisseur.contact}</p>
        <p><strong>Téléphone:</strong> ${commande.fournisseur.telephone}</p>
        ${commande.fournisseur.email ? `<p><strong>Email:</strong> ${commande.fournisseur.email}</p>` : ''}
        <p><strong>Adresse:</strong> ${commande.fournisseur.adresse}</p>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <div class="info-box" style="flex: 1; margin-right: 15px;">
          <h3>📊 Statut de la commande</h3>
          <p>${formatStatutBadge(commande.statut)}</p>
          ${commande.dateReception ? `
            <p style="margin-top: 8px;">
              <strong>Date de réception:</strong> ${formatDate(commande.dateReception)}
            </p>
          ` : ''}
        </div>
        <div style="text-align: center;">
          <div style="border: 2px solid #e5e7eb; border-radius: 6px; padding: 8px; background: white;">
            <img src="${qrCodeUrl}" alt="QR Code" style="width: 100px; height: 100px; display: block;" />
            <p style="font-size: 9px; color: #6b7280; margin-top: 5px;">Scannez pour vérifier</p>
          </div>
        </div>
      </div>

      <h3 style="margin-bottom: 12px; color: #374151; font-size: 14px; border-bottom: 2px solid #10b981; padding-bottom: 5px;">📦 Articles Commandés</h3>
      <table>
        <thead>
          <tr>
            <th>Médicament</th>
            <th>Description</th>
            <th class="text-center">Qté Commandée</th>
            ${commande.statut === 'livree' ? '<th class="text-center">Qté Reçue</th>' : ''}
            <th class="text-right">Prix Unitaire</th>
            <th class="text-right">Sous-total</th>
          </tr>
        </thead>
        <tbody>
          ${commande.items.map(item => `
            <tr>
              <td class="font-bold">${item.medicament.nom}</td>
              <td>${item.medicament.description || '-'}</td>
              <td class="text-center">${item.quantiteCommandee}</td>
              ${commande.statut === 'livree' ? `<td class="text-center">${item.quantiteRecue || 0}</td>` : ''}
              <td class="text-right">${formatCurrency(item.prixUnitaire)}</td>
              <td class="text-right font-bold">${formatCurrency(item.sousTotal)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr class="total-row">
            <td><strong>MONTANT TOTAL</strong></td>
            <td class="text-right"><strong>${formatCurrency(commande.total)}</strong></td>
          </tr>
        </table>
      </div>

      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line">
            <strong>Le Fournisseur</strong>
          </div>
        </div>
        <div class="signature-box">
          <div class="signature-line">
            <strong>Le Pharmacien</strong>
          </div>
        </div>
      </div>
    `;

    printDocument({
      title: 'BON DE COMMANDE',
      documentNumber: commande.numeroCommande,
      date: formatDate(commande.date),
      content,
    });
  };

  // Badge de statut
  const getStatutBadge = (statut: string) => {
    const styles = {
      en_attente: 'bg-amber-50 text-amber-700 border border-amber-200/80',
      partielle: 'bg-amber-50 text-amber-800',
      confirmee: 'bg-blue-50 text-blue-700 border border-blue-200/80',
      livree: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
      annulee: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    };

    const labels = {
      en_attente: 'En attente',
      confirmee: 'Confirmée',
      partielle: 'Partiellement reçue',
      livree: 'Livrée',
      annulee: 'Annulée',
    };

    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
          styles[statut as keyof typeof styles]
        }`}
      >
        {labels[statut as keyof typeof labels]}
      </span>
    );
  };

  if (loading || loadingFournisseurs) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">
          {loading ? 'Chargement des commandes...' : 'Chargement des fournisseurs...'}
        </div>
      </div>
    );
  }

  if (error || errorFournisseurs) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-500">
          Erreur: {error || errorFournisseurs}
        </div>
        <Button onClick={() => window.location.reload()}>
          Recharger la page
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête et statistiques */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Commandes</h1>
          <p className="text-gray-600 mt-1">
            Gérez vos commandes fournisseurs et leur réception
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} className="mr-2" />
          Nouvelle Commande
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Commandes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 flex items-center justify-center">
              <Package size={20} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">En Attente</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.enAttente}</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Livrées</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.livrees}</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Montant Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.montantTotal)}
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            type="text"
            placeholder="Rechercher par numéro ou fournisseur..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            label="Recherche"
            icon={<Search size={16} />}
          />

          <Select
            label="Fournisseur"
            value={selectedFournisseur}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedFournisseur(e.target.value)}
          >
            <option value="all">Tous les fournisseurs</option>
            {fournisseurs.map((fournisseur) => (
              <option key={fournisseur.id} value={fournisseur.id}>
                {fournisseur.nom}
              </option>
            ))}
          </Select>

          <Select
            label="Statut"
            value={selectedStatut}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStatut(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="confirmee">Confirmée</option>
            <option value="partielle">Partiellement reçue</option><option value="livree">Livrée</option>
            <option value="annulee">Annulée</option>
          </Select>
        </div>
      </Card>

      {/* Liste des commandes */}
      <Card className="overflow-hidden">
        <div tabIndex={0} role="region" aria-label="Tableau de données à défilement horizontal" className="ph-table-scroll overflow-x-auto">
          <table className="w-full">
            <thead className="bg-emerald-50/60">
              <tr className="border-b border-emerald-100">
                <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500">N° Commande</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Fournisseur</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Articles</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Montant</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Statut</th>
                <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100/70">
              {commandesFiltrees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Aucune commande trouvée
                  </td>
                </tr>
              ) : (
                commandesFiltrees.map((commande) => (
                  <tr key={commande.id} className="hover:bg-emerald-50/40">
                    <td className="py-4 px-4 font-semibold text-gray-900">{commande.numeroCommande}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">{formatDate(commande.date)}</td>
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-medium text-gray-900">{commande.fournisseur.nom}</div>
                        <div className="text-sm text-gray-500">
                          {commande.fournisseur.telephone}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700">{commande.items.length}</td>
                    <td className="py-4 px-4 font-semibold text-gray-900">
                      {formatCurrency(commande.total)}
                    </td>
                    <td className="py-4 px-4">{getStatutBadge(commande.statut)}</td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewCommande(commande)}
                          className="text-gray-700 border-gray-200 hover:bg-gray-50"
                        >
                          <Eye size={14} className="mr-1.5" />
                          Voir
                        </Button>

                        {commande.statut === 'en_attente' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConfirmCommande(commande.id)}
                              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            >
                              <Check size={14} className="mr-1.5" />
                              Confirmer
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelCommande(commande.id)}
                              className="text-amber-700 border-amber-200 hover:bg-amber-50"
                            >
                              <X size={14} className="mr-1.5" />
                              Annuler
                            </Button>
                          </>
                        )}

                        {(commande.statut === 'confirmee'||commande.statut==='partielle') && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenReception(commande)}
                          >
                            <Truck size={14} className="mr-1.5" />
                            Réceptionner
                          </Button>
                        )}

                        {(commande.statut === 'confirmee' || commande.statut === 'livree') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrintCommande(commande)}
                            className="text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                          >
                            <Printer size={14} className="mr-1.5" />
                            Imprimer
                          </Button>
                        )}

                        {(commande.statut === 'en_attente' ||
                          commande.statut === 'annulee') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCommande(commande.id)}
                            className="text-rose-700 border-rose-200 hover:bg-rose-50"
                          >
                            <Trash2 size={14} className="mr-1.5" />
                            Supprimer
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      <AddCommandeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      
      <ViewCommandeModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedCommande(null);
        }}
        commande={selectedCommande}
      />
      
      <ReceptionCommandeModal
        isOpen={isReceptionModalOpen}
        onClose={() => {
          setIsReceptionModalOpen(false);
          setSelectedCommande(null);
        }}
        commande={selectedCommande}
      />
    </div>
  );
}
