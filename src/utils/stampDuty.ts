export const DEFAULT_STAMP_THRESHOLD = 5000;
export const DEFAULT_STAMP_AMOUNT = 0;

export function parseStampNumber(value: string | number | null | undefined, fallback: number): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(',', '.').trim();
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function computeStampDuty(baseTotal: number, threshold: number, amount: number): number {
  if (!Number.isFinite(baseTotal) || baseTotal <= 0) return 0;
  if (!Number.isFinite(threshold) || threshold < 0) threshold = 0;
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return baseTotal >= threshold ? amount : 0;
}
