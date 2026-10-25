'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ModuleId, Role, Utilisateur, VentesAccessId } from '@/types';
import { useUserData } from '@/hooks/useUserData';
import { ALL_VENTES_ACCESS, VENTES_ACCESS_OPTIONS } from '@/constants/ventesAccess';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Utilisateur | null;
}

export function EditUserModal({ isOpen, onClose, user }: EditUserModalProps) {
  const { modulesDisponibles, modifierUtilisateur } = useUserData();
  const [form, setForm] = useState<{
    nom: string;
    prenom: string;
    email: string;
    role: Role;
    actif: boolean;
    modulesSupplementaires: ModuleId[];
    ventesAccess: VentesAccessId[];
  }>({
    nom: '',
    prenom: '',
    email: '',
    role: 'vendeur',
    actif: true,
    modulesSupplementaires: [],
    ventesAccess: ALL_VENTES_ACCESS,
  });

  useEffect(() => {
    if (user) {
      setForm({
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        actif: user.actif,
        modulesSupplementaires: user.modulesSupplementaires || [],
        ventesAccess: user.ventesAccess && user.ventesAccess.length > 0 ? user.ventesAccess : ALL_VENTES_ACCESS,
      });
    }
  }, [user]);

  const canSubmit = useMemo(() => {
    return form.nom.trim() && form.prenom.trim() && /[^\s@]+@[^\s@]+\.[^\s@]+/.test(form.email);
  }, [form]);

  const toggleModule = (id: ModuleId) => {
    setForm((prev) => ({
      ...prev,
      modulesSupplementaires: prev.modulesSupplementaires.includes(id)
        ? prev.modulesSupplementaires.filter((m) => m !== id)
        : [...prev.modulesSupplementaires, id],
    }));
  };

  const toggleVenteAccess = (id: VentesAccessId) => {
    setForm((prev) => ({
      ...prev,
      ventesAccess: prev.ventesAccess.includes(id)
        ? prev.ventesAccess.filter((access) => access !== id)
        : [...prev.ventesAccess, id],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user) return;
    modifierUtilisateur(user.id, {
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      email: form.email.trim(),
      role: form.role,
      actif: form.actif,
      modulesSupplementaires: form.modulesSupplementaires,
      ventesAccess: form.ventesAccess,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifier l'utilisateur" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nom"
            value={form.nom}
            onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
            required
          />
          <Input
            label="Prénom"
            value={form.prenom}
            onChange={(e) => setForm((p) => ({ ...p, prenom: e.target.value }))}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
          <Select
            label="Rôle"
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}
          >
            <option value="vendeur">Vendeur</option>
            <option value="pharmacien">Pharmacien</option>
            <option value="admin">Administrateur</option>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="actif_edit"
            type="checkbox"
            checked={form.actif}
            onChange={(e) => setForm((p) => ({ ...p, actif: e.target.checked }))}
          />
          <label htmlFor="actif_edit" className="text-sm text-gray-700">Compte actif</label>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-800">Accès supplémentaires (au-delà du rôle par défaut)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {modulesDisponibles.map((m) => (
              <label key={m.id} className="flex items-center gap-2 p-2 rounded border border-emerald-200">
                <input
                  type="checkbox"
                  checked={form.modulesSupplementaires.includes(m.id)}
                  onChange={() => toggleModule(m.id)}
                />
                <span className="text-sm">{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-800">Accès aux catégories de factures (module ventes)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {VENTES_ACCESS_OPTIONS.map((option) => (
              <label key={option.id} className="flex items-start gap-2 p-2 rounded border border-emerald-200">
                <input
                  type="checkbox"
                  checked={form.ventesAccess.includes(option.id)}
                  onChange={() => toggleVenteAccess(option.id)}
                />
                <span className="text-sm">
                  {option.label}
                  {option.description ? <span className="block text-xs text-gray-500">{option.description}</span> : null}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={!canSubmit}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}
