// Types pour l'intégration de l'API e-SECeF (Système Électronique Certifié de Facturation)

// ==================== CONFIGURATION ====================

export interface ConfigurationESECeF {
  id: string;
  nif: string; // NIF du contribuable
  nim: string; // NIM de l'e-MCF
  token: string; // Token d'authentification (crypté)
  environnement: 'test' | 'production';
  isf: string; // Identifiant du Système de Facturation d'Entreprise
  actif: boolean;
  dateConfiguration: Date;
  dateModification: Date;
}

// ==================== ENUMS ====================

export type ModePrice = 'TTC' | 'HT' | 'ttc' | 'ht';
export type ISBGroup = 'A' | 'B' | 'C' | 'D'; // A = ISB 2%, B = ISB 5%, C et D selon configuration
// Types de factures valides pour l'API e-SECeF (InvoiceTypeEnum - 6 valeurs)
export type ApiInvoiceType =
  | 'FV'  // Facture de vente
  | 'FT'  // Facture d'acompte ou d'avance
  | 'FA'  // Facture d'avoir
  | 'EV'  // Facture de vente à l'exportation
  | 'ET'  // Facture d'acompte à l'exportation
  | 'EA'; // Facture d'avoir à l'exportation

// Types de factures incluant les copies (usage local uniquement, NE PAS envoyer à l'API)
export type InvoiceType = ApiInvoiceType
  | 'CV'  // Copie de la dernière facture de vente
  | 'CT'  // Copie de la dernière facture d'acompte ou d'avance
  | 'CA'  // Copie de la dernière facture d'avoir
  | 'EC'  // Copie de la dernière facture de vente à l'exportation
  | 'EK'  // Copie de la dernière facture d'acompte à l'exportation
  | 'ER'; // Copie de la dernière facture d'avoir à l'exportation

export type TaxGroup = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P';

export type PaymentType = 
  | 'ESPECES' 
  | 'VIREMENT' 
  | 'CARTEBANCAIRE' 
  | 'MOBILEMONEY' 
  | 'CHEQUES' 
  | 'CREDIT' 
  | 'AUTRE' | 'AUTRE1' | 'AUTRE2';

export type InvoiceStatus = 
  | 'DRAFT'       // Panier en cours (local)
  | 'PENDING'     // POST envoyé, uid reçu, en attente de finalisation
  | 'FINALIZED'   // Confirmé, QR + Code reçus
  | 'CANCELLED'   // Annulé
  | 'EXPIRED'     // Expiré (non finalisé dans les 2 minutes)
  | 'ERROR';      // Erreur API

export type FactureESECeFStatut = 
  | 'en_attente'    // En attente de soumission
  | 'soumise'       // Soumise à l'API (demande de facture envoyée)
  | 'certifiee'     // Certifiée (Code SECeF/DGI reçu)
  | 'annulee'       // Annulée
  | 'erreur';       // Erreur lors de la certification

// ==================== REQUEST DTOs ====================

export interface ClientDto {
  nif?: string;
  name?: string;
  contact?: string;
  address?: string;
}

export interface OperatorDto {
  id?: string;
  name: string;
}

export interface PaymentDto {
  name: PaymentType;
  amount: number; // En FCFA entiers (integer)
}

export interface ItemDto {
  code?: string;
  name: string;
  price: number; // En FCFA entiers (integer)
  quantity: number; // Decimal
  taxGroup: TaxGroup;
  taxSpecificValue?: string; // Ex: "230" ou "10%"
  taxSpecificAmount?: number; // En FCFA entiers
  originalPrice?: number; // En FCFA entiers
  priceModification?: string;
}

export interface InvoiceRequestDataDto {
  nif: string;
  rn?: string; // Numéro interne de la facture
  mode: ModePrice;
  isf: string;
  isb?: ISBGroup;
  type: ApiInvoiceType;
  items: ItemDto[];
  client?: ClientDto;
  operator: OperatorDto;
  payment?: PaymentDto[];
  reference?: string; // Pour les factures d'avoir (FA, EA) - format RN (NIM-compteur)
  cmta?: string; // Commentaires A-H
  cmtb?: string;
  cmtc?: string;
  cmtd?: string;
  cmte?: string;
  cmtf?: string;
  cmtg?: string;
  cmth?: string;
}

// ==================== RESPONSE DTOs ====================

export interface InvoiceResponseDataDto {
  uid?: string; // UID de la transaction (36 caractères)
  // Valeurs des groupes de taxation A-P (en %)
  ta?: number;
  tb?: number;
  tc?: number;
  td?: number;
  te?: number;
  tf?: number;
  tg?: number;
  th?: number;
  ti?: number;
  tj?: number;
  tk?: number;
  tl?: number;
  tm?: number;
  tn?: number;
  to?: number;
  tp?: number;
  // Montants totaux pour chaque groupe A-P (en FCFA entiers)
  taa?: number;
  tab?: number;
  tac?: number;
  tad?: number;
  tae?: number;
  taf?: number;
  tag?: number;
  tah?: number;
  tai?: number;
  taj?: number;
  tak?: number;
  tal?: number;
  tam?: number;
  tan?: number;
  tao?: number;
  tap?: number;
  // Montants HT pour chaque groupe (en FCFA entiers)
  haa?: number;
  hab?: number;
  hac?: number;
  had?: number;
  hae?: number;
  haf?: number;
  hag?: number;
  hah?: number;
  hai?: number;
  haj?: number;
  hak?: number;
  hal?: number;
  ham?: number;
  han?: number;
  hao?: number;
  hap?: number;
  // Montants TVA pour chaque groupe (en FCFA entiers)
  vaa?: number;
  vab?: number;
  vac?: number;
  vad?: number;
  vae?: number;
  vaf?: number;
  vag?: number;
  vah?: number;
  vai?: number;
  vaj?: number;
  vak?: number;
  val?: number;
  vam?: number;
  van?: number;
  vao?: number;
  vap?: number;
  isb?: number; // Montant ISB (en FCFA entiers)
  ts?: number; // Montant impôt spécifique (en FCFA entiers)
  total?: number; // Montant total TTC (en FCFA entiers)
  vtotal?: number; // Montant total TVA (en FCFA entiers)
  errorCode?: string;
  errorDesc?: string;
}

export interface SecurityElementsDto {
  dateTime?: string; // Format: DD/MM/YYYY HH:mm:ss
  qrCode?: string; // Contenu du code QR (66 caractères)
  codeSECeFDGI?: string; // Code SECeF/DGI (29 caractères)
  counters?: string; // Ex: "23/56 FV"
  nim?: string; // NIM de l'e-MCF (10 caractères)
  errorCode?: string;
  errorDesc?: string;
}

export interface StatusResponseDto {
  status: boolean;
  version: string;
  nif: string;
  nim: string;
  tokenValid: string; // DateTime - Date d'expiration du token
  serverDateTime: string; // DateTime
  pendingRequestsCount: number;
  pendingRequestsList: PendingRequestDto[];
}

export interface PendingRequestDto {
  date: string; // DateTime
  uid: string;
}

export interface InvoiceDetailsDto {
  nif: string;
  rn?: string;
  mode: ModePrice;
  isf: string;
  type: InvoiceType;
  items: ItemDto[];
  client?: ClientDto;
  operator: OperatorDto;
  payment?: PaymentDto[];
  totals: InvoiceResponseDataDto;
  reference?: string;
  errorCode?: string;
  errorDesc?: string;
}

// ==================== INFO API DTOs ====================

export interface InfoResponseDto {
  status: boolean;
  version: string;
  nif: string;
  nim: string;
  tokenValid: string; // Date d'expiration du token
  serverDateTime: string;
  emcfList: EmcfInfoDto[];
}

export interface EmcfInfoDto {
  nim: string;
  status: 'Enregistré' | 'Actif' | 'Désactivé';
  shopName: string;
  address1: string;
  address2: string;
  address3: string;
  contact1: string;
  contact2: string;
  contact3: string;
}

export interface TaxGroupsDto {
  a?: number;
  b?: number;
  c?: number;
  d?: number;
  e?: number;
  f?: number;
  g?: number;
  h?: number;
  i?: number;
  j?: number;
  k?: number;
  l?: number;
  m?: number;
  n?: number;
  o?: number;
  p?: number;
  isbA?: number;
  isbB?: number;
  isbC?: number;
  isbD?: number;
}

export interface InvoiceTypeDto {
  type: string;
  description: string;
}

export interface PaymentTypeDto {
  type: string;
  description: string;
}

// ==================== DATABASE MODEL ====================

export interface FactureESECeF {
  id: string;
  venteId: string; // Référence à la vente
  numeroFacture: string;
  statut: FactureESECeFStatut;
  
  // Données de la requête
  requestData: string; // JSON de InvoiceRequestDataDto
  
  // Données de la réponse
  uid?: string; // UID de la transaction
  codeSECeFDGI?: string; // Code SECeF/DGI
  qrCode?: string; // Contenu du code QR
  dateTimeCertification?: Date;
  counters?: string;
  
  // Erreurs
  errorCode?: string;
  errorDescription?: string;
  
  // Métadonnées
  dateCreation: Date;
  dateModification: Date;
  tentatives: number;
  derniereTentative?: Date;
}

// ==================== UTILITY TYPES ====================

export interface ESECeFAPIConfig {
  baseURL: string;
  token: string;
  timeout?: number;
}

export interface CertificationResult {
  success: boolean;
  uid?: string; // UID de la facture en attente
  totals?: InvoiceResponseDataDto; // Totaux calculés par l'API
  codeSECeFDGI?: string;
  qrCode?: string;
  dateTime?: string;
  counters?: string;
  nim?: string;
  error?: {
    code: string;
    description: string;
  };
}

// ==================== LOCAL STORAGE TYPES ====================

export interface DraftInvoice {
  id: string;
  status: InvoiceStatus;
  invoiceType: InvoiceType;
  cart: Array<{
    medicamentId: string;
    nom: string;
    quantite: number;
    prixUnitaire: number;
    remise: number;
    sousTotal: number;
    taxGroup?: TaxGroup;
  }>;
  client?: {
    id?: string;
    nif?: string;
    nom: string;
    contact?: string;
    address?: string;
  };
  operator: string;
  paymentMethod: string;
  globalDiscount: number;
  reference?: string; // Pour factures d'avoir
  
  // Données API
  uid?: string; // UID reçu après POST
  totalsAPI?: InvoiceResponseDataDto; // Totaux calculés par l'API
  securityElements?: SecurityElementsDto; // Éléments de sécurité après confirmation
  
  // Métadonnées
  createdAt: string;
  updatedAt: string;
  expiresAt?: string; // Pour les factures PENDING (2 minutes)
  error?: {
    code: string;
    description: string;
  };
}

// ==================== ERROR CODES ====================

export const ESECEF_ERROR_CODES: Record<string, string> = {
  '1': 'Le nombre maximum de factures en attente est dépassé',
  '3': "Type de facture n'est pas valide",
  '4': 'La référence de la facture originale est manquante',
  '5': 'La référence de la facture originale ne comporte pas 24 caractères',
  '6': "La valeur de l'ISB n'est pas valide",
  '7': "Le type de paiement n'est pas valide",
  '8': 'La facture doit contenir les articles',
  '9': "Le groupe de taxation au niveau des articles n'est pas valide",
  '10': 'La référence de la facture originale ne peut pas être validée, veuillez réessayer plus tard',
  '11': "La référence de la facture originale n'est pas valide (la facture originale est introuvable)",
  '12': "La référence de la facture originale n'est pas valide (le montant sur la facture d'avoir dépassé le montant de la facture originale)",
  '20': 'La facture n\'existe pas ou elle est déjà finalisée / annulée',
  '99': 'Erreur lors du traitement de la demande',
};

// ==================== CONSTANTS ====================

export const ESECEF_API_URLS = {
  production: {
    invoice: 'https://esecef.impots.gouv.ne/api/invoice',
    info: 'https://esecef.impots.gouv.ne/api/info',
  },
  test: {
    invoice: 'https://esecef-test.impots.gouv.ne/api/invoice',
    info: 'https://esecef-test.impots.gouv.ne/api/info',
  },
};

// Timeout pour les factures en attente (2 minutes selon spec)
export const PENDING_INVOICE_TIMEOUT_MS = 2 * 60 * 1000;

// Nombre maximum de factures en attente
export const MAX_PENDING_INVOICES = 10;
