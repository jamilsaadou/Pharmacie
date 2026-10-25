'use client';

import React, { useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAssuranceData } from '@/hooks/useAssuranceData';
import { useClientData } from '@/hooks/useClientData';
import { dateToInputValue, inputValueToDate } from '@/utils';

interface AddAssureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddAssureModal({ isOpen, onClose }: AddAssureModalProps) {
  const { assurances, ajouterAssure } = useAssuranceData();
  const { clients } = useClientData();

  const [form, setForm] = useState({
    clientId: '',
    assuranceId: '',
    numeroPolice: '',
    tauxCouverture: '',
    dateDebut: dateToInputValue(new Date()),
    dateFin: '',
    actif: true,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onChange = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: value as any }));
    if (errors.length) setErrors([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const vErrors: string[] = [];
    if (!form.clientId) vErrors.push('Le client est obligatoire');
    if (!form.assuranceId) vErrors.push('L\'assurance est obligatoire');
    if (!form.numeroPolice.trim()) vErrors.push('Le numéro de police est obligatoire');
    if (vErrors.length) {
      setErrors(vErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      await ajouterAssure({
        clientId: form.clientId,
        assuranceId: form.assuranceId,
        numeroPolice: form.numeroPolice.trim(),
        tauxCouverture: form.tauxCouverture ? Number(form.tauxCouverture) : undefined,
        dateDebut: inputValueToDate(form.dateDebut),
        dateFin: form.dateFin ? inputValueToDate(form.dateFin) : undefined,
        actif: !!form.actif,
      });
      setForm({ clientId: '', assuranceId: '', numeroPolice: '', tauxCouverture: '', dateDebut: dateToInputValue(new Date()), dateFin: '', actif: true });
      onClose();
    } catch {
      setErrors(["Une erreur est survenue lors de l'enregistrement de l'assuré"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors([]);
      setForm({ clientId: '', assuranceId: '', numeroPolice: '', tauxCouverture: '', dateDebut: dateToInputValue(new Date()), dateFin: '', actif: true });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nouvel assuré">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <ul className="list-disc list-inside space-y-1">
              {errors.map((e, i) => (<li key={i}>{e}</li>))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select value={form.clientId} onChange={onChange('clientId')}>
            <option value="">Sélectionner un client *</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>
            ))}
          </Select>
          <Select value={form.assuranceId} onChange={onChange('assuranceId')}>
            <option value="">Sélectionner une assurance *</option>
            {assurances.map(a => (
              <option key={a.id} value={a.id}>{a.nom}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Numéro de police *" value={form.numeroPolice} onChange={onChange('numeroPolice')} required />
          <Input label="Taux (optionnel, %)" type="number" min="0" max="100" value={form.tauxCouverture} onChange={onChange('tauxCouverture')} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Date début *" type="date" value={form.dateDebut} onChange={onChange('dateDebut')} required />
          <Input label="Date fin" type="date" value={form.dateFin} onChange={onChange('dateFin')} />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Annuler</Button>
          <Button type="submit" loading={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {isSubmitting ? 'Enregistrement...' : 'Ajouter'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

