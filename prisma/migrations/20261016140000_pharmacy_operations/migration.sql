-- AlterTable
ALTER TABLE "Vente" ADD COLUMN     "caisseId" TEXT,
ADD COLUMN     "cle" TEXT,
ADD COLUMN     "empreinte" TEXT,
ADD COLUMN     "operateurId" TEXT;

-- AlterTable
ALTER TABLE "ItemVente" ADD COLUMN     "conditionnementId" TEXT,
ADD COLUMN     "facteurStock" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "LotStock" (
    "id" TEXT NOT NULL,
    "medicamentId" TEXT NOT NULL,
    "numero" TEXT,
    "dateExpiration" TIMESTAMP(3) NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 0,
    "quantiteReservee" INTEGER NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'a_qualifier',
    "rayonId" TEXT,
    "fournisseurId" TEXT,
    "provenance" TEXT NOT NULL DEFAULT 'manuel',
    "prixAchat" DOUBLE PRECISION,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LotStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationStock" (
    "id" TEXT NOT NULL,
    "itemVenteId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "quantiteRetournee" INTEGER NOT NULL DEFAULT 0,
    "origineItemId" TEXT,
    "origineAllocationId" TEXT,
    "etat" TEXT NOT NULL DEFAULT 'reservee',

    CONSTRAINT "AllocationStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MouvementStock" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "avant" INTEGER NOT NULL,
    "apres" INTEGER NOT NULL,
    "utilisateurId" TEXT,
    "utilisateur" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "documentId" TEXT,
    "destinationLotId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MouvementStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceptionCommande" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilisateur" TEXT NOT NULL,
    "lignes" JSONB NOT NULL,

    CONSTRAINT "ReceptionCommande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventaire" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ouvert',
    "utilisateur" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateValidation" TIMESTAMP(3),

    CONSTRAINT "Inventaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneInventaire" (
    "id" TEXT NOT NULL,
    "inventaireId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "theorique" INTEGER NOT NULL,
    "reservee" INTEGER NOT NULL,
    "comptee" INTEGER,
    "motif" TEXT,

    CONSTRAINT "LigneInventaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conditionnement" (
    "id" TEXT NOT NULL,
    "medicamentId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "facteur" INTEGER NOT NULL,
    "codeBarres" TEXT,
    "prixVente" DOUBLE PRECISION NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Conditionnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionCaisse" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "utilisateur" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ouverte',
    "fondOuverture" INTEGER NOT NULL,
    "montantCompte" INTEGER,
    "montantAttendu" INTEGER,
    "ecart" INTEGER,
    "motifEcart" TEXT,
    "dateOuverture" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateCloture" TIMESTAMP(3),

    CONSTRAINT "SessionCaisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encaissement" (
    "id" TEXT NOT NULL,
    "venteId" TEXT NOT NULL,
    "caisseId" TEXT,
    "mode" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Encaissement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MouvementCaisse" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "caisseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "motif" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MouvementCaisse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LotStock_medicamentId_statut_dateExpiration_idx" ON "LotStock"("medicamentId", "statut", "dateExpiration");

-- CreateIndex
CREATE INDEX "LotStock_rayonId_idx" ON "LotStock"("rayonId");

-- CreateIndex
CREATE INDEX "AllocationStock_itemVenteId_etat_idx" ON "AllocationStock"("itemVenteId", "etat");

-- CreateIndex
CREATE INDEX "MouvementStock_lotId_date_idx" ON "MouvementStock"("lotId", "date");

-- CreateIndex
CREATE INDEX "MouvementStock_documentId_idx" ON "MouvementStock"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceptionCommande_cle_key" ON "ReceptionCommande"("cle");

-- CreateIndex
CREATE UNIQUE INDEX "Inventaire_reference_key" ON "Inventaire"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "LigneInventaire_inventaireId_lotId_key" ON "LigneInventaire"("inventaireId", "lotId");

-- CreateIndex
CREATE UNIQUE INDEX "Conditionnement_codeBarres_key" ON "Conditionnement"("codeBarres");

-- CreateIndex
CREATE UNIQUE INDEX "Conditionnement_medicamentId_nom_key" ON "Conditionnement"("medicamentId", "nom");

-- CreateIndex
CREATE INDEX "SessionCaisse_utilisateurId_statut_idx" ON "SessionCaisse"("utilisateurId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Encaissement_venteId_key" ON "Encaissement"("venteId");

-- CreateIndex
CREATE UNIQUE INDEX "MouvementCaisse_cle_key" ON "MouvementCaisse"("cle");

-- CreateIndex
CREATE UNIQUE INDEX "Vente_cle_key" ON "Vente"("cle");

-- AddForeignKey
ALTER TABLE "LotStock" ADD CONSTRAINT "LotStock_medicamentId_fkey" FOREIGN KEY ("medicamentId") REFERENCES "Medicament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationStock" ADD CONSTRAINT "AllocationStock_itemVenteId_fkey" FOREIGN KEY ("itemVenteId") REFERENCES "ItemVente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationStock" ADD CONSTRAINT "AllocationStock_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "LotStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouvementStock" ADD CONSTRAINT "MouvementStock_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "LotStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionCommande" ADD CONSTRAINT "ReceptionCommande_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "CommandeFournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneInventaire" ADD CONSTRAINT "LigneInventaire_inventaireId_fkey" FOREIGN KEY ("inventaireId") REFERENCES "Inventaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneInventaire" ADD CONSTRAINT "LigneInventaire_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "LotStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conditionnement" ADD CONSTRAINT "Conditionnement_medicamentId_fkey" FOREIGN KEY ("medicamentId") REFERENCES "Medicament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encaissement" ADD CONSTRAINT "Encaissement_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "Vente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encaissement" ADD CONSTRAINT "Encaissement_caisseId_fkey" FOREIGN KEY ("caisseId") REFERENCES "SessionCaisse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouvementCaisse" ADD CONSTRAINT "MouvementCaisse_caisseId_fkey" FOREIGN KEY ("caisseId") REFERENCES "SessionCaisse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Preserve existing stock without inventing manufacturer lot numbers.
ALTER TABLE "LotStock" ADD CONSTRAINT "stock_non_negative" CHECK ("quantite" >= 0 AND "quantiteReservee" >= 0);
ALTER TABLE "AllocationStock" ADD CONSTRAINT "allocation_positive" CHECK ("quantite" > 0 AND "quantiteRetournee" >= 0 AND "quantiteRetournee" <= "quantite");
CREATE UNIQUE INDEX "caisse_une_ouverte_par_operateur" ON "SessionCaisse" ("utilisateurId") WHERE "statut" = 'ouverte';
WITH placements AS (
 SELECT r.*, GREATEST(LEAST(GREATEST(r."quantiteEnRayon",0), m."quantiteStock"-COALESCE(SUM(GREATEST(r."quantiteEnRayon",0)) OVER(PARTITION BY r."medicamentId" ORDER BY r.id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0)),0)::integer AS q
 FROM "MedicamentRayon" r JOIN "Medicament" m ON m.id=r."medicamentId"
)
INSERT INTO "LotStock" (id,"medicamentId","dateExpiration",quantite,"quantiteReservee",statut,"rayonId",provenance,"dateModification")
 SELECT 'reprise-rayon-'||p.id,p."medicamentId",m."dateExpiration",p.q,0,'a_qualifier',p."rayonId",'reprise',CURRENT_TIMESTAMP
 FROM placements p JOIN "Medicament" m ON m.id=p."medicamentId" WHERE p.q>0;
INSERT INTO "LotStock" (id,"medicamentId","dateExpiration",quantite,"quantiteReservee",statut,provenance,"dateModification")
 SELECT 'reprise-'||m.id,m.id,m."dateExpiration",GREATEST(m."quantiteStock"-COALESCE((SELECT SUM(l.quantite) FROM "LotStock" l WHERE l."medicamentId"=m.id),0),0),
 COALESCE((SELECT SUM(i.quantite*i."facteurStock") FROM "ItemVente" i JOIN "Vente" v ON v.id=i."venteId" WHERE i."medicamentId"=m.id AND v.statut='en_cours' AND v."typeFacture" NOT IN ('FA','EA')),0),
 'a_qualifier','reprise',CURRENT_TIMESTAMP FROM "Medicament" m;
INSERT INTO "AllocationStock" (id,"itemVenteId","lotId",quantite,"quantiteRetournee",etat)
 SELECT 'reprise-'||i.id,i.id,'reprise-'||i."medicamentId",i.quantite*i."facteurStock",0,'reservee' FROM "ItemVente" i JOIN "Vente" v ON v.id=i."venteId" WHERE i."medicamentId" IS NOT NULL AND i.quantite>0 AND v.statut='en_cours' AND v."typeFacture" NOT IN ('FA','EA');
INSERT INTO "MouvementStock" (id,"lotId",type,quantite,avant,apres,utilisateur,motif)
 SELECT 'init-'||id,id,'reprise',quantite,0,quantite,'Système','Reprise du stock existant ; numéro fabricant à qualifier' FROM "LotStock";
UPDATE "Medicament" SET "quantiteStock"=0;
UPDATE "MedicamentRayon" SET "quantiteEnRayon"=0;
INSERT INTO "Encaissement" (id,"venteId",mode,montant,date)
 SELECT 'historique-'||v.id,v.id,v."methodePaiement",ROUND(ABS(v.total))::integer*(CASE WHEN v."typeFacture" IN ('FA','EA') THEN -1 ELSE 1 END),v.date FROM "Vente" v JOIN "FactureESECeF" f ON f."venteId"=v.id WHERE v.statut='terminee' AND f.statut='certifiee';
