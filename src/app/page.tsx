'use client';

import { WorkspaceHeader } from '@/components/layout/PharmacyNavigation';
import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
const ExamplesGuide = dynamic(()=>import('@/components/features/ExamplesGuide'));
const Dashboard = dynamic(() => import('@/components/features/Dashboard'), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const StockOperations = dynamic(() => import('@/components/features/StockOperations'));
const CashManagement = dynamic(() => import('@/components/features/CashManagement'));
const StockManagement = dynamic(() => import('@/components/features/StockManagement'), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const RayonManagement = dynamic(() => import('@/components/features/RayonManagement'), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const SalesManagement = dynamic(() => import('@/components/features/SalesManagement').then(m => m.SalesManagement), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const ClientManagement = dynamic(() => import('@/components/features/ClientManagement').then(m => m.ClientManagement), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const FournisseurManagement = dynamic(() => import('@/components/features/FournisseurManagement').then(m => m.FournisseurManagement), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const CommandeManagement = dynamic(() => import('@/components/features/CommandeManagement'), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const StatisticsView = dynamic(() => import('@/components/features/StatisticsView'), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const ReportsManagement = dynamic(() => import('@/components/features/ReportsManagement'), { loading: () => <div className="cs-loading">Ouverture du module…</div> });

const AssuranceManagement = dynamic(() => import('@/components/features/AssuranceManagement'), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const RemboursementManagement = dynamic(() => import('@/components/features/RemboursementManagement'), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const AlertsManagement = dynamic(() => import('@/components/features/AlertsManagement'), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const UserManagement = dynamic(() => import('@/components/features/UserManagement'), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const LogsManagement = dynamic(() => import('@/components/features/LogsManagement'), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
import LoginPage from '@/components/features/LoginPage';
const ESECeFConfiguration = dynamic(() => import('@/components/features/ESECeFConfiguration').then(m => m.ESECeFConfiguration), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const CreditNoteCreation = dynamic(() => import('@/components/features/CreditNoteCreation'), { loading: () => <div className="cs-loading">Ouverture des avoirs…</div> });
const InvoiceCreation = dynamic(() => import('@/components/features/InvoiceCreation').then(m => m.InvoiceCreation), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const PendingInvoicesManagement = dynamic(() => import('@/components/features/PendingInvoicesManagement').then(m => m.PendingInvoicesManagement), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const FacturationManagement = dynamic(() => import('@/components/features/FacturationManagement').then(m => m.FacturationManagement), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const CertifiedInvoicesManagement = dynamic(() => import('@/components/features/CertifiedInvoicesManagement').then(m => m.CertifiedInvoicesManagement), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const PrestationInvoicesManagement = dynamic(() => import('@/components/features/PrestationInvoicesManagement').then(m => m.PrestationInvoicesManagement), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
const SettingsManagement = dynamic(() => import('@/components/features/SettingsManagement').then(m => m.SettingsManagement), { loading: () => <div className="cs-loading">Ouverture du module…</div> });
import { useUserData } from '@/hooks/useUserData';
import { ModuleId } from '@/types';
import { isVentesAccessId } from '@/constants/ventesAccess';

// Mapping des sous-menus vers leur module parent
const SUBMENU_TO_PARENT: Record<string, ModuleId> = {
  'exemples': 'dashboard',
  'stock-suivi': 'stock',
  'facture-vente': 'ventes',
  'facture-acompte': 'ventes',
  'facture-avoir': 'ventes',
  'facture-export': 'ventes',
  'facture-prestation': 'ventes',
  'pending-invoices': 'ventes',
  'certified-invoices': 'ventes',
  'facturation': 'ventes',
};

export default function Home() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const { hasAccess, hasVentesAccess, utilisateurCourant } = useUserData();

  // Afficher la page de connexion si aucun utilisateur n'est connecté
  if (!utilisateurCourant) {
    return <LoginPage />;
  }

  // Vérifier l'accès en tenant compte des sous-menus
  const checkAccess = (section: string): boolean => {
    if (isVentesAccessId(section)) {
      return hasVentesAccess(section);
    }
    // Si c'est un sous-menu, vérifier l'accès au module parent
    const parentModule = SUBMENU_TO_PARENT[section];
    if (parentModule) {
      return hasAccess(parentModule);
    }
    // Sinon, vérifier l'accès directement
    return hasAccess(section as ModuleId);
  };

  const safeActiveSection = checkAccess(activeSection) ? activeSection : 'dashboard';

  const renderContent = () => {
    switch (safeActiveSection) {
      case 'exemples': return <ExamplesGuide onNavigate={setActiveSection} canAccess={checkAccess}/>;
      case 'dashboard':
        return <Dashboard />;
      case 'stock':
        return <StockManagement />;
      case 'stock-suivi': return <StockOperations />;
      case 'caisse': return <CashManagement />;
      case 'rayons':
        return <RayonManagement />;
      case 'facturation':
        return <FacturationManagement />;
      case 'ventes':
        return <SalesManagement />;
      case 'facture-vente':
        return <InvoiceCreation invoiceType="FV" />;
      case 'facture-acompte':
        return <InvoiceCreation invoiceType="FT" />;
      case 'facture-avoir':
        return <CreditNoteCreation />;
      case 'facture-export':
        return <InvoiceCreation invoiceType="EV" />;
      case 'facture-prestation':
        return <PrestationInvoicesManagement />;
      case 'clients':
        return <ClientManagement />;
      case 'fournisseurs':
        return <FournisseurManagement />;
      case 'commandes':
        return <CommandeManagement />;
      case 'assurances':
        return <AssuranceManagement />;
      case 'remboursements':
        return <RemboursementManagement />;
      case 'statistiques':
        return <StatisticsView />;
      case 'rapports':
        return <ReportsManagement />;
      case 'alertes':
        return <AlertsManagement />;
      case 'esecef':
        return <ESECeFConfiguration />;
      case 'pending-invoices':
        return <PendingInvoicesManagement />;
      case 'certified-invoices':
        return <CertifiedInvoicesManagement />;
      case 'utilisateurs':
        return <UserManagement />;
      case 'logs':
        return <LogsManagement />;
      case 'parametres':
        return <SettingsManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      
      {/* Main content */}
      <div className="ph-main min-w-0 lg:ml-72 min-h-screen transition-all duration-300">
        <WorkspaceHeader onNavigate={setActiveSection} />
        <main id="main-content" className="ph-workspace p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1480px] mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
