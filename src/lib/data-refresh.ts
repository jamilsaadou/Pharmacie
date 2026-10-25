const EVENT = 'pharmacare:data-changed';
const STORAGE_KEY = 'pharmacare:data-revision';

export function notifyDataChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(EVENT));
  try { window.localStorage.setItem(STORAGE_KEY, `${Date.now()}-${Math.random()}`); } catch { /* Same-tab refresh still works without storage. */ }
}

/** Successful writes invalidate displayed data without reloading the page. */
export async function fetchWithRefresh(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await globalThis.fetch(input, init);
  const method = (init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase();
  const path = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
  if (response.ok && !['GET', 'HEAD', 'OPTIONS'].includes(method) && path.startsWith('/api/') && !path.startsWith('/api/auth/')) notifyDataChanged();
  return response;
}

/** Coalesce bursts and serialize refreshes so an older read cannot finish last. */
export function subscribeDataRefresh(refresh: () => void | Promise<void>) {
  let disposed = false, running = false, queued = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = async () => {
    if (disposed) return;
    if (running) { queued = true; return; }
    running = true;
    try { await refresh(); } catch { /* Consumers expose their own loading errors. */ }
    finally { running = false; if (queued && !disposed) { queued = false; schedule(); } }
  };
  const schedule = () => { if (disposed) return; clearTimeout(timer); timer = setTimeout(() => { void run(); }, 80); };
  const visible = () => { if (document.visibilityState === 'visible') schedule(); };
  const storage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) schedule(); };
  window.addEventListener(EVENT, schedule);
  window.addEventListener('focus', schedule);
  window.addEventListener('online', schedule);
  window.addEventListener('storage', storage);
  document.addEventListener('visibilitychange', visible);
  return () => {
    disposed = true; clearTimeout(timer);
    window.removeEventListener(EVENT, schedule);
    window.removeEventListener('focus', schedule);
    window.removeEventListener('online', schedule);
    window.removeEventListener('storage', storage);
    document.removeEventListener('visibilitychange', visible);
  };
}
