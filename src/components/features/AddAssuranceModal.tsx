'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAssuranceData } from '@/hooks/useAssuranceData';
import { Mail, Phone, MapPin, Percent, Shield } from 'lucide-react';

interface AddAssuranceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddAssuranceModal({ isOpen, onClose }: AddAssuranceModalProps) {
  const { ajouterAssurance, validerAssurance } = useAssuranceData();
  const [form, setForm] = useState({
    nom: '',
    code: '',
    tauxCouverture: 80,
    telephone: '',
    email: '',
    adresse: '',
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'tauxCouverture' ? Number(e.target.value) : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors.length) setErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data = {
      nom: form.nom.trim(),
      code: form.code.trim() || undefined,
      tauxCouverture: Number(form.tauxCouverture),
      telephone: form.telephone.trim() || undefined,
      email: form.email.trim() || undefined,
      adresse: form.adresse.trim() || undefined,
    };

    const validation = validerAssurance(data as any);
    if (!validation.valide) {
      setErrors(validation.erreurs);
      setIsSubmitting(false);
      return;
    }

    try {
      await ajouterAssurance(data as any);
      setForm({ nom: '', code: '', tauxCouverture: 80, telephone: '', email: '', adresse: '' });
      onClose();
    } catch {
      setErrors(["Une erreur est survenue lors de l'ajout de l'assurance"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors([]);
      setForm({ nom: '', code: '', tauxCouverture: 80, telephone: '', email: '', adresse: '' });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nouvelle assurance">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <ul className="list-disc list-inside space-y-1">
              {errors.map((e, i) => (<li key={i}>{e}</li>))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nom *" value={form.nom} onChange={onChange('nom')} required icon={<Shield size={16} />} />
          <Input label="Code" value={form.code} onChange={onChange('code')} placeholder="Ex: CNSS" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Taux couverture (%) *" type="number" min="0" max="100" value={form.tauxCouverture} onChange={onChange('tauxCouverture')} required icon={<Percent size={16} />} />
          <Input label="Téléphone" value={form.telephone} onChange={onChange('telephone')} icon={<Phone size={16} />} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Email" type="email" value={form.email} onChange={onChange('email')} icon={<Mail size={16} />} />
          <Input label="Adresse" value={form.adresse} onChange={onChange('adresse')} icon={<MapPin size={16} />} />
        </div>

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

