// Émission UNITAIRE d'une facture de vente propre (2 x B + 3 x A) vers le bac à sable DGI.
// But : vérifier la conformité/propagation sur le portail avant de continuer.
// Base PostgreSQL isolée + serveur Next dédié : aucune donnée métier (stock/ventes) modifiée. Numérotation séquentielle réelle.
const fs=require('node:fs'),assert=require('node:assert/strict'),{spawn,spawnSync}=require('node:child_process'),{scryptSync}=require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd());const{PrismaClient}=require('@prisma/client');const source=new PrismaClient();
const name='pharmacare_sfe_v3_20261019',out='output/homologation-verif-unitaire';fs.mkdirSync(out,{recursive:true});
let db,server,cookie='';
const ts=require('typescript'), numberingModule={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync('src/lib/invoice-number.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(require,numberingModule,numberingModule.exports);
async function api(path,body){const r=await fetch('http://127.0.0.1:3103'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});return{status:r.status,data:await r.json(),headers:r.headers};}
const A=(q,extra={})=>({code:'MED-PARA-500',name:'Paracétamol 500 mg comprimé',price:800,quantity:q,taxGroup:'A',...extra});
const B=(q,extra={})=>({code:'PARA-GEL-250',name:'Gel hydroalcoolique 250 ml',price:1190,quantity:q,taxGroup:'B',...extra});
async function main(){
 const config=await source.configurationESECeF.findFirst({where:{actif:true}});assert.equal(config?.environnement,'test');assert.match(config.nim,/^ET/);
 const databases=await source.$queryRawUnsafe('SELECT datname FROM pg_database WHERE datname=$1',name);if(!databases.length)await source.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
 const u=new URL(process.env.DATABASE_URL);u.pathname='/'+name;const env={...process.env,DATABASE_URL:u.toString()};db=new PrismaClient({datasources:{db:{url:u.toString()}}});
 const migration=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env,encoding:'utf8'});assert.equal(migration.status,0,'Migrations isolées');
 await db.configurationESECeF.upsert({where:{id:config.id},create:config,update:{modePrix:'TTC'}});for(const param of await source.parametres.findMany())await db.parametres.upsert({where:{cle:param.cle},create:param,update:{}});
 await db.configurationESECeF.update({where:{id:config.id},data:{modePrix:'TTC'}});
 const salt='sfe-v3-isolated';await db.utilisateur.upsert({where:{email:'sfe-v3@pharmacare.test'},create:{nom:'Numerique',prenom:'Niger',email:'sfe-v3@pharmacare.test',motDePasse:'scrypt:'+salt+':'+scryptSync('Local-SFE-v3-20261019',salt,64).toString('hex'),role:'admin'},update:{}});
 const log=fs.openSync(out+'/serveur.log','a');server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3103'],{env,stdio:['ignore','pipe',log]});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Serveur isolé indisponible')),20000);server.stdout.on('data',d=>{fs.writeSync(log,d);if(String(d).includes('Ready')){clearTimeout(timer);resolve();}});server.on('exit',()=>{clearTimeout(timer);reject(Error('Arrêt du serveur isolé'));});});
 const login=await api('/api/auth/login',{email:'sfe-v3@pharmacare.test',motDePasse:'Local-SFE-v3-20261019'});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
 const rn=await source.$transaction(tx=>numberingModule.exports.nextInvoiceNumber(tx,config.nim));assert.match(rn,/^FC\/ET01000293\/1-\d+\/2026$/);
 const request={type:'FV',rn,items:[B(2),A(3)]};
 const calc=await api('/api/invoice/calculate',{invoiceData:request});assert.ok(calc.data.success,'calcul: '+JSON.stringify(calc.data));
 const uid=calc.data.uid;
 const fin=await api('/api/invoice/finalize',{uid,action:'confirm'});assert.ok(fin.data.success,'finalisation: '+JSON.stringify(fin.data));
 const sec=fin.data.securityElements;assert.ok(sec.codeSECeFDGI&&sec.qrCode);
 const doc=await api('/api/invoice/document?demandeUid='+encodeURIComponent(uid));assert.equal(doc.status,200);
 const key='unitaire-'+rn.split('/')[2].split('-')[1];
 fs.writeFileSync(out+'/'+key+'.json',JSON.stringify(doc.data,null,2));
 const summary={emittedAt:new Date().toISOString(),numero:rn,uid,codeSECeFDGI:sec.codeSECeFDGI,nim:sec.nim,compteurs:sec.counters,total:calc.data.totals.total,qr:sec.qrCode};
 fs.writeFileSync(out+'/derniere-emission.json',JSON.stringify(summary,null,2));
 console.log(JSON.stringify(summary));
}
main().catch(e=>{console.error('Émission interrompue : '+e.message);process.exitCode=1;}).finally(async()=>{if(server)server.kill('SIGTERM');if(db)await db.$disconnect();await source.$disconnect();});
