import { assertSupportedInvoice } from './invoice-scope';
/** Server-side counterpart of the sales submenus. Null preserves the configured default; [] grants none. */
export function assertSalesAccess(user:{role:string;ventesAccess?:string|null},...access:string[]){
 if(user.role==='admin'||user.ventesAccess==null)return;
 let allowed:unknown;try{allowed=JSON.parse(user.ventesAccess);}catch{throw Error('ADMIN_REQUIRED');}
 if(!Array.isArray(allowed)||!access.some(a=>allowed.includes(a)))throw Error('ADMIN_REQUIRED');
}
export function assertInvoiceAccess(user:{role:string;ventesAccess?:string|null},type:string,prestation=false){
 assertSupportedInvoice(type);
 if(prestation)return assertSalesAccess(user,'facture-prestation');
 const access:Record<string,string[]>={FV:['ventes','facture-vente'],FT:['facture-acompte'],FA:['facture-avoir'],EA:['facture-avoir'],EV:['facture-export'],ET:['facture-export']};
 if(!access[type])throw Error('Type de facture invalide.');
 assertSalesAccess(user,...access[type]);
}
