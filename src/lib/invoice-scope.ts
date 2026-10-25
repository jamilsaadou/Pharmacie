/** Supported scope for NEW certifications. Historical signed records remain readable. */
export function assertSupportedInvoice(type: string, items: Array<{taxGroup?:string;groupeTaxation?:string;code?:string;quantity?:number;taxSpecificAmount?:unknown;taxSpecificValue?:unknown}> = []) {
  if (!['FV','FA'].includes(type)) throw new Error('Cette installation prend en charge uniquement les factures de vente et les factures d’avoir.');
  for (const item of items) {
    const group=item.taxGroup || item.groupeTaxation || 'B';
    const stamp=group==='L'&&item.code==='TIMBRE'&&item.quantity===1;
    if (!['A','B','C','D'].includes(group)&&!stamp) throw new Error('Seuls les articles des groupes A, B, C et D et le timbre sont pris en charge.');
    if (item.taxSpecificAmount || item.taxSpecificValue) throw new Error('Les taxes spécifiques ne sont pas prises en charge par cette installation.');
  }
}
