import { prisma } from '@/lib/prisma';
import { DEFAULT_STAMP_AMOUNT, DEFAULT_STAMP_THRESHOLD, parseStampNumber } from '@/utils/stampDuty';

const STAMP_THRESHOLD_KEY = 'facturation.timbre.seuil';
const STAMP_AMOUNT_KEY = 'facturation.timbre.montant';

export async function getStampDutyConfig(): Promise<{ threshold: number; amount: number }> {
  try {
    const params = await prisma.parametres.findMany({
      where: {
        cle: {
          in: [STAMP_THRESHOLD_KEY, STAMP_AMOUNT_KEY],
        },
      },
    });

    const paramMap = new Map(params.map((param) => [param.cle, param.valeur]));

    const threshold = parseStampNumber(
      paramMap.get(STAMP_THRESHOLD_KEY) ?? DEFAULT_STAMP_THRESHOLD,
      DEFAULT_STAMP_THRESHOLD
    );
    const amount = parseStampNumber(
      paramMap.get(STAMP_AMOUNT_KEY) ?? DEFAULT_STAMP_AMOUNT,
      DEFAULT_STAMP_AMOUNT
    );

    return { threshold, amount };
  } catch {
    return { threshold: DEFAULT_STAMP_THRESHOLD, amount: DEFAULT_STAMP_AMOUNT };
  }
}
