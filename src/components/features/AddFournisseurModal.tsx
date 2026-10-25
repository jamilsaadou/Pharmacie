'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useFournisseurData } from '@/hooks/useFournisseurData';
import { Fournisseur } from '@/types';
import { Phone, Mail, MapPin } from 'lucide-react';

interface AddFournisseurModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddFournisseurModal({ isOpen, onClose }: AddFournisseurModalProps) {
  const { ajouterFournisseur, validerFournisseur } = useFournisseurData();

  const [form, setForm] = useState({
    nom: '',
    contact: '',
    telephone: '',
    email: '',
    adresse: '',
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors.length) setErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data: Omit<Fournisseur, 'id' | 'dateAjout'> = {
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
      ajouterFournisseur(data);
      setForm({ nom: '', contact: '', telephone: '', email: '', adresse: '' });
      onClose();
    } catch {
      setErrors(["Une erreur est survenue lors de l'ajout"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors([]);
      setForm({ nom: '', contact: '', telephone: '', email: '', adresse: '' });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nouveau fournisseur">
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
          <Button type="submit" loading={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {isSubmitting ? 'Ajout en cours...' : 'Ajouter'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
