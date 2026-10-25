import QRCode from 'qrcode';
import { amountInWords } from './amountInWords';

interface CertifiedInvoiceItem {
  nom: string;
  code?: string;
  quantite: number;
  prixUnitaire: number;
  montant: number;
  groupeTaxation: string; // A-P (voir section 2.13 des specs)
  taxeSpecifique?: number;
  taxeSpecifiqueDesc?: string;
  isbGroupe?: string; // A, B, C, D (section 2.14 des specs)
  isbMontant?: number;
  prixOriginal?: number;
  descriptionModification?: string;
}

interface CertifiedInvoiceClient {
  nif?: string;
  nom?: string;
  adresse?: string;
  contact?: string;
}

interface CertifiedInvoicePayment {
  type: string; // ESPECES, VIREMENT, CARTEBANCAIRE, MOBILEMONEY, CHEQUES, CREDIT, AUTRE
  montant: number;
}

interface CertifiedInvoiceTotals {
  [key: string]: {
    totalHT: number;
    totalTVA: number;
    tauxTVA: number;
    totalTS?: number;
  };
}

interface ESECeFSecurityElements {
  codeSECeFDGI: string;
  nim: string;
  compteurs: string; // Format: FC/TC FT
  dateHeure: string; // Format: DD/MM/YYYY HH:MM:SS
  qrCodeData: string;
}

interface CertifiedInvoiceData {
  // SECTION 3.1 (i-iv) - Informations contribuable (obligatoires)
  pharmacieName: string;
  raisonSociale?: string;
  environnement?: 'test' | 'production';
  nif: string;
  rccm?: string;
  adresse: string;
  telephone: string;
  email: string;
  boitePostale?: string;
  
  // SECTION 3.1 (vi-x, xii) - Type et numéro de facture
  modePrix?: 'ttc' | 'ht';
  typeFacture: string; // FV, FA, FT, EV, EA, ET (section 2.7)
  numeroFacture: string; // Numéro ascendant ininterrompu par année
  isCopie?: boolean; // Mention COPIE si true
  isAnnulee?: boolean; // Mention ANNULÉE si true
  referenceFactureOriginale?: string; // Pour FA, EA (obligatoire pour factures d'avoir)
  
  // SECTION 3.1 (xxii-xxiii) - Date et heure
  dateEtablissement: string; // Date d'établissement de la facture
  heureEtablissement?: string; // Heure d'établissement (si applicable)
  
  // SECTION 3.1 (xxv) - Opérateur
  operateur: string; // Nom de l'opérateur (si possible)
  operateurId?: string; // ID de l'opérateur
  
  // SECTION 3.1 (xxiv) - ISF
  isf: string; // Numéro de série unique de SFE
  
  // SECTION 3.1 (v) - Client
  client?: CertifiedInvoiceClient;
  
  // SECTION 3.1 (xiii-xiv) - Articles
  items: CertifiedInvoiceItem[];
  
  // SECTION 3.1 (xv-xvii) - Totaux par groupe de taxation
  totauxParGroupe: CertifiedInvoiceTotals;
  
  // SECTION 3.1 (xviii, xx, xxi) - Totaux globaux
  totalTVA: number;
  isbTotal?: number;
  isbTaux?: string; // A (2%), B (5%), C, D
  taxeSpecifiqueTotal?: number;
  totalTTC: number;
  
  // SECTION 3.1 (xix) - Modes de paiement
  paiements: CertifiedInvoicePayment[];
  
  // SECTION 3.1 (xxvi) - Éléments de sécurité e-SECeF
  securityElements: ESECeFSecurityElements;
  
  // SECTION 2.20 - Commentaires (optionnels, max 8 lignes)
  commentaires?: string[];

  // Largeur papier (mm) pour imprimante thermique (ex: 58 ou 80)
  paperWidthMm?: number;
}

const labels: Record<string,string> = { FV:'FACTURE DE VENTE', FA:"FACTURE D’AVOIR", FT:"FACTURE D’ACOMPTE OU D’AVANCE", EV:"FACTURE DE VENTE À L’EXPORTATION", EA:"FACTURE D’AVOIR À L’EXPORTATION", ET:"FACTURE D’ACOMPTE À L’EXPORTATION", CV:'FACTURE DE VENTE', CA:"FACTURE D’AVOIR", CT:"FACTURE D’ACOMPTE OU D’AVANCE", EC:"FACTURE DE VENTE À L’EXPORTATION", ER:"FACTURE D’AVOIR À L’EXPORTATION", EK:"FACTURE D’ACOMPTE À L’EXPORTATION" };
const escapeHtml=(v: unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const quantity=(v:number)=>(v<0?'- ':'')+Math.abs(v).toLocaleString('fr-FR',{maximumFractionDigits:3}).replace(/[\u00a0\u202f]/g,' ');
const amount=(v:number)=>{ const n=Math.round(v); return (n<0?'- ':'')+Math.abs(n).toLocaleString('fr-FR').replace(/[\u00a0\u202f ]/g,'.'); };
export function assertCertifiedAmounts(data: CertifiedInvoiceData) {
  // Historical documents with specific taxes keep their original fiscal treatment.
  if (data.taxeSpecifiqueTotal || data.items.some(i=>i.taxeSpecifique)) return;
  const groups=Object.entries(data.totauxParGroupe);
  const sumHT=groups.reduce((s,[,g])=>s+Math.abs(g.totalHT),0);
  const sumVAT=groups.reduce((s,[,g])=>s+Math.abs(g.totalTVA),0);
  if (![sumHT,sumVAT,data.totalTVA,data.totalTTC,data.isbTotal||0].every(Number.isFinite) || sumVAT!==Math.abs(data.totalTVA) || sumHT+sumVAT+Math.abs(data.isbTotal||0)!==Math.abs(data.totalTTC)) throw new Error('Impression bloquée : les bases HT, la TVA et le total confirmé DGI ne concordent pas.');
  for(const [group,g] of groups) {
    const lines=data.items.filter(i=>i.groupeTaxation===group);
    const sum=lines.reduce((s,i)=>s+Math.abs(i.montant),0);
    const expected=data.modePrix?.toLowerCase()==='ht'?Math.abs(g.totalHT):Math.abs(g.totalHT)+Math.abs(g.totalTVA);
    if(sum!==expected || lines.some(i=>!Number.isFinite(i.quantite)||!Number.isFinite(i.prixUnitaire)||Math.abs(Math.round(Math.abs(i.prixUnitaire*i.quantite))-Math.abs(i.montant))>0)) throw new Error('Impression bloquée : les montants des lignes ne correspondent pas au récapitulatif fiscal DGI.');
  }
}
export async function buildCertifiedInvoiceHtml(data: CertifiedInvoiceData): Promise<string> {
  assertCertifiedAmounts(data);
  const security=data.securityElements;
  if(!security?.codeSECeFDGI||!security.qrCodeData||!security.nim||!security.compteurs||!security.dateHeure) throw new Error('Impossible d’imprimer : les éléments de sécurité e‑MCF sont incomplets.');
  const avoir=['FA','EA','CA','ER'].includes(data.typeFacture);
  const signed=(v:number)=>avoir?-Math.abs(v):v;
  const reference=data.referenceFactureOriginale || (data as any).referenceFacture;
  if(avoir&&!reference) throw new Error('La référence de la facture d’origine est obligatoire pour imprimer un avoir.');
  const qr=await QRCode.toString(security.qrCodeData,{type:'svg',errorCorrectionLevel:'M',margin:1});
  const thermal=!!data.paperWidthMm&&data.paperWidthMm<=80;
  const duplicate=data.isCopie||['CV','CA','CT','EC','ER','EK'].includes(data.typeFacture);
  const lineItems=data.items.map((item,index)=>`<tr><td class="center">${index+1}</td><td>${escapeHtml(item.nom)} [${escapeHtml(item.groupeTaxation==='A'?'A-EX':item.groupeTaxation)}]${item.taxeSpecifique?`<small>T.S. : ${amount(item.taxeSpecifique)} FCFA${item.taxeSpecifiqueDesc?` (${escapeHtml(item.taxeSpecifiqueDesc)} / unité)`:``}</small>`:''}${item.descriptionModification?`<small>${escapeHtml(item.descriptionModification)}${item.prixOriginal!==undefined?` · Prix initial : ${amount(item.prixOriginal)}`:``}</small>`:''}${item.isbMontant?`<small>ISB ${escapeHtml(item.isbGroupe)} : ${amount(signed(item.isbMontant))}</small>`:''}</td><td class="number">${amount(signed(Math.abs(item.prixUnitaire)))}</td><td class="number">${quantity(Math.abs(item.quantite))}</td><td class="number">${amount(signed(Math.abs(item.montant)))}</td></tr>`).join('');
  const totals=Object.entries(data.totauxParGroupe).map(([group,t])=>`<div><span>Total H.T. [${escapeHtml(group)}] ${t.tauxTVA}%</span><span>${amount(signed(Math.abs(t.totalHT)))}</span></div>${t.totalTS?`<div><span>Total T.S. [${escapeHtml(group)}]</span><span>${amount(signed(t.totalTS))}</span></div>`:''}<div><span>Total TVA [${escapeHtml(group)}] ${t.tauxTVA}%</span><span>${amount(signed(Math.abs(t.totalTVA)))}</span></div>`).join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(labels[data.typeFacture]||data.typeFacture)} — ${escapeHtml(data.numeroFacture)}</title><style>
*{box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;color:#202020;background:#f3f3f3;font-size:12px;margin:0;line-height:1.35}
.invoice{max-width:190mm;margin:8mm auto;padding:8mm;background:#fff}
.test-marker{border:1px solid #aaa;background:#fff;color:#444;text-align:center;padding:5px 8px;margin-bottom:16px;font-size:10px;font-weight:600;letter-spacing:.7px}
.top{display:grid;grid-template-columns:minmax(0,1fr) 40%;gap:24px;padding:0 0 16px;border-bottom:1px solid #aaa}
.issuer h1{font-size:21px;line-height:1.15;letter-spacing:-.4px;margin:0 0 7px;color:#111}
.issuer p{margin:2px 0;font-size:11px;overflow-wrap:anywhere}.issuer .shop{font-weight:600;margin-bottom:7px}
.client{align-self:start;border-left:1px solid #bbb;padding:2px 0 2px 16px;min-width:0}
.client h2{margin:0 0 9px;font-size:10px;letter-spacing:1.4px;color:#444;font-weight:600}
.client dl{display:grid;grid-template-columns:27% minmax(0,1fr);gap:4px 7px;margin:0;font-size:11px}.client dt{color:#555}.client dd{margin:0;overflow-wrap:anywhere}
.title{margin:18px 0 16px}.title h2{font-size:24px;letter-spacing:-.5px;line-height:1.15;margin:0 0 7px;font-weight:600;color:#111}.title p{font-size:11px;margin:3px 0;overflow-wrap:anywhere}.title .reference{font-size:11px;font-weight:600;margin-top:7px}
table{border-collapse:collapse;width:100%;font-size:12px;table-layout:fixed}th:nth-child(1){width:5%}th:nth-child(2){width:39%}th:nth-child(3){width:23%}th:nth-child(4){width:11%}th:nth-child(5){width:22%}
thead{display:table-header-group}th{background:#fff;color:#222;text-align:left;font-size:10px;font-weight:600;padding:9px 6px;border-top:1px solid #777;border-bottom:1px solid #777}th:nth-child(n+3){text-align:right}
td{padding:9px 6px;border-bottom:1px solid #ddd;vertical-align:top;overflow-wrap:anywhere}tr{break-inside:avoid}td small{display:block;font-size:10px;color:#444;margin-top:3px;line-height:1.3}
.number{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.center{text-align:center}
.summary{display:grid;grid-template-columns:minmax(0,1fr) 49%;gap:24px;margin-top:16px;break-inside:avoid}.left-summary{display:flex;flex-direction:column;align-items:flex-start;gap:7px;font-size:11px;color:#444}
.totals>div{display:flex;justify-content:space-between;gap:12px;margin:4px 0;font-size:11px;line-height:1.25}.totals>div>span:last-child{font-variant-numeric:tabular-nums;white-space:nowrap}
.grand{display:flex;justify-content:space-between;align-items:baseline;gap:12px;background:#fff;color:#111;border-top:1px solid #555;border-bottom:1px solid #aaa;margin-top:12px;padding:10px 0;font-size:26px;line-height:1.15;white-space:nowrap}.grand span:first-child{font-size:12px;font-weight:600}.grand span:last-child{font-weight:600;font-variant-numeric:tabular-nums}
.words{font-size:11px;color:#444;margin:16px 0;line-height:1.4}
.security{margin-top:18px;padding-top:12px;border-top:1px solid #aaa;break-inside:avoid}.security-heading{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:0 0 10px;font-size:10px;color:#444}.security-heading em{font-style:normal;letter-spacing:.6px;font-weight:600}.security-heading strong{font-weight:normal;white-space:nowrap}
.security-box{display:grid;grid-template-columns:104px minmax(0,1fr);align-items:center;gap:18px;padding:0;background:#fff}.qr{background:#fff;padding:0}.qr svg{display:block;width:104px;height:104px}
.security-values{font-size:10px;color:#444;min-width:0}.security-values>strong{display:block;margin:4px 0 9px;font-size:13px;letter-spacing:.2px;color:#111;overflow-wrap:anywhere}.security-values dl{display:grid;grid-template-columns:32% minmax(0,1fr);gap:4px 8px;text-align:left;line-height:1.3;margin:0}.security-values dd{margin:0;font-weight:600;overflow-wrap:anywhere}
.comments{font-size:11px;line-height:1.4;margin-top:12px;break-inside:avoid}.document-footer{text-align:center;color:#555;font-size:9px;padding-top:12px;margin-top:12px}
.actions{display:flex;gap:10px;justify-content:center;padding:20px}.actions button{padding:12px 20px;border:1px solid #777;background:#fff;color:#222;font-weight:600;font-size:13px;cursor:pointer}
@page{size:${thermal?`${data.paperWidthMm}mm auto`:'A4'};margin:${thermal?'3mm':'12mm 15mm'}}
@media print{body{background:#fff;print-color-adjust:exact;-webkit-print-color-adjust:exact}.invoice{margin:0;padding:0;width:100%;max-width:none}.actions{display:none}}
  ${thermal?`.invoice{max-width:${data.paperWidthMm}mm;margin:4mm auto;padding:0;font-size:10px;border-radius:0;box-shadow:none}table{table-layout:auto}.top{background:white;border:0}.client{padding:5px}.grand{padding:10px;color:black;background:white}.security-box{border-radius:0}.qr{padding:0}.document-footer{font-size:8px}.top,.summary{display:block;padding:0}.issuer h1{font-size:14px}.issuer p{font-size:10px}.client{margin-top:12px}.title h2{font-size:14px}.title p{font-size:11px}table{font-size:9px}th,td{padding:2px}td.number{white-space:normal}.grand{font-size:16px;letter-spacing:0;padding:0}.words{font-size:10px;margin:15px 0}.security-heading{display:block;padding:0;font-size:10px}.security-box{display:block;padding:6px}.security-values{font-size:9px}.security-values>strong{font-size:10px}.qr svg{width:80px;height:80px}.client dl{padding:5px;font-size:10px}`:''}
  </style></head><body><article class="invoice">${data.environnement === 'test' ? '<div class="test-marker">ENVIRONNEMENT DE TEST DGI — DOCUMENT DE TEST</div>' : ''}<div class="top"><section class="issuer"><h1>${escapeHtml(data.raisonSociale||data.pharmacieName)}</h1><p class="shop">Point de vente : ${escapeHtml(data.pharmacieName)}</p><p>NIF : ${escapeHtml(data.nif)}</p>${data.rccm?`<p>RCCM : ${escapeHtml(data.rccm)}</p>`:''}${data.boitePostale?`<p>${escapeHtml(data.boitePostale)}</p>`:''}<p>${escapeHtml(data.adresse)}</p><p>${escapeHtml(data.telephone)}</p><p>${escapeHtml(data.email)}</p></section><section class="client"><h2>CLIENT</h2><dl><dt>Nom</dt><dd>${escapeHtml(data.client?.nom||'Client anonyme')}</dd><dt>NIF</dt><dd>${escapeHtml(data.client?.nif)}</dd><dt>Adresse</dt><dd>${escapeHtml(data.client?.adresse)}</dd><dt>Contact</dt><dd>${escapeHtml(data.client?.contact)}</dd></dl></section></div><div class="title"><h2>${data.isAnnulee?'ANNULÉE ':''}${duplicate?'DUPLICATA ':''}${escapeHtml(labels[data.typeFacture]||data.typeFacture)}</h2><p>Facture # ${escapeHtml(data.numeroFacture)}</p><p>Établie le ${escapeHtml(data.dateEtablissement || security.dateHeure)}</p>${reference?`<p class="reference">Reference de facture SECeF : ${escapeHtml(reference)}</p>`:''}</div><table><thead><tr><th>#</th><th>Designation</th><th>Prix unitaire (${data.modePrix?.toLowerCase()==='ht'?'HT':'TTC'})</th><th>Quantité</th><th>Montant (${data.modePrix?.toLowerCase()==='ht'?'HT':'TTC'})</th></tr></thead><tbody>${lineItems}</tbody></table><div class="summary"><div class="left-summary"><span>Nombre d’articles : ${data.items.length}</span><span>Mode de paiement : ${escapeHtml(data.paiements.map(p=>p.type).join(' / '))}</span></div><div><div class="totals">${totals}<div><span>TOTAL HORS TAXE</span><span>${amount(signed(Object.values(data.totauxParGroupe).reduce((sum,t)=>sum+Math.abs(t.totalHT),0)))}</span></div><div><span>TOTAL TVA</span><span>${amount(signed(Math.abs(data.totalTVA)))}</span></div>${data.taxeSpecifiqueTotal?`<div><span>TAXE SPÉCIFIQUE</span><span>${amount(signed(data.taxeSpecifiqueTotal))}</span></div>`:''}${data.isbTotal?`<div><span>SOUS-TOTAL TTC HORS ISB</span><span>${amount(signed(Math.abs(data.totalTTC)-Math.abs(data.isbTotal)))}</span></div><div><span>PRÉCOMPTE ISB ${escapeHtml(data.isbTaux)} ${data.isbTaux==='A'?'2%':data.isbTaux==='B'?'5%':''}</span><span>${amount(signed(data.isbTotal))}</span></div>`:''}</div><div class="grand"><span>Total TTC:</span><span>${amount(signed(Math.abs(data.totalTTC)))}</span></div></div></div><p class="words">Arrêté la présente facture à la somme de ${escapeHtml(amountInWords(data.totalTTC))} francs CFA TTC</p><section class="security"><div class="security-heading"><em>ÉLÉMENTS DE SÉCURITÉ · FACTURE CERTIFIÉE</em><strong>ISF: ${escapeHtml(data.isf)}</strong></div><div class="security-box"><div class="qr">${qr}</div><div class="security-values">Code SECeF/DGI<strong>${escapeHtml(security.codeSECeFDGI)}</strong><dl><dt>SECeF NIM:</dt><dd>${escapeHtml(security.nim)}</dd><dt>SECeF Compteurs:</dt><dd>${escapeHtml(security.compteurs)}</dd><dt>SECeF date et heure:</dt><dd>${escapeHtml(security.dateHeure)}</dd></dl></div></div></section>${data.commentaires?.length?`<section class="comments">${data.commentaires.slice(0,8).map(c=>`<div>${escapeHtml(c)}</div>`).join('')}</section>`:''}<footer class="document-footer">Document établi électroniquement · Montants en FCFA</footer></article><div class="actions"><button onclick="window.print()">Imprimer / Enregistrer en PDF</button><button onclick="window.close()">Fermer</button></div></body></html>`;
}
export async function printCertifiedInvoice(data: CertifiedInvoiceData) {
  const printWindow=window.open('','_blank');
  if(!printWindow) { alert('Autorisez l’ouverture de la fenêtre d’impression pour consulter votre facture.'); return; }
  try { const html=await buildCertifiedInvoiceHtml(data); printWindow.document.open();printWindow.document.write(html);printWindow.document.close(); } catch(error) { printWindow.close(); alert(error instanceof Error?error.message:'Impression impossible.'); }
}
export type { CertifiedInvoiceData, CertifiedInvoiceItem, CertifiedInvoiceClient, CertifiedInvoicePayment, ESECeFSecurityElements };
export async function printStoredCertifiedInvoice(id: string, copie = false, byFactureId = false) {
  const printWindow = window.open('', '_blank'); if (!printWindow) { alert('Autorisez l’ouverture de la fenêtre d’impression.'); return; }
  try {
    const response = await fetch(`/api/invoice/document?${byFactureId ? 'factureId' : 'venteId'}=${encodeURIComponent(id)}&copie=${copie ? '1' : '0'}`);
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    if (data.paiements) data.paiements = data.paiements.map((p: any) => ({ type: p.type || p.name, montant: p.montant ?? p.amount }));
    const html = await buildCertifiedInvoiceHtml(data); printWindow.document.open(); printWindow.document.write(html); printWindow.document.close();
  } catch (error) { printWindow.close(); alert(error instanceof Error ? error.message : 'Impression impossible.'); }
}
