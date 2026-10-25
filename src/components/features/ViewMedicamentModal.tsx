'use client';

import React from 'react';
import { Package, Calendar, DollarSign, AlertTriangle, User, Barcode } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Medicament } from '@/types';
import { formatPrice, formatDate, isLowStock, isExpired, isExpiringSoon } from '@/utils';

interface ViewMedicamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicament: Medicament | null;
}

export default function ViewMedicamentModal({ isOpen, onClose, medicament }: ViewMedicamentModalProps) {
  if (!medicament) return null;

  const stockStatus = () => {
    if (medicament.quantiteStock === 0) {
      return { color: 'text-red-600', bgColor: 'bg-red-100', label: 'Rupture de stock' };
    }
    if (isLowStock(medicament.quantiteStock, medicament.seuilAlerte)) {
      return { color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Stock faible' };
    }
    return { color: 'text-emerald-600', bgColor: 'bg-emerald-100', label: 'En stock' };
  };

  const expirationStatus = () => {
    if (isExpired(medicament.dateExpiration)) {
      return { color: 'text-red-600', bgColor: 'bg-red-100', label: 'Expiré' };
    }
    if (isExpiringSoon(medicament.dateExpiration)) {
      return { color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Expire bientôt' };
    }
    return { color: 'text-emerald-600', bgColor: 'bg-emerald-100', label: 'Valide' };
  };

  const stock = stockStatus();
  const expiration = expirationStatus();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Détails du médicament" size="lg">
      <div className="space-y-6">
        {/* Photo et informations principales */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0">
            {medicament.photo ? (
              <img
                src={medicament.photo}
                alt={medicament.nom}
                className="w-32 h-32 rounded-xl object-cover border border-gray-200"
              />
            ) : (
              <div className="w-32 h-32 rounded-xl bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                <Package size={48} className="text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{medicament.nom}</h3>
              <p className="text-lg text-gray-600">{medicament.dosage} - {medicament.forme}</p>
              {medicament.prescription && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 mt-2">
                  Sur ordonnance
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <DollarSign size={20} className="text-emerald-600" />
                <div>
                  <p className="text-sm text-gray-500">Prix</p>
                  <p className="font-semibold text-gray-900">{formatPrice(medicament.prix)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Package size={20} className="text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Stock</p>
                  <p className="font-semibold text-gray-900">{medicament.quantiteStock} unités</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statuts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg ${stock.bgColor}`}>
            <div className="flex items-center space-x-2">
              <Package size={20} className={stock.color} />
              <div>
                <p className="text-sm font-medium text-gray-700">Statut du stock</p>
                <p className={`font-semibold ${stock.color}`}>{stock.label}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Seuil d'alerte: {medicament.seuilAlerte} unités
                </p>
              </div>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${expiration.bgColor}`}>
            <div className="flex items-center space-x-2">
              <Calendar size={20} className={expiration.color} />
              <div>
                <p className="text-sm font-medium text-gray-700">Statut d'expiration</p>
                <p className={`font-semibold ${expiration.color}`}>{expiration.label}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Expire le: {formatDate(medicament.dateExpiration)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
          <p className="text-gray-700">{medicament.description}</p>
        </div>

        {/* Informations détaillées */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Informations produit</h4>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Catégorie:</span>
                <span className="font-medium text-gray-900">{medicament.categorie}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Forme:</span>
                <span className="font-medium text-gray-900 capitalize">{medicament.forme}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Fournisseur:</span>
                <span className="font-medium text-gray-900">{medicament.fournisseur}</span>
              </div>
              
              {medicament.codeBarres && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Code-barres:</span>
                  <span className="font-medium text-gray-900 font-mono">{medicament.codeBarres}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Historique</h4>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Ajouté le:</span>
                <span className="font-medium text-gray-900">{formatDate(medicament.dateAjout)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Modifié le:</span>
                <span className="font-medium text-gray-900">{formatDate(medicament.dateModification)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alertes */}
        {(isLowStock(medicament.quantiteStock, medicament.seuilAlerte) || 
          isExpired(medicament.dateExpiration) || 
          isExpiringSoon(medicament.dateExpiration)) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-800">Alertes</h4>
                <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                  {isLowStock(medicament.quantiteStock, medicament.seuilAlerte) && (
                    <li>• Stock faible - Réapprovisionnement recommandé</li>
                  )}
                  {isExpired(medicament.dateExpiration) && (
                    <li>• Médicament expiré - Retirer du stock</li>
                  )}
                  {isExpiringSoon(medicament.dateExpiration) && !isExpired(medicament.dateExpiration) && (
                    <li>• Expiration proche - Vendre en priorité</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
