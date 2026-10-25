const {spawnSync}=require('child_process');const fs=require('fs');
const r=spawnSync('npm',['audit','--omit=dev','--json','--fetch-timeout=15000','--fetch-retries=0'],{encoding:'utf8',timeout:30000});
try{const data=JSON.parse(r.stdout);fs.writeFileSync('/private/tmp/pharma-audit-runtime.json',JSON.stringify(data));console.log(JSON.stringify({counts:data.metadata?.vulnerabilities,packages:Object.values(data.vulnerabilities||{}).map(v=>({name:v.name,severity:v.severity,fix:v.fixAvailable})),error:data.error?.summary}));}catch{console.log('Audit distant indisponible.');}
