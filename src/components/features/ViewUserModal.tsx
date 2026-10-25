'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Utilisateur } from '@/types';
import { useUserData } from '@/hooks/useUserData';

interface ViewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Utilisateur | null;
}

export function ViewUserModal({ isOpen, onClose, user }: ViewUserModalProps) {
  const { getUserModules, libelleModule, getUserVentesAccess, libelleVenteAccess } = useUserData();
  if (!user) return null;
  const modules = getUserModules(user);
  const ventesAccess = getUserVentesAccess(user);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Détails de l'utilisateur" size="md">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-gray-500">Nom</p>
            <p className="font-medium">{user.nom}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Prénom</p>
            <p className="font-medium">{user.prenom}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Rôle</p>
            <p className="font-medium capitalize">{user.role}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Statut</p>
            <p className="font-medium">{user.actif ? 'Actif' : 'Inactif'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Créé le</p>
            <p className="font-medium">{new Date(user.dateCreation).toLocaleString()}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">Accès effectifs</p>
          <div className="flex flex-wrap gap-2">
            {modules.map((m) => (
              <span key={m} className="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700">
                {libelleModule(m)}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">Accès catégories de factures (ventes)</p>
          {ventesAccess.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun accès</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ventesAccess.map((access) => (
                <span key={access} className="px-2 py-1 text-xs rounded bg-slate-100 text-slate-700">
                  {libelleVenteAccess(access)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline">Fermer</Button>
        </div>
      </div>
    </Modal>
  );
}
