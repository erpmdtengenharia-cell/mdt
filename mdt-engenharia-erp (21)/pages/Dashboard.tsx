import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Task } from '../types';
import { useAuth } from '../context/AuthContext';
import { Users, FileText, ClipboardList, AlertCircle, TrendingUp, DollarSign, PieChart, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // General Stats
  const [totalClients, setTotalClients] = useState(0);
  const [activeContracts, setActiveContracts] = useState(0);
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([]);
  
  // Financial Stats (Admin Only)
  const [totalContractValue, setTotalContractValue] = useState(0);
  const [totalItemsValue, setTotalItemsValue] = useState(0);
  const [totalMeasuredValue, setTotalMeasuredValue] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, [isAdmin]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Total Clients
      const { count: clientsCount, error: clientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      
      if (clientsError) throw clientsError;
      setTotalClients(clientsCount || 0);

      // 2. Active Contracts
      const { count: contractsCount, error: contractsError } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .not('startDate', 'is', null);

      if (contractsError) throw contractsError;
      setActiveContracts(contractsCount || 0);

      // 3. Urgent Tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .neq('status', 'completed')
        .order('deadline', { ascending: true })
        .limit(5);

      if (tasksError) throw tasksError;
      setUrgentTasks(tasksData || []);

      // 4. Financials (Only if Admin)
      if (isAdmin) {
          // Sum Contract Values
          const { data: contractsData } = await supabase.from('contracts').select('totalValue');
          const sumContracts = contractsData?.reduce((acc, curr) => acc + (Number(curr.totalValue) || 0), 0) || 0;
          setTotalContractValue(sumContracts);

          // Sum Items Values (Allocated/Planned)
          const { data: itemsData } = await supabase.from('service_items').select('totalPrice');
          const sumItems = itemsData?.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0) || 0;
          setTotalItemsValue(sumItems);

          // Sum Measured Values (Executed)
          const { data: measurementsData } = await supabase.from('measurements').select('totalPrice');
          const sumMeasured = measurementsData?.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0) || 0;
          setTotalMeasuredValue(sumMeasured);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const StatCard = ({ title, value, icon: Icon, color, subValue }: any) => (
    <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 flex flex-col justify-between">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md p-3 ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-bold text-gray-900">{value}</div>
              </dd>
              {subValue && <dd className="text-xs text-gray-400 mt-1">{subValue}</dd>}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">Visão geral da MDT Engenharia</p>
        </div>
        <button 
            onClick={fetchDashboardData}
            className="text-sm text-primary-600 hover:text-primary-800 font-medium bg-white px-3 py-1 rounded border border-gray-200 shadow-sm"
        >
            Atualizar dados
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
            {/* --- ADMIN FINANCIAL SECTION --- */}
            {isAdmin && (
                <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                        <DollarSign className="w-5 h-5 mr-2 text-green-600"/>
                        Resumo Financeiro
                    </h3>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard 
                            title="Total Contratos (Carteira)" 
                            value={formatCurrency(totalContractValue)} 
                            icon={TrendingUp} 
                            color="bg-green-600"
                            subValue="Soma de contratos ativos"
                        />
                        <StatCard 
                            title="Itens Planilhados" 
                            value={formatCurrency(totalItemsValue)} 
                            icon={ClipboardList} 
                            color="bg-blue-600"
                            subValue="Soma dos itens inseridos" 
                        />
                        <StatCard 
                            title="Total Executado (Medido)" 
                            value={formatCurrency(totalMeasuredValue)} 
                            icon={Activity} 
                            color="bg-purple-600"
                            subValue="Soma das medições realizadas" 
                        />
                        <StatCard 
                            title="Saldo a Executar" 
                            value={formatCurrency(totalItemsValue - totalMeasuredValue)} 
                            icon={PieChart} 
                            color="bg-orange-500"
                            subValue="Itens Planilhados - Medido"
                        />
                    </div>
                </div>
            )}

            <div className="border-t border-gray-200 my-6"></div>

            {/* --- GENERAL STATS --- */}
            <div>
                 <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Operacional</h3>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <StatCard 
                        title="Total de Clientes" 
                        value={totalClients} 
                        icon={Users} 
                        color="bg-indigo-500" 
                    />
                    <StatCard 
                        title="Contratos Cadastrados" 
                        value={activeContracts} 
                        icon={FileText} 
                        color="bg-cyan-500" 
                    />
                    <StatCard 
                        title="Tarefas Pendentes" 
                        value={urgentTasks.length > 0 ? urgentTasks.length + '+' : '0'} 
                        icon={AlertCircle} 
                        color="bg-rose-500" 
                    />
                </div>
            </div>

            {/* --- URGENT TASKS --- */}
            <div className="bg-white shadow rounded-lg border border-gray-100 overflow-hidden mt-6">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Tarefas Urgentes
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            Próximos vencimentos.
                        </p>
                    </div>
                    <button onClick={() => navigate('/tasks')} className="text-xs font-medium text-primary-600 hover:text-primary-800">Ver todas</button>
                </div>
                <div className="divide-y divide-gray-200">
                    {urgentTasks.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-sm">
                            Nenhuma tarefa pendente encontrada.
                        </div>
                    ) : (
                        urgentTasks.map((task) => (
                            <div key={task.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0">
                                            <AlertCircle className="h-5 w-5 text-rose-500" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {task.title || 'Tarefa sem título'}
                                        </p>
                                    </div>
                                    <div className="ml-2 flex-shrink-0 flex">
                                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {task.status || 'Pendente'}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-2 sm:flex sm:justify-between">
                                    <div className="sm:flex">
                                        <p className="flex items-center text-sm text-gray-500">
                                            {task.description || 'Sem descrição'}
                                        </p>
                                    </div>
                                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                        <CalendarIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                        <p className={
                                            task.deadline && new Date(task.deadline) < new Date() 
                                            ? 'text-red-600 font-bold' 
                                            : ''
                                        }>
                                            {task.deadline ? new Date(task.deadline).toLocaleDateString('pt-BR') : 'Sem prazo'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
      )}
    </div>
  );
};

function CalendarIcon(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}