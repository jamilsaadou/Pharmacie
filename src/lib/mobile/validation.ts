export class MobileError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function fail(status: number, code: string, message: string): never { throw new MobileError(status, code, message); }
export function pageParams(params: URLSearchParams) {
  const page = Number(params.get('page') ?? 1), limit = Number(params.get('limit') ?? 30);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100)
    fail(400, 'VALIDATION_ERROR', 'Pagination invalide (page ≥ 1, limit de 1 à 100).');
  return { page, limit, skip: (page - 1) * limit };
}
export function dateRange(params: URLSearchParams) {
  const parse = (key: string) => {
    const value = params.get(key);
    if (value === null) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value)))
      fail(400, 'VALIDATION_ERROR', `${key} doit être une date ISO 8601 avec fuseau horaire.`);
    return new Date(value);
  };
  const gte = parse('from'), lt = parse('to');
  if (gte && lt && gte >= lt) fail(400, 'VALIDATION_ERROR', 'from doit précéder to.');
  return { gte, lt };
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
  return JSON.stringify(value);
}
type SaleInput = { requestKey: string; clientId?: string; items: { medicamentId: string; conditionnementId?: string; quantite: number }[]; methodePaiement: string };
export function saleInput(body: any): SaleInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'VALIDATION_ERROR', 'Objet JSON requis.');
  const allowed = ['requestKey', 'clientId', 'items', 'methodePaiement'];
  if (Object.keys(body).some(k => !allowed.includes(k))) fail(400, 'VALIDATION_ERROR', 'Champs de vente inconnus. Les prix, totaux et opérateurs sont déterminés par le serveur.');
  if (typeof body.requestKey !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(body.requestKey)) fail(400, 'VALIDATION_ERROR', 'requestKey requis (16 à 100 caractères alphanumériques, _ ou -).');
  if (body.clientId !== undefined && (typeof body.clientId !== 'string' || !body.clientId || body.clientId.length > 200)) fail(400, 'VALIDATION_ERROR', 'clientId invalide.');
  if (!['especes','carte','cheque','virement'].includes(body.methodePaiement)) fail(400, 'VALIDATION_ERROR', 'Moyen de paiement invalide.');
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 100) fail(400, 'VALIDATION_ERROR', 'De 1 à 100 lignes sont requises.');
  const items = body.items.map((item: any) => {
    if (!item || Object.keys(item).some(k => !['medicamentId','conditionnementId','quantite'].includes(k)) ||
      typeof item.medicamentId !== 'string' || !item.medicamentId || item.medicamentId.length > 200 || item.medicamentId.includes('::') ||
      (item.conditionnementId !== undefined && (typeof item.conditionnementId !== 'string' || !item.conditionnementId || item.conditionnementId.length > 200)) ||
      !Number.isSafeInteger(item.quantite) || item.quantite < 1 || item.quantite > 1000000) fail(400, 'VALIDATION_ERROR', 'Ligne de vente invalide.');
    return { medicamentId: item.medicamentId as string, ...(item.conditionnementId ? { conditionnementId: item.conditionnementId as string } : {}), quantite: item.quantite as number };
  });
  return { requestKey: body.requestKey as string, ...(body.clientId ? { clientId: body.clientId as string } : {}), items, methodePaiement: body.methodePaiement as string };
}
