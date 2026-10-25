'use client';

import React, { useState } from 'react';
import { useCommandeData } from '@/hooks/useCommandeData';
import { useFournisseurData } from '@/hooks/useFournisseurData';
import { usePharmacieData } from '@/hooks/usePharmacieData';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatCurrency } from '@/utils';

interface AddCommandeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ItemCommande {
  medicamentId: string;
  medicamentNom: string;
  quantiteCommandee: number;
  prixUnitaire: number;
}

export function AddCommandeModal({ isOpen, onClose }: AddCommandeModalProps) {
  const { createCommande } = useCommandeData();
  const { fournisseurs, loading: loadingFournisseurs } = useFournisseurData();
  const { medicaments, loading: loadingMedicaments } = usePharmacieData();
  
  const [fournisseurId, setFournisseurId] = useState('');
  const [items, setItems] = useState<ItemCommande[]>([]);
  const [selectedMedicament, setSelectedMedicament] = useState('');
  const [quantite, setQuantite] = useState('');
  const [prixUnitaire, setPrixUnitaire] = useState('');
  
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ajouter un item à la commande
  const handleAddItem = () => {
    if (!selectedMedicament || !quantite || !prixUnitaire) {
      setErrors(['Veuillez remplir tous les champs pour ajouter un article']);
      return;
    }

    const qty = parseInt(quantite);
    const prix = parseFloat(prixUnitaire);

    if (qty <= 0 || prix <= 0) {
      setErrors(['Les quantités et prix doivent être supérieurs à 0']);
      return;
    }

    // Vérifier si le médicament n'est pas déjà dans la liste
    if (items.some(item => item.medicamentId === selectedMedicament)) {
      setErrors(['Ce médicament est déjà dans la commande']);
      return;
    }

    const medicament = medicaments.find(m => m.id === selectedMedicament);
    if (!medicament) return;

    const newItem: ItemCommande = {
      medicamentId: selectedMedicament,
      medicamentNom: medicament.nom,
      quantiteCommandee: qty,
      prixUnitaire: prix,
    };

    setItems([...items, newItem]);
    setSelectedMedicament('');
    setQuantite('');
    setPrixUnitaire('');
    setErrors([]);
  };

  // Supprimer un item
  const handleRemoveItem = (medicamentId: string) => {
    setItems(items.filter(item => item.medicamentId !== medicamentId));
  };

  // Calculer le total
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantiteCommandee * item.prixUnitaire), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    // Validation
    if (!fournisseurId) {
      setErrors(['Veuillez sélectionner un fournisseur']);
      setIsSubmitting(false);
      return;
    }

    if (items.length === 0) {
      setErrors(['Veuillez ajouter au moins un article à la commande']);
      setIsSubmitting(false);
      return;
    }

    try {
      // Créer la commande
      await createCommande({
        fournisseurId,
        items: items.map(item => ({
          medicamentId: item.medicamentId,
          quantiteCommandee: item.quantiteCommandee,
          prixUnitaire: item.prixUnitaire,
        })),
      });
      
      // Réinitialiser le formulaire
      setFournisseurId('');
      setItems([]);
      setSelectedMedicament('');
      setQuantite('');
      setPrixUnitaire('');
      
      // Fermer la modale
      onClose();
    } catch (error) {
      setErrors(['Une erreur est survenue lors de la création de la commande']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFournisseurId('');
      setItems([]);
      setSelectedMedicament('');
      setQuantite('');
      setPrixUnitaire('');
      setErrors([]);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nouvelle commande fournisseur">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Affichage des erreurs */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-400">⚠️</div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Erreurs de validation
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sélection du fournisseur */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fournisseur *
          </label>
          <Select
            value={fournisseurId}
            onChange={(e) => setFournisseurId(e.target.value)}
            required
            disabled={loadingFournisseurs}
          >
            <option value="">
              {loadingFournisseurs ? 'Chargement des fournisseurs...' : fournisseurs.length === 0 ? 'Aucun fournisseur disponible' : 'Sélectionner un fournisseur'}
            </option>
            {!loadingFournisseurs && fournisseurs.length > 0 && fournisseurs.map((fournisseur) => (
              <option key={fournisseur.id} value={fournisseur.id}>
                {fournisseur.nom} - {fournisseur.contact}
              </option>
            ))}
          </Select>
          {!loadingFournisseurs && fournisseurs.length === 0 && (
            <p className="text-sm text-red-600 mt-1">
              Aucun fournisseur trouvé. Veuillez d'abord ajouter un fournisseur.
            </p>
          )}
        </div>

        {/* Ajout d'articles */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Articles de la commande</h3>
          
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Médicament
              </label>
              <Select
                value={selectedMedicament}
                onChange={(e) => {
                  setSelectedMedicament(e.target.value);
                  // Pré-remplir le prix avec le prix du médicament
                  const med = medicaments.find(m => m.id === e.target.value);
                  if (med) {
                    setPrixUnitaire(med.prix.toString());
                  }
                }}
              >
                <option value="">
                  {loadingMedicaments ? 'Chargement...' : 'Sélectionner un médicament'}
                </option>
                {medicaments.map((medicament) => (
                  <option key={medicament.id} value={medicament.id}>
                    {medicament.nom} - {formatCurrency(medicament.prix)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantité"
                type="number"
                value={quantite}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantite(e.target.value)}
                placeholder="Ex: 100"
                min="1"
              />
              
              <Input
                label="Prix unitaire (FCFA)"
                type="number"
                value={prixUnitaire}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrixUnitaire(e.target.value)}
                placeholder="Ex: 1500"
                min="0"
                step="0.01"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleAddItem}
              className="w-full"
            >
              + Ajouter l'article
            </Button>
          </div>

          {/* Liste des articles */}
          {items.length > 0 && (
            <div tabIndex={0} role="region" aria-label="Tableau de données à défilement horizontal" className="ph-table-scroll border rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Médicament</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">Qté</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">Prix Unit.</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">Sous-total</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.medicamentId} className="border-t">
                      <td className="py-2 px-3 text-sm">{item.medicamentNom}</td>
                      <td className="py-2 px-3 text-sm text-right">{item.quantiteCommandee}</td>
                      <td className="py-2 px-3 text-sm text-right">
                        {formatCurrency(item.prixUnitaire)}
                      </td>
                      <td className="py-2 px-3 text-sm text-right font-medium">
                        {formatCurrency(item.quantiteCommandee * item.prixUnitaire)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveItem(item.medicamentId)}
                          className="text-red-600 hover:text-red-700"
                        >
                          ✕
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 text-sm font-bold text-gray-900">
                      Total
                    </td>
                    <td className="py-3 px-3 text-sm font-bold text-gray-900 text-right">
                      {formatCurrency(calculateTotal())}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={items.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? 'Création en cours...' : 'Créer la commande'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
