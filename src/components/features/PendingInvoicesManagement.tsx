'use client';

import { fetchWithRefresh as fetch } from '@/lib/data-refresh';

import { useDataRefresh } from '@/hooks/useDataRefresh';
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import Button from '../ui/Button';
import { CertificationStatus } from '../ui/CertificationStatus';
import Modal from '../ui/Modal';

interface FactureEnAttente {
  id: string;
  numeroFacture: string;
  venteId: string;
  statut: string;
  uid?: string;
  codeSECeFDGI?: string;
  dateTimeCertification?: string;
  errorCode?: string;
  errorDescription?: string;
  tentatives: number;
  derniereTentative?: string;
  dateCreation: string;
  vente: {
    numeroFacture: string;
    date: string;
    total: number;
    client?: {
      nom: string;
      prenom: string;
      telephone?: string;
    };
    vendeur: string;
    itemsCount: number;
  };
}

interface ApiStatus {
  apiStatus?: string;
  version?: string;
  nif?: string;
  nim?: string;
  tokenValid?: string;
  serverDateTime?: string;
  pendingRequestsCount?: number;
  pendingRequestsList?: ApiPendingRequest[];
}

interface ApiPendingRequest {
  date: string;
  uid: string;
}

export function PendingInvoicesManagement() {
  const [factures, setFactures] = useState<FactureEnAttente[]>([]);
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'en_attente' | 'erreur' | 'soumise'>('all');
  const [selectedFacture, setSelectedFacture] = useState<FactureEnAttente | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [apiActionLoading, setApiActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadFactures();
    loadApiStatus();
  }, [filter]);

  const loadFactures = async () => {
    try {
      setLoading(true);
      const url = filter === 'all' 
        ? '/api/invoice/pending/db' 
        : `/api/invoice/pending/db?statut=${filter}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setFactures(data.factures || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des factures:', error);
    } finally {
      setLoading(false);
    }
  };

  useDataRefresh(loadFactures);

  const loadApiStatus = async () => {
    try {
      const response = await fetch('/api/invoice/pending');
      const data = await response.json();
      
      if (data.success) {
        setApiStatus(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du statut API:', error);
    }
  };

  const handleRetry = async (factureId: string) => {
    if (!confirm('Voulez-vous réessayer de certifier cette facture ?')) {
      return;
    }

    try {
      setActionLoading(factureId);
      const response = await fetch('/api/invoice/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factureId })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Facture certifiée avec succès !');
        loadFactures();
      } else {
        alert(`❌ Erreur: ${data.error}\n${data.errorDescription || ''}`);
        loadFactures(); // Recharger pour voir les tentatives mises à jour
      }
    } catch (error) {
      console.error('Erreur lors de la nouvelle tentative:', error);
      alert('❌ Erreur lors de la nouvelle tentative');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (factureId: string, uid?: string) => {
    const facture = factures.find(f => f.id === factureId);
    const hasUid = uid || facture?.uid;
    
    const message = hasUid
      ? 'Voulez-vous annuler cette facture ?\n\n⚠️ Cette action annulera la facture sur l\'API e-SECeF ET en base de données.\nCette action est irréversible.'
      : 'Voulez-vous annuler cette facture en base de données ?\n\nCette action est irréversible.';

    if (!confirm(message)) {
      return;
    }

    try {
      setActionLoading(factureId);
      const response = await fetch('/api/invoice/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factureId, uid: hasUid })
      });

      const data = await response.json();

      if (data.success) {
        const successMessage = data.cancelledOnApi
          ? '✅ Facture annulée sur l\'API e-SECeF et en base de données'
          : '✅ Facture annulée en base de données' + (data.apiError ? `\n⚠️ ${data.apiError}` : '');
        
        alert(successMessage);
        loadFactures();
        
        // Fermer le modal si ouvert
        if (showDetailModal) {
          setShowDetailModal(false);
          setSelectedFacture(null);
        }
      } else {
        alert(`❌ Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error);
      alert('❌ Erreur lors de l\'annulation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelApiPending = async (uid: string) => {
    if (!confirm(`Voulez-vous annuler cette facture en attente sur l'API e-SECeF ?\n\nUID: ${uid}\n\nCette action est irréversible.`)) {
      return;
    }

    try {
      setApiActionLoading(uid);
      const response = await fetch(`/api/invoice/pending/${uid}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Facture annulée avec succès sur l\'API e-SECeF');
        loadApiStatus();
        loadFactures();
      } else {
        alert(`❌ Erreur: ${data.error}\n${data.errorCode ? `Code: ${data.errorCode}` : ''}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'annulation API:', error);
      alert('❌ Erreur lors de l\'annulation');
    } finally {
      setApiActionLoading(null);
    }
  };

  const handleConfirmApiPending = async (uid: string) => {
    if (!confirm(`Voulez-vous confirmer cette facture en attente sur l'API e-SECeF ?\n\nUID: ${uid}\n\nCela va générer les éléments de sécurité (code SECeF/DGI, QR code).`)) {
      return;
    }

    try {
      setApiActionLoading(uid);
      const response = await fetch(`/api/invoice/pending/${uid}`, {
        method: 'PUT',
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Facture confirmée avec succès!\n\nCode SECeF/DGI: ${data.securityElements?.codeSECeFDGI || 'N/A'}`);
        loadApiStatus();
        loadFactures();
      } else {
        alert(`❌ Erreur: ${data.error}\n${data.errorCode ? `Code: ${data.errorCode}` : ''}`);
      }
    } catch (error) {
      console.error('Erreur lors de la confirmation API:', error);
      alert('❌ Erreur lors de la confirmation');
    } finally {
      setApiActionLoading(null);
    }
  };

  const handleCancelAllApiPending = async () => {
    if (!apiStatus?.pendingRequestsList?.length) return;

    if (!confirm(`Voulez-vous annuler TOUTES les ${apiStatus.pendingRequestsCount} factures en attente sur l'API e-SECeF ?\n\nCette action est irréversible.`)) {
      return;
    }

    setApiActionLoading('all');
    let successCount = 0;
    let errorCount = 0;

    for (const pending of apiStatus.pendingRequestsList) {
      try {
        const response = await fetch(`/api/invoice/pending/${pending.uid}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setApiActionLoading(null);
    alert(`Annulation terminée:\n✅ ${successCount} factures annulées\n${errorCount > 0 ? `❌ ${errorCount} erreurs` : ''}`);
    loadApiStatus();
    loadFactures();
  };

  const showDetails = (facture: FactureEnAttente) => {
    setSelectedFacture(facture);
    setShowDetailModal(true);
  };

  const getStatutBadge = (statut: string) => {
    const styles: Record<string, string> = {
      en_attente: 'bg-yellow-100 text-yellow-800',
      soumise: 'bg-blue-100 text-blue-800',
      erreur: 'bg-red-100 text-red-800',
      a_rapprocher: 'bg-orange-100 text-orange-900',
      confirmation_en_cours: 'bg-blue-100 text-blue-800',
      certifiee: 'bg-green-100 text-green-800',
      annulee: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[statut] || 'bg-gray-100 text-gray-800'}`}>
        {statut === 'a_rapprocher' ? 'À VÉRIFIER AVEC LA DGI' : statut.replaceAll('_', ' ').toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredFactures = factures;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Factures en Attente</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gérez les factures en attente de certification ou en erreur
          </p>
        </div>
        <Button onClick={loadFactures} disabled={loading}>
          <span className={loading ? 'animate-spin' : ''}>🔄</span> Actualiser
        </Button>
      </div>

      {/* Statut API e-SECeF */}
      {apiStatus && (
        <Card>
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-3">Statut API e-SECeF</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Statut:</span>
                <p className="font-semibold">{apiStatus.apiStatus ? '🟢 En ligne' : '🔴 Hors ligne'}</p>
              </div>
              <div>
                <span className="text-gray-600">Version:</span>
                <p className="font-semibold">{apiStatus.version}</p>
              </div>
              <div>
                <span className="text-gray-600">NIF:</span>
                <p className="font-semibold">{apiStatus.nif}</p>
              </div>
              <div>
                <span className="text-gray-600">Requêtes en attente sur l'API:</span>
                <p className={`font-semibold ${(apiStatus.pendingRequestsCount || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {apiStatus.pendingRequestsCount || 0}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Factures en attente sur l'API e-SECeF */}
      {apiStatus && apiStatus.pendingRequestsList && apiStatus.pendingRequestsList.length > 0 && (
        <Card>
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg text-orange-700">
                ⚠️ Factures en attente sur l'API e-SECeF ({apiStatus.pendingRequestsCount})
              </h3>
              <Button
                onClick={handleCancelAllApiPending}
                variant="danger"
                disabled={apiActionLoading === 'all'}
              >
                {apiActionLoading === 'all' ? '⏳ Annulation...' : '🗑️ Annuler toutes'}
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Ces factures sont en attente de confirmation ou d'annulation sur le serveur e-SECeF.
              Vous devez les traiter pour pouvoir soumettre de nouvelles factures (max 10 en attente).
            </p>
            <div tabIndex={0} role="region" aria-label="Tableau de données à défilement horizontal" className="ph-table-scroll overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">UID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {apiStatus.pendingRequestsList.map((pending) => (
                    <tr key={pending.uid} className="hover:bg-orange-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-mono text-gray-900">
                        {pending.uid}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                        {new Date(pending.date).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm space-x-2">
                        <Button
                          onClick={() => handleConfirmApiPending(pending.uid)}
                          variant="primary"
                          className="text-xs"
                          disabled={apiActionLoading === pending.uid}
                        >
                          {apiActionLoading === pending.uid ? '⏳' : '✅'} Confirmer
                        </Button>
                        <Button
                          onClick={() => handleCancelApiPending(pending.uid)}
                          variant="danger"
                          className="text-xs"
                          disabled={apiActionLoading === pending.uid}
                        >
                          {apiActionLoading === pending.uid ? '⏳' : '❌'} Annuler
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Filtres */}
      <Card>
        <div className="p-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setFilter('all')}
              variant={filter === 'all' ? 'primary' : 'secondary'}
            >
              Toutes ({factures.length})
            </Button>
            <Button
              onClick={() => setFilter('en_attente')}
              variant={filter === 'en_attente' ? 'primary' : 'secondary'}
            >
              En attente
            </Button>
            <Button
              onClick={() => setFilter('erreur')}
              variant={filter === 'erreur' ? 'primary' : 'secondary'}
            >
              Erreurs
            </Button>
            <Button
              onClick={() => setFilter('soumise')}
              variant={filter === 'soumise' ? 'primary' : 'secondary'}
            >
              Soumises
            </Button>
          </div>
        </div>
      </Card>

      {/* Liste des factures */}
      <Card>
        <div tabIndex={0} role="region" aria-label="Tableau de données à défilement horizontal" className="ph-table-scroll overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">N° Facture</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tentatives</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Chargement...
                  </td>
                </tr>
              ) : filteredFactures.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Aucune facture {filter !== 'all' ? filter : ''} trouvée
                  </td>
                </tr>
              ) : (
                filteredFactures.map((facture) => (
                  <tr key={facture.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {facture.vente.numeroFacture}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(facture.vente.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {facture.vente.client
                        ? `${facture.vente.client.nom} ${facture.vente.client.prenom}`
                        : 'Client anonyme'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      {facture.vente.total.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatutBadge(facture.statut)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className={facture.tentatives > 3 ? 'text-red-600 font-semibold' : ''}>
                        {facture.tentatives}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <Button
                        onClick={() => showDetails(facture)}
                        variant="secondary"
                        className="text-xs"
                      >
                        📋 Détails
                      </Button>
                      {(!facture.uid && (facture.statut === 'en_attente' || facture.statut === 'erreur')) && (
                        <Button
                          onClick={() => handleRetry(facture.id)}
                          variant="primary"
                          className="text-xs"
                          disabled={actionLoading === facture.id}
                        >
                          🔄 Réessayer
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Détails */}
      {selectedFacture && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedFacture(null);
          }}
          title={`Détails - Facture ${selectedFacture.vente.numeroFacture}`}
        >
          <div className="space-y-4">
            {/* Informations générales */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">Informations générales</h4>
              <div className="bg-gray-50 p-3 rounded space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Statut:</span>
                  {getStatutBadge(selectedFacture.statut)}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date création:</span>
                  <span>{formatDate(selectedFacture.dateCreation)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tentatives:</span>
                  <span className="font-semibold">{selectedFacture.tentatives}</span>
                </div>
                {selectedFacture.derniereTentative && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dernière tentative:</span>
                    <span>{formatDate(selectedFacture.derniereTentative)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Vendeur:</span>
                  <span>{selectedFacture.vente.vendeur}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Articles:</span>
                  <span>{selectedFacture.vente.itemsCount}</span>
                </div>
              </div>
            </div>

            {/* Informations client */}
            {selectedFacture.vente.client && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Client</h4>
                <div className="bg-gray-50 p-3 rounded space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nom:</span>
                    <span>{selectedFacture.vente.client.nom} {selectedFacture.vente.client.prenom}</span>
                  </div>
                  {selectedFacture.vente.client.telephone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Téléphone:</span>
                      <span>{selectedFacture.vente.client.telephone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Certification */}
            {selectedFacture.codeSECeFDGI && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Certification e-SECeF</h4>
                <div className="bg-green-50 p-3 rounded space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Code SECeF/DGI:</span>
                    <span className="font-mono text-xs">{selectedFacture.codeSECeFDGI}</span>
                  </div>
                  {selectedFacture.dateTimeCertification && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date certification:</span>
                      <span>{formatDate(selectedFacture.dateTimeCertification)}</span>
                    </div>
                  )}
                  {selectedFacture.uid && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">UID:</span>
                      <span className="font-mono text-xs">{selectedFacture.uid}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Erreur */}
            {selectedFacture.errorDescription && (
              <div>
                <h4 className="font-semibold text-red-700 mb-2">⚠️ Erreur</h4>
                <div className="bg-red-50 p-3 rounded space-y-2 text-sm">
                  {selectedFacture.errorCode && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Code erreur:</span>
                      <span className="font-mono text-xs">{selectedFacture.errorCode}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Description:</span>
                    <p className="mt-1 text-red-800">{selectedFacture.errorDescription}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              {(!selectedFacture.uid && (selectedFacture.statut === 'en_attente' || selectedFacture.statut === 'erreur')) && (
                <>
                  <Button
                    onClick={() => handleRetry(selectedFacture.id)}
                    variant="primary"
                    disabled={actionLoading === selectedFacture.id}
                    className="flex-1"
                  >
                    🔄 Réessayer la certification
                  </Button>
                  <Button
                    onClick={() => handleCancel(selectedFacture.id, selectedFacture.uid || undefined)}
                    variant="secondary"
                    disabled={actionLoading === selectedFacture.id}
                    className="flex-1"
                  >
                    {selectedFacture.uid ? '🚫 Annuler sur e-SECeF' : '❌ Annuler localement'}
                  </Button>
                </>
              )}
              <p className="text-sm text-gray-600">L’historique est conservé. Une demande déjà transmise doit être vérifiée avec la DGI avant toute nouvelle soumission.</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
