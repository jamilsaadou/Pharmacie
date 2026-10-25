export type CatalogProduct = { id: string; nom: string; prix: number; quantiteStock: number; categorie: string; groupeTaxation?:string; codeBarres?: string; dosage?: string; forme?: string; seuilAlerte?: number; dateExpiration?: Date | string };
export const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim();
export function sellable(product: CatalogProduct, now = Date.now()) { return ['A','B','C','D'].includes(product.groupeTaxation||'B') && product.quantiteStock > 0 && (!product.dateExpiration || new Date(product.dateExpiration).toISOString().slice(0,10) >= new Date(now+3600000).toISOString().slice(0,10)); }
export function filterProducts<T extends CatalogProduct>(products: T[], query: string, category: string, availableOnly: boolean, now = Date.now()): T[] {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return products.filter(p => (!category || p.categorie === category) && (!availableOnly || sellable(p, now)) && words.every(word => normalizeSearch([p.nom, p.codeBarres, p.dosage, p.forme, p.categorie].filter(Boolean).join(' ')).includes(word))).sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base', numeric: true }));
}
export function paginate<T>(items: T[], requested: number, size: number) {
  const pageSize = Math.max(1, Math.floor(size));
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(pageCount, Math.max(1, Math.floor(requested) || 1));
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageCount, start, end: Math.min(start + pageSize, items.length) };
}
