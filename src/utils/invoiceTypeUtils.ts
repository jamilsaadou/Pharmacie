/**
 * Utilitaires pour les types de factures e-SECeF
 * Conforme aux spécifications techniques SFE v2.0
 */

import { InvoiceType } from '@/types/esecef';
import { normalizeInvoiceReference } from '@/utils/esecefReference';

/**
 * Métadonnées des types de factures
 */
export interface InvoiceTypeMetadata {
  code: InvoiceType;
  label: string;
  description: string;
  isCopy: boolean;
  isExport: boolean;
  isCredit: boolean; // Facture d'avoir
  isAdvance: boolean; // Facture d'acompte
  requiresReference: boolean; // Nécessite une référence de facture originale
  category: 'normal' | 'export';
}

export const INVOICE_TYPES_METADATA: Record<InvoiceType, InvoiceTypeMetadata> = {
  // ==================== FACTURES NORMALES ====================
  FV: {
    code: 'FV',
    label: 'FACTURE DE VENTE',
    description: 'Facture de vente',
    isCopy: false,
    isExport: false,
    isCredit: false,
    isAdvance: false,
    requiresReference: false,
    category: 'normal',
  },
  FT: {
    code: 'FT',
    label: 'FACTURE D\'ACOMPTE OU D\'AVANCE',
    description: 'Facture d\'acompte ou d\'avance',
    isCopy: false,
    isExport: false,
    isCredit: false,
    isAdvance: true,
    requiresReference: false,
    category: 'normal',
  },
  FA: {
    code: 'FA',
    label: 'FACTURE D\'AVOIR',
    description: 'Facture d\'avoir',
    isCopy: false,
    isExport: false,
    isCredit: true,
    isAdvance: false,
    requiresReference: true,
    category: 'normal',
  },
  CV: {
    code: 'CV',
    label: 'COPIE DE LA FACTURE DE VENTE',
    description: 'Copie de la dernière facture de vente',
    isCopy: true,
    isExport: false,
    isCredit: false,
    isAdvance: false,
    requiresReference: false,
    category: 'normal',
  },
  CT: {
    code: 'CT',
    label: 'COPIE DE LA FACTURE D\'ACOMPTE OU D\'AVANCE',
    description: 'Copie de la dernière facture d\'acompte ou d\'avance',
    isCopy: true,
    isExport: false,
    isCredit: false,
    isAdvance: true,
    requiresReference: false,
    category: 'normal',
  },
  CA: {
    code: 'CA',
    label: 'COPIE DE LA FACTURE D\'AVOIR',
    description: 'Copie de la dernière facture d\'avoir',
    isCopy: true,
    isExport: false,
    isCredit: true,
    isAdvance: false,
    requiresReference: false,
    category: 'normal',
  },
  // ==================== FACTURES EXPORTATION ====================
  EV: {
    code: 'EV',
    label: 'FACTURE DE VENTE À L\'EXPORTATION',
    description: 'Facture de vente à l\'exportation',
    isCopy: false,
    isExport: true,
    isCredit: false,
    isAdvance: false,
    requiresReference: false,
    category: 'export',
  },
  ET: {
    code: 'ET',
    label: 'FACTURE D\'ACOMPTE À L\'EXPORTATION',
    description: 'Facture d\'acompte à l\'exportation',
    isCopy: false,
    isExport: true,
    isCredit: false,
    isAdvance: true,
    requiresReference: false,
    category: 'export',
  },
  EA: {
    code: 'EA',
    label: 'FACTURE D\'AVOIR À L\'EXPORTATION',
    description: 'Facture d\'avoir à l\'exportation',
    isCopy: false,
    isExport: true,
    isCredit: true,
    isAdvance: false,
    requiresReference: true,
    category: 'export',
  },
  EC: {
    code: 'EC',
    label: 'COPIE DE LA FACTURE DE VENTE À L\'EXPORTATION',
    description: 'Copie de la dernière facture de vente à l\'exportation',
    isCopy: true,
    isExport: true,
    isCredit: false,
    isAdvance: false,
    requiresReference: false,
    category: 'export',
  },
  EK: {
    code: 'EK',
    label: 'COPIE DE LA FACTURE D\'ACOMPTE À L\'EXPORTATION',
    description: 'Copie de la dernière facture d\'acompte à l\'exportation',
    isCopy: true,
    isExport: true,
    isCredit: false,
    isAdvance: true,
    requiresReference: false,
    category: 'export',
  },
  ER: {
    code: 'ER',
    label: 'COPIE DE LA FACTURE D\'AVOIR À L\'EXPORTATION',
    description: 'Copie de la dernière facture d\'avoir à l\'exportation',
    isCopy: true,
    isExport: true,
    isCredit: true,
    isAdvance: false,
    requiresReference: false,
    category: 'export',
  },
};

/**
 * Obtient les métadonnées d'un type de facture
 */
export function getInvoiceTypeMetadata(type: InvoiceType): InvoiceTypeMetadata {
  return INVOICE_TYPES_METADATA[type];
}

/**
 * Vérifie si un type de facture nécessite une référence de facture originale
 */
export function requiresOriginalReference(type: InvoiceType): boolean {
  return INVOICE_TYPES_METADATA[type].requiresReference;
}

/**
 * Vérifie si un type de facture est une copie
 */
export function isCopyInvoice(type: InvoiceType): boolean {
  return INVOICE_TYPES_METADATA[type].isCopy;
}

/**
 * Vérifie si un type de facture est une facture d'exportation
 */
export function isExportInvoice(type: InvoiceType): boolean {
  return INVOICE_TYPES_METADATA[type].isExport;
}

/**
 * Vérifie si un type de facture est une facture d'avoir (crédit)
 */
export function isCreditInvoice(type: InvoiceType): boolean {
  return INVOICE_TYPES_METADATA[type].isCredit;
}

/**
 * Vérifie si un type de facture est une facture d'acompte
 */
export function isAdvanceInvoice(type: InvoiceType): boolean {
  return INVOICE_TYPES_METADATA[type].isAdvance;
}

/**
 * Obtient tous les types de factures normales (non exportation)
 */
export function getNormalInvoiceTypes(): InvoiceType[] {
  return Object.keys(INVOICE_TYPES_METADATA).filter(
    (type) => INVOICE_TYPES_METADATA[type as InvoiceType].category === 'normal'
  ) as InvoiceType[];
}

/**
 * Obtient tous les types de factures d'exportation
 */
export function getExportInvoiceTypes(): InvoiceType[] {
  return Object.keys(INVOICE_TYPES_METADATA).filter(
    (type) => INVOICE_TYPES_METADATA[type as InvoiceType].category === 'export'
  ) as InvoiceType[];
}

/**
 * Obtient tous les types de factures originales (non copies)
 */
export function getOriginalInvoiceTypes(): InvoiceType[] {
  return Object.keys(INVOICE_TYPES_METADATA).filter(
    (type) => !INVOICE_TYPES_METADATA[type as InvoiceType].isCopy
  ) as InvoiceType[];
}

/**
 * Obtient tous les types de factures copies
 */
export function getCopyInvoiceTypes(): InvoiceType[] {
  return Object.keys(INVOICE_TYPES_METADATA).filter(
    (type) => INVOICE_TYPES_METADATA[type as InvoiceType].isCopy
  ) as InvoiceType[];
}

/**
 * Valide les données d'une facture selon son type
 */
export interface InvoiceValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateInvoiceData(
  type: InvoiceType,
  data: {
    reference?: string;
    items?: any[];
    client?: any;
  }
): InvoiceValidationResult {
  const errors: string[] = [];
  const metadata = getInvoiceTypeMetadata(type);
  const normalizedReference = normalizeInvoiceReference(data.reference);

  // Vérifier si une référence est requise
  if (metadata.requiresReference && !normalizedReference) {
    errors.push(`La référence de la facture originale est obligatoire pour le type ${metadata.label}`);
  }

  // Vérifier si une référence est fournie alors qu'elle n'est pas requise
  if (!metadata.requiresReference && data.reference) {
    errors.push(`La référence de la facture originale n'est pas applicable pour le type ${metadata.label}`);
  }

  // Vérifier que la facture contient des articles
  if (!data.items || data.items.length === 0) {
    errors.push('La facture doit contenir au moins un article');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Formate le label d'un type de facture pour l'affichage
 */
export function formatInvoiceTypeLabel(type: InvoiceType, includeCode: boolean = false): string {
  const metadata = getInvoiceTypeMetadata(type);
  return includeCode ? `[${type}] ${metadata.label}` : metadata.label;
}

/**
 * Obtient la description d'un type de facture
 */
export function getInvoiceTypeDescription(type: InvoiceType): string {
  return INVOICE_TYPES_METADATA[type].description;
}

/**
 * Options pour les sélecteurs de types de factures
 */
export interface InvoiceTypeOption {
  value: InvoiceType;
  label: string;
  description: string;
  group: 'Factures normales' | 'Factures exportation' | 'Copies';
}

/**
 * Obtient les options de types de factures pour un sélecteur
 */
export function getInvoiceTypeOptions(options?: {
  includeExport?: boolean;
  includeCopies?: boolean;
  onlyOriginals?: boolean;
}): InvoiceTypeOption[] {
  const {
    includeExport = true,
    includeCopies = true,
    onlyOriginals = false,
  } = options || {};

  const types: InvoiceTypeOption[] = Object.values(INVOICE_TYPES_METADATA)
    .filter((metadata) => {
      if (!['FV','FA','CV','CA'].includes(metadata.code)) return false;
      // Filtrer les exportations si non incluses
      if (!includeExport && metadata.isExport) return false;
      
      // Filtrer les copies si non incluses
      if (!includeCopies && metadata.isCopy) return false;
      
      // Filtrer pour ne garder que les originales si spécifié
      if (onlyOriginals && metadata.isCopy) return false;

      return true;
    })
    .map((metadata): InvoiceTypeOption => ({
      value: metadata.code,
      label: metadata.label,
      description: metadata.description,
      group: metadata.isCopy
        ? 'Copies'
        : metadata.isExport
        ? 'Factures exportation'
        : 'Factures normales',
    }));

  return types;
}

/**
 * Obtient le type de facture copie correspondant à un type original
 */
export function getCopyTypeForOriginal(type: InvoiceType): InvoiceType | null {
  const mapping: Partial<Record<InvoiceType, InvoiceType>> = {
    FV: 'CV',
    FT: 'CT',
    FA: 'CA',
    EV: 'EC',
    ET: 'EK',
    EA: 'ER',
  };
  return mapping[type] || null;
}

/**
 * Obtient le type de facture original correspondant à un type copie
 */
export function getOriginalTypeForCopy(type: InvoiceType): InvoiceType | null {
  const mapping: Partial<Record<InvoiceType, InvoiceType>> = {
    CV: 'FV',
    CT: 'FT',
    CA: 'FA',
    EC: 'EV',
    EK: 'ET',
    ER: 'EA',
  };
  return mapping[type] || null;
}

/**
 * Génère des mentions pour une facture selon son type
 */
export function getInvoiceMentions(type: InvoiceType): string[] {
  const metadata = getInvoiceTypeMetadata(type);
  const mentions: string[] = [];

  if (metadata.isCopy) {
    mentions.push('COPIE');
  }

  if (metadata.isCredit) {
    mentions.push('FACTURE D\'AVOIR');
  }

  if (metadata.isAdvance) {
    mentions.push('FACTURE D\'ACOMPTE');
  }

  if (metadata.isExport) {
    mentions.push('EXPORTATION');
  }

  return mentions;
}
