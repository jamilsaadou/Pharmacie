-- CreateTable
CREATE TABLE "Medicament" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "prix" DOUBLE PRECISION NOT NULL,
    "quantiteStock" INTEGER NOT NULL,
    "seuilAlerte" INTEGER NOT NULL,
    "dateExpiration" TIMESTAMP(3) NOT NULL,
    "categorie" TEXT NOT NULL,
    "fournisseur" TEXT NOT NULL,
    "codeBarres" TEXT,
    "dosage" TEXT,
    "forme" TEXT NOT NULL,
    "prescription" BOOLEAN NOT NULL DEFAULT false,
    "photo" TEXT,
    "groupeTaxation" TEXT NOT NULL DEFAULT 'B',
    "dateAjout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nif" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "dateNaissance" TIMESTAMP(3),
    "numeroSecu" TEXT,
    "dateInscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vente" (
    "id" TEXT NOT NULL,
    "numeroFacture" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT,
    "sousTotal" DOUBLE PRECISION NOT NULL,
    "tva" DOUBLE PRECISION NOT NULL,
    "remise" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "methodePaiement" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "vendeur" TEXT NOT NULL,
    "typeFacture" TEXT NOT NULL DEFAULT 'FV',
    "factureReference" TEXT,
    "retourStock" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Vente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemVente" (
    "id" TEXT NOT NULL,
    "venteId" TEXT NOT NULL,
    "medicamentId" TEXT,
    "libelle" TEXT,
    "code" TEXT,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "remise" DOUBLE PRECISION NOT NULL,
    "sousTotal" DOUBLE PRECISION NOT NULL,
    "groupeTaxation" TEXT NOT NULL DEFAULT 'B',

    CONSTRAINT "ItemVente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fournisseur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "adresse" TEXT NOT NULL,
    "dateAjout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandeFournisseur" (
    "id" TEXT NOT NULL,
    "numeroCommande" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "dateReception" TIMESTAMP(3),

    CONSTRAINT "CommandeFournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCommande" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "medicamentId" TEXT NOT NULL,
    "quantiteCommandee" INTEGER NOT NULL,
    "quantiteRecue" INTEGER,
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "sousTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ItemCommande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerte" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "medicamentId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "priorite" TEXT NOT NULL,

    CONSTRAINT "Alerte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "modulesSupplementaires" TEXT,
    "ventesAccess" TEXT,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "message" TEXT NOT NULL,
    "details" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rayon" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emplacement" TEXT NOT NULL,
    "capaciteMax" INTEGER NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rayon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicamentRayon" (
    "id" TEXT NOT NULL,
    "medicamentId" TEXT NOT NULL,
    "rayonId" TEXT NOT NULL,
    "quantiteEnRayon" INTEGER NOT NULL,
    "quantiteMinimale" INTEGER NOT NULL,
    "dateTransfert" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT NOT NULL,

    CONSTRAINT "MedicamentRayon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransfertRayon" (
    "id" TEXT NOT NULL,
    "medicamentId" TEXT NOT NULL,
    "rayonId" TEXT NOT NULL,
    "quantiteTransferee" INTEGER NOT NULL,
    "typeTransfert" TEXT NOT NULL,
    "rayonDestinationId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilisateur" TEXT NOT NULL,
    "commentaire" TEXT,

    CONSTRAINT "TransfertRayon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assurance" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT,
    "tauxCouverture" DOUBLE PRECISION NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assure" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "assuranceId" TEXT NOT NULL,
    "numeroPolice" TEXT NOT NULL,
    "tauxCouverture" DOUBLE PRECISION,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Assure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DossierRemboursement" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "assuranceId" TEXT NOT NULL,
    "assureId" TEXT,
    "venteId" TEXT,
    "dateSoumission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodeDebut" TIMESTAMP(3) NOT NULL,
    "periodeFin" TIMESTAMP(3) NOT NULL,
    "montantTotal" DOUBLE PRECISION NOT NULL,
    "montantCouvert" DOUBLE PRECISION NOT NULL,
    "montantPayeClient" DOUBLE PRECISION NOT NULL,
    "montantRembourse" DOUBLE PRECISION NOT NULL,
    "statut" TEXT NOT NULL,
    "commentaire" TEXT,

    CONSTRAINT "DossierRemboursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigurationESECeF" (
    "id" TEXT NOT NULL,
    "nif" TEXT NOT NULL,
    "nim" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "environnement" TEXT NOT NULL,
    "isf" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "tokenValidUntil" TIMESTAMP(3),
    "lastTokenCheck" TIMESTAMP(3),
    "nomEtablissement" TEXT NOT NULL DEFAULT '',
    "adresse" TEXT NOT NULL DEFAULT '',
    "modePrix" TEXT NOT NULL DEFAULT 'TTC',
    "delaiAttenteMs" INTEGER NOT NULL DEFAULT 30000,
    "catalogueFiscal" JSONB,
    "derniereSynchro" TIMESTAMP(3),
    "derniersCompteurs" TEXT,
    "dateConfiguration" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigurationESECeF_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeCertification" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'soumise',
    "requete" JSONB NOT NULL,
    "totaux" JSONB NOT NULL,
    "securite" JSONB,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactureESECeF" (
    "id" TEXT NOT NULL,
    "venteId" TEXT NOT NULL,
    "numeroFacture" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "requestData" TEXT NOT NULL,
    "uid" TEXT,
    "codeSECeFDGI" TEXT,
    "qrCode" TEXT,
    "dateTimeCertification" TIMESTAMP(3),
    "counters" TEXT,
    "errorCode" TEXT,
    "errorDescription" TEXT,
    "configurationId" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "derniereTentative" TIMESTAMP(3),

    CONSTRAINT "FactureESECeF_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parametres" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "description" TEXT,
    "categorie" TEXT NOT NULL DEFAULT 'general',
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parametres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Medicament_nom_idx" ON "Medicament"("nom");

-- CreateIndex
CREATE INDEX "Medicament_categorie_idx" ON "Medicament"("categorie");

-- CreateIndex
CREATE INDEX "Medicament_fournisseur_idx" ON "Medicament"("fournisseur");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_nom_prenom_idx" ON "Client"("nom", "prenom");

-- CreateIndex
CREATE INDEX "Client_telephone_idx" ON "Client"("telephone");

-- CreateIndex
CREATE UNIQUE INDEX "Vente_numeroFacture_key" ON "Vente"("numeroFacture");

-- CreateIndex
CREATE INDEX "Vente_date_idx" ON "Vente"("date");

-- CreateIndex
CREATE INDEX "Vente_clientId_idx" ON "Vente"("clientId");

-- CreateIndex
CREATE INDEX "Vente_statut_idx" ON "Vente"("statut");

-- CreateIndex
CREATE INDEX "ItemVente_venteId_idx" ON "ItemVente"("venteId");

-- CreateIndex
CREATE INDEX "ItemVente_medicamentId_idx" ON "ItemVente"("medicamentId");

-- CreateIndex
CREATE INDEX "Fournisseur_nom_idx" ON "Fournisseur"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "CommandeFournisseur_numeroCommande_key" ON "CommandeFournisseur"("numeroCommande");

-- CreateIndex
CREATE INDEX "CommandeFournisseur_fournisseurId_idx" ON "CommandeFournisseur"("fournisseurId");

-- CreateIndex
CREATE INDEX "CommandeFournisseur_statut_idx" ON "CommandeFournisseur"("statut");

-- CreateIndex
CREATE INDEX "ItemCommande_commandeId_idx" ON "ItemCommande"("commandeId");

-- CreateIndex
CREATE INDEX "ItemCommande_medicamentId_idx" ON "ItemCommande"("medicamentId");

-- CreateIndex
CREATE INDEX "Alerte_date_idx" ON "Alerte"("date");

-- CreateIndex
CREATE INDEX "Alerte_lue_idx" ON "Alerte"("lue");

-- CreateIndex
CREATE INDEX "Alerte_medicamentId_idx" ON "Alerte"("medicamentId");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "Utilisateur_email_idx" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "Utilisateur_role_idx" ON "Utilisateur"("role");

-- CreateIndex
CREATE INDEX "AuditLog_date_idx" ON "AuditLog"("date");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "Rayon_nom_idx" ON "Rayon"("nom");

-- CreateIndex
CREATE INDEX "MedicamentRayon_medicamentId_idx" ON "MedicamentRayon"("medicamentId");

-- CreateIndex
CREATE INDEX "MedicamentRayon_rayonId_idx" ON "MedicamentRayon"("rayonId");

-- CreateIndex
CREATE INDEX "MedicamentRayon_statut_idx" ON "MedicamentRayon"("statut");

-- CreateIndex
CREATE INDEX "TransfertRayon_medicamentId_idx" ON "TransfertRayon"("medicamentId");

-- CreateIndex
CREATE INDEX "TransfertRayon_rayonId_idx" ON "TransfertRayon"("rayonId");

-- CreateIndex
CREATE INDEX "TransfertRayon_date_idx" ON "TransfertRayon"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Assurance_nom_key" ON "Assurance"("nom");

-- CreateIndex
CREATE INDEX "Assurance_nom_idx" ON "Assurance"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Assure_numeroPolice_key" ON "Assure"("numeroPolice");

-- CreateIndex
CREATE INDEX "Assure_clientId_idx" ON "Assure"("clientId");

-- CreateIndex
CREATE INDEX "Assure_assuranceId_idx" ON "Assure"("assuranceId");

-- CreateIndex
CREATE INDEX "Assure_numeroPolice_idx" ON "Assure"("numeroPolice");

-- CreateIndex
CREATE UNIQUE INDEX "DossierRemboursement_reference_key" ON "DossierRemboursement"("reference");

-- CreateIndex
CREATE INDEX "DossierRemboursement_assuranceId_idx" ON "DossierRemboursement"("assuranceId");

-- CreateIndex
CREATE INDEX "DossierRemboursement_assureId_idx" ON "DossierRemboursement"("assureId");

-- CreateIndex
CREATE INDEX "DossierRemboursement_venteId_idx" ON "DossierRemboursement"("venteId");

-- CreateIndex
CREATE INDEX "DossierRemboursement_statut_idx" ON "DossierRemboursement"("statut");

-- CreateIndex
CREATE INDEX "DossierRemboursement_dateSoumission_idx" ON "DossierRemboursement"("dateSoumission");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigurationESECeF_nim_key" ON "ConfigurationESECeF"("nim");

-- CreateIndex
CREATE INDEX "ConfigurationESECeF_nif_idx" ON "ConfigurationESECeF"("nif");

-- CreateIndex
CREATE INDEX "ConfigurationESECeF_actif_idx" ON "ConfigurationESECeF"("actif");

-- CreateIndex
CREATE UNIQUE INDEX "DemandeCertification_uid_key" ON "DemandeCertification"("uid");

-- CreateIndex
CREATE INDEX "DemandeCertification_statut_dateCreation_idx" ON "DemandeCertification"("statut", "dateCreation");

-- CreateIndex
CREATE UNIQUE INDEX "FactureESECeF_venteId_key" ON "FactureESECeF"("venteId");

-- CreateIndex
CREATE INDEX "FactureESECeF_venteId_idx" ON "FactureESECeF"("venteId");

-- CreateIndex
CREATE INDEX "FactureESECeF_numeroFacture_idx" ON "FactureESECeF"("numeroFacture");

-- CreateIndex
CREATE INDEX "FactureESECeF_statut_idx" ON "FactureESECeF"("statut");

-- CreateIndex
CREATE INDEX "FactureESECeF_codeSECeFDGI_idx" ON "FactureESECeF"("codeSECeFDGI");

-- CreateIndex
CREATE INDEX "FactureESECeF_configurationId_idx" ON "FactureESECeF"("configurationId");

-- CreateIndex
CREATE INDEX "FactureESECeF_dateCreation_idx" ON "FactureESECeF"("dateCreation");

-- CreateIndex
CREATE UNIQUE INDEX "Parametres_cle_key" ON "Parametres"("cle");

-- CreateIndex
CREATE INDEX "Parametres_cle_idx" ON "Parametres"("cle");

-- CreateIndex
CREATE INDEX "Parametres_categorie_idx" ON "Parametres"("categorie");

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVente" ADD CONSTRAINT "ItemVente_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "Vente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVente" ADD CONSTRAINT "ItemVente_medicamentId_fkey" FOREIGN KEY ("medicamentId") REFERENCES "Medicament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandeFournisseur" ADD CONSTRAINT "CommandeFournisseur_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCommande" ADD CONSTRAINT "ItemCommande_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "CommandeFournisseur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCommande" ADD CONSTRAINT "ItemCommande_medicamentId_fkey" FOREIGN KEY ("medicamentId") REFERENCES "Medicament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerte" ADD CONSTRAINT "Alerte_medicamentId_fkey" FOREIGN KEY ("medicamentId") REFERENCES "Medicament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicamentRayon" ADD CONSTRAINT "MedicamentRayon_medicamentId_fkey" FOREIGN KEY ("medicamentId") REFERENCES "Medicament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicamentRayon" ADD CONSTRAINT "MedicamentRayon_rayonId_fkey" FOREIGN KEY ("rayonId") REFERENCES "Rayon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransfertRayon" ADD CONSTRAINT "TransfertRayon_medicamentId_fkey" FOREIGN KEY ("medicamentId") REFERENCES "Medicament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransfertRayon" ADD CONSTRAINT "TransfertRayon_rayonId_fkey" FOREIGN KEY ("rayonId") REFERENCES "Rayon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransfertRayon" ADD CONSTRAINT "TransfertRayon_rayonDestinationId_fkey" FOREIGN KEY ("rayonDestinationId") REFERENCES "Rayon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assure" ADD CONSTRAINT "Assure_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assure" ADD CONSTRAINT "Assure_assuranceId_fkey" FOREIGN KEY ("assuranceId") REFERENCES "Assurance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierRemboursement" ADD CONSTRAINT "DossierRemboursement_assuranceId_fkey" FOREIGN KEY ("assuranceId") REFERENCES "Assurance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierRemboursement" ADD CONSTRAINT "DossierRemboursement_assureId_fkey" FOREIGN KEY ("assureId") REFERENCES "Assure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DossierRemboursement" ADD CONSTRAINT "DossierRemboursement_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "Vente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactureESECeF" ADD CONSTRAINT "FactureESECeF_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "Vente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactureESECeF" ADD CONSTRAINT "FactureESECeF_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "ConfigurationESECeF"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

