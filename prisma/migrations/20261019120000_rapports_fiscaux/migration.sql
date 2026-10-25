-- Rapports fiscaux SFE : persistance des clôtures Z
CREATE TABLE "RapportZ" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "configurationId" TEXT,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "genereePar" TEXT NOT NULL,
    "donnees" JSONB NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RapportZ_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RapportZ_configurationId_numero_key" ON "RapportZ"("configurationId", "numero");
CREATE INDEX "RapportZ_fin_idx" ON "RapportZ"("fin");
