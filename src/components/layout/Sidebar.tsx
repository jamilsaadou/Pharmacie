'use client';
import { useFiscalConfiguration } from '@/hooks/useFiscalConfiguration';
import { PharmacyNavigation } from './PharmacyNavigation';
import { useUserData } from '@/hooks/useUserData';
import { isVentesAccessId } from '@/constants/ventesAccess';
import { ModuleId } from '@/types';
export default function Sidebar({ activeSection, onSectionChange }: { activeSection: string; onSectionChange: (section: string) => void }) {
  const { utilisateurCourant, hasAccess, hasVentesAccess, logout } = useUserData();
  const { configuration } = useFiscalConfiguration();
  const canAccess = (id: string) => id === 'exemples' ? hasAccess('dashboard') : id === 'stock-suivi' ? hasAccess('stock') : id === 'facturation' ? hasAccess('ventes') : isVentesAccessId(id) ? hasVentesAccess(id) : hasAccess(id as ModuleId);
  return <PharmacyNavigation name={configuration?.nomEtablissement || 'Mon établissement'} activeSection={activeSection} onSectionChange={onSectionChange} canAccess={canAccess} user={utilisateurCourant ? `${utilisateurCourant.prenom} ${utilisateurCourant.nom}` : 'Équipe'} onLogout={logout} />;
}
