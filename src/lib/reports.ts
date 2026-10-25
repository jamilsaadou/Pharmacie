import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// ==========================================================================
// Rapports fiscaux SFE (X / Z / A) — exigences 2.8–2.10, 4.1–4.2, 5.1 du
// tableau de conformité. Les montants s'appuient sur les totaux officiels
// e-MCF conservés dans requestData._totals de chaque facture certifiée.
// ==========================================================================

const TAX_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'] as const;

// Types de factures effectivement émis par le SFE (hors copies, usage local).
export const INVOICE_TYPE_LABELS: Record<string, string> = {
  FV: 'Facture de vente',
  FT: "Facture d'acompte ou d'avance",
  FA: "Facture d'avoir",
  EV: "Facture de vente à l'exportation",
  ET: "Facture d'acompte à l'exportation",
  EA: "Facture d'avoir à l'exportation",
};
// Les avoirs réduisent le chiffre d'affaires net de la période.
const CREDIT_TYPES = new Set(['FA', 'EA']);

const PAYMENT_LABELS: Record<string, string> = {
  ESPECES: 'Espèces',
  VIREMENT: 'Virement',
  CARTEBANCAIRE: 'Carte bancaire',
  MOBILEMONEY: 'Mobile money',
  CHEQUES: 'Chèques',
  CREDIT: 'Crédit',
  AUTRE: 'Autre',
  AUTRE1: 'Autre',
  AUTRE2: 'Autre',
};
const PAYMENT_FROM_VENTE: Record<string, string> = {
  especes: 'ESPECES',
  carte: 'CARTEBANCAIRE',
  cheque: 'CHEQUES',
  virement: 'VIREMENT',
  mobilemoney: 'MOBILEMONEY',
};

export interface ReportMeta {
  nomCommercial: string;
  raisonSociale?: string;
  nif: string;
  isf: string;
  nim: string;
  environnement: 'test' | 'production';
  dateGeneration: string; // ISO
}

export interface ReportCell {
  montantTotal: number; // TTC (taa)
  montantTaxable: number; // HT  (haa)
  montantTaxe: number; // TVA (vaa)
}

export interface SalesReport {
  meta: ReportMeta;
  type: 'X' | 'Z';
  mode: 'quotidien' | 'periode';
  debut: string; // ISO
  fin: string; // ISO
  numeroZ?: number; // Numéro de clôture Z (type Z uniquement)
  dernierZ?: { numero: number; fin: string } | null;
  nombreFactures: number;
  // Matrice imposée : par TYPE de facture ET par GROUPE de taxation
  parTypeEtGroupe: Array<{ type: string; typeLabel: string; groupe: string; taux: number } & ReportCell>;
  parType: Array<{ type: string; typeLabel: string; nombre: number; estAvoir: boolean } & ReportCell>;
  parGroupe: Array<{ groupe: string; taux: number } & ReportCell>;
  parPaiement: Array<{ mode: string; libelle: string; montant: number }>;
  reductionsCommerciales: number;
  nombreVentesIncompletes: number;
  totaux: {
    montantTotalNet: number; // ventes - avoirs
    montantTaxableNet: number;
    montantTaxeNet: number;
  };
}

export interface ArticleReportRow {
  code: string;
  nom: string;
  prixUnitaire: number;
  tauxImpot: number;
  quantiteVendue: number;
  quantiteRetournee: number;
  quantiteStock: number | null; // null = article hors catalogue (prestation / libre)
}

export interface ArticleReport {
  meta: ReportMeta;
  debut: string;
  fin: string;
  nombreArticles: number;
  articles: ArticleReportRow[];
}

function round(n: number): number {
  return Math.round(n);
}

async function buildMeta(config: {
  nif: string;
  isf: string;
  nim: string;
  environnement: string;
  nomEtablissement: string;
}): Promise<ReportMeta> {
  const issuerRows = await prisma.parametres.findMany({ where: { cle: { startsWith: 'entreprise.' } } });
  const issuer = Object.fromEntries(issuerRows.map((row) => [row.cle.replace('entreprise.', ''), row.valeur]));
  return {
    nomCommercial: issuer.nomEtablissement || config.nomEtablissement || 'Établissement',
    raisonSociale: issuer.raisonSociale || undefined,
    nif: config.nif,
    isf: config.isf,
    nim: config.nim,
    environnement: config.environnement === 'production' ? 'production' : 'test',
    dateGeneration: new Date().toISOString(),
  };
}

interface ConfigRow {
  id: string;
  nif: string;
  isf: string;
  nim: string;
  environnement: string;
  nomEtablissement: string;
  catalogueFiscal: Prisma.JsonValue;
}

async function activeConfig(): Promise<ConfigRow> {
  const config = await prisma.configurationESECeF.findFirst({ where: { actif: true } });
  if (!config) throw new Error('Configurez le NIF, le NIM, l’ISF et le jeton dans Paramètres → Facturation certifiée.');
  return config as ConfigRow;
}

function taxRateFor(catalogue: Prisma.JsonValue, groupe: string): number {
  const taxes = (catalogue as { taxes?: Record<string, unknown> })?.taxes;
  const raw = taxes?.[groupe.toLowerCase()];
  const rate = Number(raw);
  return Number.isFinite(rate) ? rate : groupe === 'A' ? 0 : 19;
}

/**
 * Agrège les factures certifiées d'une période en un rapport de ventes (X ou Z).
 * Lit exclusivement les totaux officiels e-MCF (_totals) de chaque facture.
 */
async function computeSalesReport(
  config: ConfigRow,
  debut: Date,
  fin: Date,
  type: 'X' | 'Z',
  mode: 'quotidien' | 'periode',
): Promise<Omit<SalesReport, 'meta' | 'numeroZ' | 'dernierZ'>> {
  const factures = await prisma.factureESECeF.findMany({
    where: {
      statut: 'certifiee',
      configurationId: config.id,
      dateTimeCertification: { gte: debut, lte: fin },
    },
    include: { vente: { select: { methodePaiement: true, remiseMontant: true } } },
    orderBy: { dateTimeCertification: 'asc' },
  });

  // Clé type|groupe -> cellule
  const matrix = new Map<string, { type: string; groupe: string; taux: number } & ReportCell>();
  const perType = new Map<string, { type: string; nombre: number } & ReportCell>();
  const perGroup = new Map<string, { groupe: string; taux: number } & ReportCell>();
  const perPayment = new Map<string, number>();
  let reductionsCommerciales = 0;

  for (const facture of factures) {
    let record: Record<string, unknown>;
    try {
      record = JSON.parse(facture.requestData) as Record<string, unknown>;
    } catch {
      continue; // Instantané illisible : ignoré de l'agrégation.
    }
    const totals = record._totals as Record<string, number> | undefined;
    const factureType = String(record.type || facture.numeroFacture.slice(0, 2) || 'FV');
    if (!totals) continue; // Facture sans totaux officiels : exclue (ne doit pas arriver pour une certifiée récente).

    const typeAgg = perType.get(factureType) || { type: factureType, nombre: 0, montantTotal: 0, montantTaxable: 0, montantTaxe: 0 };
    typeAgg.nombre += 1;

    for (const groupe of TAX_GROUPS) {
      const letter = groupe.toLowerCase();
      const taa = totals['ta' + letter];
      const haa = totals['ha' + letter];
      const vaa = totals['va' + letter];
      if (!taa && !haa && !vaa) continue; // Groupe non utilisé par cette facture.
      const montantTotal = Number(taa) || (Number(haa) || 0) + (Number(vaa) || 0);
      const montantTaxable = Number(haa) || 0;
      const montantTaxe = Number(vaa) || 0;
      const taux = Number(totals['t' + letter]) || taxRateFor(config.catalogueFiscal, groupe);

      typeAgg.montantTotal += montantTotal;
      typeAgg.montantTaxable += montantTaxable;
      typeAgg.montantTaxe += montantTaxe;

      const mkey = factureType + '|' + groupe;
      const cell = matrix.get(mkey) || { type: factureType, groupe, taux, montantTotal: 0, montantTaxable: 0, montantTaxe: 0 };
      cell.montantTotal += montantTotal;
      cell.montantTaxable += montantTaxable;
      cell.montantTaxe += montantTaxe;
      matrix.set(mkey, cell);

      // La ventilation par groupe applique le sens (avoirs négatifs) pour refléter le net.
      const sign = CREDIT_TYPES.has(factureType) ? -1 : 1;
      const gcell = perGroup.get(groupe) || { groupe, taux, montantTotal: 0, montantTaxable: 0, montantTaxe: 0 };
      gcell.montantTotal += sign * montantTotal;
      gcell.montantTaxable += sign * montantTaxable;
      gcell.montantTaxe += sign * montantTaxe;
      perGroup.set(groupe, gcell);
    }
    perType.set(factureType, typeAgg);

    // Modes de paiement : montants officiels de la requête, sinon mode de la vente.
    const payments = record.payment as Array<{ name?: string; amount?: number }> | undefined;
    const sign = CREDIT_TYPES.has(factureType) ? -1 : 1;
    if (payments?.length) {
      for (const p of payments) {
        const name = String(p.name || 'AUTRE');
        perPayment.set(name, (perPayment.get(name) || 0) + sign * (Number(p.amount) || 0));
      }
    } else {
      const name = PAYMENT_FROM_VENTE[facture.vente?.methodePaiement || 'especes'] || 'ESPECES';
      perPayment.set(name, (perPayment.get(name) || 0) + sign * (Number(totals.total) || 0));
    }

    reductionsCommerciales += Number(facture.vente?.remiseMontant) || 0;
  }

  // Ventes incomplètes : ventes non finalisées (panier resté « en_cours ») sur la période.
  const nombreVentesIncompletes = await prisma.vente.count({
    where: { statut: 'en_cours', date: { gte: debut, lte: fin } },
  });

  const parTypeEtGroupe = Array.from(matrix.values())
    .map((c) => ({
      type: c.type,
      typeLabel: INVOICE_TYPE_LABELS[c.type] || c.type,
      groupe: c.groupe,
      taux: c.taux,
      montantTotal: round(c.montantTotal),
      montantTaxable: round(c.montantTaxable),
      montantTaxe: round(c.montantTaxe),
    }))
    .sort((a, b) => a.type.localeCompare(b.type) || a.groupe.localeCompare(b.groupe));

  const parType = Array.from(perType.values())
    .map((t) => ({
      type: t.type,
      typeLabel: INVOICE_TYPE_LABELS[t.type] || t.type,
      nombre: t.nombre,
      estAvoir: CREDIT_TYPES.has(t.type),
      montantTotal: round(t.montantTotal),
      montantTaxable: round(t.montantTaxable),
      montantTaxe: round(t.montantTaxe),
    }))
    .sort((a, b) => a.type.localeCompare(b.type));

  const parGroupe = Array.from(perGroup.values())
    .map((g) => ({
      groupe: g.groupe,
      taux: g.taux,
      montantTotal: round(g.montantTotal),
      montantTaxable: round(g.montantTaxable),
      montantTaxe: round(g.montantTaxe),
    }))
    .sort((a, b) => a.groupe.localeCompare(b.groupe));

  const parPaiement = Array.from(perPayment.entries())
    .map(([modeName, montant]) => ({ mode: modeName, libelle: PAYMENT_LABELS[modeName] || modeName, montant: round(montant) }))
    .sort((a, b) => b.montant - a.montant);

  const totaux = parType.reduce(
    (acc, t) => {
      const sign = t.estAvoir ? -1 : 1;
      acc.montantTotalNet += sign * t.montantTotal;
      acc.montantTaxableNet += sign * t.montantTaxable;
      acc.montantTaxeNet += sign * t.montantTaxe;
      return acc;
    },
    { montantTotalNet: 0, montantTaxableNet: 0, montantTaxeNet: 0 },
  );

  return {
    type,
    mode,
    debut: debut.toISOString(),
    fin: fin.toISOString(),
    nombreFactures: factures.length,
    parTypeEtGroupe,
    parType,
    parGroupe,
    parPaiement,
    reductionsCommerciales: round(reductionsCommerciales),
    nombreVentesIncompletes,
    totaux: {
      montantTotalNet: round(totaux.montantTotalNet),
      montantTaxableNet: round(totaux.montantTaxableNet),
      montantTaxeNet: round(totaux.montantTaxeNet),
    },
  };
}

/** Début de la journée courante (minuit, heure serveur). */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function lastZ(configId: string) {
  return prisma.rapportZ.findFirst({ where: { configurationId: configId }, orderBy: { numero: 'desc' } });
}

/**
 * X-rapport — exigence 2.8 / 4.2.
 * mode « quotidien » : depuis le dernier Z (ou minuit si aucun Z) jusqu'à maintenant.
 * mode « periode »   : sur la période [debut, fin] choisie. Ne clôture rien.
 */
export async function generateXReport(params: { mode: 'quotidien' | 'periode'; debut?: Date; fin?: Date }): Promise<SalesReport> {
  const config = await activeConfig();
  const meta = await buildMeta(config);
  const dernier = await lastZ(config.id);
  let debut: Date;
  let fin: Date;
  if (params.mode === 'periode') {
    if (!params.debut || !params.fin || isNaN(params.debut.getTime()) || isNaN(params.fin.getTime())) throw new Error('Période invalide : indiquez une date de début et de fin.');
    if (params.debut > params.fin) throw new Error('La date de début doit précéder la date de fin.');
    debut = params.debut;
    fin = params.fin;
  } else {
    debut = dernier ? dernier.fin : startOfToday();
    fin = new Date();
  }
  const data = await computeSalesReport(config, debut, fin, 'X', params.mode);
  return { ...data, meta, dernierZ: dernier ? { numero: dernier.numero, fin: dernier.fin.toISOString() } : null };
}

/** Z-rapport — aperçu (sans clôture) de la période en cours depuis le dernier Z. */
export async function previewZReport(): Promise<SalesReport> {
  const config = await activeConfig();
  const meta = await buildMeta(config);
  const dernier = await lastZ(config.id);
  const debut = dernier ? dernier.fin : startOfToday();
  const fin = new Date();
  const data = await computeSalesReport(config, debut, fin, 'Z', 'quotidien');
  return { ...data, meta, numeroZ: (dernier?.numero || 0) + 1, dernierZ: dernier ? { numero: dernier.numero, fin: dernier.fin.toISOString() } : null };
}

/**
 * Z-rapport — clôture (exigence 2.9 / 4.1). Fige la période depuis le dernier Z,
 * enregistre la clôture (numéro séquentiel + instantané) et renvoie le rapport.
 */
export async function closeZReport(genereePar: string): Promise<SalesReport> {
  const config = await activeConfig();
  const meta = await buildMeta(config);
  const fin = new Date();
  return prisma.$transaction(async (tx) => {
    const dernier = await tx.rapportZ.findFirst({ where: { configurationId: config.id }, orderBy: { numero: 'desc' } });
    const debut = dernier ? dernier.fin : startOfToday();
    const numero = (dernier?.numero || 0) + 1;
    // computeSalesReport lit via le client global : cohérent car la transaction ne modifie pas les factures.
    const data = await computeSalesReport(config, debut, fin, 'Z', 'quotidien');
    const report: SalesReport = { ...data, meta, numeroZ: numero, dernierZ: dernier ? { numero: dernier.numero, fin: dernier.fin.toISOString() } : null };
    await tx.rapportZ.create({
      data: {
        numero,
        configurationId: config.id,
        debut,
        fin,
        genereePar,
        donnees: JSON.parse(JSON.stringify(report)),
      },
    });
    return report;
  });
}

/**
 * A-rapport — détail par article (exigence 2.10 / 5.1).
 * Quantités vendues / retournées sur les factures certifiées de la période ;
 * quantité en stock = stock catalogue courant.
 */
export async function generateAReport(params: { debut?: Date; fin?: Date }): Promise<ArticleReport> {
  const config = await activeConfig();
  const meta = await buildMeta(config);
  if (params.debut && params.fin && params.debut > params.fin) throw new Error('La date de début doit précéder la date de fin.');
  const dateFilter = params.debut || params.fin ? { gte: params.debut, lte: params.fin } : undefined;

  const items = await prisma.itemVente.findMany({
    where: {
      vente: {
        typeFacture: { in: ['FV', 'FT', 'FA', 'EV', 'ET', 'EA'] },
        factureESECeF: { is: { statut: 'certifiee', configurationId: config.id, dateTimeCertification: dateFilter } },
      },
    },
    include: {
      vente: { select: { typeFacture: true } },
      medicament: { select: { id: true, nom: true, quantiteStock: true, groupeTaxation: true } },
    },
  });

  type Acc = { code: string; nom: string; prixUnitaire: number; groupe: string; quantiteVendue: number; quantiteRetournee: number; medicamentId: string | null };
  const map = new Map<string, Acc>();
  for (const item of items) {
    const groupe = (item.groupeTaxation || item.medicament?.groupeTaxation || 'B').toUpperCase();
    const code = item.code || item.medicamentId || item.libelle || 'N/D';
    const key = code + '|' + groupe;
    const acc = map.get(key) || {
      code,
      nom: item.libelle || item.medicament?.nom || code,
      prixUnitaire: item.prixUnitaire,
      groupe,
      quantiteVendue: 0,
      quantiteRetournee: 0,
      medicamentId: item.medicamentId || null,
    };
    // Prix unitaire représentatif : conserve le plus récent rencontré.
    acc.prixUnitaire = item.prixUnitaire;
    if (CREDIT_TYPES.has(item.vente.typeFacture)) acc.quantiteRetournee += item.quantite;
    else acc.quantiteVendue += item.quantite;
    map.set(key, acc);
  }

  // Stock courant : regroupé par médicament.
  const medIds = Array.from(new Set(items.map((i) => i.medicamentId).filter((x): x is string => !!x)));
  const stocks = medIds.length ? await prisma.medicament.findMany({ where: { id: { in: medIds } }, select: { id: true, quantiteStock: true } }) : [];
  const stockById = new Map(stocks.map((m) => [m.id, m.quantiteStock]));

  const articles = Array.from(map.values())
    .map((a) => ({
      code: a.code,
      nom: a.nom,
      prixUnitaire: round(a.prixUnitaire),
      tauxImpot: taxRateFor(config.catalogueFiscal, a.groupe),
      quantiteVendue: a.quantiteVendue,
      quantiteRetournee: a.quantiteRetournee,
      quantiteStock: a.medicamentId ? stockById.get(a.medicamentId) ?? null : null,
    }))
    .sort((a, b) => b.quantiteVendue - a.quantiteVendue || a.nom.localeCompare(b.nom));

  return {
    meta,
    debut: (params.debut || new Date(0)).toISOString(),
    fin: (params.fin || new Date()).toISOString(),
    nombreArticles: articles.length,
    articles,
  };
}

export async function listZReports(limit = 50) {
  const config = await prisma.configurationESECeF.findFirst({ where: { actif: true } });
  const rows = await prisma.rapportZ.findMany({
    where: config ? { configurationId: config.id } : {},
    orderBy: { numero: 'desc' },
    take: limit,
    select: { id: true, numero: true, debut: true, fin: true, genereePar: true, dateCreation: true },
  });
  return rows;
}
