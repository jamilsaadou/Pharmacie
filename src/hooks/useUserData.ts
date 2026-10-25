'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ModuleId, Role, Utilisateur, VentesAccessId } from '@/types';
import { ALL_VENTES_ACCESS, VENTES_ACCESS_OPTIONS } from '@/constants/ventesAccess';

type ModuleDef = { id: ModuleId; label: string };

const MODULES: ModuleDef[] = [
  { id: 'caisse', label: 'Caisse' },
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'stock', label: 'Gestion Stock' },
  { id: 'rayons', label: 'Gestion Rayons' },
  { id: 'ventes', label: 'Gestion des Ventes' },
  { id: 'clients', label: 'Clients' },
  { id: 'commandes', label: 'Commandes' },
  { id: 'assurances', label: 'Assurances' },
  { id: 'remboursements', label: 'Remboursements' },
  { id: 'fournisseurs', label: 'Fournisseurs' },
  { id: 'statistiques', label: 'Statistiques' },
  { id: 'rapports', label: 'Rapports fiscaux' },
  { id: 'alertes', label: 'Alertes' },
  { id: 'esecef', label: 'e-SECeF' },
  { id: 'utilisateurs', label: 'Utilisateurs' },
  { id: 'logs', label: 'Journal' },
  { id: 'parametres', label: 'Paramètres' },
];

const ROLE_MODULES: Record<Role, ModuleId[]> = {
  admin: MODULES.map((m) => m.id),
  pharmacien: ['caisse',
    'dashboard',
    'stock',
    'rayons',
    'ventes',
    'clients',
    'commandes',
    'fournisseurs',
    'assurances',
    'remboursements',
    'alertes',
    'statistiques',
    'rapports',
    'logs',
  ],
  vendeur: ['caisse','dashboard', 'ventes', 'clients', 'alertes'],
};

export function useUserData() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modulesDisponibles = MODULES;

  // Charger les utilisateurs depuis l'API
  const loadUtilisateurs = useCallback(async (autoSelectFirst = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/utilisateurs');
      
      if (response.status === 401) {
        setUtilisateurs([]);
        setCurrentUserId(null);
        return;
      }
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des utilisateurs');
      }
      
      const data = await response.json();
      
      // Convertir les dates ISO en objets Date
      const utilisateursFormatted = data.map((u: any) => ({
        ...u,
        dateCreation: new Date(u.dateCreation),
      }));
      
      setUtilisateurs(utilisateursFormatted);
      
      // Si pas d'utilisateur courant, vérifier le localStorage
      if (!currentUserId && utilisateursFormatted.length > 0) {
        const storedUserId = localStorage.getItem('currentUserId');
        if (storedUserId) {
          const userExists = utilisateursFormatted.find((u: Utilisateur) => u.id === storedUserId);
          if (userExists) {
            setCurrentUserId(storedUserId);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur lors du chargement des utilisateurs:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Charger les utilisateurs au montage (sans auto-sélection)
  useEffect(() => {
    loadUtilisateurs(false);
  }, []);

  // Synchroniser les instances du hook après connexion ou déconnexion.
  useEffect(() => {
    const syncSession = () => {
      const id = localStorage.getItem('currentUserId');
      setCurrentUserId(id);
      if (id) void loadUtilisateurs(false);
      else setUtilisateurs([]);
    };
    window.addEventListener('pharmacare:session', syncSession);
    return () => window.removeEventListener('pharmacare:session', syncSession);
  }, [loadUtilisateurs]);

  // Sauvegarder l'utilisateur courant dans localStorage
  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem('currentUserId', currentUserId);
    }
  }, [currentUserId]);

  const getUserModules = useCallback((user: Utilisateur | null | undefined) => {
    if (!user) return [] as ModuleId[];
    const base = ROLE_MODULES[user.role] || [];
    const extras = user.modulesSupplementaires || [];
    const set = new Set<ModuleId>([...base, ...extras]);
    return Array.from(set);
  }, []);

  const utilisateurCourant = useMemo(() => {
    return utilisateurs.find((u) => u.id === currentUserId) || null;
  }, [utilisateurs, currentUserId]);

  const modulesUtilisateurCourant = useMemo(
    () => getUserModules(utilisateurCourant),
    [utilisateurCourant, getUserModules]
  );

  const hasAccess = useCallback(
    (moduleId: ModuleId) => modulesUtilisateurCourant.includes(moduleId),
    [modulesUtilisateurCourant]
  );

  const getUserVentesAccess = useCallback((user: Utilisateur | null | undefined) => {
    if (!user) return [] as VentesAccessId[];
    const stored = user.ventesAccess;
    if (!stored) return ALL_VENTES_ACCESS;
    return stored;
  }, []);

  const hasVentesAccess = useCallback(
    (id: VentesAccessId) => {
      if (!hasAccess('ventes')) return false;
      return getUserVentesAccess(utilisateurCourant).includes(id);
    },
    [hasAccess, getUserVentesAccess, utilisateurCourant]
  );

  // CRUD utilisateurs
  const ajouterUtilisateur = useCallback(
    async (data: Omit<Utilisateur, 'id' | 'dateCreation'> & { motDePasse: string }) => {
      try {
        const response = await fetch('/api/utilisateurs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...data,
            currentUserId: utilisateurCourant?.id,
            currentUserName: utilisateurCourant ? `${utilisateurCourant.prenom} ${utilisateurCourant.nom}` : undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la création de l\'utilisateur');
        }

        const newUser = await response.json();
        const userFormatted = {
          ...newUser,
          dateCreation: new Date(newUser.dateCreation),
        };
        
        setUtilisateurs((prev) => [...prev, userFormatted]);
        return userFormatted;
      } catch (err) {
        console.error('Erreur lors de la création de l\'utilisateur:', err);
        throw err;
      }
    },
    [utilisateurCourant]
  );

  const modifierUtilisateur = useCallback(
    async (id: string, modifications: Partial<Omit<Utilisateur, 'id' | 'dateCreation'>>) => {
      try {
        const response = await fetch(`/api/utilisateurs/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...modifications,
            currentUserId: utilisateurCourant?.id,
            currentUserName: utilisateurCourant ? `${utilisateurCourant.prenom} ${utilisateurCourant.nom}` : undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la modification de l\'utilisateur');
        }

        const updatedUser = await response.json();
        const userFormatted = {
          ...updatedUser,
          dateCreation: new Date(updatedUser.dateCreation),
        };
        
        setUtilisateurs((prev) =>
          prev.map((u) => (u.id === id ? userFormatted : u))
        );
      } catch (err) {
        console.error('Erreur lors de la modification de l\'utilisateur:', err);
        throw err;
      }
    },
    [utilisateurCourant]
  );

  const supprimerUtilisateur = useCallback(
    async (id: string) => {
      try {
        const currentUser = utilisateurCourant;
        const params = new URLSearchParams({
          currentUserId: currentUser?.id || '',
          currentUserName: currentUser ? `${currentUser.prenom} ${currentUser.nom}` : '',
        });

        const response = await fetch(`/api/utilisateurs/${id}?${params.toString()}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la suppression de l\'utilisateur');
        }

        setUtilisateurs((prev) => prev.filter((u) => u.id !== id));
        
        // Si l'utilisateur supprimé est l'utilisateur courant, basculer vers le premier disponible
        if (currentUserId === id) {
          const remaining = utilisateurs.filter(u => u.id !== id);
          setCurrentUserId(remaining[0]?.id || null);
        }
      } catch (err) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', err);
        throw err;
      }
    },
    [utilisateurCourant, currentUserId, utilisateurs]
  );

  const definirUtilisateurCourant = useCallback(
    (id: string) => setCurrentUserId(id),
    []
  );

  const libelleModule = useCallback((id: ModuleId) => {
    return MODULES.find((m) => m.id === id)?.label ?? id;
  }, []);

  const libelleVenteAccess = useCallback((id: VentesAccessId) => {
    return VENTES_ACCESS_OPTIONS.find((option) => option.id === id)?.label ?? id;
  }, []);

  // Fonction de connexion
  const login = useCallback(async (email: string, motDePasse: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, motDePasse }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la connexion');
      }

      const data = await response.json();
      const user = {
        ...data.utilisateur,
        dateCreation: new Date(data.utilisateur.dateCreation),
      };
      
      localStorage.setItem('currentUserId', user.id);
      setCurrentUserId(user.id);
      window.dispatchEvent(new Event('pharmacare:session'));
      
      // Recharger les utilisateurs pour être à jour (sans auto-sélection)
      await loadUtilisateurs(false);
      
      return user;
    } catch (err) {
      console.error('Erreur lors de la connexion:', err);
      throw err;
    }
  }, [loadUtilisateurs]);

  // Fonction de déconnexion
  const logout = useCallback(async () => {
    try {
      if (utilisateurCourant) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: utilisateurCourant.id,
            userName: `${utilisateurCourant.prenom} ${utilisateurCourant.nom}`,
          }),
        });
      }
      
      setCurrentUserId(null);
      localStorage.removeItem('currentUserId');
      window.dispatchEvent(new Event('pharmacare:session'));
    } catch (err) {
      console.error('Erreur lors de la déconnexion:', err);
      // Déconnecter quand même localement
      setCurrentUserId(null);
      localStorage.removeItem('currentUserId');
      window.dispatchEvent(new Event('pharmacare:session'));
    }
  }, [utilisateurCourant]);

  return {
    // data
    utilisateurs,
    utilisateurCourant,
    currentUserId,
    modulesDisponibles,
    modulesUtilisateurCourant,
    loading,
    error,

    // access helpers
    hasAccess,
    hasVentesAccess,
    getUserModules,
    getUserVentesAccess,
    libelleModule,
    libelleVenteAccess,

    // actions
    ajouterUtilisateur,
    modifierUtilisateur,
    supprimerUtilisateur,
    definirUtilisateurCourant,
    login,
    logout,
    reload: loadUtilisateurs,
  };
}
