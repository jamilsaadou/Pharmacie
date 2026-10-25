'use client';

import React, { useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ModuleId, Role, Utilisateur, VentesAccessId } from '@/types';
import { useUserData } from '@/hooks/useUserData';
import { ALL_VENTES_ACCESS, VENTES_ACCESS_OPTIONS } from '@/constants/ventesAccess';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddUserModal({ isOpen, onClose }: AddUserModalProps) {
  const { modulesDisponibles, ajouterUtilisateur } = useUserData();
  type NewUserInput = Omit<Utilisateur, 'id' | 'dateCreation'> & { motDePasse: string };
  const [form, setForm] = useState<{
    nom: string;
    prenom: string;
    email: string;
    motDePasse: string;
    role: Role;
    actif: boolean;
    modulesSupplementaires: ModuleId[];
    ventesAccess: VentesAccessId[];
  }>({
    nom: '',
    prenom: '',
    email: '',
    motDePasse: '',
    role: 'vendeur',
    actif: true,
    modulesSupplementaires: [],
    ventesAccess: ALL_VENTES_ACCESS,
  });

  const canSubmit = useMemo(() => {
    return (
      form.nom.trim() &&
      form.prenom.trim() &&
      /[^\s@]+@[^\s@]+\.[^\s@]+/.test(form.email) &&
      form.motDePasse.trim().length >= 6
    );
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
    if (!canSubmit) return;
    const data: NewUserInput = {
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      email: form.email.trim(),
      motDePasse: form.motDePasse,
      role: form.role,
      actif: form.actif,
      modulesSupplementaires: form.modulesSupplementaires,
      ventesAccess: form.ventesAccess,
    };
    ajouterUtilisateur(data);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvel utilisateur" size="lg">
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
          <Input
            label="Mot de passe"
            type="password"
            value={form.motDePasse}
            onChange={(e) => setForm((p) => ({ ...p, motDePasse: e.target.value }))}
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
            id="actif"
            type="checkbox"
            checked={form.actif}
            onChange={(e) => setForm((p) => ({ ...p, actif: e.target.checked }))}
          />
          <label htmlFor="actif" className="text-sm text-gray-700">Compte actif</label>
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
          <Button type="submit" disabled={!canSubmit}>Créer</Button>
        </div>
      </form>
    </Modal>
  );
}
