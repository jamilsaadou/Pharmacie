'use client';

import React, { useState } from 'react';
import { Upload, Package, Camera, List } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useMedicamentData } from '@/hooks/useMedicamentData';
import { FormulaireMedicament, GroupeTaxation } from '@/types';
import { dateToInputValue } from '@/utils';
import { medicamentsPredefined, MedicamentPredefini } from '@/data/predefinedMedicaments';

interface AddMedicamentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddMedicamentModal({ isOpen, onClose }: AddMedicamentModalProps) {
  const { ajouterMedicament } = useMedicamentData();
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  
  const [formData, setFormData] = useState<FormulaireMedicament>({
    nom: '',
    description: '',
    prix: '0',
    quantiteStock: '0',
    seuilAlerte: '10',
    dateExpiration: dateToInputValue(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)), // 1 an
    categorie: '',
    fournisseur: '',
    codeBarres: '',
    dosage: '',
    forme: 'comprimé',
    prescription: false,
    groupeTaxation: 'B', // Défaut: TVA 19%
  });

  const [errors, setErrors] = useState<Partial<FormulaireMedicament>>({});
  const [selectedPredefined, setSelectedPredefined] = useState<string>('');

  const categories = [
    'Antalgiques',
    'Antibiotiques',
    'Sirops',
    'Vitamines',
    'Antiseptiques',
    'Anti-inflammatoires',
    'Cardiovasculaires',
    'Digestifs',
    'Respiratoires',
    'Dermatologiques',
  ];

  const fournisseurs = [
    'Pharma Plus',
    'MediCorp',
    'Santé Afrique',
    'Laboratoires Modernes',
    'PharmaCare Distribution',
  ];

  const handleInputChange = (field: keyof FormulaireMedicament, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleLoadPredefined = (medicamentNom: string) => {
    if (!medicamentNom) return;

    const medicament = medicamentsPredefined.find(m => m.nom === medicamentNom);
    if (!medicament) return;

    setFormData(prev => ({
      ...prev,
      nom: medicament.nom,
      description: medicament.description,
      prix: medicament.prix.toString(),
      dosage: medicament.dosage,
      forme: medicament.forme,
      categorie: medicament.categorie,
      prescription: medicament.prescription,
      seuilAlerte: medicament.seuilAlerte.toString(),
      groupeTaxation: medicament.groupeTaxation || 'B',
    }));

    setSelectedPredefined(medicamentNom);
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPhotoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormulaireMedicament> = {};

    if (!formData.nom.trim()) newErrors.nom = 'Le nom est requis';
    if (!formData.description.trim()) newErrors.description = 'La description est requise';
    if (Number(formData.prix) <= 0) newErrors.prix = 'Le prix doit être supérieur à 0';
    if (Number(formData.quantiteStock) < 0) newErrors.quantiteStock = 'La quantité ne peut pas être négative';
    if (Number(formData.seuilAlerte) < 0) newErrors.seuilAlerte = 'Le seuil d\'alerte ne peut pas être négatif';
    if (!formData.categorie) newErrors.categorie = 'La catégorie est requise';
    if (!formData.fournisseur) newErrors.fournisseur = 'Le fournisseur est requis';
    if (!formData.dosage.trim()) newErrors.dosage = 'Le dosage est requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const nouveauMedicament = {
        nom: formData.nom,
        description: formData.description,
        prix: Number(formData.prix),
        quantiteStock: Number(formData.quantiteStock),
        seuilAlerte: Number(formData.seuilAlerte),
        dateExpiration: new Date(formData.dateExpiration),
        categorie: formData.categorie,
        fournisseur: formData.fournisseur,
        codeBarres: formData.codeBarres,
        dosage: formData.dosage,
        forme: formData.forme,
        prescription: formData.prescription,
        photo: photoPreview || undefined,
        groupeTaxation: formData.groupeTaxation,
      };

      ajouterMedicament(nouveauMedicament);
      
      // Reset form
      setFormData({
        nom: '',
        description: '',
        prix: '0',
        quantiteStock: '0',
        seuilAlerte: '10',
        dateExpiration: dateToInputValue(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
        categorie: '',
        fournisseur: '',
        codeBarres: '',
        dosage: '',
        forme: 'comprimé',
        prescription: false,
        groupeTaxation: 'B',
      });
      setPhotoPreview('');
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du médicament:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter un médicament" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Predefined Medications Selector */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <List size={20} className="text-emerald-600" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-emerald-900">
                  Charger un médicament prédéfini
                </h3>
                <p className="text-xs text-emerald-700 mt-1">
                  Sélectionnez un médicament dans la liste pour remplir automatiquement le formulaire
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <select
                  value={selectedPredefined}
                  onChange={(e) => handleLoadPredefined(e.target.value)}
                  className="flex-1 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="">-- Sélectionner un médicament --</option>
                  {medicamentsPredefined.map((med) => (
                    <option key={med.nom} value={med.nom}>
                      {med.nom} - {med.categorie}
                    </option>
                  ))}
                </select>
                {selectedPredefined && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPredefined('');
                      setFormData({
                        nom: '',
                        description: '',
                        prix: '0',
                        quantiteStock: '0',
                        seuilAlerte: '10',
                        dateExpiration: dateToInputValue(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
                        categorie: '',
                        fournisseur: '',
                        codeBarres: '',
                        dosage: '',
                        forme: 'comprimé',
                        prescription: false,
                        groupeTaxation: 'B',
                      });
                    }}
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Photo Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Photo du médicament</label>
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Aperçu"
                  className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                  <Camera size={24} className="text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                <Upload size={16} className="mr-2" />
                Choisir une photo
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Formats acceptés: JPG, PNG, GIF (max 5MB)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nom */}
          <Input
            label="Nom du médicament *"
            value={formData.nom}
            onChange={(e) => handleInputChange('nom', e.target.value)}
            error={errors.nom}
            placeholder="Ex: Paracétamol 500mg"
          />

          {/* Dosage */}
          <Input
            label="Dosage *"
            value={formData.dosage}
            onChange={(e) => handleInputChange('dosage', e.target.value)}
            error={errors.dosage}
            placeholder="Ex: 500mg, 1g, 100ml"
          />

          {/* Description */}
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              rows={3}
              placeholder="Description du médicament et de ses effets"
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description}</p>
            )}
          </div>

          {/* Prix */}
          <Input
            label="Prix (FCFA) *"
            type="number"
            value={formData.prix}
            onChange={(e) => handleInputChange('prix', Number(e.target.value))}
            error={errors.prix}
            placeholder="0"
            min="0"
            step="0.01"
          />

          {/* Quantité en stock */}
          <Input
            label="Quantité en stock *"
            type="number"
            value={formData.quantiteStock}
            onChange={(e) => handleInputChange('quantiteStock', Number(e.target.value))}
            error={errors.quantiteStock}
            placeholder="0"
            min="0"
          />

          {/* Seuil d'alerte */}
          <Input
            label="Seuil d'alerte *"
            type="number"
            value={formData.seuilAlerte}
            onChange={(e) => handleInputChange('seuilAlerte', Number(e.target.value))}
            error={errors.seuilAlerte}
            placeholder="10"
            min="0"
          />

          {/* Date d'expiration */}
          <Input
            label="Date d'expiration *"
            type="date"
            value={formData.dateExpiration}
            onChange={(e) => handleInputChange('dateExpiration', e.target.value)}
            error={errors.dateExpiration}
          />

          {/* Catégorie */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Catégorie *</label>
            <select
              value={formData.categorie}
              onChange={(e) => handleInputChange('categorie', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.categorie && (
              <p className="text-sm text-red-600">{errors.categorie}</p>
            )}
          </div>

          {/* Fournisseur */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Fournisseur *</label>
            <select
              value={formData.fournisseur}
              onChange={(e) => handleInputChange('fournisseur', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">Sélectionner un fournisseur</option>
              {fournisseurs.map(fournisseur => (
                <option key={fournisseur} value={fournisseur}>{fournisseur}</option>
              ))}
            </select>
            {errors.fournisseur && (
              <p className="text-sm text-red-600">{errors.fournisseur}</p>
            )}
          </div>

          {/* Forme */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Forme</label>
            <select
              value={formData.forme}
              onChange={(e) => handleInputChange('forme', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="comprimé">Comprimé</option>
              <option value="gélule">Gélule</option>
              <option value="sirop">Sirop</option>
              <option value="injection">Injection</option>
              <option value="pommade">Pommade</option>
              <option value="autre">Autre</option>
            </select>
          </div>

          {/* Code-barres */}
          <Input
            label="Code-barres"
            value={formData.codeBarres}
            onChange={(e) => handleInputChange('codeBarres', e.target.value)}
            placeholder="Ex: 3401579804567"
          />

          {/* Groupe de taxation e-SECeF */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Groupe de taxation *</label>
            <select
              value={formData.groupeTaxation}
              onChange={(e) => handleInputChange('groupeTaxation', e.target.value as GroupeTaxation)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {'ABCD'.split('').map(group => <option key={group} value={group}>Groupe {group}{group === 'A' ? ' · Exonéré' : ''}</option>)}
            </select>
            <p className="text-xs text-gray-500">
              Groupe A: produits exonérés de TVA | Groupe B: TVA 19% | C: TVA 10% | D: TVA 5%
            </p>
          </div>
        </div>

        {/* Sur ordonnance */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="prescription"
            checked={formData.prescription}
            onChange={(e) => handleInputChange('prescription', e.target.checked)}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label htmlFor="prescription" className="text-sm font-medium text-gray-700">
            Médicament sur ordonnance
          </label>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={loading}
          >
            Ajouter le médicament
          </Button>
        </div>
      </form>
    </Modal>
  );
}
