const crypto=require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());
const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
async function main(){
 const config=await db.configurationESECeF.findFirst({where:{actif:true}});if(!config)throw new Error('Configuration active absente.');
 const [version,iv,tag,data]=config.token.split('.');if(version!=='v1')throw new Error('Format de chiffrement non reconnu.');
 const cipher=crypto.createDecipheriv('aes-256-gcm',Buffer.from(process.env.ENCRYPTION_KEY,'hex'),Buffer.from(iv,'base64url'));cipher.setAuthTag(Buffer.from(tag,'base64url'));const token=Buffer.concat([cipher.update(Buffer.from(data,'base64url')),cipher.final()]).toString();
 const base=config.environnement==='test'?'https://esecef-test.impots.gouv.ne':'https://esecef.impots.gouv.ne';
 const get=async path=>{const r=await fetch(base+path,{headers:{Authorization:token,Accept:'application/json'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('Le service DGI a répondu avec une erreur HTTP.');return r.json();};
 const [status,info]=await Promise.all(['/api/invoice','/api/info/status'].map(get));
 if(!status.status||status.nif!==config.nif||status.nim!==config.nim||!info.emcfList?.some(c=>c.nim===config.nim&&c.status==='Actif')||new Date(status.tokenValid)<=new Date())throw new Error('Identité, activité ou validité non confirmée.');
 console.log('Contrôle DGI en lecture seule : connexion, identité, compteur actif et jeton valide confirmés. Environnement : '+config.environnement+'. Aucune facture émise.');
}
main().catch(()=>{console.error('Contrôle DGI non abouti : vérifier le réseau et la configuration. Aucun secret affiché.');process.exitCode=1;}).finally(()=>db.$disconnect());
