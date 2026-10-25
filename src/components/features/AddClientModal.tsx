'use client';

import React, { useState } from 'react';
import { useClientData } from '@/hooks/useClientData';
import { Client } from '@/types';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddClientModal({ isOpen, onClose }: AddClientModalProps) {
  const { ajouterClient, validerClient } = useClientData();
  
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    nif: '',
    telephone: '',
    email: '',
    adresse: '',
    dateNaissance: '',
    numeroSecu: '',
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // Effacer les erreurs quand l'utilisateur commence à taper
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Préparer les données du client
    const clientData: Omit<Client, 'id' | 'dateInscription'> = {
      nom: formData.nom.trim(),
      prenom: formData.prenom.trim(),
      nif: formData.nif.trim() || undefined,
      telephone: formData.telephone.trim() || undefined,
      email: formData.email.trim() || undefined,
      adresse: formData.adresse.trim() || undefined,
      dateNaissance: formData.dateNaissance ? new Date(formData.dateNaissance) : undefined,
      numeroSecu: formData.numeroSecu.trim() || undefined,
    };

    // Valider les données
    const validation = validerClient(clientData);
    
    if (!validation.valide) {
      setErrors(validation.erreurs);
      setIsSubmitting(false);
      return;
    }

    try {
      // Ajouter le client
      ajouterClient(clientData);
      
      // Réinitialiser le formulaire
      setFormData({
        nom: '',
        prenom: '',
        nif: '',
        telephone: '',
        email: '',
        adresse: '',
        dateNaissance: '',
        numeroSecu: '',
      });
      
      // Fermer la modale
      onClose();
    } catch (error) {
      setErrors(['Une erreur est survenue lors de l\'ajout du client']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        nom: '',
        prenom: '',
        nif: '',
        telephone: '',
        email: '',
        adresse: '',
        dateNaissance: '',
        numeroSecu: '',
      });
      setErrors([]);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nouveau client">
      <form onSubmit={handleSubmit} className="space-y-4">
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

        {/* Informations personnelles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nom *"
            type="text"
            value={formData.nom}
            onChange={handleInputChange('nom')}
            placeholder="Nom de famille"
            required
          />
          
          <Input
            label="Prénom *"
            type="text"
            value={formData.prenom}
            onChange={handleInputChange('prenom')}
            placeholder="Prénom"
            required
          />
          <Input
            label="NIF"
            type="text"
            value={formData.nif}
            onChange={handleInputChange('nif')}
            placeholder="Numéro d'identification fiscale"
          />
        </div>

        {/* Informations de contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Téléphone"
            type="tel"
            value={formData.telephone}
            onChange={handleInputChange('telephone')}
            placeholder="70 12 34 56"
            icon="📞"
          />
          
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleInputChange('email')}
            placeholder="client@email.com"
            icon="✉️"
          />
        </div>

        {/* Adresse */}
        <Input
          label="Adresse"
          type="text"
          value={formData.adresse}
          onChange={handleInputChange('adresse')}
          placeholder="Adresse complète"
          icon="🏠"
        />

        {/* Informations supplémentaires */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Date de naissance"
            type="date"
            value={formData.dateNaissance}
            onChange={handleInputChange('dateNaissance')}
            icon="🎂"
          />
          
          <Input
            label="N° Sécurité sociale"
            type="text"
            value={formData.numeroSecu}
            onChange={handleInputChange('numeroSecu')}
            placeholder="13 chiffres"
            maxLength={13}
            icon="🆔"
          />
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
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? 'Ajout en cours...' : 'Ajouter le client'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
