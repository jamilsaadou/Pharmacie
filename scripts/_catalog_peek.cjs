require('@next/env').loadEnvConfig(process.cwd());const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();
(async()=>{
 const groups=await db.medicament.groupBy({by:['groupeTaxation'],_count:true});
 console.log('Répartition groupeTaxation:',JSON.stringify(groups));
 for(const g of ['A','B']){
   const rows=await db.medicament.findMany({where:{groupeTaxation:g,quantiteStock:{gt:5}},select:{id:true,nom:true,prix:true,quantiteStock:true,groupeTaxation:true},take:4});
   console.log('Groupe',g,'(stock>5):',JSON.stringify(rows,null,0));
 }
 await db.$disconnect();
})().catch(e=>{console.error(e.message);process.exit(1)});
