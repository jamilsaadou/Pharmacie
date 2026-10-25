CREATE TABLE "SessionMobile" (
  "id" TEXT NOT NULL,
  "utilisateurId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "credentialHash" TEXT NOT NULL,
  "appareil" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionMobile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SessionMobile_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SessionMobile_tokenHash_key" ON "SessionMobile"("tokenHash");
CREATE INDEX "SessionMobile_utilisateurId_expiresAt_idx" ON "SessionMobile"("utilisateurId", "expiresAt");
CREATE INDEX "Vente_operateurId_date_idx" ON "Vente"("operateurId", "date");
