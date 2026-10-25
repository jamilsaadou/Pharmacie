import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { mobileContext } from '@/lib/mobile/context';
import { authenticateMobile, createMobileSession, digest, publicUser } from '@/lib/mobile/auth';
import { MobileError, fail, pageParams, dateRange, canonical, saleInput } from '@/lib/mobile/validation';
import { requireUser } from '@/lib/session';
import { verifyPassword } from '@/lib/password';
import { takeLoginAttempt, clearLoginAttempts } from '@/lib/login-limiter';
import { assertInvoiceAccess } from '@/lib/sales-access';
import { cashSummary } from '@/lib/cash-ledger';
import { summarizeLots } from '@/lib/stock-ledger';
import { createSale } from '@/lib/business/sales';
import { POST as cashAction } from '@/app/api/caisse/route';
import { GET as invoiceDocument } from '@/app/api/invoice/document/route';
import { certifyVente } from '@/lib/business/certification';

export const runtime = 'nodejs';
const invoiceSelect = { id:true, statut:true, uid:true, codeSECeFDGI:true, qrCode:true, dateTimeCertification:true, counters:true, errorDescription:true } satisfies Prisma.FactureESECeFSelect;
const saleInclude = { items:true, client:{select:{id:true,nom:true,prenom:true,nif:true}}, factureESECeF:{select:invoiceSelect}, encaissement:true } satisfies Prisma.VenteInclude;
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers:{'Cache-Control':'no-store'} });
async function bodyOf(request: NextRequest) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) fail(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type application/json requis.');
  const text = await request.text();
  if (Buffer.byteLength(text) > 65536) fail(413,'PAYLOAD_TOO_LARGE','Corps limité à 64 Ko.');
  try { const body = JSON.parse(text); if (!body || Array.isArray(body) || typeof body !== 'object') throw Error(); return body; }
  catch { fail(400,'INVALID_JSON','Objet JSON invalide.'); }
}
function forward(request: NextRequest, body: unknown) {
  return new NextRequest(request.url, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
}
async function unwrap(response: Response) {
  const data = await response.json();
  if (!response.ok) {
    const conflict = typeof data.error === 'string' && data.error.includes('autre contenu');
    fail(conflict ? 409 : response.status, conflict ? 'IDEMPOTENCY_CONFLICT' : response.status === 403 ? 'FORBIDDEN' : 'BUSINESS_ERROR', data.error || 'Opération impossible.');
  }
  return data;
}
function saleDto(sale: any) {
  const { cle: _cle, empreinte: _empreinte, ...safe } = sale;
  return { ...safe, documentUrl: sale.factureESECeF?.statut === 'certifiee' ? `/api/mobile/v1/ventes/${sale.id}/document` : null };
}
async function ownedSale(id: string, userId: string) {
  const sale = await prisma.vente.findFirst({where:{id,operateurId:userId},include:saleInclude});
  if (!sale) fail(404,'NOT_FOUND','Vente introuvable.');
  return sale;
}
async function dispatch(request: NextRequest, context: {params:Promise<{path:string[]}>}) {
  try {
    const path = (await context.params).path, route = path.join('/'), method = request.method;
    if (route === 'auth/login' && method === 'POST') {
      const b = await bodyOf(request);
      if (typeof b.email !== 'string' || !b.email.trim() || b.email.length > 254 || typeof b.motDePasse !== 'string' || !b.motDePasse || b.motDePasse.length > 1024 || typeof b.appareil !== 'string' || !b.appareil.trim() || b.appareil.length > 100) fail(400,'VALIDATION_ERROR','email, motDePasse et appareil requis.');
      if (!takeLoginAttempt(b.email)) fail(429,'RATE_LIMITED','Trop de tentatives. Réessayez dans quinze minutes.');
      const user = await prisma.utilisateur.findUnique({where:{email:b.email.trim().toLowerCase()}});
      if (!user || !verifyPassword(b.motDePasse,user.motDePasse) || !user.actif) fail(401,'INVALID_CREDENTIALS','Identifiants invalides ou compte désactivé.');
      const token = await createMobileSession(user,b.appareil.trim());
      clearLoginAttempts(b.email);
      await prisma.auditLog.create({data:{module:'system',action:'login',userId:user.id,userName:`${user.prenom} ${user.nom}`,message:'Connexion mobile',details:JSON.stringify({appareil:b.appareil})}});
      return json({...token,utilisateur:publicUser(user)});
    }
    const session = await authenticateMobile(request.headers), user = session.utilisateur;
    return await mobileContext.run(user, async () => {
      if (route === 'auth/logout' && method === 'POST') {
        await prisma.sessionMobile.update({where:{id:session.id},data:{revokedAt:new Date()}});
        return json({success:true});
      }
      if (route === 'me' && method === 'GET') return json({utilisateur:publicUser(user),session:{appareil:session.appareil,expiresAt:session.expiresAt}});
      if (route === 'stock' && method === 'GET') {
        await requireUser(false,'ventes');
        const params = request.nextUrl.searchParams, {page,limit,skip} = pageParams(params), q = (params.get('q') || '').trim();
        if (q.length > 100) fail(400,'VALIDATION_ERROR','Recherche limitée à 100 caractères.');
        const where: Prisma.MedicamentWhereInput = q ? {OR:[{nom:{contains:q,mode:'insensitive'}},{codeBarres:{equals:q}},{conditionnements:{some:{codeBarres:q,actif:true}}}]} : {};
        const result = await prisma.$transaction(async tx => {
          const total = await tx.medicament.count({where});
          const products = await tx.medicament.findMany({where,skip,take:limit,orderBy:[{nom:'asc'},{id:'asc'}],select:{id:true,nom:true,prix:true,codeBarres:true,dosage:true,forme:true,prescription:true,groupeTaxation:true,seuilAlerte:true,conditionnements:{where:{actif:true}},lots:{select:{quantite:true,quantiteReservee:true,statut:true,dateExpiration:true}}}});
          return {total,data:products.map(({lots,...product})=>({...product,stock:summarizeLots(lots)}))};
        },{isolationLevel:'RepeatableRead'});
        return json({...result,page,limit});
      }
      if (route === 'clients' && method === 'GET') {
        await requireUser(false,'clients');
        const params=request.nextUrl.searchParams,{page,limit,skip}=pageParams(params),q=(params.get('q')||'').trim();
        if(q.length>100)fail(400,'VALIDATION_ERROR','Recherche limitée à 100 caractères.');
        const where:Prisma.ClientWhereInput=q?{OR:[{nom:{contains:q,mode:'insensitive'}},{prenom:{contains:q,mode:'insensitive'}},{telephone:{contains:q}}]}:{};
        const [total,data]=await prisma.$transaction([prisma.client.count({where}),prisma.client.findMany({where,skip,take:limit,orderBy:[{nom:'asc'},{id:'asc'}],select:{id:true,nom:true,prenom:true,nif:true,telephone:true,adresse:true}})]);
        return json({data,total,page,limit});
      }
      if (route === 'ventes' && method === 'GET') {
        await requireUser(false,'ventes');
        const params=request.nextUrl.searchParams,{page,limit,skip}=pageParams(params),statut=params.get('statut');
        if(statut&&!['en_cours','terminee','annulee'].includes(statut))fail(400,'VALIDATION_ERROR','Statut invalide.');
        const where:Prisma.VenteWhereInput={operateurId:user.id,date:dateRange(params),...(statut?{statut}:{})};
        const [total,data]=await prisma.$transaction([prisma.vente.count({where}),prisma.vente.findMany({where,skip,take:limit,orderBy:[{date:'desc'},{id:'desc'}],include:saleInclude})]);
        return json({data:data.map(saleDto),total,page,limit});
      }
      if (route === 'ventes' && method === 'POST') {
        await requireUser(false,'ventes');assertInvoiceAccess(user,'FV');
        const b=saleInput(await bodyOf(request)),fingerprint=digest(canonical(b));
        // Check replay before looking up current prices or requiring a new cash session.
        const old=await prisma.vente.findUnique({where:{cle:user.id+':mobile:'+b.requestKey},include:saleInclude});
        if(old){if(old.empreinte!==fingerprint)fail(409,'IDEMPOTENCY_CONFLICT','Cette clé a déjà été utilisée avec un autre contenu.');return json({vente:saleDto(old),replayed:true});}
        const products=await prisma.medicament.findMany({where:{id:{in:b.items.map(i=>i.medicamentId)}},include:{conditionnements:true}});
        const items=b.items.map(i=>{
          const product=products.find(p=>p.id===i.medicamentId),pack=i.conditionnementId?product?.conditionnements.find(p=>p.id===i.conditionnementId&&p.actif):undefined;
          if(!product||(i.conditionnementId&&!pack))fail(400,'VALIDATION_ERROR','Article ou conditionnement introuvable.');
          return {...i,prixUnitaire:pack?.prixVente??product.prix};
        });
        const sousTotal=items.reduce((sum,i)=>sum+i.prixUnitaire*i.quantite,0);
        if(!Number.isSafeInteger(sousTotal)||sousTotal<0||sousTotal>1e9)fail(400,'VALIDATION_ERROR','Montant de vente invalide.');
        const response=await createSale(forward(request,{...b,requestKey:'mobile:'+b.requestKey,items,sousTotal,total:sousTotal,tva:0,remise:0,typeFacture:'FV',skipCertification:false}),{requireCash:true,fingerprint});
        const created=await unwrap(response);
        const sale=await ownedSale(created.id,user.id);
        return json({vente:saleDto(sale),replayed:false},sale.factureESECeF?.statut==='certifiee'?201:202);
      }
      if (path[0]==='ventes' && path.length>=2 && path.length<=3) {
        await requireUser(false,'ventes');
        const sale=await ownedSale(path[1],user.id);
        if(path.length===2&&method==='GET')return json({vente:saleDto(sale)});
        if(path[2]==='document'&&method==='GET') {
          if(sale.factureESECeF?.statut!=='certifiee')fail(409,'NOT_CERTIFIED','La facture n’est pas encore certifiée.');
          const url=new URL(request.url);url.search='';url.searchParams.set('venteId',sale.id);
          if(request.nextUrl.searchParams.get('copie')==='1')url.searchParams.set('copie','1');
          return json(await unwrap(await invoiceDocument(new NextRequest(url))));
        }
        if(path[2]==='certification'&&method==='POST') {
          assertInvoiceAccess(user,sale.typeFacture);
          const f=sale.factureESECeF;
          if(f?.statut==='certifiee')return json({vente:saleDto(sale)});
          if(!f||f.uid||!['en_attente','erreur'].includes(f.statut))fail(409,'RECONCILIATION_REQUIRED','Un responsable doit rapprocher cette demande avec e‑MCF avant toute relance.');
          await certifyVente(sale.id);
          const updated=await ownedSale(sale.id,user.id);
          return json({vente:saleDto(updated)},updated.factureESECeF?.statut==='certifiee'?200:202);
        }
      }
      if(route==='caisse'&&method==='GET') {
        await requireUser(false,'caisse');
        const {page,limit,skip}=pageParams(request.nextUrl.searchParams);
        const where={utilisateurId:user.id};
        const [total,sessions,current]=await prisma.$transaction([prisma.sessionCaisse.count({where}),prisma.sessionCaisse.findMany({where,skip,take:limit,orderBy:[{dateOuverture:'desc'},{id:'desc'}],include:{encaissements:true,mouvements:true}}),prisma.sessionCaisse.findFirst({where:{...where,statut:'ouverte'},include:{encaissements:true,mouvements:true}})]);
        return json({current:current?{...current,summary:cashSummary(current)}:null,data:sessions.map(s=>({...s,summary:cashSummary(s)})),page,limit,total});
      }
      if(route==='caisse'&&method==='POST') {
        await requireUser(false,'caisse');
        const b=await bodyOf(request);
        if(!['ouvrir','mouvement','cloturer'].includes(b.action))fail(400,'VALIDATION_ERROR','Action de caisse invalide.');
        if(b.action!=='ouvrir') {
          if(typeof b.id!=='string')fail(400,'VALIDATION_ERROR','Identifiant de caisse requis.');
          if(!await prisma.sessionCaisse.findFirst({where:{id:b.id,utilisateurId:user.id}}))fail(404,'NOT_FOUND','Caisse introuvable.');
        }
        if(b.motif!==undefined&&(typeof b.motif!=='string'||b.motif.length>1000))fail(400,'VALIDATION_ERROR','Motif invalide.');
        if(b.action==='mouvement') {
          if(typeof b.cle!=='string'||!/^[A-Za-z0-9_-]{16,100}$/.test(b.cle))fail(400,'VALIDATION_ERROR','Clé de mouvement invalide.');
          b.cle=user.id+':mobile:'+b.cle;
          const old=await prisma.mouvementCaisse.findUnique({where:{cle:b.cle}});
          if(old&&(old.caisseId!==b.id||old.type!==b.type||old.montant!==b.montant||old.motif!==b.motif?.trim()))fail(409,'IDEMPOTENCY_CONFLICT','Clé de mouvement déjà utilisée avec un autre contenu.');
        }
        return json(await unwrap(await cashAction(forward(request,b))));
      }
      if(route==='me/situation'&&method==='GET') {
        await requireUser(false,'ventes');
        const date=dateRange(request.nextUrl.searchParams),where={operateurId:user.id,date};
        const situation = await prisma.$transaction(async tx => {
          const byStatus = await tx.vente.groupBy({by:['statut'],where,_count:{_all:true}});
          const completed = await tx.vente.groupBy({by:['typeFacture'],where:{...where,statut:'terminee',factureESECeF:{statut:'certifiee'}},_sum:{total:true},_count:{_all:true}});
          const payments = await tx.encaissement.groupBy({by:['mode'],where:{vente:{operateurId:user.id},date},_sum:{montant:true},_count:{_all:true}});
          let montantVentes=0,montantAvoirs=0,nombre=0;
          for(const group of completed) {
            const amount=Math.abs(group._sum.total??0);
            if(['FA','EA'].includes(group.typeFacture))montantAvoirs+=amount;else montantVentes+=amount;
            nombre+=group._count._all;
          }
          return {operateurId:user.id,periode:{from:date.gte??null,to:date.lt??null},
            ventesParStatut:byStatus.map(g=>({statut:g.statut,nombre:g._count._all})),
            ventesCertifiees:{nombre,total:montantVentes-montantAvoirs,montantVentes,montantAvoirs},
            encaissementsParMode:payments.map(g=>({mode:g.mode,montant:g._sum.montant??0,nombre:g._count._all}))};
        },{isolationLevel:'RepeatableRead'});
        return json(situation);
      }
      fail(404,'NOT_FOUND','Route mobile introuvable ou méthode non prise en charge.');
    });
  } catch(error) {
    if(error instanceof MobileError)return NextResponse.json({error:{code:error.code,message:error.message}},{status:error.status,headers:{'Cache-Control':'no-store',...(error.status===429?{'Retry-After':'900'}:{})}});
    if(error instanceof Error&&['SESSION_REQUIRED','ADMIN_REQUIRED'].includes(error.message))return json({error:{code:error.message==='SESSION_REQUIRED'?'UNAUTHENTICATED':'FORBIDDEN',message:error.message==='SESSION_REQUIRED'?'Session expirée ou invalide. Reconnectez-vous.':'Accès refusé.'}},error.message==='SESSION_REQUIRED'?401:403);
    console.error('Mobile API failure',error instanceof Error?error.name:'unknown');
    return json({error:{code:'INTERNAL_ERROR',message:'Service temporairement indisponible.'}},500);
  }
}
export const GET=dispatch;
export const POST=dispatch;
