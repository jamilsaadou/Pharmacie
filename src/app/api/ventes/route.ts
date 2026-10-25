import { assertSupportedInvoice } from '@/lib/invoice-scope';
import { assertInvoiceAccess } from '@/lib/sales-access';
import { createHash } from 'node:crypto';
import { reserveStock } from '@/lib/stock-ledger';
import { activeCash, cashLock } from '@/lib/cash-ledger';
import { apiError } from '@/lib/api-error';
import { requireUser } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { normalizeInvoiceReference } from '@/utils/esecefReference';
import { resolveDiscount } from '@/lib/discount';
import { nextInvoiceNumber } from '@/lib/invoice-number';

// GET - Récupérer toutes les ventes
export async function GET() {
  try {
    await requireUser();
    const ventes = await prisma.vente.findMany({
      include: {
        factureESECeF:{select:{statut:true}},
        client: true,
        items: {
          include: {
            medicament: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(ventes);
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    console.error('Erreur lors de la récupération des ventes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des ventes' },
      { status: 500 }
    );
  }
}

// POST - Créer une nouvelle vente
export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireUser(false,'ventes');
    const body = await request.json();
    const key = body.requestKey ? currentUser.id + ":" + String(body.requestKey) : undefined;
    const fingerprint = createHash("sha256").update(JSON.stringify(body)).digest("hex");
    const {
      clientId,
      items,
      sousTotal,
      tva,
      remise,
      remiseType,
      remiseValeur,
      remiseMontant,
      total,
      methodePaiement,
      statut,
      vendeur,
      typeFacture = 'FV',
      factureReference,
      retourStock = false,
      skipCertification = false,
      isb
    } = body;

    assertInvoiceAccess(currentUser,typeFacture,!!isb||Array.isArray(items)&&items.every((i:any)=>!i.medicamentId));
    const normalizedFactureReference = normalizeInvoiceReference(factureReference);

    // Déterminer si c'est une facture d'avoir (FA ou EA)
    const isFactureAvoir = typeFacture === 'FA' || typeFacture === 'EA';
    if (isFactureAvoir) return NextResponse.json({ error: 'Créez l’avoir depuis une facture certifiée sélectionnée dans Avoir / retour.' }, { status: 409 });

    if (!Array.isArray(items) || !items.length || items.some((i: any) => !Number.isInteger(i.quantite) || i.quantite <= 0 || !Number.isFinite(i.prixUnitaire) || i.prixUnitaire < 0)) return NextResponse.json({ error: 'Articles ou quantités invalides' }, { status: 400 });
    const activeConfig = await prisma.configurationESECeF.findFirst({ where: { actif: true } });
    if (!activeConfig) return NextResponse.json({ error: 'Configurez e‑MCF avant de commencer une vente.' }, { status: 409 });

    if(activeConfig.environnement!=='test'&&(String(clientId||'').startsWith('ex-v1-')||items.some((i:any)=>String(i.medicamentId||'').startsWith('ex-v1-'))))return NextResponse.json({error:'Les données EXEMPLE sont réservées à l’environnement de test.'},{status:409});
    const normalizedItems = items.map((item: any) => {
      const quantite =
        typeof item.quantite === 'number' && Number.isFinite(item.quantite)
          ? item.quantite
          : 0;
      const prixUnitaire =
        typeof item.prixUnitaire === 'number' && Number.isFinite(item.prixUnitaire)
          ? item.prixUnitaire
          : 0;
      const lineBase = Math.max(0, quantite * prixUnitaire);
      const normalizedLineDiscount = resolveDiscount({
        baseAmount: lineBase,
        type: item.remiseType,
        percent: typeof item.remise === 'number' ? item.remise : undefined,
        value:
          typeof item.remiseValeur === 'number' ? item.remiseValeur : undefined,
        amount:
          typeof item.remiseMontant === 'number' ? item.remiseMontant : undefined,
      });

      return {
        ...item,
        medicamentId: item.medicamentId?.split("::")[0],
        conditionnementId: item.medicamentId?.split("::")[1] || item.conditionnementId,
        quantite,
        prixUnitaire,
        remise: normalizedLineDiscount.discountPercent,
        remiseType: normalizedLineDiscount.discountType,
        remiseValeur: normalizedLineDiscount.discountValue,
        remiseMontant: normalizedLineDiscount.discountAmount,
        sousTotal: normalizedLineDiscount.netAmount,
      };
    });

    const computedSousTotal = normalizedItems.reduce(
      (sum: number, item: any) => sum + (typeof item.sousTotal === 'number' ? item.sousTotal : 0),
      0
    );
    const safeSousTotal = computedSousTotal;
    const normalizedGlobalDiscount = resolveDiscount({
      baseAmount: safeSousTotal,
      type: remiseType,
      percent: typeof remise === 'number' ? remise : undefined,
      value: typeof remiseValeur === 'number' ? remiseValeur : undefined,
      amount: typeof remiseMontant === 'number' ? remiseMontant : undefined,
    });

    // Le numéro de facture séquentiel est généré dans la transaction (après le
    // verrou), pour rester ascendant et ininterrompu par année (exigence 3.1.xii).

    // Créer la vente avec ses items dans une transaction
    const vente = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(742021)`;
      await cashLock(tx);
      if (key) { const saved=await tx.vente.findUnique({where:{cle:key},include:{items:{include:{medicament:true}},client:true}}); if(saved){if(saved.empreinte!==fingerprint)throw Error('Cette demande est déjà enregistrée avec un autre contenu. Consultez les ventes en attente.');return saved;} }
      const numeroFacture = await nextInvoiceNumber(tx, activeConfig.nim);
      const cash=await activeCash(tx,currentUser.id);
      const medicamentIds = normalizedItems
        .map((item: any) => item.medicamentId)
        .filter(Boolean);
      const medicaments = medicamentIds.length
        ? await tx.medicament.findMany({
            where: { id: { in: medicamentIds } },
            select: { id: true, nom:true, groupeTaxation: true, prix: true, conditionnements:true },
          })
        : [];
      const taxGroupById = new Map(medicaments.map((med) => [med.id, med.groupeTaxation]));
      assertSupportedInvoice(typeFacture, normalizedItems.map((i:any)=>({...i,groupeTaxation:i.medicamentId?taxGroupById.get(i.medicamentId):i.groupeTaxation}))); 

      // Créer la vente
      const nouvelleVente = await tx.vente.create({
        data: {
          numeroFacture,
          cle:key,empreinte:fingerprint,operateurId:currentUser.id,caisseId:cash?.id,
          clientId,
          sousTotal: safeSousTotal,
          tva,
          remise: normalizedGlobalDiscount.discountPercent,
          remiseType: normalizedGlobalDiscount.discountType,
          remiseValeur: normalizedGlobalDiscount.discountValue,
          remiseMontant: normalizedGlobalDiscount.discountAmount,
          total,
          methodePaiement,
          statut: 'en_cours',
          vendeur: `${currentUser.prenom} ${currentUser.nom}`,
          typeFacture,
          factureReference: normalizedFactureReference || null,
          retourStock: isFactureAvoir ? retourStock : false,
        },
        include: {
          client: true,
        },
      });

      // Créer les items et mettre à jour les stocks
      const itemsCreated = [];
      for (const item of normalizedItems) {
        const taxGroup = taxGroupById.get(item.medicamentId) || item.groupeTaxation || 'B';
        const originalMed = medicaments.find(m => m.id === item.medicamentId);
        const pack=item.conditionnementId?originalMed?.conditionnements.find(p=>p.id===item.conditionnementId&&p.actif):undefined;
        if(item.conditionnementId&&!pack)throw Error('Conditionnement invalide.');
        const factor=pack?.facteur||1;
        if (item.medicamentId && (!originalMed || (pack?.prixVente??originalMed.prix) !== item.prixUnitaire)) throw new Error('Le prix de l’article a changé. Actualisez le catalogue.');
        // Créer l'item de vente
        const itemVente = await tx.itemVente.create({
          data: {
            venteId: nouvelleVente.id,
            medicamentId: item.medicamentId || null,
            libelle: pack?`${originalMed!.nom} — ${pack.nom}`:item.libelle || item.nom || originalMed?.nom || null,
            conditionnementId:pack?.id,facteurStock:factor,
            code: pack?.codeBarres || item.code || null,
            quantite: item.quantite,
            prixUnitaire: item.prixUnitaire,
            remise: item.remise || 0,
            remiseType: item.remiseType,
            remiseValeur: item.remiseValeur,
            remiseMontant: item.remiseMontant,
            sousTotal: item.sousTotal || 0,
            groupeTaxation: taxGroup,
          },
          include: {
            medicament: true,
          },
        });

        if(item.medicamentId)await reserveStock(tx,itemVente.id,item.medicamentId,item.quantite*factor,currentUser,nouvelleVente.id);

        itemsCreated.push(itemVente);
      }

      await tx.factureESECeF.create({data:{venteId:nouvelleVente.id,numeroFacture:nouvelleVente.numeroFacture,configurationId:activeConfig.id,statut:'en_attente',requestData:'{}',tentatives:0}});
      return {
        ...nouvelleVente,
        items: itemsCreated,
      };
    });

    // Tenter la certification e-SECeF automatiquement (sauf si explicitement ignorée)
    let certificationResult = null;
    if (!skipCertification) {
      try {
        const { certifyVente } = await import('@/lib/business/certification');
        // Utiliser le type de facture et la référence si fournis
        certificationResult = await certifyVente(vente.id, typeFacture, normalizedFactureReference, isb);
        console.log(`Certification automatique ${typeFacture} ${vente.numeroFacture}:`, certificationResult.success ? 'Succès' : 'Échec');
      } catch (certError) {
        console.error('Erreur lors de la certification automatique:', certError);
      }
    }

    return NextResponse.json({
      ...vente,
      certification: certificationResult
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && ['SESSION_REQUIRED', 'ADMIN_REQUIRED'].includes(error.message)) return apiError(error);
    return apiError(error);
  }
}
