const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const {NextRequest}=require('next/server');
function load(file,resolve=require){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(resolve,m,m.exports);return m.exports;}
const validation=load('src/lib/mobile/validation.ts');
const context=load('src/lib/mobile/context.ts');
const fixture={requestKey:'sale-request-123456',items:[{medicamentId:'med-1',quantite:2}],methodePaiement:'especes'};
test('mobile validation rejects injected operators, prices, fractional stock and unbounded lists',()=>{
 for(const b of [{...fixture,operateurId:'other'},{...fixture,total:1},{...fixture,skipCertification:true},{...fixture,items:[{medicamentId:'med-1',quantite:0.5}]},{...fixture,items:[{medicamentId:'med-1',quantite:1,prixUnitaire:1}]},{...fixture,requestKey:'short'}])assert.throws(()=>validation.saleInput(b),e=>e.status===400);
 assert.deepEqual(validation.saleInput(fixture),fixture);
 assert.equal(validation.canonical({a:1,b:2}),validation.canonical({b:2,a:1}));
 assert.throws(()=>validation.pageParams(new URLSearchParams('limit=101')),e=>e.status===400);
 assert.throws(()=>validation.dateRange(new URLSearchParams('from=2026-10-26')),e=>e.status===400);
 assert.throws(()=>validation.dateRange(new URLSearchParams('from=2026-10-27T00:00:00Z&to=2026-10-26T00:00:00Z')),e=>e.status===400);
});
test('mobile opaque tokens are hashed, expiring, revocable and invalidated by password changes',async()=>{
 let stored;
 const user={id:'u1',motDePasse:'scrypt:test:hash',actif:true};
 const auth=load('src/lib/mobile/auth.ts',n=>n==='@/lib/prisma'?{prisma:{sessionMobile:{create:async({data})=>stored={...data,utilisateur:user},findUnique:async({where})=>where.tokenHash===stored.tokenHash?stored:null}}}:require(n));
 const token=await auth.createMobileSession(user,'Android QA');
 assert.equal(token.expiresIn,28800);assert.notEqual(stored.tokenHash,token.accessToken);assert.equal(stored.tokenHash,auth.digest(token.accessToken));
 const h=new Headers({authorization:'Bearer '+token.accessToken});assert.equal((await auth.authenticateMobile(h)).utilisateur.id,'u1');
 stored.revokedAt=new Date();await assert.rejects(auth.authenticateMobile(h),/SESSION_REQUIRED/);stored.revokedAt=null;
 stored.expiresAt=new Date(0);await assert.rejects(auth.authenticateMobile(h),/SESSION_REQUIRED/);stored.expiresAt=new Date(Date.now()+10000);
 user.actif=false;await assert.rejects(auth.authenticateMobile(h),/SESSION_REQUIRED/);user.actif=true;
 user.motDePasse='changed';await assert.rejects(auth.authenticateMobile(h),/SESSION_REQUIRED/);
 for(const value of ['',token.accessToken,'Bearer invalid','Basic '+token.accessToken])assert.throws(()=>auth.bearerToken(new Headers({authorization:value})),/SESSION_REQUIRED/);
});
test('request contexts isolate concurrent agents and preserve module permissions',async()=>{
 const session=load('src/lib/session.ts',n=>n==='@/lib/mobile/context'?context:n==='next/headers'?{cookies:async()=>({get:()=>undefined})}:n==='@/lib/prisma'?{prisma:{}}:require(n));
 const results=await Promise.all(['alice','bob'].map(id=>context.mobileContext.run({id,role:'vendeur'},async()=>{await new Promise(r=>setTimeout(r,5));assert.equal((await session.requireUser(false,'ventes')).id,id);await assert.rejects(session.requireUser(true),/ADMIN_REQUIRED/);return (await session.requireUser()).id;})));
 assert.deepEqual(results,['alice','bob']);await assert.rejects(session.requireUser(),/SESSION_REQUIRED/);
});
function router(db,overrides={}) {
 const user={id:'agent-a',role:'vendeur',nom:'Agent',prenom:'A'};
 const deps={
  '@/lib/prisma':{prisma:db},'@/lib/mobile/context':context,
  '@/lib/mobile/auth':{authenticateMobile:async()=>({id:'session',utilisateur:user}),digest:s=>require('node:crypto').createHash('sha256').update(s).digest('hex'),publicUser:u=>u},
  '@/lib/mobile/validation':validation,'@/lib/session':{requireUser:async()=>user},
  '@/lib/password':{},'@/lib/login-limiter':{},'@/lib/sales-access':{assertInvoiceAccess:()=>{}},
  '@/lib/cash-ledger':{cashSummary:()=>({})},'@/lib/stock-ledger':{},
  '@/lib/business/sales':{createSale:()=>{throw Error('Unexpected sale creation');}},
  '@/app/api/caisse/route':{POST:()=>{throw Error('Unexpected cash mutation');}},
  '@/app/api/invoice/document/route':{GET:()=>{throw Error('Unexpected document access');}},
  '@/lib/business/certification':{certifyVente:()=>{throw Error('Unexpected fiscal submission');}},...overrides};
 return load('src/app/api/mobile/v1/[...path]/route.ts',n=>deps[n]||require(n));
}
async function request(r,path,method='GET',body){return r[method](new NextRequest('http://localhost/api/mobile/v1/'+path,{method,...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})}),{params:Promise.resolve({path:path.split('/')})});}
test('another agent sale, document, certification and cash session return 404 even before mutations',async()=>{
 const db={vente:{findFirst:async({where})=>{assert.equal(where.operateurId,'agent-a');return null;}},sessionCaisse:{findFirst:async({where})=>{assert.equal(where.utilisateurId,'agent-a');return null;}}};
 const r=router(db);
 for(const [path,method,body] of [['ventes/other','GET'],['ventes/other/document','GET'],['ventes/other/certification','POST'],['caisse','POST',{action:'cloturer',id:'other',montant:0}]])assert.equal((await request(r,path,method,body)).status,404);
});
test('same mobile sale key replays stored outcome, rejects changed payload and never resubmits a pending invoice',async()=>{
 const fingerprint=require('node:crypto').createHash('sha256').update(validation.canonical(fixture)).digest('hex');
 const sale={id:'sale1',cle:'agent-a:mobile:'+fixture.requestKey,empreinte:fingerprint,factureESECeF:{statut:'a_rapprocher'}};
 const r=router({vente:{findUnique:async({where})=>{assert.equal(where.cle,sale.cle);return sale;}}});
 const replay=await request(r,'ventes','POST',fixture);assert.equal(replay.status,200);
 const body=await replay.json();assert.equal(body.replayed,true);assert.equal(body.vente.empreinte,undefined);assert.equal(body.vente.documentUrl,null);
 assert.equal((await request(r,'ventes','POST',{...fixture,methodePaiement:'carte'})).status,409);
 const pending=router({vente:{findFirst:async()=>sale}});
 assert.equal((await request(pending,'ventes/sale1/certification','POST')).status,409);
});
test('mobile sale uses server catalogue price, requires a cash session and returns fresh certified state',async()=>{
 let captured;
 const sale={id:'new',statut:'terminee',factureESECeF:{statut:'certifiee'}};
 const r=router({vente:{findUnique:async()=>null,findFirst:async()=>sale},medicament:{findMany:async()=>[{id:'med-1',prix:500,conditionnements:[]}]}},{'@/lib/business/sales':{createSale:async(req,opts)=>{captured={body:await req.json(),opts};return Response.json({id:'new',statut:'en_cours'});}}});
 const res=await request(r,'ventes','POST',fixture);assert.equal(res.status,201);
 assert.equal(captured.opts.requireCash,true);assert.equal(captured.body.items[0].prixUnitaire,500);assert.equal(captured.body.total,1000);assert.equal(captured.body.skipCertification,false);assert.equal(captured.body.operateurId,undefined);
 assert.equal((await res.json()).vente.statut,'terminee');
});
