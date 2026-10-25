'use client';

import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Utilisateur } from '@/types';
import { useUserData } from '@/hooks/useUserData';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';
import { ViewUserModal } from './ViewUserModal';

export default function UserManagement() {
  const {
    utilisateurs,
    utilisateurCourant,
    definirUtilisateurCourant,
    supprimerUtilisateur,
    libelleModule,
    getUserModules,
  } = useUserData();

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<Utilisateur | null>(null);
  const [viewUser, setViewUser] = useState<Utilisateur | null>(null);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return utilisateurs;
    return utilisateurs.filter(
      (u) =>
        u.nom.toLowerCase().includes(s) ||
        u.prenom.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        u.role.toLowerCase().includes(s)
    );
  }, [utilisateurs, search]);

  const handleDelete = (u: Utilisateur) => {
    if (window.confirm(`Supprimer l'utilisateur ${u.prenom} ${u.nom} ?`)) {
      supprimerUtilisateur(u.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h2>
        <Button onClick={() => setShowAdd(true)}>➕ Nouvel utilisateur</Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Rechercher (nom, email, rôle)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div tabIndex={0} role="region" aria-label="Tableau de données à défilement horizontal" className="ph-table-scroll overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accès</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u) => {
                const modules = getUserModules(u);
                const isCurrent = utilisateurCourant?.id === u.id;
                return (
                  <tr key={u.id} className={isCurrent ? 'bg-emerald-50' : ''}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{u.prenom} {u.nom}</div>
                      <div className="text-xs text-gray-500">Créé le {new Date(u.dateCreation).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{u.email}</td>
                    <td className="px-4 py-3 capitalize">{u.role}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${u.actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {u.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {modules.slice(0, 4).map((m) => (
                          <span key={m} className="px-2 py-0.5 text-xs rounded bg-emerald-100 text-emerald-700">{libelleModule(m)}</span>
                        ))}
                        {modules.length > 4 && (
                          <span className="px-2 py-0.5 text-xs rounded bg-emerald-200 text-emerald-800">+{modules.length - 4}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setViewUser(u)}>Voir</Button>
                        <Button variant="outline" size="sm" onClick={() => setEditUser(u)}>Modifier</Button>
                        <Button variant="ghost" size="sm" onClick={() => definirUtilisateurCourant(u.id)} disabled={isCurrent}>
                          {isCurrent ? 'Utilisateur courant' : 'Définir comme courant'}
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(u)} disabled={isCurrent}>Supprimer</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <AddUserModal isOpen={showAdd} onClose={() => setShowAdd(false)} />
      <EditUserModal isOpen={!!editUser} onClose={() => setEditUser(null)} user={editUser} />
      <ViewUserModal isOpen={!!viewUser} onClose={() => setViewUser(null)} user={viewUser} />
    </div>
  );
}

