import { useDataRefresh } from './useDataRefresh';

import { fetchWithRefresh as fetch } from '@/lib/data-refresh';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Medicament, 
  Vente, 
  Client, 
  Fournisseur, 
  Alerte,
  StatistiquesVente,
  StatistiquesStock
} from '@/types';
import { 
  generateId, 
  generateInvoiceNumber, 
  isLowStock, 
  isExpired, 
  isExpiringSoon,
} from '@/utils';

export function usePharmacieData() {
  const [medicaments, setMedicaments] = useState<Medicament[]>([]);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les données au démarrage
  const loadData = useCallback(async () => {
      try {

        
        // Charger les médicaments
        const medResponse = await fetch('/api/medicaments');
        if (medResponse.ok) {
          const medData = await medResponse.json();
          setMedicaments(medData.map((m: any) => ({
            ...m,
            dateExpiration: new Date(m.dateExpiration),
            dateAjout: new Date(m.dateAjout),
            dateModification: new Date(m.dateModification),
          })));
        }

        // Charger les clients
        const clientResponse = await fetch('/api/clients');
        if (clientResponse.ok) {
          const clientData = await clientResponse.json();
          setClients(clientData.map((c: any) => ({
            ...c,
            dateInscription: new Date(c.dateInscription),
            dateNaissance: c.dateNaissance ? new Date(c.dateNaissance) : undefined,
          })));
        }

        // Charger les ventes
        const venteResponse = await fetch('/api/ventes');
        if (venteResponse.ok) {
          const venteData = await venteResponse.json();
          setVentes(venteData.map((v: any) => ({
            ...v,
            date: new Date(v.date),
          })));
        }

        // Charger les fournisseurs
        const fournisseurResponse = await fetch('/api/fournisseurs');
        if (fournisseurResponse.ok) {
          const fournisseurData = await fournisseurResponse.json();
          setFournisseurs(fournisseurData.map((f: any) => ({
            ...f,
            dateAjout: new Date(f.dateAjout),
          })));
        }
        
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
  }, []);
  useEffect(() => { void loadData(); }, [loadData]);
  useDataRefresh(loadData);

  // Gestion des médicaments
  const ajouterMedicament = useCallback(async (medicament: Omit<Medicament, 'id' | 'dateAjout' | 'dateModification'>) => {
    try {
      const response = await fetch('/api/medicaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(medicament),
      });

      if (response.ok) {
        const nouveauMedicament = await response.json();
        const medicamentFormate: Medicament = {
          ...nouveauMedicament,
          dateExpiration: new Date(nouveauMedicament.dateExpiration),
          dateAjout: new Date(nouveauMedicament.dateAjout),
          dateModification: new Date(nouveauMedicament.dateModification),
        };
        setMedicaments(prev => [...prev, medicamentFormate]);
        return medicamentFormate;
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du médicament:', error);
    }
  }, []);

  const modifierMedicament = useCallback(async (id: string, modifications: Partial<Medicament>) => {
    try {
      const response = await fetch(`/api/medicaments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modifications),
      });

      if (response.ok) {
        const medicamentMisAJour = await response.json();
        setMedicaments(prev => 
          prev.map(med => 
            med.id === id 
              ? {
                  ...medicamentMisAJour,
                  dateExpiration: new Date(medicamentMisAJour.dateExpiration),
                  dateAjout: new Date(medicamentMisAJour.dateAjout),
                  dateModification: new Date(medicamentMisAJour.dateModification),
                }
              : med
          )
        );
      }
    } catch (error) {
      console.error('Erreur lors de la modification du médicament:', error);
    }
  }, []);

  const supprimerMedicament = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/medicaments/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMedicaments(prev => prev.filter(med => med.id !== id));
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du médicament:', error);
    }
  }, []);

  const mettreAJourStock = useCallback(async (id: string, nouvelleQuantite: number) => {
    await modifierMedicament(id, { quantiteStock: nouvelleQuantite });
  }, [modifierMedicament]);

  // Rafraîchir les données (ventes et médicaments)
  const refreshData = useCallback(async () => {
    try {
      const [venteResponse, medResponse] = await Promise.all([
        fetch('/api/ventes'),
        fetch('/api/medicaments'),
      ]);

      if (venteResponse.ok) {
        const venteData = await venteResponse.json();
        setVentes(venteData.map((v: any) => ({
          ...v,
          date: new Date(v.date),
        })));
      }

      if (medResponse.ok) {
        const medData = await medResponse.json();
        setMedicaments(medData.map((m: any) => ({
          ...m,
          dateExpiration: new Date(m.dateExpiration),
          dateAjout: new Date(m.dateAjout),
          dateModification: new Date(m.dateModification),
        })));
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des données:', error);
    }
  }, []);

  // Gestion des ventes
  const ajouterVente = useCallback(async (vente: Omit<Vente, 'id' | 'numeroFacture' | 'date'>) => {
    try {
      const response = await fetch('/api/ventes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vente),
      });

      if (response.ok) {
        const nouvelleVente = await response.json();
        const venteFormatee: Vente = {
          ...nouvelleVente,
          date: new Date(nouvelleVente.date),
        };
        setVentes(prev => [...prev, venteFormatee]);

        // Recharger les médicaments pour mettre à jour les stocks
        const medResponse = await fetch('/api/medicaments');
        if (medResponse.ok) {
          const medData = await medResponse.json();
          setMedicaments(medData.map((m: any) => ({
            ...m,
            dateExpiration: new Date(m.dateExpiration),
            dateAjout: new Date(m.dateAjout),
            dateModification: new Date(m.dateModification),
          })));
        }

        return venteFormatee;
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la vente:', error);
    }
  }, []);

  // Gestion des clients
  const ajouterClient = useCallback(async (client: Omit<Client, 'id' | 'dateInscription'>) => {
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(client),
      });

      if (response.ok) {
        const nouveauClient = await response.json();
        const clientFormate: Client = {
          ...nouveauClient,
          dateInscription: new Date(nouveauClient.dateInscription),
          dateNaissance: nouveauClient.dateNaissance ? new Date(nouveauClient.dateNaissance) : undefined,
        };
        setClients(prev => [...prev, clientFormate]);
        return clientFormate;
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du client:', error);
    }
  }, []);

  const modifierClient = useCallback(async (id: string, modifications: Partial<Client>) => {
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modifications),
      });

      if (response.ok) {
        const clientMisAJour = await response.json();
        setClients(prev => 
          prev.map(client => 
            client.id === id 
              ? {
                  ...clientMisAJour,
                  dateInscription: new Date(clientMisAJour.dateInscription),
                  dateNaissance: clientMisAJour.dateNaissance ? new Date(clientMisAJour.dateNaissance) : undefined,
                }
              : client
          )
        );
      }
    } catch (error) {
      console.error('Erreur lors de la modification du client:', error);
    }
  }, []);

  const supprimerClient = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setClients(prev => prev.filter(client => client.id !== id));
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du client:', error);
    }
  }, []);

  // Gestion des fournisseurs
  const ajouterFournisseur = useCallback(async (fournisseur: Omit<Fournisseur, 'id' | 'dateAjout'>) => {
    try {
      const response = await fetch('/api/fournisseurs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fournisseur),
      });

      if (response.ok) {
        const nouveauFournisseur = await response.json();
        const fournisseurFormate: Fournisseur = {
          ...nouveauFournisseur,
          dateAjout: new Date(nouveauFournisseur.dateAjout),
        };
        setFournisseurs(prev => [...prev, fournisseurFormate]);
        return fournisseurFormate;
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du fournisseur:', error);
    }
  }, []);

  // Calcul des alertes
  const alertes = useMemo((): Alerte[] => {
    const alertesRupture: Alerte[] = medicaments
      .filter(med => med.quantiteStock === 0)
      .map(med => ({
        id: generateId(),
        type: 'rupture' as const,
        medicament: med,
        message: `Rupture de stock pour ${med.nom}`,
        date: new Date(),
        lue: false,
        priorite: 'haute' as const,
      }));

    const alertesStock: Alerte[] = medicaments
      .filter(med => med.quantiteStock > 0 && isLowStock(med.quantiteStock, med.seuilAlerte))
      .map(med => ({
        id: generateId(),
        type: 'stock_faible' as const,
        medicament: med,
        message: `Stock faible pour ${med.nom} (${med.quantiteStock} restant)`,
        date: new Date(),
        lue: false,
        priorite: 'moyenne' as const,
      }));

    const alertesExpiration: Alerte[] = medicaments
      .filter(med => isExpiringSoon(med.dateExpiration) || isExpired(med.dateExpiration))
      .map(med => ({
        id: generateId(),
        type: 'expiration' as const,
        medicament: med,
        message: isExpired(med.dateExpiration)
          ? `${med.nom} est expiré`
          : `${med.nom} expire bientôt`,
        date: new Date(),
        lue: false,
        priorite: isExpired(med.dateExpiration) ? 'haute' as const : 'moyenne' as const,
      }));

    return [...alertesRupture, ...alertesStock, ...alertesExpiration];
  }, [medicaments]);

  // Calcul des statistiques de vente
  const statistiquesVente = useMemo((): StatistiquesVente => {
    const validated=ventes.filter(v=>v.statut==='terminee'&&v.factureESECeF?.statut==='certifiee');
    const signed=(v:Vente)=>(['FA','EA'].includes(v.typeFacture||'')?-1:1)*Math.abs(v.total);
    const aujourd = new Date();
    const debutMois = new Date(aujourd.getFullYear(), aujourd.getMonth(), 1);
    const debutAnnee = new Date(aujourd.getFullYear(), 0, 1);

    const ventesAujourdhui = validated.filter(vente => 
      vente.date.toDateString() === aujourd.toDateString()
    );
    
    const ventesDuMois = validated.filter(vente => 
      vente.date >= debutMois
    );
    
    const ventesAnnuelles = validated.filter(vente => 
      vente.date >= debutAnnee
    );

    // Médicaments les plus vendus
    const ventesParMedicament = new Map<string, { medicament: Medicament; quantite: number }>();
    
    validated.forEach(vente => {
      vente.items.forEach(item => {
        if (!item.medicamentId) return;
        const existing = ventesParMedicament.get(item.medicamentId);
        if (existing) {
          existing.quantite += item.quantite;
        } else {
          const med = item.medicament ?? medicaments.find(m => m.id === item.medicamentId);
          if (med) {
            ventesParMedicament.set(item.medicamentId, {
              medicament: med,
              quantite: item.quantite,
            });
          }
        }
      });
    });

    const medicamentsPlusVendus = Array.from(ventesParMedicament.values())
      .sort((a, b) => b.quantite - a.quantite)
      .slice(0, 5)
      .map(item => ({
        medicament: item.medicament,
        quantiteVendue: item.quantite,
      }));

    return {
      ventesDuJour: ventesAujourdhui.reduce((sum, vente) => sum + signed(vente), 0),
      ventesDuMois: ventesDuMois.reduce((sum, vente) => sum + signed(vente), 0),
      ventesAnnuelles: ventesAnnuelles.reduce((sum, vente) => sum + signed(vente), 0),
      nombreTransactions: validated.length,
      medicamentsPlusVendus,
    };
  }, [ventes, medicaments]);

  // Calcul des statistiques de stock
  const statistiquesStock = useMemo((): StatistiquesStock => {
    const stockFaible = medicaments.filter(med => isLowStock(med.quantiteStock, med.seuilAlerte));
    const medicamentsExpires = medicaments.filter(med => isExpired(med.dateExpiration));
    const valeurTotaleStock = medicaments.reduce((sum, med) => sum + (med.prix * med.quantiteStock), 0);

    const alertesStock = stockFaible.map(med => ({
      medicament: med,
      quantiteRestante: med.quantiteStock,
    }));

    return {
      totalMedicaments: medicaments.length,
      stockFaible: stockFaible.length,
      medicamentsExpires: medicamentsExpires.length,
      valeurTotaleStock,
      alertesStock,
    };
  }, [medicaments]);

  return {
    // Données
    medicaments,
    ventes,
    clients,
    fournisseurs,
    alertes,
    loading,
    
    // Actions médicaments
    ajouterMedicament,
    modifierMedicament,
    supprimerMedicament,
    mettreAJourStock,
    
    // Actions ventes
    ajouterVente,
    refreshData,
    
    // Actions clients
    ajouterClient,
    modifierClient,
    supprimerClient,
    
    // Actions fournisseurs
    ajouterFournisseur,
    
    // Statistiques
    statistiquesVente,
    statistiquesStock,
  };
}
