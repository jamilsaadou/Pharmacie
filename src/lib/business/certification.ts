import { assertSupportedInvoice } from '@/lib/invoice-scope';
import { stockLock,finalizeStock,releaseStock,expiryFloor } from '@/lib/stock-ledger';
import { cashLock,recordCash } from '@/lib/cash-ledger';
import { getCertificationContext, getRegisteredIssuer } from '@/lib/esecef-config';
import { prisma } from '@/lib/prisma';
import { ESECeFService } from '@/lib/esecef.service';
import { TokenCrypto } from '@/lib/token-crypto';
import { InvoiceRequestDataDto, ItemDto, PaymentDto, InvoiceType, ApiInvoiceType, TaxGroup, ISBGroup } from '@/types/esecef';
import { validateInvoiceData, requiresOriginalReference } from '@/utils/invoiceTypeUtils';
import { computeStampDuty } from '@/utils/stampDuty';
import { getStampDutyConfig } from '@/lib/stampDutyConfig';
import { normalizeInvoiceReference } from '@/utils/esecefReference';
import { prorateAmount, resolveDiscount } from '@/lib/discount';

export type CertificationResponse = {
  success: boolean;
  message?: string;
  error?: any;
  securityElements?: {
    codeSECeFDGI: string;
    nim: string;
    compteurs: string;
    dateHeure: string;
    qrCodeData: string;
  };
  totauxParGroupe?: any;
  facture?: any;
};

export async function certifyVente(
  venteId: string,
  typeFacture: InvoiceType = 'FV',
  reference?: string,
  isb?: ISBGroup
): Promise<CertificationResponse> {
  // Récupérer la configuration active
  let config = await prisma.configurationESECeF.findFirst({
    where: { actif: true },
  });

  if (!config) {
    return {
      success: false,
      message: 'Aucune configuration e-SECeF active. Veuillez configurer e-SECeF d\'abord.',
    };
  }

  // Récupérer les détails de la vente
  const vente = await prisma.vente.findUnique({
    where: { id: venteId },
    include: {
      client: true,
      items: {
        include: {
          medicament: true,
        },
      },
    },
  });

  if (!vente) {
    return {
      success: false,
      message: 'Vente non trouvée',
    };
  }

  // Vérifier si une facture e-SECeF existe déjà
  const existingFacture = await prisma.factureESECeF.findUnique({
    where: { venteId },
  });

  if (existingFacture && existingFacture.configurationId !== config.id) {
    const originalConfiguration = await prisma.configurationESECeF.findUnique({ where: { id: existingFacture.configurationId } });
    if (!originalConfiguration) return { success: false, message: 'Configuration originale introuvable.' };
    config = originalConfiguration;
  }
  if(config.environnement!=='test'&&(vente.id.startsWith('ex-v1-')||vente.clientId?.startsWith('ex-v1-')||vente.items.some(i=>i.medicamentId?.startsWith('ex-v1-'))))return{success:false,message:'Les données EXEMPLE sont réservées à la certification de test.'};
  typeFacture = vente.typeFacture as InvoiceType;
  reference = vente.factureReference || reference;

  if (existingFacture && existingFacture.statut === 'certifiee') {
    return {
      success: true,
      message: 'Cette vente a déjà été certifiée',
      facture: existingFacture,
      securityElements: {
        codeSECeFDGI: existingFacture.codeSECeFDGI || '',
        nim: config.nim,
        compteurs: existingFacture.counters || '',
        dateHeure: existingFacture.dateTimeCertification?.toLocaleString('fr-FR') || '',
        qrCodeData: existingFacture.qrCode || '',
      }
    };
  }

  if (existingFacture && !['en_attente', 'erreur'].includes(existingFacture.statut)) return { success: false, message: 'Cette demande est déjà soumise ou doit être rapprochée avec e‑MCF. Consultez les demandes en attente avant de relancer.' };

  // Valider que le type de facture est un type API valide (FV, FT, FA, EV, ET, EA)
  const validApiTypes: ApiInvoiceType[] = ['FV', 'FT', 'FA', 'EV', 'ET', 'EA'];
  if (!validApiTypes.includes(typeFacture as ApiInvoiceType)) {
    return {
      success: false,
      message: `Type de facture '${typeFacture}' non valide pour l'API e-SECeF. Types valides: ${validApiTypes.join(', ')}`,
    };
  }
  const apiInvoiceType = typeFacture as ApiInvoiceType;

  // Valider le type de facture
  const normalizedReference = normalizeInvoiceReference(reference);
  const validation = validateInvoiceData(typeFacture, {
    reference: normalizedReference,
    items: vente.items,
    client: vente.client,
  });

  if (!validation.valid) {
    return {
      success: false,
      message: 'Données de facture invalides',
      error: validation.errors,
    };
  }

  const creditOrigin = existingFacture?.requestData ? JSON.parse(existingFacture.requestData)._creditOrigin : undefined;

  if (creditOrigin) isb = creditOrigin.isb || undefined;
  if (creditOrigin?.mode) config = { ...config, modePrix: creditOrigin.mode.toUpperCase() };

  // Déterminer si c'est une facture d'avoir (FA ou EA)
  const isFactureAvoir = typeFacture === 'FA' || typeFacture === 'EA';
  const isPrestation = !isFactureAvoir && vente.items.some((item: any) => !item.medicamentId && (item as any).libelle);

  // Pour les factures d'avoir, tenter de récupérer les items originaux certifiés
  let originalItemsByCode: Map<string, any> | null = null;
  let originalItemsByName: Map<string, any> | null = null;
  if (isFactureAvoir && normalizedReference) {
    const separator = normalizedReference.lastIndexOf('-');
    if (separator > 0) {
      const tc = normalizedReference.slice(separator + 1);
      const nim = normalizedReference.slice(0, separator);
      const counterPart = /^\d+$/.test(tc) ? `/${tc} ` : null;

      if (nim && counterPart) {
        try {
          const originalFacture = await prisma.factureESECeF.findFirst({
            where: {
              statut: 'certifiee',
              counters: { contains: counterPart },
              configuration: { nim },
            },
          });

          if (originalFacture?.requestData) {
            const parsed = JSON.parse(originalFacture.requestData);
            const originalItems = Array.isArray(parsed?.items) ? parsed.items : [];
            originalItemsByCode = new Map(
              originalItems
                .filter((it: any) => typeof it.code === 'string' && it.code.trim())
                .map((it: any) => [it.code.trim(), it])
            );
            originalItemsByName = new Map(
              originalItems
                .filter((it: any) => typeof it.name === 'string' && it.name.trim())
                .map((it: any) => [it.name.trim().toLowerCase(), it])
            );
          }
        } catch (error) {
          console.warn('Impossible de charger les items originaux pour la FA:', error);
        }
      }
    }
  }

  const formatPercent = (value: number): string =>
    value.toFixed(2).replace(/\.?0+$/, '');

  const itemDetails = vente.items.map((item) => {
    const code = (item as any).code || item.medicament?.codeBarres || undefined;
    const name = (item as any).libelle || item.medicament?.nom || 'Prestation';
    const originalItem =
      (code && originalItemsByCode?.get(code)) ||
      (name && originalItemsByName?.get(name.trim().toLowerCase()));
    const taxGroup = (
      (item as any).groupeTaxation ||
      originalItem?.taxGroup ||
      (item.medicament as any)?.groupeTaxation ||
      'B'
    ) as TaxGroup;
    const quantity =
      typeof item.quantite === 'number' && Number.isFinite(item.quantite)
        ? item.quantite
        : 0;
    const originalUnitPrice =
      typeof item.prixUnitaire === 'number' && Number.isFinite(item.prixUnitaire)
        ? item.prixUnitaire
        : 0;
    const baseAmount = Math.max(0, originalUnitPrice * quantity);
    const lineSubtotal =
      typeof item.sousTotal === 'number' && Number.isFinite(item.sousTotal)
        ? Math.max(0, item.sousTotal)
        : baseAmount;
    const lineDiscount = resolveDiscount({
      baseAmount,
      type: (item as any).remiseType,
      percent: typeof item.remise === 'number' ? item.remise : undefined,
      value:
        typeof (item as any).remiseValeur === 'number'
          ? (item as any).remiseValeur
          : undefined,
      amount:
        typeof (item as any).remiseMontant === 'number'
          ? (item as any).remiseMontant
          : undefined,
    });

    return {
      code,
      name,
      taxGroup,
      quantity,
      baseAmount,
      lineSubtotal,
      originalUnitPrice,
      lineDiscount,
    };
  });

  const baseTotalBeforeGlobal = itemDetails.reduce(
    (sum, item) => sum + item.lineSubtotal,
    0
  );
  const globalDiscount = resolveDiscount({
    baseAmount: baseTotalBeforeGlobal,
    type: (vente as any).remiseType,
    percent: typeof vente.remise === 'number' ? vente.remise : undefined,
    value:
      typeof (vente as any).remiseValeur === 'number'
        ? (vente as any).remiseValeur
        : undefined,
    amount:
      typeof (vente as any).remiseMontant === 'number'
        ? (vente as any).remiseMontant
        : undefined,
  });
  const globalDiscountShares = prorateAmount(
    itemDetails.map((item) => item.lineSubtotal),
    globalDiscount.discountAmount
  );

  const normalizedItems = itemDetails.map((item, index) => {
    const globalShare = globalDiscountShares[index] || 0;
    const finalLineAmount = Math.max(0, item.lineSubtotal - globalShare);
    const finalUnitPrice = item.quantity > 0 ? finalLineAmount / item.quantity : item.originalUnitPrice;
    const originalUnitPriceTTC =
      isPrestation && config.modePrix === 'TTC' && item.taxGroup !== 'A'
        ? item.originalUnitPrice * 1.19
        : item.originalUnitPrice;
    const finalUnitPriceTTC =
      isPrestation && config.modePrix === 'TTC' && item.taxGroup !== 'A'
        ? finalUnitPrice * 1.19
        : finalUnitPrice;
    const totalDiscountAmount = item.lineDiscount.discountAmount + globalShare;
    const totalDiscountPercent =
      item.baseAmount > 0 ? (totalDiscountAmount / item.baseAmount) * 100 : 0;
    const hasDiscount = totalDiscountAmount > 0;

    return {
      ...item,
      globalShare,
      finalLineAmount,
      finalUnitPrice,
      finalUnitPriceTTC,
      originalUnitPriceTTC,
      totalDiscountAmount,
      totalDiscountPercent,
      hasDiscount,
    };
  });

  // Préparer les items pour l'API e-SECeF
  // Pour les FA/EA : les quantités et prix restent POSITIFS
  // C'est le champ type='FA' qui indique à l'API qu'il s'agit d'un avoir
  const items: ItemDto[] = normalizedItems.map((item) => ({
    code: item.code,
    name: item.name,
    price: isPrestation
      ? Math.round(item.finalUnitPriceTTC)
      : ESECeFService.toApiAmount(item.finalUnitPriceTTC),
    quantity: item.quantity,
    taxGroup: item.taxGroup,
    ...(item.hasDiscount && {
      originalPrice: isPrestation
        ? Math.round(item.originalUnitPriceTTC)
        : ESECeFService.toApiAmount(item.originalUnitPriceTTC),
      priceModification:
        (item.lineDiscount.discountType === 'AMOUNT' && item.globalShare <= 0) || (globalDiscount.discountType === 'AMOUNT' && item.lineDiscount.discountAmount === 0)
          ? `Remise ${formatPercent(item.totalDiscountAmount)} FCFA`
          : `Remise ${formatPercent(item.totalDiscountPercent)}%`,
    }),
  }));

  // Calculer et ajouter le timbre si applicable
  const baseTotal = normalizedItems.reduce(
    (sum, item) => sum + item.finalLineAmount,
    0
  );
  const { threshold: timbreSeuil, amount: timbreMontant } = await getStampDutyConfig();
  if (creditOrigin) items.forEach((item, index) => { const original = creditOrigin.lines[index].item; item.code = original.code; if (original.originalPrice !== undefined) item.originalPrice = original.originalPrice; if (original.priceModification) item.priceModification = original.priceModification; });

  const timbreAmount = isPrestation || isFactureAvoir ? 0 : computeStampDuty(baseTotal, timbreSeuil, timbreMontant);
  const hasStampItem = items.some((item) => item.code === 'TIMBRE');
  if (timbreAmount > 0 && !hasStampItem) {
    items.push({
      code: 'TIMBRE',
      name: 'Timbre',
      price: ESECeFService.toApiAmount(timbreAmount),
      quantity: 1,
      taxGroup: 'L',
    });
  }

  // Préparer le client
  const clientDto = creditOrigin ? creditOrigin.client || undefined : vente.client
    ? {
        nif: (vente.client as any).nif || undefined,
        name: `${vente.client.prenom} ${vente.client.nom}`,
        contact: vente.client.telephone || undefined,
        address: vente.client.adresse || undefined,
      }
    : undefined;

  // Préparer le paiement
  // Pour FA/EA : le montant reste POSITIF, le type 'FA' gère la logique d'avoir
  const tvaPrestation = isPrestation
    ? normalizedItems.reduce((sum, item) => {
        if (item.taxGroup === 'A') return sum;
        return sum + item.finalLineAmount * 0.19;
      }, 0)
    : 0;
  const expectedTotal = isPrestation ? baseTotal + tvaPrestation : baseTotal + timbreAmount;
  const paymentAmount = Math.abs(vente.total - expectedTotal) < 0.01 ? vente.total : expectedTotal;
  const payment: PaymentDto[] = [
    {
      name: ESECeFService.mapPaymentType(vente.methodePaiement as any),
      amount: isPrestation ? Math.round(paymentAmount) : ESECeFService.toApiAmount(paymentAmount),
    },
  ];

  const taxRates = creditOrigin?.issuer?.taxRates || (config.catalogueFiscal as any)?.taxes;
  if (!taxRates) return { success: false, message: 'Testez et synchronisez la connexion e‑MCF dans les paramètres avant la première vente.' };
  const groupAmounts: Record<string, number> = {};
  for (const item of items) groupAmounts[item.taxGroup] = (groupAmounts[item.taxGroup] || 0) + item.price * item.quantity;
  const normalizedTotal = Object.entries(groupAmounts).reduce((sum, [group, amount]) => {
    const rate = Number(taxRates[group.toLowerCase()]);
    if (!Number.isFinite(rate)) throw new Error(`Groupe fiscal ${group} non synchronisé.`);
    return sum + Math.round(amount * (config.modePrix === 'HT' ? 1 + rate / 100 : 1));
  }, 0);
  // Les totaux calculés par e‑MCF sont ensuite comparés au paiement attendu.
  payment[0].amount = normalizedTotal + (isb ? Math.round(normalizedTotal * Number(taxRates[`isb${isb}`] || 0) / 100) : 0);
  if (isb === 'A' && !clientDto?.nif) return { success: false, message: 'Le NIF du client est requis pour le précompte ISB.' };

  // Construire la requête pour l'API e-SECeF
  const invoiceRequest: InvoiceRequestDataDto = {
    nif: creditOrigin?.nif || config.nif,
    rn: vente.numeroFacture,
    mode: config.modePrix.toLowerCase() as 'ttc' | 'ht',
    isf: creditOrigin?.isf || config.isf,
    type: apiInvoiceType,
    items,
    client: clientDto,
    operator: {
      // L'opérateur imprimé est le point de vente (nom de l'établissement), conformément
      // au format des factures certifiées DGI où « Opérateur » = le point de vente.
      name: (creditOrigin?.issuer?.nomEtablissement || config.nomEtablissement || '').trim() || vente.vendeur,
    },
    payment,
  };

  if (isb) {
    invoiceRequest.isb = isb;
  }

  // Ajouter la référence si nécessaire
  if (requiresOriginalReference(typeFacture)) {
    if (!normalizedReference) {
      return {
        success: false,
        message: 'La référence de la facture originale est obligatoire pour ce type de facture',
      };
    }
    invoiceRequest.reference = normalizedReference;
  }

  assertSupportedInvoice(invoiceRequest.type,invoiceRequest.items);
  const { service: esecefService } = await getCertificationContext(config.id);

  const registeredIssuer=creditOrigin?null:await getRegisteredIssuer(config,esecefService);
  const issuerRows = await prisma.parametres.findMany({ where: { cle: { startsWith: 'entreprise.' } } });
  const issuer = creditOrigin?.issuer || { environnement: config.environnement, taxRates: (config.catalogueFiscal as any)?.taxes, ...Object.fromEntries(issuerRows.map(row => [row.cle.replace('entreprise.', ''), row.valeur])),...registeredIssuer };
  let officialTotals: any;

  // Créer ou mettre à jour l'enregistrement de facture
  let factureRecord = existingFacture;
  if (!factureRecord) {
    try {
      factureRecord = await prisma.factureESECeF.create({
        data: {
          venteId,
          numeroFacture: vente.numeroFacture,
          statut: 'en_attente',
          requestData: JSON.stringify({ ...invoiceRequest, _creditOrigin: creditOrigin, _issuer: issuer }),
          configurationId: config.id,
          tentatives: 0,
        },
      });
    } catch (e) {
      console.error("Error creating FactureESECeF record", e);
      // Try finding it again in case of race condition
      factureRecord = await prisma.factureESECeF.findUnique({ where: { venteId } });
      if (!factureRecord) throw e;
    }
  }

  if (!factureRecord) throw new Error('Demande de certification introuvable');
  const claim = await prisma.factureESECeF.updateMany({ where: { id: factureRecord.id, statut: { in: ['en_attente', 'erreur'] }, uid: null }, data: { statut: 'confirmation_en_cours', requestData: JSON.stringify({ ...invoiceRequest, _creditOrigin: creditOrigin, _issuer: issuer }), tentatives: { increment: 1 }, derniereTentative: new Date() } });
  if (claim.count !== 1) return { success: false, message: 'Une certification est déjà en cours. Ne soumettez pas une nouvelle facture.' };
  const unsafeLot=await prisma.allocationStock.findFirst({where:{item:{venteId},etat:'reservee',OR:[{lot:{statut:{not:'disponible'}}},{lot:{dateExpiration:{lt:expiryFloor()}}}]}});
  if(unsafeLot){await prisma.factureESECeF.update({where:{id:factureRecord.id},data:{statut:'erreur',errorDescription:'Un lot réservé est bloqué, périmé ou doit être qualifié.'}});return{success:false,message:'Vérifiez les lots réservés avant de certifier cette vente.'};}
  const status = await esecefService.getStatus().catch(() => null);
  if (!status || !status.status || status.nif !== config.nif || status.nim !== config.nim) {
    await prisma.factureESECeF.update({ where: { id: factureRecord.id }, data: { statut: 'erreur', errorDescription: 'Connexion ou identité du compteur non vérifiée' } });
    return { success: false, message: 'Vérifiez la connexion et l’identité du compteur dans les paramètres.' };
  }
  const result = await esecefService.certifyInvoice(invoiceRequest, response => Number.isSafeInteger(response.total) && response.total === payment[0].amount, async response => {
    officialTotals = response;
    await prisma.factureESECeF.update({ where: { id: factureRecord!.id }, data: { uid: response.uid, statut: 'confirmation_en_cours', requestData: JSON.stringify({ ...invoiceRequest, _creditOrigin: creditOrigin, _issuer: issuer, _totals: response }) } });
    if (invoiceRequest.items.some(item => (response as any)['ha' + item.taxGroup.toLowerCase()] === undefined)) {
      const details = await esecefService.getPendingInvoiceDetails(response.uid!);
      if (details.errorCode || !details.totals) throw new Error('Les totaux fiscaux détaillés ne sont pas disponibles.');
      Object.assign(response, details.totals); officialTotals = response;
      await prisma.factureESECeF.update({ where: { id: factureRecord!.id }, data: { requestData: JSON.stringify({ ...invoiceRequest, _creditOrigin: creditOrigin, _issuer: issuer, _totals: response }) } });
    }
  });

  // Calculer les totaux par groupe de taxation
  // Pour FA/EA, les totaux sont négatifs (remboursement)
  const totalsMultiplier = isFactureAvoir ? -1 : 1;
  const totauxParGroupe: any = {};
  const itemsForTotals = timbreAmount > 0
    ? [
        ...normalizedItems.map((item) => ({
          sousTotal: item.finalLineAmount,
          groupeTaxation: item.taxGroup,
        })),
        {
          sousTotal: timbreAmount,
          groupeTaxation: 'A',
        } as any,
      ]
    : normalizedItems.map((item) => ({
        sousTotal: item.finalLineAmount,
        groupeTaxation: item.taxGroup,
      }));

  itemsForTotals.forEach((item) => {
    const groupe = (item as any).groupeTaxation || (item.medicament as any)?.groupeTaxation || 'B';
    const tauxTVA = Number((config.catalogueFiscal as any)?.taxes?.[groupe.toLowerCase()] ?? (groupe === 'A' ? 0 : 19)); // A = exonéré 0%, B = TVA 19%

    if (!totauxParGroupe[groupe]) {
      totauxParGroupe[groupe] = {
        totalHT: 0,
        totalTVA: 0,
        tauxTVA,
      };
    }

    let montantHT: number;
    let montantTVA: number;

    if (groupe === 'A') {
      const montantTTC = item.sousTotal * totalsMultiplier;
      montantHT = montantTTC;
      montantTVA = 0;
    } else if (isPrestation) {
      const montantHTBase = item.sousTotal * totalsMultiplier;
      montantHT = montantHTBase;
      montantTVA = Math.round(montantHTBase * tauxTVA / 100);
    } else {
      const montantTTC = item.sousTotal * totalsMultiplier;
      montantHT = Math.round(montantTTC / (1 + tauxTVA / 100));
      montantTVA = montantTTC - montantHT;
    }

    totauxParGroupe[groupe].totalHT += montantHT;
    totauxParGroupe[groupe].totalTVA += montantTVA;
  });

  // Mettre à jour l'enregistrement selon le résultat
  if (result.success && factureRecord) {
    const updatedFacture = await prisma.$transaction(async tx => {
      await stockLock(tx);await cashLock(tx);
      const certified = await tx.factureESECeF.update({
      where: { id: factureRecord.id },
      data: {
        statut: 'certifiee',
        requestData: JSON.stringify({ ...invoiceRequest, _creditOrigin: creditOrigin, _issuer: issuer, _totals: officialTotals, _security: { codeSECeFDGI: result.codeSECeFDGI, qrCode: result.qrCode, nim: result.nim, counters: result.counters, dateTime: result.dateTime } }),
        uid: result.uid,
        codeSECeFDGI: result.codeSECeFDGI,
        qrCode: result.qrCode,
        dateTimeCertification: new Date(),
        counters: result.counters,
        derniereTentative: new Date(),
      },
    });

      await tx.vente.update({ where: { id: venteId }, data: { statut: 'terminee', total: result.totals?.total, tva: result.totals?.vtotal } });
      await finalizeStock(tx,venteId,null);await recordCash(tx,venteId);
      await tx.configurationESECeF.update({ where: { id: config.id }, data: { derniersCompteurs: result.counters } });
      return certified;
    });
    return {
      success: true,
      message: 'Facture certifiée avec succès',
      securityElements: {
        codeSECeFDGI: result.codeSECeFDGI!,
        nim: result.nim!,
        compteurs: result.counters!,
        dateHeure: result.dateTime!,
        qrCodeData: result.qrCode!,
      },
      totauxParGroupe,
      facture: updatedFacture,
    };
  } else if (factureRecord) {
    if (result.error?.code === 'VALIDATION_FAILED') {
      await prisma.$transaction(async tx => {
        await stockLock(tx);
        const canceled = await tx.factureESECeF.updateMany({ where: { id: factureRecord!.id, statut: 'confirmation_en_cours' }, data: { statut: 'annulee', errorCode: 'VALIDATION_FAILED', errorDescription: result.error?.description } });
        if (canceled.count !== 1) throw new Error('État de demande modifié pendant l’annulation.');
        await tx.vente.update({ where: { id: venteId }, data: { statut: 'annulee' } });
        await releaseStock(tx,venteId,null);
      });
      return { success: false, message: 'Les totaux divergent : demande annulée et réservation de stock libérée.', error: result.error };
    }
    const latest = await prisma.factureESECeF.findUnique({ where: { id: factureRecord.id } });
    await prisma.factureESECeF.update({
      where: { id: factureRecord.id },
      data: {
        statut: result.error?.code === 'EXCEPTION' || latest?.uid ? 'a_rapprocher' : 'erreur',
        errorCode: result.error?.code,
        errorDescription: result.error?.description,
        derniereTentative: new Date(),
      },
    });

    return {
      success: false,
      message: 'Erreur lors de la certification',
      error: result.error,
    };
  }
  
  return {
    success: false,
    message: 'Erreur inattendue',
  };
}
