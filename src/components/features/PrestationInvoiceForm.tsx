'use client';

import { useRef, useMemo, useState } from 'react';
import { Plus, X, FileText, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CertificationStatus, CertificationStatusType } from '@/components/ui/CertificationStatus';
import { usePharmacieData } from '@/hooks/usePharmacieData';
import { normalizeInvoiceReference } from '@/utils/esecefReference';
import type { Client } from '@/types';
import type { ISBGroup } from '@/types/esecef';

type TaxGroup = 'A' | 'B' | 'C' | 'D';
const taxRate = (group: TaxGroup) => ({ A: 0, B: 19, C: 10, D: 5 })[group] / 100;

interface PrestationItemDraft {
  id: string;
  libelle: string;
  code: string;
  quantite: number;
  prixUnitaire: number;
  montant: number;
  groupeTaxation: TaxGroup;
}

interface PrestationInvoiceFormProps {
  invoiceType: 'FV' | 'FA';
}

const numberFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const moneyFormatter = new Intl.NumberFormat('fr-FR');

const formatNumber = (value: number) => numberFormatter.format(value || 0);
const formatMoney = (value: number) => moneyFormatter.format(value || 0);

const parseNumberInput = (value: string): number => {
  if (!value) return 0;
  let cleaned = value.replace(/\s/g, '').replace(/[^\d,.-]/g, '');
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const thousandSep = decimalSep === ',' ? '.' : ',';
    cleaned = cleaned.replace(new RegExp(`\\${thousandSep}`, 'g'), '');
    cleaned = cleaned.replace(decimalSep, '.');
  } else if (hasComma) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const newItem = (): PrestationItemDraft => ({
  id: Math.random().toString(36).slice(2, 9),
  libelle: '',
  code: '',
  quantite: 1,
  prixUnitaire: 0,
  montant: 0,
  groupeTaxation: 'B',
});

export function PrestationInvoiceForm({ invoiceType }: PrestationInvoiceFormProps) {
  const { clients, refreshData } = usePharmacieData();

  const [items, setItems] = useState<PrestationItemDraft[]>([newItem()]);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<'especes' | 'carte' | 'cheque' | 'virement'>('especes');
  const [referenceFacture, setReferenceFacture] = useState('');
  const pendingVente = useRef<any>(null);
  const [certificationStatus, setCertificationStatus] = useState<CertificationStatusType>('idle');
  const [certificationMessage, setCertificationMessage] = useState('');
  const [certificationCode, setCertificationCode] = useState('');
  const [isbEnabled, setIsbEnabled] = useState(false);
  const [isbGroup, setIsbGroup] = useState<ISBGroup>('A');
  const [isbCustomRate, setIsbCustomRate] = useState(0);
  const [isItemsOpen, setIsItemsOpen] = useState(false);

  const isFactureAvoir = invoiceType === 'FA';
  const multiplier = isFactureAvoir ? -1 : 1;

  const totals = useMemo(() => {
    let totalA = 0;
    let totalB_HT = 0;
    let totalB_TTC = 0;
    let tva = 0;

    items.forEach((item) => {
      const montant = item.montant || 0;
      if (item.groupeTaxation === 'A') {
        totalA += montant;
        return;
      }
      totalB_HT += montant;
      const itemTTC = montant * (1 + taxRate(item.groupeTaxation));
      totalB_TTC += itemTTC;
      tva += itemTTC - montant;
    });

    const baseTotal = totalA + totalB_HT;
    const stampAmount = 0; // Pas de timbre pour les prestations
    const total = totalA + totalB_TTC;

    return { totalA, totalB_TTC, totalB_HT, tva, baseTotal, stampAmount, total };
  }, [items]);

  const isbRate = useMemo(() => {
    if (!isbEnabled) return 0;
    if (isbGroup === 'A') return 2;
    if (isbGroup === 'B') return 5;
    return isbCustomRate > 0 ? isbCustomRate : 0;
  }, [isbEnabled, isbGroup, isbCustomRate]);

  const isbAmount = useMemo(() => {
    if (!isbEnabled || isbRate <= 0) return 0;
    const base = Math.max(0, totals.total);
    return (base * isbRate) / 100;
  }, [isbEnabled, isbRate, totals.total]);

  const computeItemTTC = (item: PrestationItemDraft) =>
    item.groupeTaxation === 'A' ? item.montant : item.montant * (1 + taxRate(item.groupeTaxation));
  const computeItemTVA = (item: PrestationItemDraft) =>
    item.groupeTaxation === 'A' ? 0 : item.montant * taxRate(item.groupeTaxation);

  const updateItem = (id: string, patch: Partial<PrestationItemDraft>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const updateItemQuantity = (id: string, value: string) => {
    const qty = Math.max(0, Math.round(parseNumberInput(value)));
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const montant = qty * item.prixUnitaire;
        return { ...item, quantite: qty, montant };
      })
    );
  };

  const updateItemUnitPrice = (id: string, value: string) => {
    const unitPrice = Math.max(0, parseNumberInput(value));
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const montant = unitPrice * item.quantite;
        return { ...item, prixUnitaire: unitPrice, montant };
      })
    );
  };

  const updateItemAmount = (id: string, value: string) => {
    const montant = Math.max(0, parseNumberInput(value));
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const prixUnitaire = item.quantite > 0 ? montant / item.quantite : 0;
        return { ...item, montant, prixUnitaire };
      })
    );
  };

  const addItem = () => setItems((prev) => [...prev, newItem()]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((item) => item.id !== id));

  const resetForm = () => {
    setItems([newItem()]);
    setSelectedClient(undefined);
    setPaymentMethod('especes');
    setReferenceFacture('');
    setCertificationStatus('idle');
    setCertificationMessage('');
    setCertificationCode('');
    setIsbEnabled(false);
    setIsbGroup('A');
    setIsbCustomRate(0);
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    const invalidItem = items.find((item) => !item.libelle.trim() || item.quantite <= 0 || item.montant <= 0);
    if (invalidItem) {
      setCertificationStatus('error');
      setCertificationMessage('Veuillez renseigner tous les articles avec un montant valide.');
      return;
    }

    const normalizedReference = normalizeInvoiceReference(referenceFacture);
    if (isFactureAvoir && !normalizedReference) {
      setCertificationStatus('error');
      setCertificationMessage('La référence de la facture originale est obligatoire pour une facture d\'avoir.');
      return;
    }

    try {
      if (pendingVente.current) throw new Error(`La vente ${pendingVente.current.numeroFacture} est déjà enregistrée. Reprenez sa certification dans Demandes en attente avant de commencer une autre vente.`);
      setCertificationStatus('processing');
      setCertificationMessage('Enregistrement de la facture...');

      const saleItems = items.map((item) => ({
        medicamentId: null,
        libelle: item.libelle,
        code: item.code || undefined,
        quantite: item.quantite,
        prixUnitaire: item.prixUnitaire,
        remise: 0,
        sousTotal: item.montant,
        groupeTaxation: item.groupeTaxation,
      }));

      const venteResponse = await fetch('/api/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient?.id,
          items: saleItems,
          sousTotal: totals.baseTotal,
          tva: totals.tva,
          remise: 0,
          total: totals.total,
          methodePaiement: paymentMethod,
          vendeur: 'admin',
          statut: 'terminee',
          typeFacture: invoiceType,
          factureReference: isFactureAvoir ? normalizedReference : undefined,
          skipCertification: true,
        }),
      });

      if (!venteResponse.ok) {
        throw new Error('Erreur lors de la création de la facture');
      }

      const vente = await venteResponse.json();
      pendingVente.current = vente;

      setCertificationMessage('Certification e-SECeF en cours...');
      const certifyResponse = await fetch('/api/esecef/certify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venteId: vente.id,
          typeFacture: invoiceType,
          reference: isFactureAvoir ? normalizedReference : undefined,
          isb: isbEnabled ? isbGroup : undefined,
        }),
      });

      if (!certifyResponse.ok) {
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
          // ignore parse errors
        }
        throw new Error(errorMessage);
      }

      const certifyData = await certifyResponse.json();
      const securityElements = certifyData.securityElements;
      const totauxParGroupe = certifyData.totauxParGroupe;

      pendingVente.current = null;
        setCertificationStatus('success');
      setCertificationMessage('Facture certifiée avec succès!');
      setCertificationCode(securityElements?.codeSECeFDGI || '');

      await refreshData();

      const configResponse = await fetch('/api/esecef/config');
      if (!configResponse.ok) {
        throw new Error('Configuration e-SECeF manquante.');
      }
      const config = await configResponse.json();

      const { printCertifiedInvoice } = await import('@/utils/printCertifiedInvoice');
      const now = new Date();

      const rawTotauxParGroupe =
        totauxParGroupe ||
        items.reduce((acc: any, item) => {
          const groupe = item.groupeTaxation || 'B';
          const tauxTVA = groupe === 'A' ? 0 : 19;
          if (!acc[groupe]) {
            acc[groupe] = { totalHT: 0, totalTVA: 0, tauxTVA };
          }
          const montantHT = item.montant * multiplier;
          if (groupe === 'A') {
            acc[groupe].totalHT += montantHT;
          } else {
            acc[groupe].totalHT += montantHT;
            acc[groupe].totalTVA += montantHT * 0.19;
          }
          return acc;
        }, {});

      const totauxAreNegative = Object.values(rawTotauxParGroupe).some(
        (t: any) => t.totalHT < 0 || t.totalTVA < 0
      );
      const totauxSigned = isFactureAvoir && !totauxAreNegative
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

      const { printStoredCertifiedInvoice } = await import('@/utils/printCertifiedInvoice');
      await printStoredCertifiedInvoice(vente.id);;

      resetForm();
    } catch (error: any) {
      console.error('Erreur lors de la création de la facture:', error);
      setCertificationStatus('error');
      setCertificationMessage(error instanceof Error ? error.message : 'Erreur lors de la certification');
    }
  };

  return (
    <div className="space-y-6">
      {isFactureAvoir && (
        <Card className="p-4 border border-orange-200 bg-orange-50/60">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <AlertCircle size={16} className="inline mr-2" />
            Référence de la facture originale (obligatoire)
          </label>
          <Input
            type="text"
            placeholder="Ex: ET01000293-1-21"
            value={referenceFacture}
            onChange={(e) => setReferenceFacture(e.target.value)}
            className="max-w-md"
          />
          <p className="text-xs text-gray-600 mt-1">Format RN (NIM-compteur).</p>
        </Card>
      )}

      <Card className="p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Articles de prestation</h2>
            <p className="text-sm text-gray-600">
              {items.length} article{items.length > 1 ? 's' : ''} · Total {formatMoney(totals.total * multiplier)} FCFA
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsItemsOpen(true)} className="gap-2">
              <FileText size={16} />
              Ouvrir la sheet
            </Button>
            <Button onClick={addItem} className="gap-2" size="sm">
              <Plus size={16} />
              Ajouter
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Client"
            value={selectedClient?.id || ''}
            onChange={(e) => {
              const client = clients.find((c) => c.id === e.target.value);
              setSelectedClient(client);
            }}
          >
            <option value="">Client anonyme</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.nom} {client.prenom}
              </option>
            ))}
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

        <div className="rounded-lg border border-slate-200/80 bg-white/90 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800">Précompte ISB</p>
              <p className="text-xs text-slate-500">Applicable aux prestations.</p>
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
                  type="text"
                  inputMode="decimal"
                  label="Taux ISB (%)"
                  value={isbCustomRate ? formatNumber(isbCustomRate) : ''}
                  onChange={(e) => setIsbCustomRate(parseNumberInput(e.target.value))}
                />
              ) : (
                <div className="text-xs text-slate-500 flex items-center">
                  Taux appliqué automatiquement par e-SECeF.
                </div>
              )}
            </div>
          )}
          {isbEnabled && <p className="text-xs text-slate-500">ISB calculé sur le total TTC.</p>}
        </div>

        <div className="bg-slate-50 p-4 rounded-lg space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center justify-between sm:flex-col sm:items-start sm:gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-500">Total HT</span>
              <span className="text-base font-semibold text-slate-900">
                {formatMoney(totals.baseTotal * multiplier)} FCFA
              </span>
            </div>
            <div className="flex items-center justify-between sm:flex-col sm:items-start sm:gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-500">TVA</span>
              <span className="text-base font-semibold text-slate-900">
                {formatMoney(totals.tva * multiplier)} FCFA
              </span>
            </div>
            <div className="flex items-center justify-between sm:flex-col sm:items-start sm:gap-1">
              <span className="text-xs uppercase tracking-wide text-slate-500">Total TTC</span>
              <span className="text-base font-semibold text-slate-900">
                {formatMoney(totals.total * multiplier)} FCFA
              </span>
            </div>
          </div>

          {(totals.totalA > 0 || totals.totalB_HT > 0) && (
            <div className="space-y-1 text-sm text-slate-600">
              {totals.totalA > 0 && (
                <div className="flex justify-between">
                  <span>Groupe A (Exo)</span>
                  <span>{formatMoney(totals.totalA * multiplier)} FCFA</span>
                </div>
              )}
              {totals.totalB_HT > 0 && (
                <div className="flex justify-between">
                  <span>Groupe B (HT)</span>
                  <span>{formatMoney(totals.totalB_HT * multiplier)} FCFA</span>
                </div>
              )}
            </div>
          )}

          {isbEnabled && (
            <div className="flex justify-between text-slate-600">
              <span>Précompte ISB {isbRate > 0 ? `(${isbGroup} ${isbRate}%)` : `(${isbGroup})`}</span>
              <span>{isbRate > 0 ? `${formatMoney(isbAmount * multiplier)} FCFA` : 'Selon configuration'}</span>
            </div>
          )}
        </div>

        <CertificationStatus
          status={certificationStatus}
          message={certificationMessage}
          codeSECeF={certificationCode}
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={resetForm} className="flex-1" disabled={certificationStatus === 'processing'}>
            Annuler
          </Button>
          <Button onClick={handleCheckout} className="flex-1" disabled={certificationStatus === 'processing'}>
            <FileText size={18} className="mr-2" />
            Certifier & Imprimer
          </Button>
        </div>
      </Card>

      {isItemsOpen && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsItemsOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 flex justify-center p-0 sm:p-4">
            <div className="w-full max-w-5xl rounded-t-2xl sm:rounded-2xl bg-white/95 shadow-2xl ring-1 ring-emerald-100/80 backdrop-blur max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-emerald-100/70">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Articles de prestation</h3>
                  <p className="text-xs text-gray-500">Saisissez les montants avec séparateurs.</p>
                </div>
                <button
                  onClick={() => setIsItemsOpen(false)}
                  className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{items.length} article{items.length > 1 ? 's' : ''}</span>
                  <Button onClick={addItem} className="gap-2" size="sm">
                    <Plus size={16} />
                    Ajouter
                  </Button>
                </div>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200/70 bg-white/90 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto] md:items-end">
                      <Input
                        label="Libellé"
                        value={item.libelle}
                        onChange={(e) => updateItem(item.id, { libelle: e.target.value })}
                        placeholder="Ex: Consultation"
                      />
                      <Input
                        label="Code"
                        value={item.code}
                        onChange={(e) => updateItem(item.id, { code: e.target.value })}
                        placeholder="Optionnel"
                      />
                      <Input
                        label="Quantité"
                        type="text"
                        inputMode="numeric"
                        value={item.quantite ? String(item.quantite) : ''}
                        onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                      />
                      <Input
                        label={item.groupeTaxation !== 'A' ? 'Prix unitaire HT' : 'Prix unitaire TTC'}
                        type="text"
                        inputMode="decimal"
                        value={item.prixUnitaire ? formatNumber(item.prixUnitaire) : ''}
                        onChange={(e) => updateItemUnitPrice(item.id, e.target.value)}
                      />
                      <div className="space-y-1">
                        <Input
                          label={item.groupeTaxation !== 'A' ? 'Montant HT' : 'Montant TTC'}
                          type="text"
                          inputMode="decimal"
                          value={item.montant ? formatNumber(item.montant) : ''}
                          onChange={(e) => updateItemAmount(item.id, e.target.value)}
                        />
                        <p className="text-xs text-slate-500">
                          {item.groupeTaxation !== 'A'
                            ? `TTC: ${formatMoney(computeItemTTC(item))} FCFA · TVA: ${formatMoney(computeItemTVA(item))} FCFA`
                            : 'Exonéré TVA'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          label="Taxe"
                          value={item.groupeTaxation}
                          onChange={(e) => updateItem(item.id, { groupeTaxation: e.target.value as TaxGroup })}
                        >
                          <option value="A">A (Exo)</option>
                          <option value="B">B (TVA 19%)</option>
                          <option value="C">C (TVA 10%)</option>
                          <option value="D">D (TVA 5%)</option>
                        </Select>
                        <Button variant="outline" size="sm" onClick={() => removeItem(item.id)} className="text-red-600">
                          <X size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 sm:p-6 border-t border-emerald-100/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-3">
                  <div>
                    Total HT: <span className="font-semibold text-gray-900">{formatMoney(totals.baseTotal * multiplier)} FCFA</span>
                  </div>
                  <div>
                    TVA: <span className="font-semibold text-gray-900">{formatMoney(totals.tva * multiplier)} FCFA</span>
                  </div>
                  <div>
                    Total TTC: <span className="font-semibold text-gray-900">{formatMoney(totals.total * multiplier)} FCFA</span>
                  </div>
                </div>
                <Button onClick={() => setIsItemsOpen(false)} className="gap-2">
                  Terminer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
