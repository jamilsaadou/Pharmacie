import { prisma } from '@/lib/prisma';
import { ESECeFService } from '@/lib/esecef.service';
import { TokenCrypto } from '@/lib/token-crypto';

export async function getCertificationContext(configurationId?: string) {
  const config = configurationId
    ? await prisma.configurationESECeF.findUnique({ where: { id: configurationId } })
    : await prisma.configurationESECeF.findFirst({ where: { actif: true } });
  if (!config) throw new Error('Configurez le NIF, le NIM, l’ISF et le jeton dans Paramètres → Facturation certifiée.');
  if (config.tokenValidUntil && config.tokenValidUntil <= new Date()) throw new Error('Le jeton e‑MCF a expiré. Enregistrez un nouveau jeton.');
  const service = new ESECeFService({ baseURL: '', token: TokenCrypto.decrypt(config.token), timeout: config.delaiAttenteMs }, config.environnement as 'test' | 'production');
  return { config, service };
}

export async function getRegisteredIssuer(config: {nim:string;nif:string}, service: ESECeFService) {
  const info=await service.getEmcfInfo();
  const counter=info.emcfList?.find(c=>c.nim===config.nim&&c.status==='Actif');
  if(!info.status||info.nif!==config.nif||!counter)throw new Error('Coordonnées officielles du compteur DGI indisponibles.');
  return {nomEtablissement:counter.shopName.trim(),adresse:[counter.address1,counter.address2,counter.address3].filter(Boolean).join(', '),telephone:counter.contact1||'',email:counter.contact2||''};
}
