'use client';

import { useCallback, useEffect, useState } from 'react';
import { AuditLog, AuditAction, ModuleId } from '@/types';
import { useUserData } from './useUserData';

export interface LogFilters {
  q?: string;
  module?: ModuleId | 'system';
  action?: AuditAction;
  userId?: string;
  dateDebut?: Date;
  dateFin?: Date;
}

export function useAuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { utilisateurCourant, utilisateurs, hasAccess } = useUserData();

  // Charger les logs depuis l'API
  const loadLogs = useCallback(async (filters?: LogFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      if (filters?.module) params.append('module', filters.module);
      if (filters?.action) params.append('action', filters.action);
      if (filters?.userId) params.append('userId', filters.userId);
      if (filters?.dateDebut) params.append('dateDebut', filters.dateDebut.toISOString());
      if (filters?.dateFin) params.append('dateFin', filters.dateFin.toISOString());
      if (filters?.q) params.append('q', filters.q);

      const response = await fetch(`/api/logs?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des logs');
      }
      
      const data = await response.json();
      
      // Convertir les dates ISO en objets Date
      const logsFormatted = data.map((log: any) => ({
        ...log,
        date: new Date(log.date),
      }));
      
      setLogs(logsFormatted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur lors du chargement des logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les logs au montage du composant
  useEffect(() => {
    if(utilisateurCourant&&hasAccess('logs'))void loadLogs();
  }, [loadLogs,utilisateurCourant?.id,hasAccess]);

  const addLog = useCallback(
    async (entry: Omit<AuditLog, 'id' | 'date' | 'userId' | 'userName'> & { date?: Date; userId?: string; userName?: string }) => {
      try {
        const userId = entry.userId ?? utilisateurCourant?.id;
        const userName = entry.userName ?? (utilisateurCourant ? `${utilisateurCourant.prenom} ${utilisateurCourant.nom}` : undefined);

        const response = await fetch('/api/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            module: entry.module,
            action: entry.action,
            userId,
            userName,
            targetType: entry.targetType,
            targetId: entry.targetId,
            message: entry.message,
            details: entry.details,
          }),
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la création du log');
        }

        const newLog = await response.json();
        
        // Convertir la date ISO en objet Date
        const logFormatted = {
          ...newLog,
          date: new Date(newLog.date),
        };
        
        // Ajouter le nouveau log au début de la liste
        setLogs((prev) => [logFormatted, ...prev]);
        
        return logFormatted;
      } catch (err) {
        console.error('Erreur lors de la création du log:', err);
        // En cas d'erreur, créer quand même un log local pour ne pas bloquer l'application
        const localLog: AuditLog = {
          id: `local_${Date.now()}`,
          date: new Date(),
          module: entry.module,
          action: entry.action,
          userId: entry.userId ?? utilisateurCourant?.id,
          userName: entry.userName ?? (utilisateurCourant ? `${utilisateurCourant.prenom} ${utilisateurCourant.nom}` : undefined),
          targetType: entry.targetType,
          targetId: entry.targetId,
          message: entry.message,
          details: entry.details,
        };
        setLogs((prev) => [localLog, ...prev]);
        return localLog;
      }
    },
    [utilisateurCourant]
  );

  const clearLogs = useCallback(async () => {
    try {
      const response = await fetch('/api/logs', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression des logs');
      }

      setLogs([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur lors de la suppression des logs:', err);
    }
  }, []);

  const filterLogs = useCallback(
    (filters: LogFilters) => {
      const { q, module, action, userId, dateDebut, dateFin } = filters;
      return logs.filter((log) => {
        if (module && log.module !== module) return false;
        if (action && log.action !== action) return false;
        if (userId && log.userId !== userId) return false;
        if (dateDebut && log.date < dateDebut) return false;
        if (dateFin && log.date > dateFin) return false;
        if (q) {
          const hay = `${log.message} ${log.userName ?? ''} ${log.module} ${log.action} ${log.targetType ?? ''} ${log.targetId ?? ''}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      });
    },
    [logs]
  );

  const modules = Array.from(new Set(logs.map((l) => l.module)));
  const actions = Array.from(new Set(logs.map((l) => l.action)));

  return { 
    logs, 
    addLog, 
    clearLogs, 
    filterLogs, 
    modules, 
    actions, 
    utilisateurs,
    loading,
    error,
    reload: loadLogs,
  };
}
