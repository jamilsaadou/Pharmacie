// Service pour l'intégration avec l'API e-SECeF
import {
  InvoiceRequestDataDto,
  InvoiceResponseDataDto,
  SecurityElementsDto,
  StatusResponseDto,
  InvoiceDetailsDto,
  InfoResponseDto,
  TaxGroupsDto,
  InvoiceTypeDto,
  PaymentTypeDto,
  ESECeFAPIConfig,
  CertificationResult,
  ESECEF_API_URLS,
  ESECEF_ERROR_CODES,
} from '@/types/esecef';

export class ESECeFService {
  private baseURLInvoice: string;
  private baseURLInfo: string;
  private token: string;
  private timeout: number;

  constructor(config: ESECeFAPIConfig, environnement: 'test' | 'production') {
    this.baseURLInvoice = ESECEF_API_URLS[environnement].invoice;
    this.baseURLInfo = ESECEF_API_URLS[environnement].info;
    this.token = config.token;
    this.timeout = config.timeout || 30000; // 30 secondes par défaut
  }

  /**
   * Effectue une requête HTTP vers l'API e-SECeF
   * Note: L'API e-SECeF attend le token JWT directement dans l'en-tête Authorization (sans préfixe "Bearer")
   */
  private async request<T>(
    url: string,
    method: 'GET' | 'POST' | 'PUT',
    body?: any
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'text/plain',
      Authorization: this.token, // Token JWT direct, sans préfixe "Bearer"
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      console.log(`[e-SECeF] ${method} ${url}`);


      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      console.log(`[e-SECeF] Response status: ${response.status}`);


      if (response.status === 401) {
        throw new Error('Token non autorisé ou expiré');
      }

      if (!response.ok) {
        throw new Error(
          `Erreur HTTP ${response.status} du service e‑MCF`
        );
      }

      // Parser le JSON depuis le texte
      try {
        return JSON.parse(responseText);
      } catch {
        throw new Error("Réponse JSON invalide du service e‑MCF");
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('[e-SECeF] Error:', error.message);

      if (error.name === 'AbortError') {
        throw new Error(`Timeout: La requête a dépassé ${this.timeout / 1000} secondes`);
      }

      throw error;
    }
  }

  // ==================== API DE FACTURATION ====================

  /**
   * 1.1 DEMANDE DE STATUT
   * Vérifie l'état de l'API, du token et des factures en attente
   */
  async getStatus(): Promise<StatusResponseDto> {
    return this.request<StatusResponseDto>(
      this.baseURLInvoice,
      'GET'
    );
  }

  /**
   * 1.2 DEMANDE DE FACTURE
   * Soumet les données de la facture et obtient les totaux calculés
   */
  async submitInvoice(
    invoiceData: InvoiceRequestDataDto
  ): Promise<InvoiceResponseDataDto> {
    return this.request<InvoiceResponseDataDto>(
      this.baseURLInvoice,
      'POST',
      invoiceData
    );
  }

  /**
   * 1.3 DEMANDE DE FINALISATION
   * Confirme ou annule la demande de facture
   * IMPORTANT: Utilise PUT selon la spec, pas POST
   * Les endpoints sont /confirm et /cancel (en anglais)
   */
  async finalizeInvoice(
    uid: string,
    action: 'confirmer' | 'annuler'
  ): Promise<SecurityElementsDto> {
    const actionUrl = action === 'confirmer' ? 'confirm' : 'cancel';
    return this.request<SecurityElementsDto>(
      `${this.baseURLInvoice}/${encodeURIComponent(uid)}/${actionUrl}`,
      'PUT'
    );
  }

  /**
   * 1.4 DEMANDE DE DÉTAILS SUR LA FACTURE EN ATTENTE
   * Récupère les détails d'une facture en attente
   */
  async getPendingInvoiceDetails(uid: string): Promise<InvoiceDetailsDto> {
    return this.request<InvoiceDetailsDto>(
      `${this.baseURLInvoice}/${encodeURIComponent(uid)}`,
      'GET'
    );
  }

  // ==================== API D'INFORMATION ====================

  /**
   * 2.1 INFORMATIONS SUR LES E-MCF
   * Récupère les informations sur les e-MCF
   */
  async getEmcfInfo(): Promise<InfoResponseDto> {
    return this.request<InfoResponseDto>(
      `${this.baseURLInfo}/status`,
      'GET'
    );
  }

  /**
   * 2.2 INFORMATIONS SUR LES GROUPES DE TAXATION
   * Récupère les groupes fiscaux disponibles
   */
  async getTaxGroups(): Promise<TaxGroupsDto> {
    return this.request<TaxGroupsDto>(
      `${this.baseURLInfo}/taxGroups`,
      'GET'
    );
  }

  /**
   * 2.3 INFORMATIONS SUR LES TYPES DE FACTURES
   * Récupère les types de factures disponibles
   */
  async getInvoiceTypes(): Promise<InvoiceTypeDto[]> {
    return this.request<InvoiceTypeDto[]>(
      `${this.baseURLInfo}/invoiceTypes`,
      'GET'
    );
  }

  /**
   * 2.4 INFORMATIONS SUR LES TYPES DE PAIEMENT
   * Récupère les types de paiement disponibles
   */
  async getPaymentTypes(): Promise<PaymentTypeDto[]> {
    return this.request<PaymentTypeDto[]>(
      `${this.baseURLInfo}/paymentTypes`,
      'GET'
    );
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * Workflow complet de certification d'une facture
   * 1. Vérifier le statut de l'API
   * 2. Soumettre la facture
   * 3. Vérifier les totaux
   * 4. Confirmer ou annuler
   */
  async certifyInvoice(
    invoiceData: InvoiceRequestDataDto,
    validateTotals?: (response: InvoiceResponseDataDto) => boolean,
    onSubmitted?: (response: InvoiceResponseDataDto) => Promise<void>
  ): Promise<CertificationResult> {
    try {
      // 1. Vérifier le statut de l'API (optionnel mais recommandé)
      const status = await this.getStatus();
      if (!status.status) {
        return {
          success: false,
          error: {
            code: 'API_UNAVAILABLE',
            description: "L'API e-SECeF n'est pas disponible",
          },
        };
      }

      // Vérifier le nombre de factures en attente
      if (status.pendingRequestsCount >= 10) {
        return {
          success: false,
          error: {
            code: '1',
            description: ESECEF_ERROR_CODES['1'],
          },
        };
      }

      // 2. Soumettre la facture
      const invoiceResponse = await this.submitInvoice(invoiceData);

      // Vérifier s'il y a des erreurs dans la réponse
      if (invoiceResponse.errorCode) {
        return {
          success: false,
          error: {
            code: invoiceResponse.errorCode,
            description:
              invoiceResponse.errorDesc ||
              ESECEF_ERROR_CODES[invoiceResponse.errorCode] ||
              'Erreur inconnue',
          },
        };
      }

      if (!invoiceResponse.uid) throw new Error('UID absent de la réponse e‑MCF');

      if (onSubmitted) await onSubmitted(invoiceResponse);

      // 3. Valider les totaux si une fonction de validation est fournie
      if (validateTotals && !validateTotals(invoiceResponse)) {
        // Annuler la facture si la validation échoue
        const cancellation = await this.finalizeInvoice(invoiceResponse.uid!, 'annuler');
        if (cancellation.errorCode) throw new Error('L’annulation du calcul divergent n’a pas été confirmée. Rapprochez la demande avec e‑MCF.');
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            description: 'La validation des totaux a échoué',
          },
        };
      }

      // 4. Confirmer la facture
      const securityElements = await this.finalizeInvoice(
        invoiceResponse.uid!,
        'confirmer'
      );

      // Vérifier s'il y a des erreurs dans la finalisation
      if (securityElements.errorCode) {
        return {
          success: false,
          error: {
            code: securityElements.errorCode,
            description:
              securityElements.errorDesc ||
              ESECEF_ERROR_CODES[securityElements.errorCode] ||
              'Erreur inconnue',
          },
        };
      }

      if (!securityElements.codeSECeFDGI || !securityElements.qrCode || !securityElements.counters || !securityElements.nim || !securityElements.dateTime) {
        throw new Error('Éléments de sécurité e‑MCF incomplets. Rapprochez la demande avant toute nouvelle soumission.');
      }
      // Succès!
      return {
        success: true,
        uid: invoiceResponse.uid,
        totals: invoiceResponse,
        nim: securityElements.nim,
        codeSECeFDGI: securityElements.codeSECeFDGI,
        qrCode: securityElements.qrCode,
        dateTime: securityElements.dateTime,
        counters: securityElements.counters,
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'EXCEPTION',
          description: error.message || 'Une erreur inattendue est survenue',
        },
      };
    }
  }

  /**
   * Annule une facture en attente
   */
  async cancelPendingInvoice(uid: string): Promise<boolean> {
    try {
      const result = await this.finalizeInvoice(uid, 'annuler');
      return !result.errorCode;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convertit un montant en FCFA vers le format attendu par l'API
   * (montant en FCFA, sans multiplication par 100)
   */
  static toApiAmount(amount: number): number {
    return Math.round(amount);
  }

  /**
   * Convertit un montant API vers FCFA
   */
  static fromApiAmount(amount: number): number {
    return amount;
  }

  /**
   * Mappe le type de paiement de l'application vers l'API e-SECeF
   */
  static mapPaymentType(
    type: 'especes' | 'carte' | 'cheque' | 'virement' | 'mobilemoney'
  ): 'ESPECES' | 'VIREMENT' | 'CARTEBANCAIRE' | 'CHEQUES' | 'MOBILEMONEY' {
    const mapping: Record<string, any> = {
      mobilemoney: 'MOBILEMONEY',
      especes: 'ESPECES',
      carte: 'CARTEBANCAIRE',
      cheque: 'CHEQUES',
      virement: 'VIREMENT',
    };
    return mapping[type] || 'ESPECES';
  }

  /**
   * Obtient la description d'une erreur par son code
   */
  static getErrorDescription(errorCode: string): string {
    return ESECEF_ERROR_CODES[errorCode] || 'Erreur inconnue';
  }
}

