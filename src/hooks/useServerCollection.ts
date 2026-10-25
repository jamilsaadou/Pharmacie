'use client';

import { fetchWithRefresh as fetch } from '@/lib/data-refresh';
import { useState, useEffect, useCallback } from 'react';
import { useDataRefresh } from './useDataRefresh';
function dates(value: any): any { if (Array.isArray(value)) return value.map(dates); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, typeof v === 'string' && /^(date|periode)/i.test(key) && /^\d{4}-\d{2}-\d{2}T/.test(v) ? new Date(v) : dates(v)])); return value; }
export async function requestJson(endpoint: string, method = 'GET', body?: unknown) {
  const r = await fetch(endpoint, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }); const data = await r.json();
  if (!r.ok) { const error = new Error(data.error || 'Échec de l’enregistrement'); window.dispatchEvent(new CustomEvent('pharmacare:error', { detail: error.message })); throw error; }
  return dates(data);
}
export function useServerCollection<T extends { id: string }>(endpoint: string) {
  const [items, setItems] = useState<T[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const refresh = useCallback(async () => { try { setItems(await requestJson(endpoint)); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); } finally { setLoading(false); } }, [endpoint]);
  useEffect(() => { void refresh(); }, [refresh]);
  useDataRefresh(refresh);
  const create = async (data: unknown): Promise<T> => { const saved = await requestJson(endpoint, 'POST', { data }); return saved; };
  const update = async (id: string, data: unknown): Promise<T> => { const saved = await requestJson(endpoint, 'PUT', { id, data }); return saved; };
  const remove = async (id: string) => { await requestJson(`${endpoint}?id=${encodeURIComponent(id)}`, 'DELETE'); };
  return { items, loading, error, refresh, create, update, remove };
}
