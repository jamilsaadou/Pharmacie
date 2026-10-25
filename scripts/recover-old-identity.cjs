const fs = require('fs');
const { PrismaClient } = require('/Users/air/Documents/Dev project/Pharmacie/pharmacie-app/node_modules/@prisma/client');
const env = fs.readFileSync('/Users/air/Documents/Dev project/Pharmacie/pharmacie-app/.env', 'utf8');
const raw = env.match(/^DATABASE_URL\s*=\s*["']?([^\r\n"']+)/m)?.[1];
const prisma = new PrismaClient({ datasources: { db: { url: raw + (raw.includes('?') ? '&' : '?') + 'connect_timeout=3' } } });
(async () => { try { const config = await prisma.configurationESECeF.findFirst({ where: { actif: true }, select: { nif: true, nim: true, isf: true, environnement: true } }); if (config) fs.writeFileSync('/private/tmp/pharma-old-identity.json', JSON.stringify(config), {mode:0o600}); console.log(config ? 'Identité fiscale ancienne retrouvée.' : 'Pas de configuration active ancienne.'); } catch { console.log('Ancienne base indisponible ; aucun secret affiché.'); } finally { await prisma.$disconnect(); } })();
