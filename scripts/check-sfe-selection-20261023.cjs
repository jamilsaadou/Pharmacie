const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
require('@next/env').loadEnvConfig(process.cwd());const{PrismaClient}=require('@prisma/client');const prisma=new PrismaClient();
function load(file,resolve=require){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(resolve,m,m.exports);return m.exports;}
const resolve=n=>n==='@/lib/prisma'?{prisma}:n==='@/lib/session'?{requireUser:async()=>{}}:n==='@/lib/api-error'?{apiError:e=>Response.json({error:e.message},{status:400})}:require(n);
async function main(){
 const out='output/sfe-selection-20261023',rows=JSON.parse(fs.readFileSync(out+'/resultats.json'));
 const list=load('src/app/api/invoice/certified/route.ts',resolve),doc=load('src/app/api/invoice/document/route.ts',resolve);
 const words=load('src/utils/amountInWords.ts');const print=load('src/utils/printCertifiedInvoice.ts',n=>n==='./amountInWords'?words:require(n));
 const listResponse=await list.GET({url:'http://localhost/api/invoice/certified?limit=100&search=FC%2FET01000367%2F'});assert.equal(listResponse.status,200);const data=await listResponse.json();
 const checks=[];
 for(const row of rows){
  const entry=data.factures.find(f=>f.uid===row.uid);assert.ok(entry,row.key);
  const response=await doc.GET({nextUrl:new URL('http://localhost/api/invoice/document?factureId='+entry.id)});assert.equal(response.status,200);const dto=await response.json();
  assert.deepEqual(dto,JSON.parse(fs.readFileSync(out+'/'+row.key+'.json')));
  const html=await print.buildCertifiedInvoiceHtml(dto);assert.ok(html.includes(dto.numeroFacture));
  assert.deepEqual(entry.vente.items.map(i=>i.quantite),dto.items.map(i=>i.quantite));
  checks.push({key:row.key,id:entry.id,visible:true,printable:true,quantitiesExact:true});
 }
 fs.writeFileSync(out+'/controle-telechargement.json',JSON.stringify(checks,null,2));console.log('20 factures visibles et imprimables ; instantanés et quantités identiques aux documents DGI.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect());
