'use client';
import { useEffect, useRef } from 'react';
import { subscribeDataRefresh } from '@/lib/data-refresh';
export function useDataRefresh(refresh: () => void | Promise<void>) {
  const current = useRef(refresh);
  current.current = refresh;
  useEffect(() => subscribeDataRefresh(() => current.current()), []);
}
