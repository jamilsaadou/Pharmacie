'use client';

import React, { useMemo, useState } from 'react';
import { Activity, Filter, Trash2, Search, Calendar as CalendarIcon, User as UserIcon, Layers } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useAuditLog } from '@/hooks/useAuditLog';
import { AuditAction, ModuleId } from '@/types';

export default function LogsManagement() {
  const { logs, filterLogs, clearLogs, modules, actions, utilisateurs } = useAuditLog();

  const [q, setQ] = useState('');
  const [module, setModule] = useState<ModuleId | 'system' | ''>('');
  const [action, setAction] = useState<AuditAction | ''>('');
  const [userId, setUserId] = useState<string>('');
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');

  const filtered = useMemo(() => {
    return filterLogs({
      q,
      module: module || undefined,
      action: action || undefined,
      userId: userId || undefined,
      dateDebut: dateDebut ? new Date(dateDebut) : undefined,
      dateFin: dateFin ? new Date(dateFin + 'T23:59:59') : undefined,
    });
  }, [q, module, action, userId, dateDebut, dateFin, filterLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100">
            <Activity className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Journal d'activité</h1>
            <p className="text-gray-600">Suivi des actions des utilisateurs</p>
          </div>
        </div>
        <p className="text-sm text-slate-500">Historique conservé · consultation et filtres</p>
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Input
                type="text"
                placeholder="Rechercher (message, utilisateur, module, cible...)"
                value={q}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
                className="pl-9"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <Select
            label="Module"
            value={module}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setModule(e.target.value as any)}
          >
            <option value="">Tous</option>
            {modules.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
          <Select
            label="Action"
            value={action}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAction(e.target.value as any)}
          >
            <option value="">Toutes</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
          <Select
            label="Utilisateur"
            value={userId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUserId(e.target.value)}
          >
            <option value="">Tous</option>
            {utilisateurs.map((u) => (
              <option key={u.id} value={u.id}>{`${u.prenom} ${u.nom}`}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-2 md:col-span-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date début</label>
              <div className="relative">
                <Input type="date" value={dateDebut} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateDebut(e.target.value)} className="pl-9" />
                <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date fin</label>
              <div className="relative">
                <Input type="date" value={dateFin} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFin(e.target.value)} className="pl-9" />
                <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Liste des logs */}
      <Card className="overflow-hidden">
        <div tabIndex={0} role="region" aria-label="Tableau de données à défilement horizontal" className="ph-table-scroll overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cible</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.date).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-gray-500" />
                      {log.userName || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-gray-500" />
                      {log.module}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.action === 'create' ? 'bg-emerald-100 text-emerald-800' :
                      log.action === 'update' ? 'bg-blue-100 text-blue-800' :
                      log.action === 'delete' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {log.message}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                    {log.targetType ? `${log.targetType}${log.targetId ? ` #${log.targetId}` : ''}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              Aucun log pour ces filtres
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
