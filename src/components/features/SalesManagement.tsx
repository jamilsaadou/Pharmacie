import {expandSaleUnits} from '@/lib/catalogue/units';

import { fetchWithRefresh as fetch } from '@/lib/data-refresh';
import { useFiscalConfiguration } from '@/hooks/useFiscalConfiguration';
import { computeCartTotals } from '@/lib/catalogue/totals';
import { SaleWorkbench } from './SaleWorkbench';
import { useRef, useEffect, useState, useMemo } from 'react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CertificationStatus, CertificationStatusType } from '@/components/ui/CertificationStatus';
import { usePharmacieData } from '@/hooks/usePharmacieData';
import { useParametres } from '@/hooks/useParametres';
import type { Vente, Medicament, Client } from '@/types';
import { Search, ShoppingCart, Plus, Minus, Package, X, FileText, Printer } from 'lucide-react';
import { computeStampDuty, DEFAULT_STAMP_AMOUNT, DEFAULT_STAMP_THRESHOLD, parseStampNumber } from '@/utils/stampDuty';
import { DiscountType, normalizeDiscountType, prorateAmount, resolveDiscount } from '@/lib/discount';

interface CartItem {
  medicament: Medicament;
  quantite: number;
  remise: number;
  remiseType: DiscountType;
}

export const SalesManagement = () => {
  const { ventes, refreshData, medicaments:baseMedicaments, clients } = usePharmacieData();
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
  const [selectedDiscountItemIds, setSelectedDiscountItemIds] = useState<string[]>([]);
  const [bulkDiscountValue, setBulkDiscountValue] = useState(0);
  const [bulkDiscountType, setBulkDiscountType] = useState<DiscountType>('PERCENT');
  const medicaments=useMemo(()=>expandSaleUnits(baseMedicaments),[baseMedicaments]);
  const saleRequestKey=useRef('');
  const pendingVente = useRef<any>(null);
  const [certificationStatus, setCertificationStatus] = useState<CertificationStatusType>('idle');
  const [certificationMessage, setCertificationMessage] = useState('');
  const [certificationCode, setCertificationCode] = useState('');

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

  useEffect(() => {
    setSelectedDiscountItemIds((prev) =>
      prev.filter((id) => cart.some((item) => item.medicament.id === id))
    );
  }, [cart]);

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

  // Calculate cart totals with tax group handling
  const cartTotals = useMemo(() => computeCartTotals(cart, globalDiscount, globalDiscountType, fiscalConfiguration?.modePrix || 'TTC', fiscalConfiguration?.catalogueFiscal?.taxes || {}, parseStampNumber(timbreSeuil, DEFAULT_STAMP_THRESHOLD), parseStampNumber(timbreMontant, DEFAULT_STAMP_AMOUNT)), [cart, globalDiscount, globalDiscountType, fiscalConfiguration, timbreSeuil, timbreMontant]);

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

  const toggleDiscountItemSelection = (medicamentId: string) => {
    setSelectedDiscountItemIds((prev) =>
      prev.includes(medicamentId)
        ? prev.filter((id) => id !== medicamentId)
        : [...prev, medicamentId]
    );
  };

  const selectAllDiscountItems = () => {
    setSelectedDiscountItemIds(cart.map((item) => item.medicament.id));
  };

  const clearDiscountSelection = () => {
    setSelectedDiscountItemIds([]);
  };

  const applyDiscountToSelectedItems = () => {
    if (selectedDiscountItemIds.length === 0) return;

    const selectedIds = new Set(selectedDiscountItemIds);
    setCart(
      cart.map((item) => {
        if (!selectedIds.has(item.medicament.id)) {
          return item;
        }

        const normalizedDiscount = resolveDiscount({
          baseAmount: item.medicament.prix * item.quantite,
          type: bulkDiscountType,
          value: bulkDiscountValue,
        });

        return {
          ...item,
          remiseType: bulkDiscountType,
          remise: normalizedDiscount.discountValue,
        };
      })
    );
  };

  const removeFromCart = (medicamentId: string) => {
    setCart(cart.filter(item => item.medicament.id !== medicamentId));
    setSelectedDiscountItemIds((prev) => prev.filter((id) => id !== medicamentId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedClient(undefined);
    setGlobalDiscount(0);
    setGlobalDiscountType('PERCENT');
    setSelectedDiscountItemIds([]);
    setBulkDiscountValue(0);
    setBulkDiscountType('PERCENT');
    setCertificationStatus('idle');
    setCertificationMessage('');
    setCertificationCode('');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    try {
      if (pendingVente.current) throw new Error(`La vente ${pendingVente.current.numeroFacture} est déjà enregistrée. Reprenez sa certification dans Demandes en attente avant de commencer une autre vente.`);
      setCertificationStatus('processing');
      setCertificationMessage('Enregistrement de la vente...');

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
          requestKey:saleRequestKey.current,
          skipCertification: true
        })
      });

      if (!venteResponse.ok) {
        throw new Error('Erreur lors de la création de la vente');
      }

      const vente = await venteResponse.json();
      pendingVente.current = vente;

      // Certification e-SECeF
      setCertificationMessage('Certification e-SECeF en cours...');
      const certifyResponse = await fetch('/api/esecef/certify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venteId: vente.id,
          typeFacture: 'FV',
        })
      });

      let securityElements, totauxParGroupe;

      if (certifyResponse.ok) {
        const certifyData = await certifyResponse.json();
        securityElements = certifyData.securityElements;
        totauxParGroupe = certifyData.totauxParGroupe;

        pendingVente.current = null; saleRequestKey.current="";
        setCertificationStatus('success');
        setCertificationMessage(`Facture certifiée avec succès!`);
        setCertificationCode(securityElements.codeSECeFDGI);
      } else {
        const error = await certifyResponse.json();
        setCertificationStatus('error');
        // Convertir le message d'erreur en chaîne si c'est un objet
        const errorMessage = typeof error.error === 'object' 
          ? error.error.description || JSON.stringify(error.error)
          : error.error || 'Erreur lors de la certification.\nLa vente a été enregistrée mais n\'est pas certifiée.\nVérifiez la configuration e-SECeF.';
        setCertificationMessage(errorMessage);
        throw new Error(errorMessage);
      }

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

      // Imprimer automatiquement si certification réussie
      if (securityElements) {
        setTimeout(() => {
          handlePrintFacture(newSale);
          clearCart();
          setIsCheckoutOpen(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Erreur lors de la création de la vente:', error);
      setCertificationStatus('error');
      setCertificationMessage(error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement');
    }
  };

  // Imprimer la facture certifiée e-SECeF
  const handlePrintFacture = async (vente: Vente) => {
    try {
      const configResponse = await fetch('/api/esecef/config');
      if (!configResponse.ok) {
        alert('Configuration e-SECeF manquante.');
        return;
      }
      
      const config = await configResponse.json();
      
      let securityElements, totauxParGroupe;
      const threshold = parseStampNumber(timbreSeuil, DEFAULT_STAMP_THRESHOLD);
      const baseTotalBeforeGlobal = vente.items.reduce(
        (sum, item: any) => sum + (typeof item.sousTotal === 'number' ? item.sousTotal : 0),
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

      // Si la facture a déjà les données de certification (depuis le state)
      if ((vente as any).securityElements) {
        securityElements = (vente as any).securityElements;
        totauxParGroupe = (vente as any).totauxParGroupe;
      } else {
        // Sinon, certifier maintenant
        const certifyResponse = await fetch('/api/esecef/certify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            venteId: vente.id,
            typeFacture: 'FV',
          })
        });
        
        if (!certifyResponse.ok) {
          throw new Error('Erreur lors de la certification de la facture');
        }
        
        const responseData = await certifyResponse.json();
        securityElements = responseData.securityElements;
        totauxParGroupe = responseData.totauxParGroupe;
      }
      
      // Importer la fonction d'impression certifiée
      const { printStoredCertifiedInvoice } = await import('@/utils/printCertifiedInvoice');
      
      // Préparer les données de la facture certifiée
      const now = new Date();
      const factureData = {
        // Informations pharmacie
        pharmacieName: config.nomEtablissement || config.raisonSociale,
        raisonSociale: config.raisonSociale,
        boitePostale: config.boitePostale,
        nif: config.nif,
        rccm: config.rccm,
        adresse: config.adresse,
        telephone: config.telephone,
        email: config.email,
        paperWidthMm: 50,
        
        // Type et numéro
        typeFacture: 'FV',
        numeroFacture: vente.numeroFacture,
        isCopie: false,
        isAnnulee: false,
        
        // Date et heure (utiliser la date de certification si dispo, sinon maintenant)
        dateEtablissement: securityElements.dateHeure ? new Date(securityElements.dateHeure).toLocaleDateString('fr-FR') : now.toLocaleDateString('fr-FR'),
        heureEtablissement: securityElements.dateHeure ? new Date(securityElements.dateHeure).toLocaleTimeString('fr-FR') : now.toLocaleTimeString('fr-FR'),
        
        // Opérateur
        operateur: vente.vendeur || 'Vendeur',
        
        // ISF
        isf: config.isf,
        
        // Client
        client: vente.client ? {
          nif: vente.client.nif || undefined,
          nom: `${vente.client.nom} ${vente.client.prenom}`,
          adresse: vente.client.adresse,
          contact: vente.client.telephone || vente.client.email
        } : undefined,
        
        // Articles
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
              quantite,
              prixUnitaire: lineUnitPrice,
              montant: lineAmount,
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
            quantite: 1,
            prixUnitaire: stampAmount,
            montant: stampAmount,
            groupeTaxation: 'A',
          }] : [])
        ],
        
        // Totaux par groupe (reçus de l'API ou calculés par défaut)
        totauxParGroupe: totauxParGroupe || {
          'B': {
            totalHT: vente.sousTotal / 1.19,
            totalTVA: vente.tva,
            tauxTVA: 19
          }
        },
        
        // Totaux globaux
        totalTVA: vente.tva,
        totalTTC: totalTTC,
        
        // Paiements
        paiements: [{
          type: vente.methodePaiement === 'especes' ? 'ESPECES' :
                vente.methodePaiement === 'carte' ? 'CARTEBANCAIRE' :
                vente.methodePaiement === 'cheque' ? 'CHEQUES' :
                'VIREMENT',
          montant: totalTTC
        }],
        
        // Éléments de sécurité e-SECeF
        securityElements: securityElements
      };
      
      await printStoredCertifiedInvoice(vente.id);
      
    } catch (error) {
      console.error('Erreur lors de l\'impression de la facture:', error);
      alert('Erreur lors de l\'impression de la facture.');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Point de Vente</h1>
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

      </div>
      <SaleWorkbench products={medicaments} cart={cart.map(line => ({ product: line.medicament, quantity: line.quantite, amount: getCartItemDiscount(line).netAmount }))} total={cartTotals.total} onAdd={id => { const med = medicaments.find(m => m.id === id); if (med) addToCart(med); }} onQuantity={updateCartItemQuantity} onRemove={removeFromCart} onCheckout={() => setIsCheckoutOpen(true)} busy={certificationStatus === 'processing' || fiscalLoading || !fiscalConfiguration?.catalogueFiscal} />

      {/* Checkout Modal */}
      <Modal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        title="Finaliser la vente"
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
            <h3 className="font-semibold">Articles dans le panier</h3>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">
                  Appliquer une remise a un ou plusieurs produits
                </p>
                <span className="text-xs text-slate-600">
                  {selectedDiscountItemIds.length} selectionne{selectedDiscountItemIds.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                  type="number"
                  label={bulkDiscountType === 'PERCENT' ? 'Valeur remise (%)' : 'Valeur remise (FCFA)'}
                  value={bulkDiscountValue}
                  onChange={(e) => setBulkDiscountValue(parseFloat(e.target.value) || 0)}
                  min="0"
                  step={bulkDiscountType === 'PERCENT' ? '0.01' : '1'}
                />
                <Select
                  label="Type"
                  value={bulkDiscountType}
                  onChange={(e) => setBulkDiscountType(normalizeDiscountType(e.target.value))}
                >
                  <option value="PERCENT">Pourcentage (%)</option>
                  <option value="AMOUNT">Montant (FCFA)</option>
                </Select>
                <div className="flex items-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllDiscountItems}
                    className="flex-1"
                    disabled={cart.length === 0}
                  >
                    Tout
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearDiscountSelection}
                    className="flex-1"
                    disabled={selectedDiscountItemIds.length === 0}
                  >
                    Aucun
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={applyDiscountToSelectedItems}
                    className="w-full"
                    disabled={selectedDiscountItemIds.length === 0}
                  >
                    Appliquer aux produits selectionnes
                  </Button>
                </div>
              </div>
            </div>

            {cart.map((item) => (
              <div key={item.medicament.id} className="ph-checkout-line with-selection">
                <label className="ph-checkout-selection flex items-center" aria-label={`Sélectionner ${item.medicament.nom} pour une remise`}>
                  <input
                    type="checkbox"
                    checked={selectedDiscountItemIds.includes(item.medicament.id)}
                    onChange={() => toggleDiscountItemSelection(item.medicament.id)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                  />
                </label>
                <div className="ph-checkout-icon w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Package className="text-emerald-600" size={20} />
                </div>
                
                <div className="ph-checkout-title">
                  <h4 className="font-medium">{item.medicament.nom}</h4>
                  <p className="text-sm text-gray-600">
                    {item.medicament.prix} FCFA/unite
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                      (item.medicament as any).groupeTaxation === 'A'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {(item.medicament as any).groupeTaxation === 'A' ? 'Exo' : 'TVA 19%'}
                    </span>
                  </p>
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
          {/* Totals */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            {cartTotals.totalGroupeA > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>Groupe A (Exonere 0%):</span>
                <span>{cartTotals.totalGroupeA.toFixed(0)} FCFA</span>
              </div>
            )}
            {cartTotals.totalGroupeB > 0 && (
              <>
                <div className="flex justify-between">
                  <span>Groupe B (HT):</span>
                  <span>{cartTotals.totalGroupeB_HT.toFixed(0)} FCFA</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>TVA 19% (sur Groupe B):</span>
                  <span>{cartTotals.tva.toFixed(0)} FCFA</span>
                </div>
              </>
            )}
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
            {cartTotals.stampAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Frais de timbre:</span>
                <span>{cartTotals.stampAmount.toFixed(0)} FCFA</span>
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
              disabled={certificationStatus === 'processing'}
            >
              <FileText size={18} className="mr-2" />
              {certificationStatus === 'processing' ? 'Traitement...' : 'Certifier & Imprimer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Recent Sales */}
      <div className="bg-white border-t border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Ventes récentes</h2>
        <div className="grid gap-4 max-h-40 overflow-y-auto">
          {ventes.slice(0, 3).map((vente) => (
            <Card key={vente.id}>
              <div className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="font-medium">Facture #{vente.numeroFacture}</h3>
                    <p className="text-sm text-gray-600">
                      {vente.client?.nom || 'Client anonyme'} - {new Date(vente.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{vente.total} FCFA</p>
                    <p className="text-sm text-gray-600">{vente.methodePaiement}</p>
                  </div>
                  <div className="ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintFacture(vente)}
                      title="Imprimer la facture"
                    >
                      <Printer size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
