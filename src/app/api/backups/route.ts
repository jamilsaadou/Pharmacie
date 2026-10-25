import{NextRequest,NextResponse}from'next/server';
import{execFile}from'node:child_process';import{promisify}from'node:util';import path from'node:path';
import{requireUser}from'@/lib/session';import{apiError}from'@/lib/api-error';import{prisma}from'@/lib/prisma';
export const runtime='nodejs';
const exec=promisify(execFile);
async function backup(action:string,name=''){const{stdout}=await exec(process.execPath,[path.join(process.cwd(),'scripts/database-backup.cjs'),action,name],{timeout:150000,maxBuffer:1024*1024,env:{...process.env,__NEXT_PROCESSED_ENV:undefined}});const line=stdout.trim().split('\n').at(-1)!;return JSON.parse(line);}
export async function GET(){try{await requireUser(true);return NextResponse.json(await backup('list'));}catch(e){return apiError(e);}}
export async function POST(req:NextRequest){try{const user=await requireUser(true);const b=await req.json();if(!['create','verify'].includes(b.action))throw Error('Action inconnue.');const result=await backup(b.action,b.name);await prisma.auditLog.create({data:{userId:user.id,module:'sauvegardes',action:'create',message:b.action==='create'?'Sauvegarde chiffrée créée':'Restauration vérifiée sur une base isolée',details:JSON.stringify(result)}});return NextResponse.json(result);}catch(e){return apiError(e);}}
