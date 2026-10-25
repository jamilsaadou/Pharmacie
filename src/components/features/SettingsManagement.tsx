'use client';

import BackupManagement from './BackupManagement';
import { ESECeFConfiguration } from './ESECeFConfiguration';
import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useParametres } from '@/hooks/useParametres';

interface SettingsFormData {
  appNom: string;
  appSlogan: string;
  facturationPrefixe: string;
  timbreSeuil: string;
  timbreMontant: string;
  impressionEntete: string;
  impressionPiedDePage: string;
}

export function SettingsManagement() {
  const [section, setSection] = useState<'general' | 'certification' | 'backups'>('general');
  const {
    loading,
    error,
    appNom,
    appSlogan,
    facturationPrefixe,
    timbreSeuil,
    timbreMontant,
    impressionEntete,
    impressionPiedDePage,
    saveParametres,
    loadParametres,
  } = useParametres();

  const [formData, setFormData] = useState<SettingsFormData>({
    appNom: '',
    appSlogan: '',
    facturationPrefixe: '',
    timbreSeuil: '',
    timbreMontant: '',
    impressionEntete: '',
    impressionPiedDePage: '',
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialiser le formulaire avec les valeurs chargées
  useEffect(() => {
    if (!loading) {
    setFormData({
      appNom,
      appSlogan,
      facturationPrefixe,
      timbreSeuil,
      timbreMontant,
      impressionEntete,
      impressionPiedDePage,
    });
  }
  }, [loading, appNom, appSlogan, facturationPrefixe, timbreSeuil, timbreMontant, impressionEntete, impressionPiedDePage]);

  const handleChange = (field: keyof SettingsFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      await saveParametres([
        { cle: 'app.nom', valeur: formData.appNom, categorie: 'general' },
        { cle: 'app.slogan', valeur: formData.appSlogan, categorie: 'general' },
        { cle: 'facturation.prefixe', valeur: formData.facturationPrefixe, categorie: 'facturation' },
        { cle: 'facturation.timbre.seuil', valeur: formData.timbreSeuil, categorie: 'facturation' },
        { cle: 'facturation.timbre.montant', valeur: formData.timbreMontant, categorie: 'facturation' },
        { cle: 'impression.entete', valeur: formData.impressionEntete, categorie: 'impression' },
        { cle: 'impression.piedDePage', valeur: formData.impressionPiedDePage, categorie: 'impression' },
      ]);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    await loadParametres();
  };

  const tabs = <div className="cs-tabs"><button className={section === 'general' ? 'active' : ''} onClick={() => setSection('general')}>Paramètres généraux</button><button className={section === 'certification' ? 'active' : ''} onClick={() => setSection('certification')}>Facturation certifiée e‑MCF</button><button className={section === 'backups' ? 'active' : ''} onClick={() => setSection('backups')}>Sauvegardes</button></div>;
  if (section === 'backups') return <>{tabs}<BackupManagement /></>;
  if (section === 'certification') return <>{tabs}<ESECeFConfiguration /></>;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">{tabs}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
            <p className="text-sm text-gray-500">Configurez les paramètres de l'application</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{saveError}</p>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center space-x-3">
          <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className="text-emerald-700">Paramètres enregistrés avec succès</p>
        </div>
      )}

      {/* Formulaire */}
      <div className="grid gap-6">
        {/* Section Général */}
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-emerald-50/50 border-b border-emerald-100">
            <h2 className="text-lg font-semibold text-gray-900">Paramètres généraux</h2>
            <p className="text-sm text-gray-500">Configuration de l'identité de l'application</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'application
              </label>
              <input
                type="text"
                value={formData.appNom}
                onChange={(e) => handleChange('appNom', e.target.value)}
                placeholder="Ex: PharmaCare"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
              <p className="mt-1 text-xs text-gray-500">
                Ce nom sera affiché dans la barre latérale et sur les documents imprimés
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slogan / Description
              </label>
              <input
                type="text"
                value={formData.appSlogan}
                onChange={(e) => handleChange('appSlogan', e.target.value)}
                placeholder="Ex: Gestion Pharmaceutique"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
              <p className="mt-1 text-xs text-gray-500">
                Description courte affichée sous le nom de l'application
              </p>
            </div>
          </div>
        </div>

        {/* Section Facturation */}
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-emerald-50/50 border-b border-emerald-100">
            <h2 className="text-lg font-semibold text-gray-900">Facturation</h2>
            <p className="text-sm text-gray-500">Configuration des factures</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Préfixe des numéros de facture
              </label>
              <input
                type="text"
                value={formData.facturationPrefixe}
                onChange={(e) => handleChange('facturationPrefixe', e.target.value.toUpperCase())}
                placeholder="Ex: FAC"
                maxLength={10}
                className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all uppercase"
              />
              <p className="mt-1 text-xs text-gray-500">
                Exemple de numéro: {formData.facturationPrefixe || 'FAC'}-2024-00001
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seuil d'application du timbre (TTC)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.timbreSeuil}
                  onChange={(e) => handleChange('timbreSeuil', e.target.value)}
                  placeholder="Ex: 5000"
                  className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Le timbre s&apos;applique si le total TTC atteint ce montant
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant du timbre
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.timbreMontant}
                  onChange={(e) => handleChange('timbreMontant', e.target.value)}
                  placeholder="Ex: 100"
                  className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Montant ajouté automatiquement sur la facture
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section Impression */}
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-emerald-50/50 border-b border-emerald-100">
            <h2 className="text-lg font-semibold text-gray-900">Impression</h2>
            <p className="text-sm text-gray-500">Personnalisation des documents imprimés</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                En-tête personnalisé
              </label>
              <textarea
                value={formData.impressionEntete}
                onChange={(e) => handleChange('impressionEntete', e.target.value)}
                placeholder="Informations de l'entreprise, adresse, téléphone..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                Cet en-tête apparaîtra en haut des factures et reçus imprimés
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pied de page personnalisé
              </label>
              <textarea
                value={formData.impressionPiedDePage}
                onChange={(e) => handleChange('impressionPiedDePage', e.target.value)}
                placeholder="Mentions légales, conditions de vente..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                Ce texte apparaîtra en bas des factures et reçus imprimés
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3">
        <button
          onClick={handleReset}
          disabled={saving}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 inline-block mr-2 ${saving ? 'animate-spin' : ''}`} />
          Réinitialiser
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center space-x-2"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
        </button>
      </div>
    </div>
  );
}

export default SettingsManagement;
