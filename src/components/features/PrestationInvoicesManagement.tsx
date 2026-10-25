'use client';

import { useState } from 'react';
import { FileText, CheckCircle, RefreshCw } from 'lucide-react';
import { CertifiedInvoicesManagement } from '@/components/features/CertifiedInvoicesManagement';
import { PrestationInvoiceForm } from '@/components/features/PrestationInvoiceForm';

type TabKey = 'fv' | 'fa' | 'certified';

export function PrestationInvoicesManagement() {
  const [activeTab, setActiveTab] = useState<TabKey>('fv');

  return (
    <div className="space-y-4">
      <div className="bg-white border-b border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Factures de prestation</h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestion des factures certifiées avec précompte ISB.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'fv'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
              onClick={() => setActiveTab('fv')}
            >
              <FileText size={16} />
              Facture prestation
            </button>
            <button
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'fa'
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
              }`}
              onClick={() => setActiveTab('fa')}
            >
              <RefreshCw size={16} />
              Avoir prestation
            </button>
            <button
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'certified'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              onClick={() => setActiveTab('certified')}
            >
              <CheckCircle size={16} />
              Factures certifiées
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'fv' && (
        <PrestationInvoiceForm invoiceType="FV" />
      )}
      {activeTab === 'fa' && (
        <PrestationInvoiceForm invoiceType="FA" />
      )}
      {activeTab === 'certified' && (
        <CertifiedInvoicesManagement
          filterIsb
          showIsbColumn
          titleOverride="Factures de prestation certifiées"
          descriptionOverride="Historique des factures certifiées avec ISB."
        />
      )}
    </div>
  );
}
