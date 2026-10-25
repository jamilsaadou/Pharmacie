'use client';
import { ModuleHeading } from '@/components/ui/ModuleHeading';

import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  Star,
  Plus,
  Download,
  Eye,
  Pencil,
  Trash2,
  Phone,
  Mail,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useClientData } from '@/hooks/useClientData';
import { Client } from '@/types';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { AddClientModal } from './AddClientModal';
import { EditClientModal } from './EditClientModal';
import { ViewClientModal } from './ViewClientModal';
import { useAuditLog } from '@/hooks/useAuditLog';

interface ClientManagementProps {
  className?: string;
}

export function ClientManagement({ className = '' }: ClientManagementProps) {
  const {
    clients,
    statistiquesClients,
    rechercherClients,
    supprimerClient,
    calculerAge,
    calculerTotalAchatsClient,
    obtenirHistoriqueClient,
    exporterClients,
  } = useClientData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [sortBy, setSortBy] = useState<'nom' | 'dateInscription' | 'totalAchats'>('nom');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { addLog } = useAuditLog();

  // Filtrer et trier les clients
  const clientsFiltres = useMemo(() => {
    let result = rechercherClients(searchTerm);

    // Trier les clients
    result.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (sortBy) {
        case 'nom':
          valueA = `${a.nom} ${a.prenom}`.toLowerCase();
          valueB = `${b.nom} ${b.prenom}`.toLowerCase();
          break;
        case 'dateInscription':
          valueA = new Date(a.dateInscription).getTime();
          valueB = new Date(b.dateInscription).getTime();
          break;
        case 'totalAchats':
          valueA = calculerTotalAchatsClient(a.id);
          valueB = calculerTotalAchatsClient(b.id);
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [clients, searchTerm, sortBy, sortOrder, rechercherClients, calculerTotalAchatsClient]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleDeleteClient = (client: Client) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le client ${client.prenom} ${client.nom} ?`)) {
      supprimerClient(client.id);
    }
  };

  const handleExport = () => {
    const csv = exporterClients();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `clients_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSortIcon = (field: typeof sortBy) => {
    if (sortBy !== field) return <ArrowUpDown className="inline-block w-4 h-4 ml-1 text-gray-400" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="inline-block w-4 h-4 ml-1 text-emerald-600" /> 
      : <ArrowDown className="inline-block w-4 h-4 ml-1 text-emerald-600" />;
  };

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {statistiquesClients.totalClients}
              </div>
              <div className="text-sm text-gray-600">Total clients</div>
            </div>
            <div className="p-2 rounded-full bg-emerald-100">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {statistiquesClients.nouveauxClientsMois}
              </div>
              <div className="text-sm text-gray-600">Nouveaux ce mois</div>
            </div>
            <div className="p-2 rounded-full bg-emerald-100">
              <UserPlus className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {statistiquesClients.clientsActifs}
              </div>
              <div className="text-sm text-gray-600">Clients actifs</div>
            </div>
            <div className="p-2 rounded-full bg-emerald-100">
              <UserCheck className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {statistiquesClients.clientsFideles.length}
              </div>
              <div className="text-sm text-gray-600">Clients fidèles</div>
            </div>
            <div className="p-2 rounded-full bg-emerald-100">
              <Star className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Barre d'outils */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Rechercher un client (nom, téléphone, email, NIF...)"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddModal(true)}
              variant="primary"
            >
              <Plus className="w-4 h-4 mr-2" /> Nouveau client
            </Button>
            
            <Button
              onClick={handleExport}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" /> Exporter
            </Button>
          </div>
        </div>
      </Card>

      {/* Liste des clients */}
      <Card className="overflow-hidden">
        <div tabIndex={0} role="region" aria-label="Tableau de données à défilement horizontal" className="ph-table-scroll overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('nom')}
                >
                  Client {getSortIcon('nom')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Âge
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('dateInscription')}
                >
                  Inscription {getSortIcon('dateInscription')}
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalAchats')}
                >
                  Total achats {getSortIcon('totalAchats')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Achats
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clientsFiltres.map((client) => {
                const age = calculerAge(client.dateNaissance);
                const totalAchats = calculerTotalAchatsClient(client.id);
                const nombreAchats = client.nombreAchats || 0;
                
                return (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {client.prenom} {client.nom}
                        </div>
                        {client.numeroSecu && (
                          <div className="text-sm text-gray-500">
                            N° Sécu: {client.numeroSecu}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {client.telephone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-500" /> {client.telephone}
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-500" /> {client.email}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {age ? `${age} ans` : '-'}
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(client.dateInscription).toLocaleDateString()}
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {totalAchats.toLocaleString()} FCFA
                      </div>
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        nombreAchats >= 5 
                          ? 'bg-green-100 text-green-800' 
                          : nombreAchats > 0 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {nombreAchats} achat{nombreAchats !== 1 ? 's' : ''}
                      </span>
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button
                          aria-label={`Consulter ${client.prenom} ${client.nom}`}
                          title="Fiche et historique des achats"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedClient(client);
                            setShowViewModal(true);
                            addLog({
                              module: 'clients',
                              action: 'view',
                              targetType: 'Client',
                              targetId: client.id,
                              message: `Consultation du client ${client.prenom} ${client.nom}`,
                            });
                          }}
                          className="hover:bg-emerald-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          aria-label={`Modifier ${client.prenom} ${client.nom}`}
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedClient(client);
                            setShowEditModal(true);
                          }}
                          className="hover:bg-emerald-50"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`Supprimer ${client.prenom} ${client.nom}`}
                          onClick={() => handleDeleteClient(client)}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {clientsFiltres.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Aucun client trouvé pour cette recherche' : 'Aucun client enregistré'}
            </div>
          )}
        </div>
      </Card>

      {/* Modales */}
      <AddClientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
      
      {selectedClient && (
        <>
          <EditClientModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedClient(null);
            }}
            client={selectedClient}
          />
          
          <ViewClientModal
            isOpen={showViewModal}
            onClose={() => {
              setShowViewModal(false);
              setSelectedClient(null);
            }}
            client={selectedClient}
          />
        </>
      )}
    </div>
  );
}
