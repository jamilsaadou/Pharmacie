'use client';

import React, { useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAssuranceData } from '@/hooks/useAssuranceData';
import { dateToInputValue, inputValueToDate } from '@/utils';

interface AddRemboursementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddRemboursementModal({ isOpen, onClose }: AddRemboursementModalProps) {
  const { assurances, creerDossier } = useAssuranceData();
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [form, setForm] = useState({
    assuranceId: '',
    periodeDebut: dateToInputValue(firstDay),
    periodeFin: dateToInputValue(today),
    montantTotal: '',
    tauxCouverture: '',
    montantCouvert: '',
    commentaire: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const assurance = useMemo(() => assurances.find(a => a.id === form.assuranceId), [assurances, form.assuranceId]);

  const onChange = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors.length) setErrors([]);
  };

  const computeMontantCouvert = () => {
    const total = Number(form.montantTotal) || 0;
    const taux = form.montantCouvert ? undefined : (form.tauxCouverture ? Number(form.tauxCouverture) : (assurance?.tauxCouverture ?? 0));
    if (form.montantCouvert) return Number(form.montantCouvert);
    return Math.round((total * (taux || 0)) / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const vErrors: string[] = [];
    if (!form.assuranceId) vErrors.push('Assurance obligatoire');
    if (!form.periodeDebut) vErrors.push('Période début obligatoire');
    if (!form.periodeFin) vErrors.push('Période fin obligatoire');
    if (!form.montantTotal) vErrors.push('Montant total obligatoire');
    if (vErrors.length) {
      setErrors(vErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const montantTotal = Number(form.montantTotal);
      const montantCouvert = computeMontantCouvert();
      const montantPayeClient = Math.max(0, montantTotal - montantCouvert);
      await creerDossier({
        assuranceId: form.assuranceId,
        dateSoumission: new Date(),
        periodeDebut: inputValueToDate(form.periodeDebut),
        periodeFin: inputValueToDate(form.periodeFin),
        montantTotal,
        montantCouvert,
        montantPayeClient,
        venteId: undefined,
        assureId: undefined,
        commentaire: form.commentaire || undefined,
      });
      onClose();
      setForm({ assuranceId: '', periodeDebut: dateToInputValue(firstDay), periodeFin: dateToInputValue(today), montantTotal: '', tauxCouverture: '', montantCouvert: '', commentaire: '' });
    } catch {
      setErrors(['Erreur lors de la création du dossier']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors([]);
      setForm({ assuranceId: '', periodeDebut: dateToInputValue(firstDay), periodeFin: dateToInputValue(today), montantTotal: '', tauxCouverture: '', montantCouvert: '', commentaire: '' });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nouveau dossier de remboursement">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <ul className="list-disc list-inside space-y-1">
              {errors.map((e, i) => (<li key={i}>{e}</li>))}
            </ul>
          </div>
        )}

        <Select value={form.assuranceId} onChange={onChange('assuranceId')}>
          <option value="">Sélectionner une assurance *</option>
          {assurances.map(a => (<option key={a.id} value={a.id}>{a.nom}</option>))}
        </Select>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Période début *" type="date" value={form.periodeDebut} onChange={onChange('periodeDebut')} required />
          <Input label="Période fin *" type="date" value={form.periodeFin} onChange={onChange('periodeFin')} required />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Montant total *" type="number" value={form.montantTotal} onChange={onChange('montantTotal')} required />
          <Input label={`Taux couverture (%)${assurance ? ` (def. ${assurance.tauxCouverture}%)` : ''}`} type="number" value={form.tauxCouverture} onChange={onChange('tauxCouverture')} placeholder="Laisser vide pour taux par défaut" />
          <Input label="Montant couvert (prioritaire)" type="number" value={form.montantCouvert} onChange={onChange('montantCouvert')} placeholder="Sinon calculé via taux" />
        </div>

        <Input label="Commentaire" value={form.commentaire} onChange={onChange('commentaire')} />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Annuler</Button>
          <Button type="submit" loading={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {isSubmitting ? 'Création...' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

