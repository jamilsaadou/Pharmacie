'use client';

import React, { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useFournisseurData } from '@/hooks/useFournisseurData';
import { Fournisseur } from '@/types';
import { Phone, Mail, MapPin } from 'lucide-react';

interface EditFournisseurModalProps {
  isOpen: boolean;
  onClose: () => void;
  fournisseur: Fournisseur;
}

export function EditFournisseurModal({ isOpen, onClose, fournisseur }: EditFournisseurModalProps) {
  const { modifierFournisseur, validerFournisseur } = useFournisseurData();

  const [form, setForm] = useState({
    nom: '',
    contact: '',
    telephone: '',
    email: '',
    adresse: '',
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (fournisseur) {
      setForm({
        nom: fournisseur.nom || '',
        contact: fournisseur.contact || '',
        telephone: fournisseur.telephone || '',
        email: fournisseur.email || '',
        adresse: fournisseur.adresse || '',
      });
    }
  }, [fournisseur]);

  const onChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors.length) setErrors([]);
  };

  const hasChanges = () => {
    const original = {
      nom: fournisseur.nom || '',
      contact: fournisseur.contact || '',
      telephone: fournisseur.telephone || '',
      email: fournisseur.email || '',
      adresse: fournisseur.adresse || '',
    };
    return JSON.stringify(form) !== JSON.stringify(original);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data: Partial<Omit<Fournisseur, 'id' | 'dateAjout'>> = {
      nom: form.nom.trim(),
      contact: form.contact.trim(),
      telephone: form.telephone.trim(),
      email: form.email.trim() || undefined,
      adresse: form.adresse.trim(),
    };

    const validation = validerFournisseur(data);
    if (!validation.valide) {
      setErrors(validation.erreurs);
      setIsSubmitting(false);
      return;
    }

    try {
      modifierFournisseur(fournisseur.id, data);
      onClose();
    } catch {
      setErrors(["Une erreur est survenue lors de la modification"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors([]);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Modifier le fournisseur`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-700">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((e, i) => (<li key={i}>{e}</li>))}
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nom du fournisseur *" value={form.nom} onChange={onChange('nom')} required />
          <Input label="Nom du contact *" value={form.contact} onChange={onChange('contact')} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Téléphone *" type="tel" value={form.telephone} onChange={onChange('telephone')} required icon={<Phone size={16} />} />
          <Input label="Email" type="email" value={form.email} onChange={onChange('email')} icon={<Mail size={16} />} />
        </div>
        <Input label="Adresse *" value={form.adresse} onChange={onChange('adresse')} required icon={<MapPin size={16} />} />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Annuler</Button>
          <Button type="submit" loading={isSubmitting} disabled={!hasChanges()} className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400">
            {isSubmitting ? 'Modification en cours...' : 'Modifier'}
          </Button>
        </div>

        {!hasChanges() && (
          <p className="text-sm text-gray-500 text-center">Aucune modification détectée</p>
        )}
      </form>
    </Modal>
  );
}
