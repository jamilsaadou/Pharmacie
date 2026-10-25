'use client';
import { useFiscalConfiguration } from '@/hooks/useFiscalConfiguration';
import { useEffect, useState } from 'react';
import { FlaskConical, HeartPulse, LayoutDashboard, Package, ShoppingBasket, Users, Truck, ShoppingBag, ChartNoAxesCombined, Bell, Settings2, ShieldCheck, FileCheck2, FileBarChart2, History, ChevronDown, LogOut, Menu, X, Store, Plus } from 'lucide-react';
const groups = [
  { label: 'VOTRE ACTIVITÉ', items: [{ id: 'exemples', name: 'Parcours d’essai', icon: FlaskConical }, { id: 'dashboard', name: 'Vue d’ensemble', icon: LayoutDashboard }, { id: 'ventes', name: 'Ventes & facturation', icon: ShoppingBasket }, { id: 'stock', name: 'Stock & médicaments', icon: Package }, { id: 'stock-suivi', name: 'Lots & inventaires', icon: Package }, { id: 'caisse', name: 'Caisse', icon: ShoppingBag }, { id: 'rayons', name: 'Rayons', icon: Store }, { id: 'clients', name: 'Clients', icon: Users }] },
  { label: 'APPROVISIONNEMENT', items: [{ id: 'commandes', name: 'Commandes & entrées', icon: ShoppingBag }, { id: 'fournisseurs', name: 'Fournisseurs', icon: Truck }, { id: 'assurances', name: 'Assurances', icon: ShieldCheck }, { id: 'remboursements', name: 'Remboursements', icon: History }] },
  { label: 'PILOTAGE', items: [{ id: 'statistiques', name: 'Statistiques', icon: ChartNoAxesCombined }, { id: 'rapports', name: 'Rapports fiscaux', icon: FileBarChart2 }, { id: 'alertes', name: 'Alertes', icon: Bell }, { id: 'logs', name: 'Journal d’activité', icon: History }] },
  { label: 'ADMINISTRATION', items: [{ id: 'esecef', name: 'Certification e‑MCF', icon: ShieldCheck }, { id: 'utilisateurs', name: 'Équipe & accès', icon: Users }, { id: 'parametres', name: 'Paramètres', icon: Settings2 }] }
];
const sales = [{ id: 'facture-vente', name: 'Nouvelle facture' }, { id: 'facture-avoir', name: 'Avoir / retour' }, { id: 'facture-prestation', name: 'Prestations & ISB' }, { id: 'pending-invoices', name: 'Demandes en attente' }, { id: 'certified-invoices', name: 'Factures certifiées' }];
export function PharmacyNavigation({ activeSection, onSectionChange, canAccess = () => true, name = 'Mon établissement', user = 'Administrateur', onLogout, demo = false }: { activeSection: string; onSectionChange: (s: string) => void; canAccess?: (s: string) => boolean; name?: string; user?: string; onLogout?: () => void; demo?: boolean }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const fit = () => { if (window.innerWidth >= 1024) setOpen(false); };
    window.addEventListener('keydown', close);
    window.addEventListener('resize', fit);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', close); window.removeEventListener('resize', fit); };
  }, [open]);
  const saleActive = activeSection === 'ventes' || sales.some(s => s.id === activeSection);
  function go(id: string) { onSectionChange(id); setOpen(false); }
  return <><button className="ph-mobile" aria-expanded={open} aria-controls="workspace-navigation" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} onClick={() => setOpen(v => !v)}>{open ? <X size={20} /> : <Menu size={20} />}</button>{open && <div className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setOpen(false)} />}<aside id="workspace-navigation" className={'ph-nav ' + (open ? 'open' : '')}><a className="ph-brand" href="/"><span><HeartPulse size={23} /></span><div><strong>PharmaCare<span style={{ color: '#48a982' }}>.</span></strong><small>L’ESSENTIEL, SIMPLEMENT</small></div></a><div className="ph-store"><Store size={17} /><div>{name}<small>{demo ? 'Espace de démonstration' : 'Gestion de votre pharmacie'}</small></div><ChevronDown size={13} style={{ marginLeft: 'auto' }} /></div><nav aria-label="Navigation principale">{groups.map(group => { const items = group.items.filter(i => canAccess(i.id)); return items.length ? <div key={group.label}><p className="ph-nav-label">{group.label}</p>{items.map(item => <div key={item.id}><button className={(activeSection === item.id || item.id === 'ventes' && saleActive) ? 'active' : ''} onClick={() => { go(item.id); if (item.id === 'ventes') setExpanded(v => !v); }}><item.icon size={17} strokeWidth={1.7} />{item.name}{item.id === 'ventes' && <ChevronDown size={12} style={{ marginLeft: 'auto' }} />}</button>{item.id === 'ventes' && (expanded || saleActive) && !demo && <div className="ph-nav-sub">{sales.filter(s => canAccess(s.id)).map(s => <button className={activeSection === s.id ? 'active' : ''} key={s.id} onClick={() => go(s.id)}>{s.name}</button>)}</div>}</div>)}</div> : null; })}</nav><div className="ph-profile"><span>{user.slice(0, 2).toUpperCase()}</span><div>{user}<small>{demo ? 'Aperçu sans connexion' : 'Session de travail'}</small></div>{onLogout && <button onClick={onLogout} aria-label="Déconnexion"><LogOut size={16} /></button>}</div></aside></>;
}
export function WorkspaceHeader({ onNavigate, demo = false }: { onNavigate: (s: string) => void; demo?: boolean }) {
  const [error, setError] = useState('');
  const [examplesActive,setExamplesActive]=useState(false);
  useEffect(()=>{if(!demo)fetch('/api/examples',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>setExamplesActive(!!d?.installed)).catch(()=>{});},[demo]);
  const { configuration } = useFiscalConfiguration();
  useEffect(() => { const listener = (event: Event) => setError((event as CustomEvent<string>).detail); window.addEventListener('pharmacare:error', listener); return () => window.removeEventListener('pharmacare:error', listener); }, []);
  return <><header className="ph-topbar"><span><Store size={14} /> Espace de travail <ChevronDown size={11} /> <strong>{demo ? 'Aperçu PharmaCare' : 'Ma pharmacie'}</strong></span><div>{examplesActive&&<span className="ph-example-badge"><FlaskConical size={14}/>Exemples actifs</span>}{configuration?.environnement === 'test' && <span className="ph-test-badge">DGI · Mode test</span>}<button onClick={() => onNavigate('esecef')}><ShieldCheck size={15} /> Certification</button><button className="new-sale" onClick={() => onNavigate('facture-vente')}><Plus size={14} />Nouvelle vente</button></div></header>{error && <div role="alert" className="cs-notice error" style={{ margin: '15px 25px' }}>{error}<button aria-label="Fermer le message" onClick={() => setError('')} style={{ marginLeft: 'auto' }}><X size={18} /></button></div>}</>;
}
