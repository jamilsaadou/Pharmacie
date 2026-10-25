export function normalizeInvoiceReference(reference?: string | null): string | undefined {
  if (!reference) return undefined;
  if (typeof reference !== 'string') return undefined;
  const trimmed = reference.trim();
  return trimmed || undefined;
}

export function isValidInvoiceReference(reference?: string | null): boolean {
  return Boolean(normalizeInvoiceReference(reference));
}

export function buildReferenceFromCounters(
  nim?: string | null,
  counters?: string | null
): string | undefined {
  const normalizedNim = normalizeInvoiceReference(nim);
  const normalizedCounters = normalizeInvoiceReference(counters);
  if (!normalizedNim || !normalizedCounters) return undefined;

  const counterPart = normalizedCounters.split(' ')[0]; // "FC/TC"
  if (!counterPart || !counterPart.includes('/')) return undefined;

  const counterFormatted = counterPart.split('/')[1];
  return `${normalizedNim}-${counterFormatted}`;
}
