// Types pour les groupes de taxation e-SECeF
export type GroupeTaxation = import('./esecef').TaxGroup; // A = exonéré 0%, B = TVA 19%

// Types pour les médicaments
export interface Medicament {
  conditionnements?: {id:string;nom:string;facteur:number;prixVente:number;codeBarres?:string|null;actif:boolean}[];
  id: string;
  nom: string;
  description: string;
  prix: number;
  quantiteStock: number;
  seuilAlerte: number;
  dateExpiration: Date;
  categorie: string;
  fournisseur: string;
  codeBarres?: string;
  dosage?: string;
  forme: 'comprimé' | 'gélule' | 'sirop' | 'injection' | 'pommade' | 'autre';
  prescription: boolean;
  photo?: string; // URL ou base64 de l'image
  groupeTaxation: GroupeTaxation; // Groupe de taxation e-SECeF
  dateAjout: Date;
  dateModification: Date;
}

// Types pour les types de factures e-SECeF
export type TypeFacture = 'FV' | 'FA' | 'FT' | 'EV' | 'EA' | 'ET';

// Types pour les ventes
export interface Vente {
  factureESECeF?: {statut:string} | null;
  id: string;
  numeroFacture: string;
  date: Date;
  client?: Client;
  items: ItemVente[];
  sousTotal: number;
  tva: number;
  remise: number;
  total: number;
  methodePaiement: 'especes' | 'carte' | 'cheque' | 'virement';
  statut: 'en_cours' | 'terminee' | 'annulee';
  vendeur: string;
  typeFacture?: TypeFacture; // Type de facture e-SECeF
  factureReference?: string; // Code SECeF/DGI de la facture originale (pour FA)
  retourStock?: boolean; // Si le stock a été réintégré (pour FA)
  certification?: {
    success: boolean;
    securityElements?: {
      codeSECeFDGI: string;
      nim: string;
      compteurs: string;
      dateHeure: string;
      qrCodeData: string;
    };
    totauxParGroupe?: any;
  };
}

export interface ItemVente {
  id: string;
  medicamentId?: string;
  medicament?: Medicament;
  libelle?: string;
  code?: string;
  quantite: number;
  prixUnitaire: number;
  remise: number;
  sousTotal: number;
  groupeTaxation?: GroupeTaxation;
}

// Types pour les clients
export interface Client {
  totalAchatsNet?: number;
  nombreAchats?: number;
  dernierAchat?: string | null;
  id: string;
  nom: string;
  prenom: string;
  nif?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  dateNaissance?: Date;
  numeroSecu?: string;
  dateInscription: Date;
}

// Types pour les fournisseurs
export interface Fournisseur {
  id: string;
  nom: string;
  contact: string;
  telephone: string;
  email?: string;
  adresse: string;
  dateAjout: Date;
}

// Types pour les commandes fournisseurs
export interface CommandeFournisseur {
  id: string;
  numeroCommande: string;
  fournisseur: Fournisseur;
  date: Date;
  items: ItemCommande[];
  statut: 'en_attente' | 'confirmee' | 'partielle' | 'livree' | 'annulee';
  total: number;
  dateReception?: Date;
}

export interface ItemCommande {
  id: string;
  medicamentId: string;
  medicament: Medicament;
  quantiteCommandee: number;
  quantiteRecue?: number;
  prixUnitaire: number;
  sousTotal: number;
}

// Types pour les statistiques
export interface StatistiquesVente {
  ventesDuJour: number;
  ventesDuMois: number;
  ventesAnnuelles: number;
  nombreTransactions: number;
  medicamentsPlusVendus: {
    medicament: Medicament;
    quantiteVendue: number;
  }[];
}

export interface StatistiquesStock {
  totalMedicaments: number;
  stockFaible: number;
  medicamentsExpires: number;
  valeurTotaleStock: number;
  alertesStock: {
    medicament: Medicament;
    quantiteRestante: number;
  }[];
}

// Types pour les alertes
export interface Alerte {
  id: string;
  type: 'stock_faible' | 'expiration' | 'rupture';
  medicament: Medicament;
  message: string;
  date: Date;
  lue: boolean;
  priorite: 'basse' | 'moyenne' | 'haute';
}

// Types pour les utilisateurs
export type Role = 'admin' | 'pharmacien' | 'vendeur';

export type VentesAccessId =
  | 'ventes'
  | 'facture-vente'
  | 'facture-acompte'
  | 'facture-avoir'
  | 'facture-export'
  | 'facture-prestation'
  | 'pending-invoices'
  | 'certified-invoices';

export type ModuleId =
  | 'caisse'
  | 'dashboard'
  | 'stock'
  | 'rayons'
  | 'ventes'
  | 'clients'
  | 'commandes'
  | 'assurances'
  | 'remboursements'
  | 'fournisseurs'
  | 'statistiques'
  | 'rapports'
  | 'alertes'
  | 'esecef'
  | 'logs'
  | 'parametres'
  | 'utilisateurs';

export interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  dateCreation: Date;
  actif: boolean;
  // Accès additionnels par utilisateur, en plus des accès par rôle
  modulesSupplementaires?: ModuleId[];
  // Accès personnalisés aux sous-modules du point de vente / factures
  ventesAccess?: VentesAccessId[];
}

// Types pour le journal d'activité
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'export'
  | 'login'
  | 'logout'
  | 'transfer'
  | 'sale'
  | 'other';

export interface AuditLog {
  id: string;
  date: Date;
  module: ModuleId | 'system';
  action: AuditAction;
  userId?: string;
  userName?: string;
  targetType?: string;
  targetId?: string;
  message: string;
  details?: Record<string, any>;
}

// Types pour les filtres et recherches
export interface FiltresMedicaments {
  nom?: string;
  categorie?: string;
  fournisseur?: string;
  stockFaible?: boolean;
  expiresSoon?: boolean;
  prescription?: boolean;
}

export interface FiltresVentes {
  dateDebut?: Date;
  dateFin?: Date;
  client?: string;
  vendeur?: string;
  methodePaiement?: string;
  statut?: string;
}

// Types pour les modals et UI
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
}

// Types pour les rayons
export interface Rayon {
  id: string;
  nom: string;
  description: string;
  emplacement: string;
  capaciteMax: number;
  dateCreation: Date;
  dateModification: Date;
}

export interface MedicamentRayon {
  id: string;
  medicamentId: string;
  medicament?: Medicament;
  rayonId: string;
  rayon?: Rayon;
  quantiteEnRayon: number;
  quantiteMinimale: number;
  dateTransfert: Date;
  statut: 'en_vente' | 'reserve' | 'expire';
}

export interface TransfertRayon {
  id: string;
  medicamentId: string;
  medicament?: Medicament;
  rayonId: string;
  rayon?: Rayon;
  quantiteTransferee: number;
  typeTransfert: 'stock_vers_rayon' | 'rayon_vers_stock' | 'rayon_vers_rayon';
  rayonDestinationId?: string;
  rayonDestination?: Rayon;
  date: Date;
  utilisateur: string;
  commentaire?: string;
}

// Types pour les formulaires
export interface FormulaireMedicament {
  nom: string;
  description: string;
  prix: string;
  quantiteStock: string;
  seuilAlerte: string;
  dateExpiration: string;
  categorie: string;
  fournisseur: string;
  codeBarres?: string;
  dosage: string;
  forme: Medicament['forme'];
  prescription: boolean;
  groupeTaxation: GroupeTaxation;
}

export interface FormulaireVente {
  client?: Client;
  items: {
    medicamentId: string;
    quantite: number;
    remise: number;
  }[];
  remiseGlobale: number;
  methodePaiement: Vente['methodePaiement'];
}

export interface FormulaireRayon {
  nom: string;
  description: string;
  emplacement: string;
  capaciteMax: string;
}

export interface FormulaireTransfertRayon {
  medicamentId: string;
  rayonId: string;
  quantite: string;
  typeTransfert: TransfertRayon['typeTransfert'];
  rayonDestinationId?: string;
  commentaire?: string;
}

// Types pour les assurances et assurés
export interface Assurance {
  id: string;
  nom: string;
  code?: string;
  tauxCouverture: number; // en % de 0 à 100
  telephone?: string;
  email?: string;
  adresse?: string;
  dateCreation: Date;
}

export interface Assure {
  id: string;
  clientId: string; // Référence au Client existant
  assuranceId: string;
  numeroPolice: string;
  tauxCouverture?: number; // Surclassement spécifique si différent de l'assurance
  dateDebut: Date;
  dateFin?: Date;
  actif: boolean;
}

export type StatutRemboursement = 'en_attente' | 'partiel' | 'rembourse';

export interface DossierRemboursement {
  id: string;
  reference: string; // ex: REMB202409-001
  assuranceId: string;
  assureId?: string;
  venteId?: string; // Optionnel si lié à une vente
  dateSoumission: Date;
  periodeDebut: Date; // bornes utilisées pour les états mensuels/periodiques
  periodeFin: Date;
  montantTotal: number; // montant facture totale
  montantCouvert: number; // part à rembourser par l'assurance
  montantPayeClient: number; // ticket modérateur
  montantRembourse: number; // somme déjà remboursée
  statut: StatutRemboursement;
  commentaire?: string;
}

export interface FiltresRemboursement {
  dateDebut?: Date;
  dateFin?: Date;
  assuranceId?: string;
  statut?: StatutRemboursement;
}
