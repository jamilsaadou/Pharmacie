import {expandSaleUnits} from '@/lib/catalogue/units';

import { fetchWithRefresh as fetch } from '@/lib/data-refresh';
import { useFiscalConfiguration } from '@/hooks/useFiscalConfiguration';
import { computeCartTotals } from '@/lib/catalogue/totals';
import { SaleWorkbench } from './SaleWorkbench';
import { useRef, useState, useMemo, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CertificationStatus, CertificationStatusType } from '@/components/ui/CertificationStatus';
import { usePharmacieData } from '@/hooks/usePharmacieData';
import { useParametres } from '@/hooks/useParametres';
import type { Medicament, Client } from '@/types';
import type { InvoiceType, InvoiceStatus, InvoiceRequestDataDto, InvoiceResponseDataDto, SecurityElementsDto, ItemDto, PaymentType, TaxGroup, ISBGroup } from '@/types/esecef';
import { ESECEF_ERROR_CODES } from '@/types/esecef';
import { ESECeFService } from '@/lib/esecef.service';
import { Search, ShoppingCart, Plus, Minus, Package, X, FileText, AlertCircle, CheckCircle, Clock, XCircle, Printer, Eye } from 'lucide-react';
import { getInvoiceTypeMetadata, requiresOriginalReference } from '@/utils/invoiceTypeUtils';
import { normalizeInvoiceReference } from '@/utils/esecefReference';
import { computeStampDuty, DEFAULT_STAMP_AMOUNT, DEFAULT_STAMP_THRESHOLD, parseStampNumber } from '@/utils/stampDuty';
import { DiscountType, normalizeDiscountType, prorateAmount, resolveDiscount } from '@/lib/discount';

interface CartItem {
  medicament: Medicament;
  quantite: number;
  remise: number;
  remiseType: DiscountType;
}

interface InvoiceCreationProps {
  invoiceType: InvoiceType;
  enableIsb?: boolean;
  titleOverride?: string;
  descriptionOverride?: string;
}

export const InvoiceCreation = ({
  invoiceType,
  enableIsb = false,
  titleOverride,
  descriptionOverride,
}: InvoiceCreationProps) => {
  const { refreshData, medicaments:baseMedicaments, clients } = usePharmacieData();
  const { timbreSeuil, timbreMontant } = useParametres();
  const { configuration: fiscalConfiguration, loading: fiscalLoading } = useFiscalConfiguration();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'especes' | 'carte' | 'cheque' | 'virement'>('especes');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [globalDiscountType, setGlobalDiscountType] = useState<DiscountType>('PERCENT');
  const [referenceFacture, setReferenceFacture] = useState('');
  const medicaments=useMemo(()=>expandSaleUnits(baseMedicaments),[baseMedicaments]);
  const saleRequestKey=useRef('');
  const pendingVente = useRef<any>(null);
  const [certificationStatus, setCertificationStatus] = useState<CertificationStatusType>('idle');
  const [certificationMessage, setCertificationMessage] = useState('');
  const [certificationCode, setCertificationCode] = useState('');
  const [isbEnabled, setIsbEnabled] = useState(false);
  const [isbGroup, setIsbGroup] = useState<ISBGroup>('A');
  const [isbCustomRate, setIsbCustomRate] = useState(0);

  const metadata = getInvoiceTypeMetadata(invoiceType);
  const needsReference = requiresOriginalReference(invoiceType);

  // Filter medications based on search and category
  const filteredMedicaments = useMemo(() => {
    return medicaments.filter(med => {
      const matchesSearch = med.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           med.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || med.categorie === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [medicaments, searchTerm, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(medicaments.map(med => med.categorie))];
    return cats.filter(Boolean);
  }, [medicaments]);

  const getCartItemBaseTotal = (item: CartItem): number =>
    item.medicament.prix * item.quantite;

  const getCartItemDiscount = (item: CartItem) =>
    resolveDiscount({
      baseAmount: getCartItemBaseTotal(item),
      type: item.remiseType,
      value: item.remise,
    });

  const formatPercentage = (value: number): string => {
    if (!Number.isFinite(value)) return '0';
    return value.toFixed(2).replace(/\.?0+$/, '');
  };

  // Calculate cart totals
  const cartTotals = useMemo(() => computeCartTotals(cart, globalDiscount, globalDiscountType, fiscalConfiguration?.modePrix || 'TTC', fiscalConfiguration?.catalogueFiscal?.taxes || {}, parseStampNumber(timbreSeuil, DEFAULT_STAMP_THRESHOLD), parseStampNumber(timbreMontant, DEFAULT_STAMP_AMOUNT)), [cart, globalDiscount, globalDiscountType, fiscalConfiguration, timbreSeuil, timbreMontant]);

  const isbRate = useMemo(() => {
    if (!enableIsb || !isbEnabled) return 0;
    if (isbGroup === 'A') return 2;
    if (isbGroup === 'B') return 5;
    return isbCustomRate > 0 ? isbCustomRate : 0;
  }, [enableIsb, isbEnabled, isbGroup, isbCustomRate]);

  const isbAmount = useMemo(() => {
    if (!enableIsb || !isbEnabled || isbRate <= 0) return 0;
    const base = Math.max(0, cartTotals.total - cartTotals.stampAmount);
    return (base * isbRate) / 100;
  }, [enableIsb, isbEnabled, isbRate, cartTotals.total, cartTotals.stampAmount]);

  const addToCart = (medicament: Medicament) => {
    const existingItem = cart.find(item => item.medicament.id === medicament.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.medicament.id === medicament.id
          ? { ...item, quantite: item.quantite + 1 }
          : item
      ));
    } else {
      setCart([...cart, { medicament, quantite: 1, remise: 0, remiseType: 'PERCENT' }]);
    }
  };

  const updateCartItemQuantity = (medicamentId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(medicamentId);
      return;
    }
    
    setCart(cart.map(item =>
      item.medicament.id === medicamentId
        ? (() => {
            const updatedItem = { ...item, quantite: newQuantity };
            const normalizedDiscount = resolveDiscount({
              baseAmount: updatedItem.medicament.prix * updatedItem.quantite,
              type: updatedItem.remiseType,
              value: updatedItem.remise,
            });
            return { ...updatedItem, remise: normalizedDiscount.discountValue };
          })()
        : item
    ));
  };

  const updateCartItemDiscount = (medicamentId: string, discount: number) => {
    setCart(cart.map(item =>
      item.medicament.id === medicamentId
        ? (() => {
            const normalizedDiscount = resolveDiscount({
              baseAmount: item.medicament.prix * item.quantite,
              type: item.remiseType,
              value: discount,
            });
            return { ...item, remise: normalizedDiscount.discountValue };
          })()
        : item
    ));
  };

  const updateCartItemDiscountType = (medicamentId: string, discountTypeValue: string) => {
    const nextType = normalizeDiscountType(discountTypeValue);
    setCart(cart.map((item) => {
      if (item.medicament.id !== medicamentId) {
        return item;
      }

      const currentDiscount = resolveDiscount({
        baseAmount: item.medicament.prix * item.quantite,
        type: item.remiseType,
        value: item.remise,
      });
      const nextDiscount = resolveDiscount({
        baseAmount: item.medicament.prix * item.quantite,
        type: nextType,
        amount: currentDiscount.discountAmount,
      });

      return {
        ...item,
        remiseType: nextType,
        remise: nextDiscount.discountValue,
      };
    }));
  };

  const removeFromCart = (medicamentId: string) => {
    setCart(cart.filter(item => item.medicament.id !== medicamentId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedClient(undefined);
    setGlobalDiscount(0);
    setGlobalDiscountType('PERCENT');
    setReferenceFacture('');
    setCertificationStatus('idle');
    setCertificationMessage('');
    setCertificationCode('');
    setIsbEnabled(false);
    setIsbGroup('A');
    setIsbCustomRate(0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    // Validation pour les factures d'avoir
    const normalizedReference = normalizeInvoiceReference(referenceFacture);
    if (needsReference && !normalizedReference) {
      alert('La référence de la facture originale est obligatoire pour ce type de facture');
      return;
    }

    try {
      if (pendingVente.current) throw new Error(`La vente ${pendingVente.current.numeroFacture} est déjà enregistrée. Reprenez sa certification dans Demandes en attente avant de commencer une autre vente.`);
      setCertificationStatus('processing');
      setCertificationMessage('Certification de la facture en cours...');

      if(!saleRequestKey.current)saleRequestKey.current=crypto.randomUUID();
      // Préparer les items pour l'API
      const saleItems = cart.map(item => ({
        ...(() => {
          const discount = getCartItemDiscount(item);
          return {
            remise: discount.discountPercent,
            remiseType: discount.discountType,
            remiseValeur: discount.discountValue,
            remiseMontant: discount.discountAmount,
            sousTotal: discount.netAmount,
          };
        })(),
        medicamentId: item.medicament.id,
        quantite: item.quantite,
        prixUnitaire: item.medicament.prix,
        groupeTaxation: (item.medicament as any).groupeTaxation || 'B'
      }));

      // Créer la vente en base de données via l'API
      if(!saleRequestKey.current)saleRequestKey.current=crypto.randomUUID();
      const venteResponse = await fetch('/api/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient?.id,
          items: saleItems,
          sousTotal: cartTotals.sousTotal,
          tva: cartTotals.tva,
          remise: cartTotals.globalDiscountPercent,
          remiseType: globalDiscountType,
          remiseValeur: globalDiscount,
          remiseMontant: cartTotals.globalDiscountAmount,
          total: cartTotals.total,
          methodePaiement: paymentMethod,
          vendeur: 'admin',
          statut: 'terminee',
          typeFacture: invoiceType,
          factureReference: needsReference ? normalizedReference : undefined,
          requestKey:saleRequestKey.current,
          skipCertification: true
        })
      });

      if (!venteResponse.ok) {
        throw new Error('Erreur lors de la création de la vente');
      }

      const vente = await venteResponse.json();
      pendingVente.current = vente;

      // Certifier la facture avec e-SECeF
      setCertificationMessage('Certification e-SECeF en cours...');
      const certifyData: any = {
        venteId: vente.id,
        typeFacture: invoiceType,
      };

      // Ajouter la référence si nécessaire
      if (needsReference && normalizedReference) {
        certifyData.reference = normalizedReference;
      }
      if (enableIsb && isbEnabled) {
        certifyData.isb = isbGroup;
      }

      const certifyResponse = await fetch('/api/esecef/certify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(certifyData)
      });

      if (!certifyResponse.ok) {
        let errorMessage = 'Erreur lors de la certification de la facture';
        try {
          const error = await certifyResponse.json();
          if (typeof error?.error === 'object' && error.error !== null) {
            errorMessage = error.error.description || JSON.stringify(error.error);
          } else if (error?.error) {
            errorMessage = String(error.error);
          } else if (error?.message) {
            errorMessage = String(error.message);
          }
        } catch {
          // ignore parse errors and keep default message
        }
        throw new Error(errorMessage);
      }

      const { securityElements, totauxParGroupe } = await certifyResponse.json();

        pendingVente.current = null; saleRequestKey.current="";
        setCertificationStatus('success');
        setCertificationMessage(`Facture certifiée avec succès!`);
        setCertificationCode(securityElements.codeSECeFDGI);

      const newSale = {
        ...vente,
        client: selectedClient,
        remiseType: globalDiscountType,
        remiseValeur: globalDiscount,
        remiseMontant: cartTotals.globalDiscountAmount,
        items: cart.map(item => ({
          ...(() => {
            const discount = getCartItemDiscount(item);
            return {
              remise: discount.discountPercent,
              remiseType: discount.discountType,
              remiseValeur: discount.discountValue,
              remiseMontant: discount.discountAmount,
              sousTotal: discount.netAmount,
            };
          })(),
          id: Math.random().toString(36).substring(2, 9),
          medicamentId: item.medicament.id,
          medicament: item.medicament,
          quantite: item.quantite,
          prixUnitaire: item.medicament.prix,
        })),
        statut: 'terminee' as const,
        securityElements,
        totauxParGroupe
      };
      await refreshData();

      // Imprimer la facture
      setTimeout(() => {
        handlePrintFacture(newSale);
        clearCart();
        setIsCheckoutOpen(false);
      }, 2000);

    } catch (error) {
      console.error('Erreur lors de la création de la facture:', error);
      setCertificationStatus('error');
      setCertificationMessage(error instanceof Error ? error.message : 'Erreur lors de la certification');
    }
  };

  const handlePrintFacture = async (vente: any) => {
    try {
      const configResponse = await fetch('/api/esecef/config');
      if (!configResponse.ok) {
        alert('Configuration e-SECeF manquante.');
        return;
      }
      
      const config = await configResponse.json();
      const { printStoredCertifiedInvoice } = await import('@/utils/printCertifiedInvoice');
      const printReference = normalizeInvoiceReference(referenceFacture);
      const threshold = parseStampNumber(timbreSeuil, DEFAULT_STAMP_THRESHOLD);
      const baseTotalBeforeGlobal = vente.items.reduce(
        (sum: number, item: any) =>
          sum + (typeof item.sousTotal === 'number' ? item.sousTotal : 0),
        0
      );
      const globalDiscountResolved = resolveDiscount({
        baseAmount: baseTotalBeforeGlobal,
        type: (vente as any).remiseType,
        percent: typeof vente.remise === 'number' ? vente.remise : undefined,
        value:
          typeof (vente as any).remiseValeur === 'number'
            ? (vente as any).remiseValeur
            : undefined,
        amount:
          typeof (vente as any).remiseMontant === 'number'
            ? (vente as any).remiseMontant
            : undefined,
      });
      const globalDiscountShares = prorateAmount(
        vente.items.map((item: any) =>
          typeof item.sousTotal === 'number' ? item.sousTotal : 0
        ),
        globalDiscountResolved.discountAmount
      );
      const baseTotal = Math.max(
        0,
        baseTotalBeforeGlobal - globalDiscountResolved.discountAmount
      );
      const stampAmount = computeStampDuty(
        baseTotal,
        threshold,
        parseStampNumber(timbreMontant, DEFAULT_STAMP_AMOUNT)
      );
      const expectedTotal = baseTotal + stampAmount;
      const totalTTC = Math.abs(vente.total - expectedTotal) < 0.01 ? vente.total : expectedTotal;
      
      const now = new Date();
      const isFactureAvoir = invoiceType === 'FA' || invoiceType === 'EA';
      const multiplier = isFactureAvoir ? -1 : 1;
      const rawTotauxParGroupe = vente.totauxParGroupe || {
        'B': {
          totalHT: vente.sousTotal / 1.19,
          totalTVA: vente.tva,
          tauxTVA: 19
        }
      };
      const totauxAreNegative = Object.values(rawTotauxParGroupe).some((t: any) => t.totalHT < 0 || t.totalTVA < 0);
      const totauxParGroupe = isFactureAvoir && !totauxAreNegative
        ? Object.fromEntries(
            Object.entries(rawTotauxParGroupe).map(([groupe, totaux]: any) => [
              groupe,
              {
                ...totaux,
                totalHT: typeof totaux.totalHT === 'number' ? totaux.totalHT * multiplier : totaux.totalHT,
                totalTVA: typeof totaux.totalTVA === 'number' ? totaux.totalTVA * multiplier : totaux.totalTVA,
              },
            ])
          )
        : rawTotauxParGroupe;

      const factureData = {
        pharmacieName: config.nomEtablissement || config.raisonSociale,
        raisonSociale: config.raisonSociale,
        boitePostale: config.boitePostale,
        nif: config.nif,
        rccm: config.rccm,
        adresse: config.adresse,
        telephone: config.telephone,
        email: config.email,
        
        typeFacture: invoiceType,
        numeroFacture: vente.numeroFacture,
        isCopie: false,
        isAnnulee: false,
        
        dateEtablissement: now.toLocaleDateString('fr-FR'),
        heureEtablissement: now.toLocaleTimeString('fr-FR'),
        
        operateur: vente.vendeur || 'Vendeur',
        isf: config.isf,
        
        client: vente.client ? {
          nif: vente.client.nif || undefined,
          nom: `${vente.client.nom} ${vente.client.prenom}`,
          adresse: vente.client.adresse,
          contact: vente.client.telephone || vente.client.email
        } : undefined,
        
        items: [
          ...vente.items.map((item: any, index: number) => {
            const quantite =
              typeof item.quantite === 'number' ? item.quantite : 0;
            const prixUnitaire =
              typeof item.prixUnitaire === 'number' ? item.prixUnitaire : 0;
            const itemBaseAmount = prixUnitaire * quantite;
            const itemDiscount = resolveDiscount({
              baseAmount: itemBaseAmount,
              type: (item as any).remiseType,
              percent: typeof item.remise === 'number' ? item.remise : undefined,
              value:
                typeof (item as any).remiseValeur === 'number'
                  ? (item as any).remiseValeur
                  : undefined,
              amount:
                typeof (item as any).remiseMontant === 'number'
                  ? (item as any).remiseMontant
                  : undefined,
            });
            const lineAmountBeforeGlobal =
              typeof item.sousTotal === 'number' ? item.sousTotal : itemDiscount.netAmount;
            const globalShare = globalDiscountShares[index] || 0;
            const lineAmount = Math.max(0, lineAmountBeforeGlobal - globalShare);
            const hasDiscount = itemDiscount.discountAmount > 0 || globalShare > 0;
            const totalDiscountAmount = itemDiscount.discountAmount + globalShare;
            const totalDiscountPercent =
              itemBaseAmount > 0 ? (totalDiscountAmount / itemBaseAmount) * 100 : 0;
            const lineUnitPrice = quantite > 0 ? lineAmount / quantite : prixUnitaire;

            return {
              nom: item.medicament?.nom || 'Article',
              code: item.medicament?.id,
              quantite: quantite * multiplier,
              prixUnitaire: lineUnitPrice,
              montant: lineAmount * multiplier,
              groupeTaxation:
                (item as any).groupeTaxation ||
                (item.medicament as any)?.groupeTaxation ||
                'B',
              prixOriginal: hasDiscount ? prixUnitaire : undefined,
              descriptionModification: hasDiscount
                ? itemDiscount.discountType === 'AMOUNT' && globalShare <= 0
                  ? `Remise ${itemDiscount.discountAmount.toFixed(0)} FCFA`
                  : `Remise ${formatPercentage(totalDiscountPercent)}%`
                : undefined,
            };
          }),
          ...(stampAmount > 0 ? [{
            nom: 'Frais de timbre',
            code: 'TIMBRE',
            quantite: 1 * multiplier,
            prixUnitaire: stampAmount,
            montant: stampAmount * multiplier,
            groupeTaxation: 'A',
          }] : [])
        ],
        
        totauxParGroupe,
        
        totalTVA: vente.tva * multiplier,
        isbTotal: enableIsb && isbEnabled && isbAmount > 0 ? isbAmount * multiplier : undefined,
        isbTaux: enableIsb && isbEnabled ? isbGroup : undefined,
        totalTTC: totalTTC * multiplier,
        
        paiements: [{
          type: vente.methodePaiement === 'especes' ? 'ESPECES' :
                vente.methodePaiement === 'carte' ? 'CARTEBANCAIRE' :
                vente.methodePaiement === 'cheque' ? 'CHEQUES' :
                'VIREMENT',
          montant: totalTTC * multiplier
        }],
        
        securityElements: vente.securityElements,
        
        // Ajouter la référence pour les factures d'avoir
        referenceFacture: needsReference ? printReference : undefined
      };
      
      await printStoredCertifiedInvoice(vente.id);
      
    } catch (error) {
      console.error('Erreur lors de l\'impression:', error);
      alert('Erreur lors de l\'impression de la facture.');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{titleOverride || metadata.label}</h1>
            <p className="text-sm text-gray-600 mt-1">{descriptionOverride || metadata.description}</p>
            {metadata.isExport && (
              <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                EXPORTATION
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button
              onClick={() => setIsCheckoutOpen(true)}
              className="flex items-center space-x-2 flex-1 sm:flex-initial"
              disabled={cart.length === 0}
            >
              <ShoppingCart size={18} className="sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">Panier ({cart.length})</span>
              {cart.length > 0 && (
                <span className="bg-emerald-600 text-white text-xs px-2 py-1 rounded-full hidden sm:inline">
                  {cartTotals.total.toFixed(0)} FCFA
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Reference input for avoir invoices */}
        {needsReference && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <AlertCircle size={16} className="inline mr-2" />
              Référence de la facture originale (obligatoire)
            </label>
            <Input
              type="text"
              placeholder="Ex: AB01000001-1-123"
              value={referenceFacture}
              onChange={(e) => setReferenceFacture(e.target.value)}
              className="max-w-md"
            />
            <p className="text-xs text-gray-600 mt-1">
              Format RN (NIM-compteur), ex: ET01000293-1-21.
            </p>
          </div>
        )}

      </div>
      <SaleWorkbench products={medicaments} cart={cart.map(line => ({ product: line.medicament, quantity: line.quantite, amount: getCartItemDiscount(line).netAmount }))} total={cartTotals.total} onAdd={id => { const med = medicaments.find(m => m.id === id); if (med) addToCart(med); }} onQuantity={updateCartItemQuantity} onRemove={removeFromCart} onCheckout={() => setIsCheckoutOpen(true)} busy={certificationStatus === 'processing' || fiscalLoading || !fiscalConfiguration?.catalogueFiscal} allowUnavailable={needsReference} />

      {/* Checkout Modal */}
      <Modal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        title={`Finaliser ${titleOverride || metadata.label}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Certification Status */}
          <CertificationStatus
            status={certificationStatus}
            message={certificationMessage}
            codeSECeF={certificationCode}
          />

          {/* Client Selection */}
          <Select
            label="Client"
            value={selectedClient?.id || ''}
            onChange={(e) => {
              const client = clients.find(c => c.id === e.target.value);
              setSelectedClient(client);
            }}
          >
            <option value="">Client anonyme</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.nom} {client.prenom}
              </option>
            ))}
          </Select>

          {/* Cart Items */}
          <div className="space-y-4">
            <h3 className="font-semibold">Articles</h3>
            {cart.map((item) => (
              <div key={item.medicament.id} className="ph-checkout-line">
                <div className="ph-checkout-icon w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Package className="text-emerald-600" size={20} />
                </div>
                
                <div className="ph-checkout-title">
                  <h4 className="font-medium">{item.medicament.nom}</h4>
                  <p className="text-sm text-gray-600">{item.medicament.prix} FCFA/unité</p>
                </div>
                
                <div className="ph-checkout-quantity flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`Diminuer ${item.medicament.nom}`}
                    onClick={() => updateCartItemQuantity(item.medicament.id, item.quantite - 1)}
                  >
                    <Minus size={16} />
                  </Button>
                  <span className="w-8 text-center">{item.quantite}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`Augmenter ${item.medicament.nom}`}
                    onClick={() => updateCartItemQuantity(item.medicament.id, item.quantite + 1)}
                  >
                    <Plus size={16} />
                  </Button>
                </div>
                
                <div className="ph-checkout-discount flex items-center gap-2">
                  <Input
                    type="number"
                    aria-label={`Remise sur ${item.medicament.nom}`}
                    placeholder={item.remiseType === 'PERCENT' ? 'Remise %' : 'Remise FCFA'}
                    value={item.remise}
                    onChange={(e) => updateCartItemDiscount(item.medicament.id, parseFloat(e.target.value) || 0)}
                    min="0"
                    max={item.remiseType === 'PERCENT' ? '100' : String(getCartItemBaseTotal(item))}
                    step="0.01"
                  />
                  <select
                    aria-label={`Type de remise sur ${item.medicament.nom}`}
                    value={item.remiseType}
                    onChange={(e) => updateCartItemDiscountType(item.medicament.id, e.target.value)}
                    className="h-10 rounded-lg border border-emerald-200 bg-white px-2 text-sm text-gray-900"
                  >
                    <option value="PERCENT">%</option>
                    <option value="AMOUNT">FCFA</option>
                  </select>
                </div>

                <div className="ph-checkout-saving text-sm text-slate-600">
                  -{getCartItemDiscount(item).discountAmount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeFromCart(item.medicament.id)}
                  className="ph-checkout-remove text-red-600 hover:text-red-700"
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
          </div>

          {/* Global Discount and Payment Method */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="number"
              label={globalDiscountType === 'PERCENT' ? 'Remise globale (%)' : 'Remise globale (FCFA)'}
              value={globalDiscount}
              onChange={(e) => {
                const nextValue = parseFloat(e.target.value) || 0;
                const normalizedDiscount = resolveDiscount({
                  baseAmount: cartTotals.sousTotal,
                  type: globalDiscountType,
                  value: nextValue,
                });
                setGlobalDiscount(normalizedDiscount.discountValue);
              }}
              min="0"
              max={globalDiscountType === 'PERCENT' ? '100' : String(cartTotals.sousTotal)}
              step="0.01"
            />
            <Select
              label="Type de remise"
              value={globalDiscountType}
              onChange={(e) => {
                const nextType = normalizeDiscountType(e.target.value);
                const currentDiscount = resolveDiscount({
                  baseAmount: cartTotals.sousTotal,
                  type: globalDiscountType,
                  value: globalDiscount,
                });
                const nextDiscount = resolveDiscount({
                  baseAmount: cartTotals.sousTotal,
                  type: nextType,
                  amount: currentDiscount.discountAmount,
                });
                setGlobalDiscountType(nextType);
                setGlobalDiscount(nextDiscount.discountValue);
              }}
            >
              <option value="PERCENT">Pourcentage (%)</option>
              <option value="AMOUNT">Montant (FCFA)</option>
            </Select>
            <Select
              label="Méthode de paiement"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
            >
              <option value="especes">Espèces</option>
              <option value="carte">Carte</option>
              <option value="cheque">Chèque</option>
              <option value="virement">Virement</option>
            </Select>
          </div>

          {cartTotals.globalDiscountAmount > 0 && (
            <p className="text-xs text-slate-600">
              Remise globale appliquée: {cartTotals.globalDiscountAmount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA
              {` (${formatPercentage(cartTotals.globalDiscountPercent)}%)`}
            </p>
          )}

          {Math.abs(cartTotals.roundingAdjustment) > 0.000001 && (
            <p className="text-sm text-slate-600">Ajustement après arrondi des prix unitaires : {cartTotals.roundingAdjustment > 0 ? '+' : ''}{cartTotals.roundingAdjustment.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA {fiscalConfiguration?.modePrix === 'HT' ? 'HT' : 'TTC'}.</p>
          )}
          {enableIsb && (
            <div className="rounded-lg border border-slate-200/80 bg-white/90 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">Précompte ISB</p>
                  <p className="text-xs text-slate-500">Applicable aux factures de prestation</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={isbEnabled}
                    onChange={(e) => setIsbEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                  />
                  Activer ISB
                </label>
              </div>
              {isbEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Groupe ISB"
                    value={isbGroup}
                    onChange={(e) => setIsbGroup(e.target.value as ISBGroup)}
                  >
                    <option value="A">A (2%)</option>
                    <option value="B">B (5%)</option>
                    <option value="C">C (taux config)</option>
                    <option value="D">D (taux config)</option>
                  </Select>
                  {(isbGroup === 'C' || isbGroup === 'D') ? (
                    <Input
                      type="number"
                      label="Taux ISB (%)"
                      value={isbCustomRate}
                      onChange={(e) => setIsbCustomRate(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <div className="text-xs text-slate-500 flex items-center">
                      Taux appliqué automatiquement par e-SECeF.
                    </div>
                  )}
                </div>
              )}
              {isbEnabled && (
                <p className="text-xs text-slate-500">
                  ISB calculé sur le total TTC hors timbre.
                </p>
              )}
            </div>
          )}

          {/* Totals */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Sous-total:</span>
              <span>{cartTotals.sousTotal.toFixed(0)} FCFA</span>
            </div>
            {cartTotals.globalDiscountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>
                  Remise (
                  {globalDiscountType === 'PERCENT'
                    ? `${formatPercentage(cartTotals.globalDiscountPercent)}%`
                    : `${cartTotals.globalDiscountAmount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA`}
                  ):
                </span>
                <span>-{cartTotals.globalDiscountAmount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>TVA totale :</span>
              <span>{cartTotals.tva.toFixed(0)} FCFA</span>
            </div>
            {cartTotals.stampAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Frais de timbre:</span>
                <span>{cartTotals.stampAmount.toFixed(0)} FCFA</span>
              </div>
            )}
            {enableIsb && isbEnabled && (
              <div className="flex justify-between text-slate-600">
                <span>
                  Précompte ISB {isbRate > 0 ? `(${isbGroup} ${isbRate}%)` : `(${isbGroup})`}
                </span>
                <span>{isbRate > 0 ? `${isbAmount.toFixed(0)} FCFA` : 'Selon configuration'}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>{cartTotals.total.toFixed(0)} FCFA</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              onClick={clearCart} 
              className="flex-1"
              disabled={certificationStatus === 'processing'}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleCheckout} 
              className="flex-1"
              disabled={certificationStatus === 'processing' || (needsReference && !referenceFacture)}
            >
              <FileText size={18} className="mr-2" />
              Certifier & Imprimer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
