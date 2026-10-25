import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api-error';
export async function GET(){try{await requireUser();const record=await prisma.parametres.findUnique({where:{cle:'exemples.v1.manifest'}});return NextResponse.json({installed:!!record,...(record?JSON.parse(record.valeur):{})});}catch(e){return apiError(e);}}
