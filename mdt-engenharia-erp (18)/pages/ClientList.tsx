import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Client } from '../types';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MapPin, Calendar, FileText } from 'lucide-react';

export const ClientList: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie os clientes e seus respectivos itens de serviço.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          {isAdmin && (
            <button
                onClick={() => navigate('/client/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Novo Cliente
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative rounded-md shadow-sm max-w-lg">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2"
          placeholder="Buscar por nome ou cidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Client List */}
      {loading ? (
        <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">Nenhum cliente encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              onClick={() => navigate(`/client/${client.id}`)}
              className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 group-hover:text-primary-700 truncate">
                        {client.name}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {client.registrationNumber || 'Sem Registro'}
                    </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="truncate">
                            {client.city ? `${client.city}` : 'Cidade não informada'} 
                            {client.neighborhood && ` - ${client.neighborhood}`}
                        </span>
                    </div>
                    <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-gray-400" />
                        <span>ATA: {client.minutesNumber || '-'}</span>
                    </div>
                    {client.deadline && (
                         <div className="flex items-center text-orange-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>Prazo: {new Date(client.deadline).toLocaleDateString('pt-BR')}</span>
                        </div>
                    )}
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-4 sm:px-6 border-t border-gray-100">
                <div className="text-sm">
                  <span className="font-medium text-primary-600 hover:text-primary-500">
                    Ver detalhes &rarr;
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};