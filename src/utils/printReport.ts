import type { SalesReport, ArticleReport } from '@/lib/reports';

// Impression des rapports fiscaux X / Z / A au même rendu soigné que les factures
// certifiées (voir printCertifiedInvoice.ts). Pas de code QR : ce ne sont pas des factures.

const escapeHtml = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const amount = (v: number) => {
  const n = Math.round(v);
  return (n < 0 ? '- ' : '') + Math.abs(n).toLocaleString('fr-FR').replace(/[   ]/g, '.');
};
const qty = (v: number) =>
  (v < 0 ? '- ' : '') + Math.abs(v).toLocaleString('fr-FR', { maximumFractionDigits: 3 }).replace(/[  ]/g, ' ');
const dateTime = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? escapeHtml(iso) : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const dateOnly = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? escapeHtml(iso) : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const STYLE = `*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#252525;background:#eeeeee;font-size:12px;margin:0;line-height:1.5}.invoice{max-width:190mm;margin:12mm auto;padding:10mm;background:white;border-radius:18px;box-shadow:0 12px 48px #00000010}.test-marker{border:1px solid #b8b8b8;background:#f3f3f3;color:#444444;text-align:center;padding:8px 12px;margin-bottom:20px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:1px}.top{display:grid;grid-template-columns:1fr 43%;gap:25px;padding:22px;background:#f2f2f2;border-left:5px solid #303030;border-radius:0 12px 12px 0}.issuer h1{font-size:20px;line-height:1.2;letter-spacing:-.4px;color:#171717;margin:0 0 9px}.issuer p{margin:3px 0;font-size:11px;color:#555555}.issuer .shop{font-weight:bold;color:#303030}.meta{align-self:start;background:#fff;border:1px solid #dedede;border-radius:8px;padding:14px}.meta h2{margin:0 0 9px;color:#595959;font-weight:bold;font-size:10px;letter-spacing:1.5px}.meta dl{display:grid;grid-template-columns:42% 58%;gap:4px 7px;margin:0;font-size:11px}.meta dt{color:#777777}.meta dd{margin:0;overflow-wrap:anywhere;color:#252525;font-weight:bold}.title{margin:27px 0 19px;padding-bottom:16px;border-bottom:1px solid #dedede}.title h2{font-size:23px;letter-spacing:-.5px;line-height:1.2;margin:0 0 7px;color:#171717}.title p{font-size:11px;color:#666666;margin:3px 0}.section-label{margin:26px 0 9px;font-size:11px;font-weight:bold;letter-spacing:.6px;color:#595959;text-transform:uppercase}table{border-collapse:collapse;width:100%;font-size:11px}thead{display:table-header-group}th{background:#303030;color:#fff;text-align:left;font-size:10px;font-weight:bold;padding:9px 8px;border:0}td{padding:9px 8px;border-bottom:1px solid #e4e4e4;vertical-align:top;overflow-wrap:anywhere}tbody tr:nth-child(even){background:#f7f7f7}tr{break-inside:avoid}tfoot td{font-weight:bold;background:#f0f0f0;border-top:2px solid #303030}.number{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.center{text-align:center}.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}.kpi{border:1px solid #dedede;border-radius:9px;padding:13px 15px;background:#fafafa}.kpi span{display:block;font-size:10px;color:#777;letter-spacing:.4px}.kpi strong{display:block;font-size:17px;color:#171717;margin-top:5px;font-variant-numeric:tabular-nums}.grand{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#171717;color:#fff;border-radius:9px;margin-top:18px;padding:16px 15px;font-size:20px;white-space:nowrap}.grand span:first-child{font-size:12px;font-weight:normal}.grand span:last-child{font-weight:bold;font-variant-numeric:tabular-nums}.document-footer{border-top:1px solid #e4e4e4;text-align:center;color:#777777;font-size:9px;padding-top:11px;margin-top:26px}.actions{display:flex;gap:10px;justify-content:center;padding:20px}.actions button{padding:12px 20px;border:1px solid #303030;border-radius:8px;background:#fff;color:#303030;font-weight:600;font-size:13px;cursor:pointer}.actions button:first-child{background:#303030;color:white}@page{size:A4;margin:12mm 15mm}@media print{body{background:white;print-color-adjust:exact;-webkit-print-color-adjust:exact}.invoice{margin:0;padding:0;width:100%;max-width:none;border-radius:0;box-shadow:none}.actions{display:none}}`;

function header(meta: SalesReport['meta'], titre: string, sousLignes: string[]): string {
  return `<article class="invoice">${meta.environnement === 'test' ? '<div class="test-marker">ENVIRONNEMENT DE TEST DGI — DOCUMENT DE TEST</div>' : ''}<div class="top"><section class="issuer"><h1>${escapeHtml(meta.raisonSociale || meta.nomCommercial)}</h1><p class="shop">Point de vente : ${escapeHtml(meta.nomCommercial)}</p><p>NIF : ${escapeHtml(meta.nif)}</p><p>ISF : ${escapeHtml(meta.isf)}</p><p>NIM e‑MCF : ${escapeHtml(meta.nim)}</p></section><section class="meta"><h2>RAPPORT</h2><dl><dt>Généré le</dt><dd>${dateTime(meta.dateGeneration)}</dd>${sousLignes.map((l) => l).join('')}</dl></section></div><div class="title"><h2>${escapeHtml(titre)}</h2></div>`;
}

export function buildSalesReportHtml(report: SalesReport): string {
  const isZ = report.type === 'Z';
  const titre = isZ ? `Z-RAPPORT — CLÔTURE N° ${report.numeroZ ?? ''}` : report.mode === 'quotidien' ? 'X-RAPPORT QUOTIDIEN' : 'X-RAPPORT PÉRIODIQUE';
  const sousLignes = [
    `<dt>Type</dt><dd>${isZ ? 'Z (clôture)' : 'X (lecture)'}</dd>`,
    `<dt>Période</dt><dd>${dateTime(report.debut)} → ${dateTime(report.fin)}</dd>`,
    isZ && report.numeroZ ? `<dt>Clôture Z n°</dt><dd>${report.numeroZ}</dd>` : '',
    report.dernierZ ? `<dt>Dernier Z</dt><dd>n° ${report.dernierZ.numero} · ${dateTime(report.dernierZ.fin)}</dd>` : '',
  ].filter(Boolean);

  const matriceRows = report.parTypeEtGroupe.length
    ? report.parTypeEtGroupe
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.type)} — ${escapeHtml(r.typeLabel)}</td><td class="center">${escapeHtml(r.groupe)}</td><td class="number">${r.taux}%</td><td class="number">${amount(r.montantTotal)}</td><td class="number">${amount(r.montantTaxable)}</td><td class="number">${amount(r.montantTaxe)}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="6" class="center">Aucune facture certifiée sur la période.</td></tr>';

  const typeRows = report.parType
    .map(
      (t) =>
        `<tr><td>${escapeHtml(t.type)} — ${escapeHtml(t.typeLabel)}${t.estAvoir ? ' (avoir)' : ''}</td><td class="number">${t.nombre}</td><td class="number">${amount(t.montantTotal)}</td><td class="number">${amount(t.montantTaxable)}</td><td class="number">${amount(t.montantTaxe)}</td></tr>`,
    )
    .join('');

  const paiementRows = report.parPaiement.length
    ? report.parPaiement.map((p) => `<tr><td>${escapeHtml(p.libelle)}</td><td class="number">${amount(p.montant)}</td></tr>`).join('')
    : '<tr><td colspan="2" class="center">—</td></tr>';

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(titre)}</title><style>${STYLE}</style></head><body>${header(report.meta, titre, sousLignes)}
  <div class="kpis"><div class="kpi"><span>Nombre de factures</span><strong>${report.nombreFactures}</strong></div><div class="kpi"><span>Réductions commerciales</span><strong>${amount(report.reductionsCommerciales)}</strong></div><div class="kpi"><span>Ventes incomplètes</span><strong>${report.nombreVentesIncompletes}</strong></div></div>
  <p class="section-label">Montants par type de facture et par groupe de taxation</p>
  <table><thead><tr><th>Type de facture</th><th class="center">Groupe</th><th class="number">Taux</th><th class="number">Montant total</th><th class="number">Montant taxable</th><th class="number">Montant de la taxe</th></tr></thead><tbody>${matriceRows}</tbody></table>
  <p class="section-label">Récapitulatif par type de facture</p>
  <table><thead><tr><th>Type de facture</th><th class="number">Nombre</th><th class="number">Montant total</th><th class="number">Montant taxable</th><th class="number">Montant de la taxe</th></tr></thead><tbody>${typeRows}</tbody></table>
  <p class="section-label">Totaux par mode de paiement</p>
  <table><thead><tr><th>Mode de paiement</th><th class="number">Montant</th></tr></thead><tbody>${paiementRows}</tbody></table>
  <div class="grand"><span>Total net de la période (TTC) :</span><span>${amount(report.totaux.montantTotalNet)}</span></div>
  <div class="kpis" style="margin-top:14px"><div class="kpi"><span>Total taxable net (HT)</span><strong>${amount(report.totaux.montantTaxableNet)}</strong></div><div class="kpi"><span>Total taxe nette (TVA)</span><strong>${amount(report.totaux.montantTaxeNet)}</strong></div><div class="kpi"><span>Total net (TTC)</span><strong>${amount(report.totaux.montantTotalNet)}</strong></div></div>
  <footer class="document-footer">Rapport établi électroniquement · Montants en FCFA · Totaux officiels e‑MCF</footer></article>
  <div class="actions"><button onclick="window.print()">Imprimer / Enregistrer en PDF</button><button onclick="window.close()">Fermer</button></div></body></html>`;
}

export function buildArticleReportHtml(report: ArticleReport): string {
  const titre = 'A-RAPPORT — DÉTAIL PAR ARTICLE';
  const sousLignes = [`<dt>Période</dt><dd>${dateOnly(report.debut)} → ${dateOnly(report.fin)}</dd>`, `<dt>Articles</dt><dd>${report.nombreArticles}</dd>`];
  const rows = report.articles.length
    ? report.articles
        .map(
          (a) =>
            `<tr><td>${escapeHtml(a.code)}</td><td>${escapeHtml(a.nom)}</td><td class="number">${amount(a.prixUnitaire)}</td><td class="number">${a.tauxImpot}%</td><td class="number">${qty(a.quantiteVendue)}</td><td class="number">${qty(a.quantiteRetournee)}</td><td class="number">${a.quantiteStock === null ? '—' : qty(a.quantiteStock)}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="7" class="center">Aucun article vendu sur la période.</td></tr>';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(titre)}</title><style>${STYLE}</style></head><body>${header(report.meta, titre, sousLignes)}
  <p class="section-label">Mouvements et stock par article</p>
  <table><thead><tr><th>Code</th><th>Désignation</th><th class="number">Prix unitaire</th><th class="number">Taux d’impôt</th><th class="number">Qté vendue</th><th class="number">Qté retournée</th><th class="number">Qté en stock</th></tr></thead><tbody>${rows}</tbody></table>
  <footer class="document-footer">Rapport établi électroniquement · Montants en FCFA · Quantité en stock au moment de l’édition</footer></article>
  <div class="actions"><button onclick="window.print()">Imprimer / Enregistrer en PDF</button><button onclick="window.close()">Fermer</button></div></body></html>`;
}

function openAndWrite(html: string) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Autorisez l’ouverture de la fenêtre d’impression pour consulter le rapport.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

export function printSalesReport(report: SalesReport) {
  openAndWrite(buildSalesReportHtml(report));
}
export function printArticleReport(report: ArticleReport) {
  openAndWrite(buildArticleReportHtml(report));
}
