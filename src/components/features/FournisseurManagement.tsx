'use client';
import { ModuleHeading } from '@/components/ui/ModuleHeading';

import React, { useMemo, useState } from 'react';
import { Fournisseur } from '@/types';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useFournisseurData } from '@/hooks/useFournisseurData';
import { AddFournisseurModal } from './AddFournisseurModal';
import { EditFournisseurModal } from './EditFournisseurModal';
import { ViewFournisseurModal } from './ViewFournisseurModal';
import { Truck, Plus, Download, Eye, Pencil, Trash2 } from 'lucide-react';

interface FournisseurManagementProps {
  className?: string;
}

export function FournisseurManagement({ className = '' }: FournisseurManagementProps) {
  const {
    fournisseurs,
    statistiquesFournisseurs,
    rechercherFournisseurs,
    supprimerFournisseur,
    exporterFournisseurs,
  } = useFournisseurData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Fournisseur | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);

  const fournisseursFiltres = useMemo(() => {
    return rechercherFournisseurs(searchTerm);
  }, [rechercherFournisseurs, searchTerm]);

  const handleDelete = (f: Fournisseur) => {
    if (window.confirm(`Supprimer le fournisseur "${f.nom}" ?`)) {
      supprimerFournisseur(f.id);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <ModuleHeading icon={Truck} title="Fournisseurs" description="Vos partenaires, leurs coordonnées et votre suivi d’approvisionnement." />
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-emerald-600">
            {statistiquesFournisseurs.totalFournisseurs}
          </div>
          <div className="text-sm text-gray-600">Total fournisseurs</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">
            {statistiquesFournisseurs.nouveauxCeMois}
          </div>
          <div className="text-sm text-gray-600">Ajoutés ce mois</div>
        </Card>
      </div>

      {/* Barre d'outils */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Rechercher un fournisseur (nom, contact, téléphone, email...)"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Nouveau fournisseur
            </Button>
            <Button onClick={exporterFournisseurs} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
              <Download className="mr-2 h-4 w-4" /> Exporter
            </Button>
          </div>
        </div>
      </Card>

      {/* Liste */}
      <Card className="overflow-hidden">
        <div tabIndex={0} role="region" aria-label="Tableau de données à défilement horizontal" className="ph-table-scroll overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fournisseur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adresse</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ajout</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fournisseursFiltres.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{f.nom}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{f.contact}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{f.telephone}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{f.email || '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{f.adresse}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(f.dateAjout).toLocaleDateString()}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelected(f); setShowView(true); }}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelected(f); setShowEdit(true); }}
                        className="text-green-600 border-green-600 hover:bg-green-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(f)}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {fournisseursFiltres.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Aucun fournisseur trouvé pour cette recherche' : 'Aucun fournisseur enregistré'}
            </div>
          )}
        </div>
      </Card>

      {/* Modales */}
      <AddFournisseurModal isOpen={showAdd} onClose={() => setShowAdd(false)} />
      {selected && (
        <>
          <EditFournisseurModal
            isOpen={showEdit}
            onClose={() => { setShowEdit(false); setSelected(null); }}
            fournisseur={selected}
          />
          <ViewFournisseurModal
            isOpen={showView}
            onClose={() => { setShowView(false); setSelected(null); }}
            fournisseur={selected}
          />
        </>
      )}
    </div>
  );
}
