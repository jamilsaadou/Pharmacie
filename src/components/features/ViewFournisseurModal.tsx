'use client';

import React, { useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Fournisseur } from '@/types';
import { usePharmacieData } from '@/hooks/usePharmacieData';
import { Phone, Package } from 'lucide-react';

interface ViewFournisseurModalProps {
  isOpen: boolean;
  onClose: () => void;
  fournisseur: Fournisseur;
}

export function ViewFournisseurModal({ isOpen, onClose, fournisseur }: ViewFournisseurModalProps) {
  const { medicaments } = usePharmacieData();

  const medicamentsAssocies = useMemo(() =>
    medicaments.filter(m => m.fournisseur === fournisseur.nom),
  [medicaments, fournisseur.nom]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Détails du fournisseur">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{fournisseur.nom}</h2>
              <div className="mt-2 text-sm text-gray-600">Ajouté le {new Date(fournisseur.dateAjout).toLocaleDateString()}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Médicaments fournis</div>
              <div className="text-lg font-semibold text-gray-900">{medicamentsAssocies.length}</div>
            </div>
          </div>
        </div>

        {/* Coordonnées */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Phone className="h-4 w-4" /> Coordonnées</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Contact</label>
              <p className="text-sm text-gray-900">{fournisseur.contact}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Téléphone</label>
              <p className="text-sm text-gray-900">{fournisseur.telephone}</p>
            </div>
            {fournisseur.email && (
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-sm text-gray-900">{fournisseur.email}</p>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-500">Adresse</label>
              <p className="text-sm text-gray-900">{fournisseur.adresse}</p>
            </div>
          </div>
        </Card>

        {/* Médicaments liés */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Package className="h-4 w-4" /> Médicaments associés</h3>
            <span className="text-sm text-gray-600">{medicamentsAssocies.length} élément(s)</span>
          </div>
          {medicamentsAssocies.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {medicamentsAssocies.slice(0, 20).map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="text-sm text-gray-900">{m.nom}</div>
                  <div className="text-xs text-gray-600">Stock: {m.quantiteStock}</div>
                </div>
              ))}
              {medicamentsAssocies.length > 20 && (
                <div className="text-center text-sm text-gray-500">... et {medicamentsAssocies.length - 20} autre(s)</div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Aucun médicament associé à ce fournisseur</div>
          )}
        </Card>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </Modal>
  );
}
