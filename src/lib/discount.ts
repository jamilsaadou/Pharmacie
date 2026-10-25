export type DiscountType = 'PERCENT' | 'AMOUNT';

type ResolveDiscountInput = {
  baseAmount: number;
  type?: string | null;
  value?: number | null;
  percent?: number | null;
  amount?: number | null;
};

type ResolvedDiscount = {
  baseAmount: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  discountPercent: number;
  netAmount: number;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const toPositiveNumber = (value: unknown): number =>
  isFiniteNumber(value) ? Math.max(0, value) : 0;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const normalizeDiscountType = (value?: string | null): DiscountType =>
  typeof value === 'string' && value.toUpperCase() === 'AMOUNT'
    ? 'AMOUNT'
    : 'PERCENT';

export const resolveDiscount = ({
  baseAmount,
  type,
  value,
  percent,
  amount,
}: ResolveDiscountInput): ResolvedDiscount => {
  const safeBase = toPositiveNumber(baseAmount);
  const discountType = normalizeDiscountType(type);

  let rawValue = 0;

  if (discountType === 'AMOUNT') {
    if (isFiniteNumber(amount)) {
      rawValue = amount;
    } else if (isFiniteNumber(value)) {
      rawValue = value;
    } else if (isFiniteNumber(percent)) {
      rawValue = (safeBase * percent) / 100;
    }
  } else if (isFiniteNumber(percent)) {
    rawValue = percent;
  } else if (isFiniteNumber(value)) {
    rawValue = value;
  } else if (isFiniteNumber(amount) && safeBase > 0) {
    rawValue = (amount / safeBase) * 100;
  }

  const safeRawValue = toPositiveNumber(rawValue);
  const discountAmount = clamp(
    discountType === 'AMOUNT' ? safeRawValue : (safeBase * safeRawValue) / 100,
    0,
    safeBase
  );
  const discountPercent = safeBase > 0 ? (discountAmount / safeBase) * 100 : 0;
  const discountValue =
    discountType === 'AMOUNT' ? discountAmount : discountPercent;
  const netAmount = safeBase - discountAmount;

  return {
    baseAmount: safeBase,
    discountType,
    discountValue,
    discountAmount,
    discountPercent,
    netAmount,
  };
};

export const prorateAmount = (
  baseAmounts: number[],
  totalAmount: number
): number[] => {
  const safeBases = baseAmounts.map(toPositiveNumber);
  const totalBase = safeBases.reduce((sum, amount) => sum + amount, 0);
  if (totalBase <= 0) {
    return safeBases.map(() => 0);
  }

  const cappedTotal = clamp(toPositiveNumber(totalAmount), 0, totalBase);
  let runningTotal = 0;

  const shares = safeBases.map((base, index) => {
    if (index === safeBases.length - 1) {
      return clamp(cappedTotal - runningTotal, 0, base);
    }

    const share = clamp((base / totalBase) * cappedTotal, 0, base);
    runningTotal += share;
    return share;
  });

  return shares;
};
