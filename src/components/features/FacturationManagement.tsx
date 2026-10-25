import { useState, useMemo } from 'react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CertificationStatus, CertificationStatusType } from '@/components/ui/CertificationStatus';
import { usePharmacieData } from '@/hooks/usePharmacieData';
import { useParametres } from '@/hooks/useParametres';
import type { Vente, Medicament, Client, ItemVente } from '@/types';
import { computeStampDuty, DEFAULT_STAMP_AMOUNT, DEFAULT_STAMP_THRESHOLD, parseStampNumber } from '@/utils/stampDuty';
import { buildReferenceFromCounters, normalizeInvoiceReference } from '@/utils/esecefReference';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Package,
  X,
  FileText,
  Printer,
  Receipt,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface CartItem {
  medicament: Medicament;
  quantite: number;
  remise: number;
}

interface OriginalInvoiceItem extends ItemVente {
  selected: boolean;
  quantiteRemboursement: number;
}

type TabType = 'FV' | 'FA';

const getRefundLineTotal = (item: OriginalInvoiceItem) => {
  if (!item.quantite) return 0;
  const unitNet = item.sousTotal / item.quantite;
  return unitNet * item.quantiteRemboursement;
};

export const FacturationManagement = () => {
  const { refreshData, medicaments, clients } = usePharmacieData();
  const { timbreSeuil, timbreMontant } = useParametres();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('FV');

  // FV States (Facture de Vente)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'especes' | 'carte' | 'cheque' | 'virement'>('especes');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [certificationStatus, setCertificationStatus] = useState<CertificationStatusType>('idle');
  const [certificationMessage, setCertificationMessage] = useState('');
  const [certificationCode, setCertificationCode] = useState('');

  // FA States (Facture d'Avoir)
  const [searchCodeSECeF, setSearchCodeSECeF] = useState('');
  const [originalInvoice, setOriginalInvoice] = useState<Vente | null>(null);
  const [originalItems, setOriginalItems] = useState<OriginalInvoiceItem[]>([]);
  const [retourStock, setRetourStock] = useState(false);
  const [searchingInvoice, setSearchingInvoice] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [faPaymentMethod, setFaPaymentMethod] = useState<'especes' | 'carte' | 'cheque' | 'virement'>('especes');
  const [faCertificationStatus, setFaCertificationStatus] = useState<CertificationStatusType>('idle');
  const [faCertificationMessage, setFaCertificationMessage] = useState('');
  const [faCertificationCode, setFaCertificationCode] = useState('');

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

  // Calculate cart totals with proper tax group handling
  const cartTotals = useMemo(() => {
    let totalA = 0; // Exonere
    let totalB_TTC = 0; // TVA 19%

    cart.forEach(item => {
      const itemTotal = item.medicament.prix * item.quantite;
      const itemDiscount = itemTotal * (item.remise / 100);
      const netAmount = itemTotal - itemDiscount;

      const groupe = (item.medicament as any).groupeTaxation || 'B';
      if (groupe === 'A') {
        totalA += netAmount;
      } else {
        totalB_TTC += netAmount;
      }
    });

    const globalDiscountAmount = (totalA + totalB_TTC) * (globalDiscount / 100);
    const afterDiscount = (totalA + totalB_TTC) - globalDiscountAmount;

    // Groupe A: HT = TTC, TVA = 0
    // Groupe B: TVA = 19%
    const totalB_HT = totalB_TTC / 1.19;
    const tva = totalB_TTC - totalB_HT;

    const sousTotal = totalA + totalB_HT;
    const baseTotal = afterDiscount;
    const threshold = parseStampNumber(timbreSeuil, DEFAULT_STAMP_THRESHOLD);
    const stampAmount = computeStampDuty(baseTotal, threshold, parseStampNumber(timbreMontant, DEFAULT_STAMP_AMOUNT));
    const total = baseTotal + stampAmount;

    return {
      sousTotal: totalA + totalB_TTC,
      globalDiscountAmount,
      tva,
      total,
      stampAmount,
      totalA,
      totalB_TTC,
      totalB_HT
    };
  }, [cart, globalDiscount, timbreSeuil, timbreMontant]);

  // Calculate FA totals
  const faTotals = useMemo(() => {
    const selectedItems = originalItems.filter(item => item.selected && item.quantiteRemboursement > 0);

    let totalA = 0;
    let totalB_TTC = 0;

    selectedItems.forEach(item => {
      const montant = getRefundLineTotal(item);
      const groupe = (item.groupeTaxation ?? (item.medicament as any)?.groupeTaxation) || 'B';
      if (groupe === 'A') {
        totalA += montant;
      } else {
        totalB_TTC += montant;
      }
    });

    const totalB_HT = totalB_TTC / 1.19;
    const tva = totalB_TTC - totalB_HT;
    const baseTotal = totalA + totalB_TTC;
    const threshold = parseStampNumber(timbreSeuil, DEFAULT_STAMP_THRESHOLD);
    const stampAmount = computeStampDuty(baseTotal, threshold, parseStampNumber(timbreMontant, DEFAULT_STAMP_AMOUNT));
    const total = baseTotal + stampAmount;

    return { totalA, totalB_TTC, totalB_HT, tva, total, stampAmount, baseTotal };
  }, [originalItems, timbreSeuil, timbreMontant]);

  // FV Functions
  const addToCart = (medicament: Medicament) => {
    const existingItem = cart.find(item => item.medicament.id === medicament.id);

    if (existingItem) {
      setCart(cart.map(item =>
        item.medicament.id === medicament.id
          ? { ...item, quantite: item.quantite + 1 }
          : item
      ));
    } else {
      setCart([...cart, { medicament, quantite: 1, remise: 0 }]);
    }
  };

  const updateCartItemQuantity = (medicamentId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(medicamentId);
      return;
    }

    setCart(cart.map(item =>
      item.medicament.id === medicamentId
        ? { ...item, quantite: newQuantity }
        : item
    ));
  };

  const updateCartItemDiscount = (medicamentId: string, discount: number) => {
    setCart(cart.map(item =>
      item.medicament.id === medicamentId
        ? { ...item, remise: Math.max(0, Math.min(100, discount)) }
        : item
    ));
  };

  const removeFromCart = (medicamentId: string) => {
    setCart(cart.filter(item => item.medicament.id !== medicamentId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedClient(undefined);
    setGlobalDiscount(0);
    setCertificationStatus('idle');
    setCertificationMessage('');
    setCertificationCode('');
  };

  // FA Functions
  const searchOriginalInvoice = async () => {
    if (!searchCodeSECeF.trim()) {
      setSearchError('Veuillez entrer un Code SECeF/DGI');
      return;
    }

    setSearchingInvoice(true);
    setSearchError('');
    setOriginalInvoice(null);
    setOriginalItems([]);

    try {
      const response = await fetch(`/api/ventes/search?codeSECeF=${encodeURIComponent(searchCodeSECeF.trim())}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Facture non trouvee');
      }

      const vente = await response.json();
      setOriginalInvoice(vente);

      // Prepare items for selection
      setOriginalItems(vente.items.map((item: ItemVente) => ({
        ...item,
        selected: true,
        quantiteRemboursement: item.quantite
      })));

    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Erreur lors de la recherche');
    } finally {
      setSearchingInvoice(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setOriginalItems(originalItems.map(item =>
      item.id === itemId
        ? { ...item, selected: !item.selected }
        : item
    ));
  };

  const updateItemRemboursement = (itemId: string, quantite: number) => {
    setOriginalItems(originalItems.map(item =>
      item.id === itemId
        ? { ...item, quantiteRemboursement: Math.max(0, Math.min(item.quantite, quantite)) }
        : item
    ));
  };

  const clearFA = () => {
    setSearchCodeSECeF('');
    setOriginalInvoice(null);
    setOriginalItems([]);
    setRetourStock(false);
    setSearchError('');
    setFaCertificationStatus('idle');
    setFaCertificationMessage('');
    setFaCertificationCode('');
  };

  // Checkout FV
  const handleCheckoutFV = async () => {
    if (cart.length === 0) return;

    try {
      setCertificationStatus('processing');
      setCertificationMessage('Enregistrement de la vente...');

      const saleItems = cart.map(item => ({
        medicamentId: item.medicament.id,
        quantite: item.quantite,
        remise: item.remise,
        prixUnitaire: item.medicament.prix,
        sousTotal: item.medicament.prix * item.quantite * (1 - item.remise / 100),
        groupeTaxation: (item.medicament as any).groupeTaxation || 'B'
      }));

      const venteResponse = await fetch('/api/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient?.id,
          items: saleItems,
          sousTotal: cartTotals.sousTotal,
          tva: cartTotals.tva,
          remise: globalDiscount,
          total: cartTotals.total,
          methodePaiement: paymentMethod,
          vendeur: 'admin',
          statut: 'terminee',
          typeFacture: 'FV',
          skipCertification: true
        })
      });

      if (!venteResponse.ok) {
        throw new Error('Erreur lors de la creation de la vente');
      }

      const vente = await venteResponse.json();

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

      let securityElements: any = null;
      let totauxParGroupe: any = null;

      if (certifyResponse.ok) {
        const certifyData = await certifyResponse.json();
        securityElements = certifyData.securityElements;
        totauxParGroupe = certifyData.totauxParGroupe;

        setCertificationStatus('success');
        setCertificationMessage('Facture certifiee avec succes!');
        setCertificationCode(securityElements?.codeSECeFDGI || '');
      } else {
        let errorMessage = 'Erreur lors de la certification.';
        try {
          const errorData = await certifyResponse.json();
          if (typeof errorData.error === 'object' && errorData.error !== null) {
            errorMessage = errorData.error.description || JSON.stringify(errorData.error);
          } else if (errorData.error) {
            errorMessage = String(errorData.error);
          } else if (errorData.message) {
            errorMessage = String(errorData.message);
          }
        } catch {
          // Response not JSON parseable
        }
        setCertificationStatus('error');
        setCertificationMessage(errorMessage);
      }

      // Rafraîchir les données (ventes + stocks) sans créer de doublon
      await refreshData();

      const newSale = {
        ...vente,
        client: selectedClient,
        items: cart.map(item => ({
          id: Math.random().toString(36).substring(2, 9),
          medicamentId: item.medicament.id,
          medicament: item.medicament,
          quantite: item.quantite,
          remise: item.remise,
          prixUnitaire: item.medicament.prix,
          sousTotal: item.medicament.prix * item.quantite * (1 - item.remise / 100)
        })),
        statut: 'terminee' as const,
        securityElements,
        totauxParGroupe
      };

      if (securityElements) {
        setTimeout(() => {
          handlePrintFacture(newSale, 'FV');
          clearCart();
          setIsCheckoutOpen(false);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Erreur lors de la creation de la vente:', error);
      setCertificationStatus('error');
      const msg = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Erreur lors de l\'enregistrement');
      setCertificationMessage(msg);
    }
  };

  // Checkout FA
  const handleCheckoutFA = async () => {
    const selectedItems = originalItems.filter(item => item.selected && item.quantiteRemboursement > 0);

    if (selectedItems.length === 0 || !originalInvoice) {
      setFaCertificationMessage('Veuillez selectionner au moins un article');
      return;
    }

    const factureESECeF = (originalInvoice as any).factureESECeF;
    const codeSECeFOriginal = factureESECeF?.codeSECeFDGI;
    if (!codeSECeFOriginal) {
      setFaCertificationStatus('error');
      setFaCertificationMessage('La facture originale n\'a pas de Code SECeF/DGI');
      return;
    }
    let referenceOriginale: string | undefined;
    try {
      const configResponse = await fetch('/api/esecef/config');
      if (configResponse.ok) {
        const config = await configResponse.json();
        referenceOriginale = buildReferenceFromCounters(config.nim, factureESECeF?.counters);
      }
    } catch {
      // Ignore config errors, will fallback below
    }
    referenceOriginale = normalizeInvoiceReference(referenceOriginale || codeSECeFOriginal);
    if (!referenceOriginale) {
      setFaCertificationStatus('error');
      setFaCertificationMessage('Référence de facture originale invalide');
      return;
    }

    try {
      setFaCertificationStatus('processing');
      setFaCertificationMessage('Creation de la facture d\'avoir...');

      const faItems = selectedItems.map(item => ({
        medicamentId: item.medicamentId,
        quantite: item.quantiteRemboursement,
        remise: item.remise,
        prixUnitaire: item.prixUnitaire,
        sousTotal: getRefundLineTotal(item),
        groupeTaxation: (item.groupeTaxation ?? (item.medicament as any)?.groupeTaxation) || 'B'
      }));

      const venteResponse = await fetch('/api/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: originalInvoice.client?.id || null,
          items: faItems,
          sousTotal: faTotals.baseTotal,
          tva: faTotals.tva,
          remise: 0,
          total: faTotals.total,
          methodePaiement: faPaymentMethod,
          vendeur: 'admin',
          statut: 'terminee',
          typeFacture: 'FA',
          factureReference: referenceOriginale,
          retourStock: retourStock,
          skipCertification: true
        })
      });

      if (!venteResponse.ok) {
        throw new Error('Erreur lors de la creation de la facture d\'avoir');
      }

      const vente = await venteResponse.json();

      // Certification e-SECeF avec type FA et reference
      setFaCertificationMessage('Certification e-SECeF de l\'avoir...');
      const certifyResponse = await fetch('/api/esecef/certify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venteId: vente.id,
          typeFacture: 'FA',
          reference: referenceOriginale
        })
      });

      let securityElements: any = null;
      let totauxParGroupe: any = null;

      if (certifyResponse.ok) {
        const certifyData = await certifyResponse.json();
        securityElements = certifyData.securityElements;
        totauxParGroupe = certifyData.totauxParGroupe;

        setFaCertificationStatus('success');
        setFaCertificationMessage('Facture d\'avoir certifiee avec succes!');
        setFaCertificationCode(securityElements?.codeSECeFDGI || '');

        // Rafraîchir les données après la FA
        await refreshData();

        // Print after success
        setTimeout(() => {
          const faVente = {
            ...vente,
            client: originalInvoice.client,
            items: selectedItems.map(item => ({
              ...item,
              quantite: item.quantiteRemboursement,
              sousTotal: getRefundLineTotal(item)
            })),
            securityElements,
            totauxParGroupe,
            factureReference: referenceOriginale
          };
          handlePrintFacture(faVente as Vente, 'FA');
        }, 2000);
      } else {
        let errorMessage = 'Erreur lors de la certification.';
        try {
          const errorData = await certifyResponse.json();
          if (typeof errorData.error === 'object' && errorData.error !== null) {
            errorMessage = errorData.error.description || JSON.stringify(errorData.error);
          } else if (errorData.error) {
            errorMessage = String(errorData.error);
          } else if (errorData.message) {
            errorMessage = String(errorData.message);
          }
        } catch {
          // Response not JSON parseable
        }
        setFaCertificationStatus('error');
        setFaCertificationMessage(errorMessage);
      }
    } catch (error: any) {
      console.error('Erreur lors de la creation de la FA:', error);
      setFaCertificationStatus('error');
      const msg = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Erreur lors de l\'enregistrement');
      setFaCertificationMessage(msg);
    }
  };

  // Print invoice
  const handlePrintFacture = async (vente: Vente, typeFacture: 'FV' | 'FA') => {
    try {
      const configResponse = await fetch('/api/esecef/config');
      if (!configResponse.ok) {
        alert('Configuration e-SECeF manquante.');
        return;
      }

      const config = await configResponse.json();
      const securityElements = (vente as any).securityElements;
      const totauxParGroupe = (vente as any).totauxParGroupe;

      if (!securityElements) {
        alert('Elements de securite manquants.');
        return;
      }

      const { printCertifiedInvoice } = await import('@/utils/printCertifiedInvoice');

      const now = new Date();
      const threshold = parseStampNumber(timbreSeuil, DEFAULT_STAMP_THRESHOLD);
      const baseTotal = vente.items.reduce((sum, item) => sum + item.sousTotal, 0);
      const stampAmount = computeStampDuty(baseTotal, threshold, parseStampNumber(timbreMontant, DEFAULT_STAMP_AMOUNT));
      const expectedTotal = baseTotal + stampAmount;
      const totalTTC = Math.abs(vente.total - expectedTotal) < 0.01 ? vente.total : expectedTotal;

      // Pour les factures d'avoir (FA), les montants sont négatifs
      const isFactureAvoir = typeFacture === 'FA';
      const multiplier = isFactureAvoir ? -1 : 1;

      const factureData = {
        pharmacieName: "Pharmacie Garkuwa",
        nif: config.nif,
        rccm: "RC/XXX-XXX",
        adresse: "Niamey, Niger",
        telephone: "+227 XX XX XX XX",
        email: "contact@garkuwa.ne",

        typeFacture,
        numeroFacture: vente.numeroFacture,
        isCopie: false,
        isAnnulee: false,
        referenceFactureOriginale: (vente as any).factureReference,

        dateEtablissement: securityElements.dateHeure
          ? new Date(securityElements.dateHeure).toLocaleDateString('fr-FR')
          : now.toLocaleDateString('fr-FR'),
        heureEtablissement: securityElements.dateHeure
          ? new Date(securityElements.dateHeure).toLocaleTimeString('fr-FR')
          : now.toLocaleTimeString('fr-FR'),

        operateur: vente.vendeur || 'Vendeur',
        isf: config.isf || 'PHARMA-APP-001',

        client: vente.client ? {
          nif: vente.client.nif || undefined,
          nom: `${vente.client.nom} ${vente.client.prenom}`,
          adresse: vente.client.adresse,
          contact: vente.client.telephone || vente.client.email
        } : undefined,

        items: [
          ...vente.items.map(item => ({
          nom: item.medicament?.nom || 'Article',
          code: item.medicament?.id,
          quantite: item.quantite * multiplier, // Quantité négative pour FA
          prixUnitaire: item.prixUnitaire, // Prix unitaire reste positif
          montant: item.sousTotal * multiplier, // Montant négatif pour FA
          groupeTaxation: (item as any).groupeTaxation || (item.medicament as any)?.groupeTaxation || 'B',
          prixOriginal: item.remise > 0 ? item.prixUnitaire / (1 - item.remise / 100) : undefined,
          descriptionModification: item.remise > 0 ? `Remise ${item.remise}%` : undefined
        })),
          ...(stampAmount > 0 ? [{
            nom: 'Frais de timbre',
            code: 'TIMBRE',
            quantite: 1 * multiplier,
            prixUnitaire: stampAmount,
            montant: stampAmount * multiplier,
            groupeTaxation: 'A',
          }] : [])
        ],

        totauxParGroupe: totauxParGroupe || {
          'B': {
            totalHT: (vente.sousTotal / 1.19) * multiplier,
            totalTVA: vente.tva * multiplier,
            tauxTVA: 19
          }
        },

        totalTVA: vente.tva * multiplier,
        totalTTC: totalTTC * multiplier,

        paiements: [{
          type: vente.methodePaiement === 'especes' ? 'ESPECES' :
                vente.methodePaiement === 'carte' ? 'CARTEBANCAIRE' :
                vente.methodePaiement === 'cheque' ? 'CHEQUES' :
                'VIREMENT',
          montant: totalTTC * multiplier
        }],

        securityElements: securityElements
      };

      printCertifiedInvoice(factureData);

    } catch (error) {
      console.error('Erreur lors de l\'impression de la facture:', error);
      alert('Erreur lors de l\'impression de la facture.');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Tabs */}
      <div className="bg-white border-b border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Facturation e-SECeF</h1>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200">
          <button
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'FV'
                ? 'border-b-2 border-emerald-500 text-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('FV')}
          >
            <Receipt size={18} className="inline mr-2" />
            Facture de Vente (FV)
          </button>
          <button
            className={`pb-3 px-4 font-medium transition-colors ${
              activeTab === 'FA'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('FA')}
          >
            <RefreshCw size={18} className="inline mr-2" />
            Facture d'Avoir (FA)
          </button>
        </div>
      </div>

      {/* FV Tab Content */}
      {activeTab === 'FV' && (
        <>
          {/* Search and Filters */}
          <div className="bg-white p-4 border-b">
            <div className="flex flex-col sm:flex-row gap-3 sm:space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="text"
                  placeholder="Rechercher un medicament..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="sm:w-48"
              >
                <option value="">Toutes les categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
              <Button
                onClick={() => setIsCheckoutOpen(true)}
                disabled={cart.length === 0}
                className="flex items-center space-x-2"
              >
                <ShoppingCart size={18} />
                <span>Panier ({cart.length})</span>
                {cart.length > 0 && (
                  <span className="bg-emerald-600 text-white text-xs px-2 py-1 rounded-full">
                    {cartTotals.total.toFixed(0)} FCFA
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredMedicaments.map((medicament) => (
                <Card key={medicament.id} className="hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="w-full h-32 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg mb-4 flex items-center justify-center relative">
                      <Package className="text-emerald-600" size={40} />
                      {/* Tax group badge */}
                      <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full font-medium ${
                        (medicament as any).groupeTaxation === 'A'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {(medicament as any).groupeTaxation === 'A' ? 'Exonere' : 'TVA 19%'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">{medicament.nom}</h3>
                      <p className="text-sm text-gray-600">{medicament.categorie}</p>

                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          medicament.quantiteStock > 10
                            ? 'bg-green-100 text-green-800'
                            : medicament.quantiteStock > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          Stock: {medicament.quantiteStock}
                        </span>
                        <span className="font-bold text-emerald-600">{medicament.prix} FCFA</span>
                      </div>

                      <Button
                        onClick={() => addToCart(medicament)}
                        disabled={medicament.quantiteStock === 0}
                        className="w-full mt-3"
                        size="sm"
                      >
                        <Plus size={16} className="mr-1" />
                        Ajouter au panier
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {filteredMedicaments.length === 0 && (
              <div className="text-center py-12">
                <Package className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-500">Aucun medicament trouve</p>
              </div>
            )}
          </div>

          {/* Checkout Modal FV */}
          <Modal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            title="Finaliser la Facture de Vente (FV)"
            size="lg"
          >
            <div className="space-y-6">
              <CertificationStatus
                status={certificationStatus}
                message={certificationMessage}
                codeSECeF={certificationCode}
              />

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

              <div className="space-y-4">
                <h3 className="font-semibold">Articles dans le panier</h3>
                {cart.map((item) => (
                  <div key={item.medicament.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Package className="text-emerald-600" size={20} />
                    </div>

                    <div className="flex-1">
                      <h4 className="font-medium">{item.medicament.nom}</h4>
                      <p className="text-sm text-gray-600">
                        {item.medicament.prix} FCFA/unite
                        <span className={`ml-2 text-xs px-1 py-0.5 rounded ${
                        ((item as any).groupeTaxation || (item.medicament as any).groupeTaxation) === 'A'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {((item as any).groupeTaxation || (item.medicament as any).groupeTaxation) === 'A' ? 'Exo' : 'TVA'}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartItemQuantity(item.medicament.id, item.quantite - 1)}
                      >
                        <Minus size={16} />
                      </Button>
                      <span className="w-8 text-center">{item.quantite}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartItemQuantity(item.medicament.id, item.quantite + 1)}
                      >
                        <Plus size={16} />
                      </Button>
                    </div>

                    <div className="w-20">
                      <Input
                        type="number"
                        placeholder="Remise %"
                        value={item.remise}
                        onChange={(e) => updateCartItemDiscount(item.medicament.id, parseFloat(e.target.value) || 0)}
                        min="0"
                        max="100"
                      />
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeFromCart(item.medicament.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  label="Remise globale (%)"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                  min="0"
                  max="100"
                />
                <Select
                  label="Methode de paiement"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                >
                  <option value="especes">Especes</option>
                  <option value="carte">Carte</option>
                  <option value="cheque">Cheque</option>
                  <option value="virement">Virement</option>
                </Select>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                {cartTotals.totalA > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Groupe A (Exonere):</span>
                    <span>{cartTotals.totalA.toFixed(0)} FCFA</span>
                  </div>
                )}
                {cartTotals.totalB_TTC > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span>Groupe B (HT):</span>
                      <span>{cartTotals.totalB_HT.toFixed(0)} FCFA</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TVA 19%:</span>
                      <span>{cartTotals.tva.toFixed(0)} FCFA</span>
                    </div>
                  </>
                )}
                {globalDiscount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Remise ({globalDiscount}%):</span>
                    <span>-{cartTotals.globalDiscountAmount.toFixed(0)} FCFA</span>
                  </div>
                )}
                {cartTotals.stampAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Frais de timbre:</span>
                    <span>{cartTotals.stampAmount.toFixed(0)} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total TTC:</span>
                  <span>{cartTotals.total.toFixed(0)} FCFA</span>
                </div>
              </div>

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
                  onClick={handleCheckoutFV}
                  className="flex-1"
                  disabled={certificationStatus === 'processing'}
                >
                  <FileText size={18} className="mr-2" />
                  {certificationStatus === 'processing' ? 'Traitement...' : 'Certifier FV'}
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}

      {/* FA Tab Content */}
      {activeTab === 'FA' && (
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <Card className="max-w-4xl mx-auto">
            <div className="p-6 space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-semibold text-orange-800 mb-2">Facture d'Avoir (FA)</h3>
                <p className="text-sm text-orange-700">
                  Recherchez une facture de vente par son Code SECeF/DGI pour creer un avoir
                </p>
              </div>

              {/* Search Invoice */}
              <div className="space-y-4">
                <label className="block font-medium text-gray-700">
                  Code SECeF/DGI de la facture originale
                </label>
                <div className="flex space-x-3">
                  <Input
                    type="text"
                    placeholder="Ex: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                    value={searchCodeSECeF}
                    onChange={(e) => setSearchCodeSECeF(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={searchOriginalInvoice}
                    disabled={searchingInvoice}
                  >
                    <Search size={18} className="mr-2" />
                    {searchingInvoice ? 'Recherche...' : 'Rechercher'}
                  </Button>
                </div>
                {searchError && (
                  <div className="flex items-center text-red-600 text-sm">
                    <AlertCircle size={16} className="mr-2" />
                    {searchError}
                  </div>
                )}
              </div>

              {/* Original Invoice Found */}
              {originalInvoice && (
                <div className="space-y-6">
                  {/* Invoice Info */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center text-green-600 mb-3">
                      <CheckCircle size={20} className="mr-2" />
                      <span className="font-semibold">Facture trouvee</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Numero:</span>
                        <span className="ml-2 font-medium">{originalInvoice.numeroFacture}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Date:</span>
                        <span className="ml-2 font-medium">
                          {new Date(originalInvoice.date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Client:</span>
                        <span className="ml-2 font-medium">
                          {originalInvoice.client
                            ? `${originalInvoice.client.nom} ${originalInvoice.client.prenom}`
                            : 'Client anonyme'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <span className="ml-2 font-medium">{originalInvoice.total} FCFA</span>
                      </div>
                    </div>
                  </div>

                  {/* Items Selection */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Selectionner les articles a rembourser</h4>

                    {originalItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center space-x-4 p-4 border rounded-lg transition-colors ${
                          item.selected ? 'bg-orange-50 border-orange-200' : 'bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleItemSelection(item.id)}
                          className="w-5 h-5 text-orange-600 rounded"
                        />

                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Package className="text-orange-600" size={20} />
                        </div>

                        <div className="flex-1">
                          <h4 className="font-medium">{item.medicament?.nom}</h4>
                          <p className="text-sm text-gray-600">
                            {item.prixUnitaire} FCFA x {item.quantite} = {item.sousTotal} FCFA
                            <span className={`ml-2 text-xs px-1 py-0.5 rounded ${
                              ((item as any).groupeTaxation || (item.medicament as any)?.groupeTaxation) === 'A'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {((item as any).groupeTaxation || (item.medicament as any)?.groupeTaxation) === 'A' ? 'Exo' : 'TVA'}
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">Qte:</span>
                          <Input
                            type="number"
                            value={item.quantiteRemboursement}
                            onChange={(e) => updateItemRemboursement(item.id, parseInt(e.target.value) || 0)}
                            min="0"
                            max={item.quantite}
                            disabled={!item.selected}
                            className="w-20"
                          />
                          <span className="text-sm text-gray-500">/ {item.quantite}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Stock Return Option */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={retourStock}
                        onChange={(e) => setRetourStock(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded mr-3"
                      />
                      <div>
                        <span className="font-medium text-blue-800">Retourner le stock</span>
                        <p className="text-sm text-blue-600">
                          Les quantites seront reintegrees dans le stock des medicaments
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Payment Method */}
                  <Select
                    label="Methode de remboursement"
                    value={faPaymentMethod}
                    onChange={(e) => setFaPaymentMethod(e.target.value as any)}
                  >
                    <option value="especes">Especes</option>
                    <option value="carte">Carte</option>
                    <option value="cheque">Cheque</option>
                    <option value="virement">Virement</option>
                  </Select>

                  {/* FA Totals - Affichage en négatif pour les remboursements */}
                  <div className="bg-orange-50 p-4 rounded-lg space-y-2">
                    {faTotals.totalA > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Groupe A (Exonere):</span>
                        <span>-{faTotals.totalA.toFixed(0)} FCFA</span>
                      </div>
                    )}
                    {faTotals.totalB_TTC > 0 && (
                      <>
                        <div className="flex justify-between text-red-600">
                          <span>Groupe B (HT):</span>
                          <span>-{faTotals.totalB_HT.toFixed(0)} FCFA</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>TVA 19%:</span>
                          <span>-{faTotals.tva.toFixed(0)} FCFA</span>
                        </div>
                      </>
                    )}
                    {faTotals.stampAmount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Frais de timbre:</span>
                        <span>-{faTotals.stampAmount.toFixed(0)} FCFA</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t border-orange-200 pt-2">
                      <span>Total a rembourser:</span>
                      <span className="text-red-600">-{faTotals.total.toFixed(0)} FCFA</span>
                    </div>
                  </div>

                  {/* Certification Status */}
                  <CertificationStatus
                    status={faCertificationStatus}
                    message={faCertificationMessage}
                    codeSECeF={faCertificationCode}
                  />

                  {/* Actions */}
                  <div className="flex space-x-4">
                    <Button
                      variant="outline"
                      onClick={clearFA}
                      className="flex-1"
                      disabled={faCertificationStatus === 'processing'}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleCheckoutFA}
                      className="flex-1 bg-orange-500 hover:bg-orange-600"
                      disabled={faCertificationStatus === 'processing' || faTotals.total === 0}
                    >
                      <FileText size={18} className="mr-2" />
                      {faCertificationStatus === 'processing' ? 'Traitement...' : 'Certifier FA'}
                    </Button>
                  </div>
                </div>
              )}

              {!originalInvoice && !searchingInvoice && !searchError && (
                <div className="text-center py-12 text-gray-500">
                  <Receipt size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Entrez un Code SECeF/DGI pour rechercher la facture originale</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
