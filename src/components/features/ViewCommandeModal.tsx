'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { formatDate, formatCurrency } from '@/utils';

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

interface ViewCommandeModalProps {
  isOpen: boolean;
  onClose: () => void;
  commande: CommandeWithRelations | null;
}

export function ViewCommandeModal({ isOpen, onClose, commande }: ViewCommandeModalProps) {
  if (!commande) return null;

  // Badge de statut
  const getStatutBadge = (statut: string) => {
    const styles = {
      en_attente: 'bg-yellow-100 text-yellow-800',
      partielle: 'bg-amber-50 text-amber-800',
      confirmee: 'bg-blue-100 text-blue-800',
      livree: 'bg-green-100 text-green-800',
      annulee: 'bg-red-100 text-red-800',
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
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          styles[statut as keyof typeof styles]
        }`}
      >
        {labels[statut as keyof typeof labels]}
      </span>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Détails de la commande">
      <div className="space-y-6">
        {/* En-tête de la commande */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {commande.numeroCommande}
              </h3>
              <p className="text-sm text-gray-600">
                Créée le {formatDate(commande.date)}
              </p>
            </div>
            {getStatutBadge(commande.statut)}
          </div>

          {commande.dateReception && (
            <p className="text-sm text-gray-600">
              Réceptionnée le {formatDate(commande.dateReception)}
            </p>
          )}
        </div>

        {/* Informations du fournisseur */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Fournisseur
          </h4>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🏢</span>
              <div>
                <p className="font-medium text-gray-900">{commande.fournisseur.nom}</p>
                <p className="text-sm text-gray-600">Contact: {commande.fournisseur.contact}</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <span className="mr-2">📞</span>
              {commande.fournisseur.telephone}
            </div>
            {commande.fournisseur.email && (
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-2">✉️</span>
                {commande.fournisseur.email}
              </div>
            )}
            <div className="flex items-center text-sm text-gray-600">
              <span className="mr-2">📍</span>
              {commande.fournisseur.adresse}
            </div>
          </div>
        </div>

        {/* Articles de la commande */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Articles commandés ({commande.items.length})
          </h4>
          <div tabIndex={0} role="region" aria-label="Tableau de données à défilement horizontal" className="ph-table-scroll border rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-700">
                    Médicament
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-700">
                    Qté commandée
                  </th>
                  {commande.statut === 'livree' && (
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-700">
                      Qté reçue
                    </th>
                  )}
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-700">
                    Prix Unit.
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-700">
                    Sous-total
                  </th>
                </tr>
              </thead>
              <tbody>
                {commande.items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="py-2 px-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.medicament.nom}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.medicament.description}
                        </p>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-sm text-right">
                      {item.quantiteCommandee}
                    </td>
                    {commande.statut === 'livree' && (
                      <td className="py-2 px-3 text-sm text-right">
                        <span
                          className={
                            item.quantiteRecue === item.quantiteCommandee
                              ? 'text-green-600 font-medium'
                              : 'text-orange-600 font-medium'
                          }
                        >
                          {item.quantiteRecue ?? 0}
                        </span>
                      </td>
                    )}
                    <td className="py-2 px-3 text-sm text-right">
                      {formatCurrency(item.prixUnitaire)}
                    </td>
                    <td className="py-2 px-3 text-sm text-right font-medium">
                      {formatCurrency(item.sousTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2">
                <tr>
                  <td
                    colSpan={commande.statut === 'livree' ? 4 : 3}
                    className="py-3 px-3 text-sm font-bold text-gray-900"
                  >
                    Total
                  </td>
                  <td className="py-3 px-3 text-sm font-bold text-gray-900 text-right">
                    {formatCurrency(commande.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Informations supplémentaires pour les commandes livrées */}
        {commande.statut === 'livree' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-green-600 text-xl mr-3">✓</span>
              <div>
                <h4 className="text-sm font-semibold text-green-900 mb-1">
                  Commande livrée
                </h4>
                <p className="text-sm text-green-700">
                  Cette commande a été réceptionnée et le stock a été mis à jour automatiquement.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bouton de fermeture */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
