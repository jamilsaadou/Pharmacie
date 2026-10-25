'use client';

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Package, 
  ArrowRightLeft, 
  Eye, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { useRayonData } from '@/hooks/useRayonData';
import { Rayon, MedicamentRayon, TransfertRayon, FormulaireRayon, FormulaireTransfertRayon } from '@/types';
import { cn } from '@/utils';
import StatistiquesRayons from './StatistiquesRayons';

export default function RayonManagement() {
  const {
    rayons,
    medicamentsRayons,
    transferts,
    medicaments,
    ajouterRayon,
    modifierRayon,
    supprimerRayon,
    transfererMedicament,
    obtenirMedicamentsParRayon,
    obtenirStatistiquesRayon
  } = useRayonData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRayon, setSelectedRayon] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'rayons' | 'transferts' | 'statistiques'>('rayons');
  
  // Modals
  const [showAddRayonModal, setShowAddRayonModal] = useState(false);
  const [showEditRayonModal, setShowEditRayonModal] = useState(false);
  const [showTransfertModal, setShowTransfertModal] = useState(false);
  const [showRayonDetailsModal, setShowRayonDetailsModal] = useState(false);
  const [editingRayon, setEditingRayon] = useState<Rayon | null>(null);
  const [selectedRayonDetails, setSelectedRayonDetails] = useState<Rayon | null>(null);

  // Formulaires
  const [rayonForm, setRayonForm] = useState<FormulaireRayon>({
    nom: '',
    description: '',
    emplacement: '',
    capaciteMax: ''
  });

  const [transfertForm, setTransfertForm] = useState<FormulaireTransfertRayon>({
    medicamentId: '',
    rayonId: '',
    quantite: '',
    typeTransfert: 'stock_vers_rayon',
    rayonDestinationId: '',
    commentaire: ''
  });

  // Filtrage des rayons
  const rayonsFiltres = useMemo(() => {
    return rayons.filter(rayon => {
      const matchSearch = rayon.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rayon.emplacement.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [rayons, searchTerm]);

  // Statistiques globales
  const statistiquesGlobales = useMemo(() => {
    const totalRayons = rayons.length;
    const totalMedicamentsEnRayon = medicamentsRayons.reduce((sum, mr) => sum + mr.quantiteEnRayon, 0);
    const rayonsAvecStock = rayons.filter(rayon => 
      obtenirMedicamentsParRayon(rayon.id).length > 0
    ).length;
    const transfertsAujourdhui = transferts.filter(t => 
      t.date.toDateString() === new Date().toDateString()
    ).length;

    return {
      totalRayons,
      totalMedicamentsEnRayon,
      rayonsAvecStock,
      transfertsAujourdhui
    };
  }, [rayons, medicamentsRayons, transferts, obtenirMedicamentsParRayon]);

  const handleAddRayon = async () => {
    try {
    if (rayonForm.nom && rayonForm.emplacement && rayonForm.capaciteMax) {
      await ajouterRayon({
        nom: rayonForm.nom,
        description: rayonForm.description,
        emplacement: rayonForm.emplacement,
        capaciteMax: parseInt(rayonForm.capaciteMax)
      });
      setRayonForm({ nom: '', description: '', emplacement: '', capaciteMax: '' });
      setShowAddRayonModal(false);
    }    } catch { /* Le message du serveur est affiché dans l’espace de travail. */ }
  };

  const handleEditRayon = async () => {
    try {
    if (editingRayon && rayonForm.nom && rayonForm.emplacement && rayonForm.capaciteMax) {
      await modifierRayon(editingRayon.id, {
        nom: rayonForm.nom,
        description: rayonForm.description,
        emplacement: rayonForm.emplacement,
        capaciteMax: parseInt(rayonForm.capaciteMax)
      });
      setEditingRayon(null);
      setRayonForm({ nom: '', description: '', emplacement: '', capaciteMax: '' });
      setShowEditRayonModal(false);
    }    } catch { /* Le message du serveur est affiché dans l’espace de travail. */ }
  };

  const handleTransfert = async () => {
    try {
    if (transfertForm.medicamentId && transfertForm.rayonId && transfertForm.quantite) {
      await transfererMedicament({
        medicamentId: transfertForm.medicamentId,
        rayonId: transfertForm.rayonId,
        quantiteTransferee: parseInt(transfertForm.quantite),
        typeTransfert: transfertForm.typeTransfert,
        rayonDestinationId: transfertForm.rayonDestinationId || undefined,
        commentaire: transfertForm.commentaire || undefined,
        utilisateur: 'Admin Pharmacie'
      });
      setTransfertForm({
        medicamentId: '',
        rayonId: '',
        quantite: '',
        typeTransfert: 'stock_vers_rayon',
        rayonDestinationId: '',
        commentaire: ''
      });
      setShowTransfertModal(false);
    }    } catch { /* Le message du serveur est affiché dans l’espace de travail. */ }
  };

  const openEditModal = (rayon: Rayon) => {
    setEditingRayon(rayon);
    setRayonForm({
      nom: rayon.nom,
      description: rayon.description,
      emplacement: rayon.emplacement,
      capaciteMax: rayon.capaciteMax.toString()
    });
    setShowEditRayonModal(true);
  };

  const openDetailsModal = (rayon: Rayon) => {
    setSelectedRayonDetails(rayon);
    setShowRayonDetailsModal(true);
  };

  const getStatutColor = (statut: MedicamentRayon['statut']) => {
    switch (statut) {
      case 'en_vente': return 'text-green-600 bg-green-100';
      case 'reserve': return 'text-yellow-600 bg-yellow-100';
      case 'expire': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeTransfertColor = (type: TransfertRayon['typeTransfert']) => {
    switch (type) {
      case 'stock_vers_rayon': return 'text-blue-600 bg-blue-100';
      case 'rayon_vers_stock': return 'text-orange-600 bg-orange-100';
      case 'rayon_vers_rayon': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Rayons</h1>
          <p className="text-gray-600">Gérez les rayons et transférez les médicaments</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowTransfertModal(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowRightLeft size={16} />
            Transférer
          </Button>
          <Button
            onClick={() => setShowAddRayonModal(true)}
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            Nouveau Rayon
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Rayons</p>
              <p className="text-2xl font-bold text-gray-900">{statistiquesGlobales.totalRayons}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Médicaments en Rayon</p>
              <p className="text-2xl font-bold text-gray-900">{statistiquesGlobales.totalMedicamentsEnRayon}</p>
            </div>
            <MapPin className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rayons avec Stock</p>
              <p className="text-2xl font-bold text-gray-900">{statistiquesGlobales.rayonsAvecStock}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Transferts Aujourd'hui</p>
              <p className="text-2xl font-bold text-gray-900">{statistiquesGlobales.transfertsAujourdhui}</p>
            </div>
            <ArrowRightLeft className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'rayons', label: 'Rayons', icon: Package },
            { id: 'transferts', label: 'Historique Transferts', icon: ArrowRightLeft },
            { id: 'statistiques', label: 'Statistiques', icon: Filter }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm',
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenu des tabs */}
      {activeTab === 'rayons' && (
        <div className="space-y-4">
          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher un rayon..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                icon={<Search size={16} />}
              />
            </div>
          </div>

          {/* Liste des rayons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rayonsFiltres.map(rayon => {
              const medicamentsRayon = obtenirMedicamentsParRayon(rayon.id);
              const totalQuantite = medicamentsRayon.reduce((sum, mr) => sum + mr.quantiteEnRayon, 0);
              const pourcentageRemplissage = (totalQuantite / rayon.capaciteMax) * 100;

              return (
                <Card key={rayon.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{rayon.nom}</h3>
                        <p className="text-sm text-gray-600">{rayon.emplacement}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetailsModal(rayon)}
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(rayon)}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => supprimerRayon(rayon.id).catch(() => {})}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Occupation</span>
                        <span className="font-medium">
                          {totalQuantite} / {rayon.capaciteMax}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all",
                            pourcentageRemplissage > 90 ? "bg-red-500" :
                            pourcentageRemplissage > 70 ? "bg-yellow-500" : "bg-green-500"
                          )}
                          style={{ width: `${Math.min(pourcentageRemplissage, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {pourcentageRemplissage.toFixed(1)}% de capacité
                      </p>
                    </div>

                    <div className="text-sm text-gray-600">
                      <p>{medicamentsRayon.length} médicament(s) différent(s)</p>
                      <p className="text-xs">{rayon.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'transferts' && (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div tabIndex={0} role="region" aria-label="Tableau de données à défilement horizontal" className="ph-table-scroll overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Médicament</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rayon</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transferts.slice(0, 20).map(transfert => (
                    <tr key={transfert.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {transfert.date.toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {transfert.medicament?.nom || 'Médicament supprimé'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                          getTypeTransfertColor(transfert.typeTransfert)
                        )}>
                          {transfert.typeTransfert.replace('_', ' → ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {transfert.rayon?.nom || 'Rayon supprimé'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {transfert.quantiteTransferee}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {transfert.utilisateur}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'statistiques' && (
        <StatistiquesRayons 
          rayons={rayons}
          medicamentsRayons={medicamentsRayons}
          transferts={transferts}
          medicaments={medicaments}
        />
      )}

      {/* Modal Ajouter Rayon */}
      <Modal
        isOpen={showAddRayonModal}
        onClose={() => setShowAddRayonModal(false)}
        title="Nouveau Rayon"
      >
        <div className="space-y-4">
          <Input
            label="Nom du rayon"
            value={rayonForm.nom}
            onChange={(e) => setRayonForm({ ...rayonForm, nom: e.target.value })}
            placeholder="Ex: Rayon A"
          />
          <Input
            label="Description"
            value={rayonForm.description}
            onChange={(e) => setRayonForm({ ...rayonForm, description: e.target.value })}
            placeholder="Description du rayon"
          />
          <Input
            label="Emplacement"
            value={rayonForm.emplacement}
            onChange={(e) => setRayonForm({ ...rayonForm, emplacement: e.target.value })}
            placeholder="Ex: Allée 1, Étagère 2"
          />
          <Input
            label="Capacité maximale"
            type="number"
            value={rayonForm.capaciteMax}
            onChange={(e) => setRayonForm({ ...rayonForm, capaciteMax: e.target.value })}
            placeholder="Nombre maximum de produits"
          />
          <div className="flex gap-2 pt-4">
            <Button onClick={handleAddRayon} className="flex-1">
              Créer le Rayon
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddRayonModal(false)}
              className="flex-1"
            >
              Annuler
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Modifier Rayon */}
      <Modal
        isOpen={showEditRayonModal}
        onClose={() => setShowEditRayonModal(false)}
        title="Modifier le Rayon"
      >
        <div className="space-y-4">
          <Input
            label="Nom du rayon"
            value={rayonForm.nom}
            onChange={(e) => setRayonForm({ ...rayonForm, nom: e.target.value })}
          />
          <Input
            label="Description"
            value={rayonForm.description}
            onChange={(e) => setRayonForm({ ...rayonForm, description: e.target.value })}
          />
          <Input
            label="Emplacement"
            value={rayonForm.emplacement}
            onChange={(e) => setRayonForm({ ...rayonForm, emplacement: e.target.value })}
          />
          <Input
            label="Capacité maximale"
            type="number"
            value={rayonForm.capaciteMax}
            onChange={(e) => setRayonForm({ ...rayonForm, capaciteMax: e.target.value })}
          />
          <div className="flex gap-2 pt-4">
            <Button onClick={handleEditRayon} className="flex-1">
              Modifier
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowEditRayonModal(false)}
              className="flex-1"
            >
              Annuler
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Transfert */}
      <Modal
        isOpen={showTransfertModal}
        onClose={() => setShowTransfertModal(false)}
        title="Transférer un Médicament"
      >
        <div className="space-y-4">
          <Select
            label="Médicament"
            value={transfertForm.medicamentId}
            onChange={(e) => setTransfertForm({ ...transfertForm, medicamentId: e.target.value })}
          >
            <option value="">Sélectionner un médicament</option>
            {medicaments.map(med => (
              <option key={med.id} value={med.id}>
                {med.nom} (Stock: {med.quantiteStock})
              </option>
            ))}
          </Select>
          <Select
            label="Type de transfert"
            value={transfertForm.typeTransfert}
            onChange={(e) => setTransfertForm({ 
              ...transfertForm, 
              typeTransfert: e.target.value as TransfertRayon['typeTransfert']
            })}
          >
            <option value="stock_vers_rayon">Stock → Rayon</option>
            <option value="rayon_vers_stock">Rayon → Stock</option>
            <option value="rayon_vers_rayon">Rayon → Rayon</option>
          </Select>
          <Select
            label="Rayon source"
            value={transfertForm.rayonId}
            onChange={(e) => setTransfertForm({ ...transfertForm, rayonId: e.target.value })}
          >
            <option value="">Sélectionner un rayon</option>
            {rayons.map(rayon => (
              <option key={rayon.id} value={rayon.id}>
                {rayon.nom} ({rayon.emplacement})
              </option>
            ))}
          </Select>
          {transfertForm.typeTransfert === 'rayon_vers_rayon' && (
            <Select
              label="Rayon destination"
              value={transfertForm.rayonDestinationId || ''}
              onChange={(e) => setTransfertForm({ ...transfertForm, rayonDestinationId: e.target.value })}
            >
              <option value="">Sélectionner le rayon de destination</option>
              {rayons.filter(r => r.id !== transfertForm.rayonId).map(rayon => (
                <option key={rayon.id} value={rayon.id}>
                  {rayon.nom} ({rayon.emplacement})
                </option>
              ))}
            </Select>
          )}
          <Input
            label="Quantité"
            type="number"
            value={transfertForm.quantite}
            onChange={(e) => setTransfertForm({ ...transfertForm, quantite: e.target.value })}
            placeholder="Quantité à transférer"
          />
          <Input
            label="Commentaire (optionnel)"
            value={transfertForm.commentaire}
            onChange={(e) => setTransfertForm({ ...transfertForm, commentaire: e.target.value })}
            placeholder="Commentaire sur le transfert"
          />
          <div className="flex gap-2 pt-4">
            <Button onClick={handleTransfert} className="flex-1">
              Effectuer le Transfert
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowTransfertModal(false)}
              className="flex-1"
            >
              Annuler
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Détails Rayon */}
      <Modal
        isOpen={showRayonDetailsModal}
        onClose={() => setShowRayonDetailsModal(false)}
        title={`Détails - ${selectedRayonDetails?.nom}`}
      >
        {selectedRayonDetails && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Emplacement</p>
                <p className="font-medium">{selectedRayonDetails.emplacement}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Capacité</p>
                <p className="font-medium">{selectedRayonDetails.capaciteMax}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Description</p>
              <p className="font-medium">{selectedRayonDetails.description || 'Aucune description'}</p>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Médicaments dans ce rayon</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {obtenirMedicamentsParRayon(selectedRayonDetails.id).map(mr => (
                  <div key={mr.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{mr.medicament?.nom}</p>
                      <p className="text-xs text-gray-600">
                        Transféré le {mr.dateTransfert.toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{mr.quantiteEnRayon}</p>
                      <span className={cn(
                        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                        getStatutColor(mr.statut)
                      )}>
                        {mr.statut.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
