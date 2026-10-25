import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ESECeFService } from '@/lib/esecef.service';
import { TokenCrypto } from '@/lib/token-crypto';
import type { StatusResponseDto } from '@/types/esecef';

/**
 * GET /api/invoice/pending
 * Récupère la liste des factures en attente et le statut de l'API
 */
export async function GET(request: NextRequest) {
  try {
    await requireUser();
    // Récupérer la configuration e-SECeF directement depuis la base de données
    const config = await prisma.configurationESECeF.findFirst({
      where: { actif: true },
    });

    if (!config) {
      return NextResponse.json(
        { error: 'Configuration e-SECeF non trouvée' },
        { status: 404 }
      );
    }

    // Décrypter le token
    const token = TokenCrypto.decrypt(config.token);

    // Créer une instance du service e-SECeF
    const esecefService = new ESECeFService(
      { baseURL: '', token },
      config.environnement as 'test' | 'production'
    );

    // Récupérer le statut et les factures en attente
    const status: StatusResponseDto = await esecefService.getStatus();

    // Retourner les informations
    return NextResponse.json({
      success: true,
      apiStatus: status.status,
      version: status.version,
      nif: status.nif,
      nim: status.nim,
      tokenValid: status.tokenValid,
      serverDateTime: status.serverDateTime,
      pendingRequestsCount: status.pendingRequestsCount,
      pendingRequestsList: status.pendingRequestsList,
    });

  } catch (error: any) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur dans /api/invoice/pending:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Erreur lors de la récupération des factures en attente',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
