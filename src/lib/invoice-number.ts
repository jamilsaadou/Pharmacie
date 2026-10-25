import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';

/**
 * Génère un numéro de facture séquentiel, ascendant et ininterrompu par année
 * de gestion (exigence SFE 3.1.xii).
 *
 * Le format reproduit celui des factures certifiées de référence de la DGI :
 *   FC/{NIM sans dernier segment}/{dernier segment}-{séquence}/{année}
 * Exemple : NIM "ES01012222-1" → "FC/ES01012222/1-19/2026"
 *
 * Le compteur annuel est stocké dans la table Parametres et incrémenté de
 * manière atomique (INSERT ... ON CONFLICT DO UPDATE ... RETURNING), ce qui est
 * sûr même en cas de concurrence. Les appelants détiennent par ailleurs le
 * verrou applicatif pg_advisory_xact_lock(742021) de la transaction de vente.
 */
export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  nim: string
): Promise<string> {
  const year = new Date().getFullYear();
  const key = `facturation.sequence.${year}`;
  const id = randomUUID();

  const rows = await tx.$queryRaw<Array<{ valeur: string }>>`
    INSERT INTO "Parametres" ("id", "cle", "valeur", "categorie", "dateModification")
    VALUES (${id}, ${key}, '1', 'facturation', now())
    ON CONFLICT ("cle") DO UPDATE
      SET "valeur" = ((("Parametres"."valeur")::int + 1)::text),
          "dateModification" = now()
    RETURNING "valeur"
  `;

  const seq = Number(rows[0]?.valeur ?? '1');

  const lastDash = nim.lastIndexOf('-');
  const nimBase = lastDash > 0 ? nim.slice(0, lastDash) : nim;
  const branch = lastDash > 0 ? nim.slice(lastDash + 1) : '1';

  return `FC/${nimBase}/${branch}-${seq}/${year}`;
}
