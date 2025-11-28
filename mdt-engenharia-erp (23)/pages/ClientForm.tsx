import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Client, Contract, ServiceItem, Measurement, MeasurementAttachment, Task, ContractAttachment, Profile, ServiceItemComment } from '../types';
import { Save, ArrowLeft, Plus, Trash2, Ruler, X, AlertCircle, FileText, ClipboardList, Download, Printer, ExternalLink, MessageSquare, UploadCloud, ChevronRight, Briefcase, Calendar, User, CheckCircle, Clock, Send, Link as LinkIcon, Paperclip, Pencil } from 'lucide-react';
import { exportToCSV, printElement } from '../utils/exporter';

export const ClientForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, profile } = useAuth();
  const isNew = id === undefined || id === 'new';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // --- Client State ---
  const [client, setClient] = useState<Partial<Client>>({
    name: '',
    address: '',
    neighborhood: '',
    city: '',
    whatsapp: '',
    email: '',
    responsible: '',
    registrationNumber: '',
    minutesNumber: '',
    registrationDate: '',
    deadline: '',
    userCreated: profile?.name
  });

  // --- Contracts State (Multiple) ---
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [contractFormData, setContractFormData] = useState<Partial<Contract>>({
      contractNumber: '', processNumber: '', description: 'Novo Contrato', contractDescription: '', totalValue: 0
  });

  // --- Sub-data State (Items, Tasks, Docs) ---
  const [activeTab, setActiveTab] = useState<'items' | 'tasks' | 'docs'>('items');
  const [items, setItems] = useState<(ServiceItem & { totalMeasured?: number })[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contractDocs, setContractDocs] = useState<ContractAttachment[]>([]);
  const [users, setUsers] = useState<Profile[]>([]); 

  // --- UI States ---
  const [newItem, setNewItem] = useState<Partial<ServiceItem>>({ description: '', unit: 'UN', quantity: 1, unitPrice: 0, totalPrice: 0 });
  
  // --- Edit Item Modal State ---
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);

  // --- Measurement Modal States ---
  const [activeItemForMeasurement, setActiveItemForMeasurement] = useState<ServiceItem | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [newMeasurement, setNewMeasurement] = useState({ date: new Date().toISOString().split('T')[0], quantity: 0, description: '' });
  const [measurementFile, setMeasurementFile] = useState<File | null>(null);
  const [uploadingMeasurement, setUploadingMeasurement] = useState(false);

  // --- Workflow (OS) Modal States ---
  const [activeItemForWorkflow, setActiveItemForWorkflow] = useState<ServiceItem | null>(null);
  const [workflowComments, setWorkflowComments] = useState<ServiceItemComment[]>([]);
  const [newWorkflowComment, setNewWorkflowComment] = useState('');
  const [workflowAttachments, setWorkflowAttachments] = useState<any[]>([]); 
  const [workflowFile, setWorkflowFile] = useState<File | null>(null);
  const [uploadingWorkflowDoc, setUploadingWorkflowDoc] = useState(false);

  // --- Task Modal States ---
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('');

  // --- Document Modal States ---
  const [newDocName, setNewDocName] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => {
    if (!isNew && id) {
      fetchClientData(id);
      fetchUsers();
    }
  }, [id, isNew]);

  useEffect(() => {
    if (selectedContractId) {
        fetchContractDetails(selectedContractId);
        const selected = contracts.find(c => c.id === selectedContractId);
        if (selected) {
            setContractFormData(selected);
        }
    } else {
        setItems([]);
        setTasks([]);
        setContractDocs([]);
    }
  }, [selectedContractId]);

  const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('*');
      if (data) setUsers(data);
  };

  const fetchClientData = async (clientId: string) => {
    setLoading(true);
    try {
      const { data: clientData, error: clientError } = await supabase.from('clients').select('*').eq('id', clientId).single();
      if (clientError) throw clientError;
      setClient(clientData);

      const { data: contractsData, error: contractError } = await supabase.from('contracts').select('*').eq('clientId', clientId).order('id', { ascending: true });
      if (contractError) throw contractError;

      if (contractsData && contractsData.length > 0) {
        setContracts(contractsData);
        setSelectedContractId(contractsData[0].id);
      } else {
         setContracts([]);
         setSelectedContractId('new'); 
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchContractDetails = async (contractId: string) => {
      if (contractId === 'new') {
          setItems([]); setTasks([]); setContractDocs([]);
          return;
      }

      const { data: itemsData } = await supabase.from('service_items').select('*').eq('contractId', contractId).order('date', { ascending: false });
      if (itemsData) {
        const itemsWithMeasurement = await Promise.all(itemsData.map(async (item) => {
            const { data: meas } = await supabase.from('measurements').select('quantity').eq('itemId', item.id);
            const totalMeasured = meas?.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0) || 0;
            return { ...item, totalMeasured };
        }));
        setItems(itemsWithMeasurement);
      }

      const { data: tasksData } = await supabase.from('tasks').select('*').eq('contractId', contractId).order('deadline', { ascending: true });
      if (tasksData) setTasks(tasksData);

      const { data: docsData } = await supabase.from('contract_attachments').select('*').eq('contractId', contractId);
      if (docsData) setContractDocs(docsData);
  };

  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClient(prev => ({ ...prev, [name]: value }));
  };

  const saveClient = async () => {
    if (!client.name) {
        setError("Nome do cliente é obrigatório.");
        window.scrollTo(0, 0);
        return;
    }
    setLoading(true);
    setError(null);

    try {
      const clientPayload = {
        name: client.name,
        responsible: client.responsible || null,
        email: client.email || null,
        whatsapp: client.whatsapp || null,
        city: client.city || null,
        address: client.address || null,
        neighborhood: client.neighborhood || null,
        registrationNumber: client.registrationNumber || null,
        minutesNumber: client.minutesNumber || null,
        deadline: client.deadline ? client.deadline : null,
        registrationDate: client.registrationDate ? client.registrationDate : null,
        userCreated: profile?.name || 'Sistema'
      };

      if (isNew) {
        const { data, error } = await supabase.from('clients').insert([clientPayload]).select().single();
        if (error) throw error;
        navigate(`/client/${data.id}`, { replace: true });
      } else {
        const { error } = await supabase.from('clients').update(clientPayload).eq('id', id!);
        if (error) throw error;
        alert("Cliente atualizado com sucesso!");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao salvar cliente.");
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };

  const handleContractChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContractFormData(prev => ({ ...prev, [name]: value }));
  };

  const saveContract = async () => {
      if (!id) return;
      try {
          const payload = {
              clientId: id,
              description: contractFormData.description || 'Novo Contrato',
              contractDescription: contractFormData.contractDescription,
              contractNumber: contractFormData.contractNumber,
              processNumber: contractFormData.processNumber,
              totalValue: parseFloat(contractFormData.totalValue?.toString() || '0'),
              startDate: contractFormData.startDate || null,
              endDate: contractFormData.endDate || null,
          };

          if (selectedContractId && selectedContractId !== 'new') {
              const { error } = await supabase.from('contracts').update(payload).eq('id', selectedContractId);
              if (error) throw error;
              alert("Contrato atualizado!");
              setContracts(prev => prev.map(c => c.id === selectedContractId ? { ...c, ...payload } : c));
          } else {
              const { data, error } = await supabase.from('contracts').insert([payload]).select().single();
              if (error) throw error;
              alert("Contrato criado!");
              setContracts(prev => [...prev, data]);
              setSelectedContractId(data.id);
          }
      } catch (err: any) {
          alert("Erro: " + err.message);
      }
  };

  const addNewContract = () => {
      setContractFormData({ description: 'Novo Contrato', contractDescription: '', contractNumber: '', processNumber: '', totalValue: 0 });
      setSelectedContractId('new');
  };

  const handleAddItem = async () => {
    if (!selectedContractId || selectedContractId === 'new') return alert("Salve o contrato primeiro.");
    try {
      const qty = Number(newItem.quantity);
      const price = isAdmin ? Number(newItem.unitPrice || 0) : 0;
      const { error } = await supabase.from('service_items').insert([{
        contractId: selectedContractId,
        description: newItem.description,
        unit: newItem.unit,
        quantity: qty,
        unitPrice: price,
        totalPrice: qty * price,
        date: new Date().toISOString(),
        userCreated: profile?.name,
        status: 'pending' // Default status
      }]);
      if (error) throw error;
      fetchContractDetails(selectedContractId);
      setNewItem({ description: '', unit: 'UN', quantity: 1, unitPrice: 0, totalPrice: 0 });
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- EDIT ITEM LOGIC ---
  const openEditItemModal = (item: ServiceItem) => {
      setEditingItem(item);
  };

  const handleUpdateItem = async () => {
      if (!editingItem) return;
      try {
          const qty = Number(editingItem.quantity);
          const price = Number(editingItem.unitPrice);
          const total = qty * price;

          const { error } = await supabase.from('service_items').update({
              description: editingItem.description,
              unit: editingItem.unit,
              quantity: qty,
              unitPrice: price,
              totalPrice: total
          }).eq('id', editingItem.id);

          if (error) throw error;
          alert("Item atualizado!");
          setEditingItem(null);
          if (selectedContractId) fetchContractDetails(selectedContractId);
      } catch (e: any) {
          alert("Erro ao atualizar item: " + e.message);
      }
  };

  const handleCreateTask = async () => {
      if (!selectedContractId || selectedContractId === 'new') return;
      if (!newTaskTitle) return alert("Título obrigatório");
      
      const { error } = await supabase.from('tasks').insert([{
          title: newTaskTitle,
          status: 'pending',
          assignedTo: newTaskAssignedTo,
          createdBy: profile?.name,
          clientId: id,
          contractId: selectedContractId,
          description: `Tarefa criada no contrato: ${contractFormData.description}`
      }]);
      if (error) alert("Erro ao criar tarefa");
      else {
          setNewTaskTitle('');
          setNewTaskAssignedTo('');
          fetchContractDetails(selectedContractId);
      }
  };

  const uploadFileToSupabase = async (file: File, bucket: string = 'documents'): Promise<string | null> => {
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
              .from(bucket)
              .upload(fileName, file);
          
          if (uploadError) {
              console.error(uploadError);
              alert(`Erro ao fazer upload. Verifique se o bucket '${bucket}' existe e é público no Supabase.`);
              return null;
          }

          const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
          return data.publicUrl;
      } catch (e) {
          console.error(e);
          return null;
      }
  };

  const handleAddDoc = async () => {
      if (!selectedContractId || selectedContractId === 'new') return;
      if (!newDocName) return alert("Preencha o nome do documento");
      if (!docFile) return alert("Selecione um arquivo");

      setUploadingDoc(true);
      const url = await uploadFileToSupabase(docFile);
      setUploadingDoc(false);

      if (!url) return;

      const { error } = await supabase.from('contract_attachments').insert([{
          contractId: selectedContractId,
          name: newDocName,
          url: url,
          type: 'file',
          uploadedBy: profile?.name
      }]);
      if (!error) {
          setNewDocName(''); setDocFile(null);
          fetchContractDetails(selectedContractId);
      }
  };

  const openMeasurementModal = async (item: ServiceItem) => {
      setActiveItemForMeasurement(item);
      setNewMeasurement({ date: new Date().toISOString().split('T')[0], quantity: 0, description: '' });
      setMeasurementFile(null);
      const { data } = await supabase.from('measurements').select('*').eq('itemId', item.id).order('date', { ascending: false });
      setMeasurements(data || []);
  };

  const saveMeasurement = async () => {
      if (!activeItemForMeasurement) return;
      try {
          setUploadingMeasurement(true);
          const unitPrice = activeItemForMeasurement.unitPrice || 0;
          const payload = {
              itemId: activeItemForMeasurement.id,
              date: newMeasurement.date,
              quantity: newMeasurement.quantity,
              unitPrice: unitPrice,
              totalPrice: Number(newMeasurement.quantity) * unitPrice,
              userCreated: profile?.name,
              description: newMeasurement.description
          };
          const { data, error } = await supabase.from('measurements').insert([payload]).select().single();
          if (error) throw error;

          if (measurementFile) {
               const url = await uploadFileToSupabase(measurementFile);
               if (url) {
                   await supabase.from('measurement_attachments').insert([{
                       measurementId: data.id,
                       name: 'Comprovante',
                       url: url,
                       type: 'file',
                       uploadedBy: profile?.name
                   }]);
               }
          }

          const { data: updatedHistory } = await supabase.from('measurements').select('*').eq('itemId', activeItemForMeasurement.id).order('date', { ascending: false });
          setMeasurements(updatedHistory || []);
          if (selectedContractId) fetchContractDetails(selectedContractId);
          setNewMeasurement(prev => ({ ...prev, quantity: 0, description: '' }));
          setMeasurementFile(null);
      } catch (err: any) { 
          alert(err.message); 
      } finally {
          setUploadingMeasurement(false);
      }
  };

  // --- WORKFLOW LOGIC ---
  
  const fetchWorkflowData = async (itemId: string) => {
      // Fetch Comments
      const { data: comments } = await supabase
        .from('service_item_comments')
        .select('*')
        .eq('itemId', itemId)
        .order('date', { ascending: true });
      
      // Fetch Attachments
      const { data: attachments } = await supabase
        .from('service_item_attachments')
        .select('*')
        .eq('itemId', itemId);
        
      setWorkflowComments(comments || []);
      setWorkflowAttachments(attachments || []);
  };

  const openWorkflowModal = async (item: ServiceItem) => {
      setActiveItemForWorkflow(item);
      fetchWorkflowData(item.id);
  };

  const handleWorkflowChange = (field: keyof ServiceItem, value: any) => {
      if (!activeItemForWorkflow) return;
      // If date is cleared, set to null
      const safeValue = (value === '' && field.toLowerCase().includes('date')) ? null : value;
      setActiveItemForWorkflow(prev => prev ? ({ ...prev, [field]: safeValue }) : null);
  };

  const saveWorkflow = async () => {
      if (!activeItemForWorkflow) return;
      
      const btn = document.getElementById('btn-save-workflow');
      const originalText = btn?.innerText;
      if (btn) btn.innerText = "Salvando...";

      try {
          // 1. Update OS Fields
          const { error: updateError } = await supabase.from('service_items').update({
              receptionDate: activeItemForWorkflow.receptionDate,
              internalDeadline: activeItemForWorkflow.internalDeadline,
              clientDeadline: activeItemForWorkflow.clientDeadline,
              executorId: activeItemForWorkflow.executorId,
              startReviewDate: activeItemForWorkflow.startReviewDate,
              endReviewDate: activeItemForWorkflow.endReviewDate,
              supervisorObservation: activeItemForWorkflow.supervisorObservation,
              status: activeItemForWorkflow.status,
              clientApprovalDate: activeItemForWorkflow.clientApprovalDate,
              artEmissionDate: activeItemForWorkflow.artEmissionDate,
              invoiceEmissionDate: activeItemForWorkflow.invoiceEmissionDate,
              billingDeadline: activeItemForWorkflow.billingDeadline
          }).eq('id', activeItemForWorkflow.id);

          if (updateError) throw updateError;

          // 2. Save Pending Comment
          if (newWorkflowComment.trim()) {
              const { error: commentError } = await supabase.from('service_item_comments').insert([{
                  itemId: activeItemForWorkflow.id,
                  text: newWorkflowComment,
                  author: profile?.name || 'Usuário',
                  date: new Date().toISOString()
              }]);
              if (commentError) {
                  console.error("Error saving comment:", commentError);
                  alert(`Erro ao salvar comentário: ${commentError.message} (Verifique permissões no Supabase)`);
              } else {
                  setNewWorkflowComment('');
              }
          }

          // 3. Save Pending Attachment
          if (workflowFile) {
             const url = await uploadFileToSupabase(workflowFile);
             if (url) {
                  const { error: attachError } = await supabase.from('service_item_attachments').insert([{
                      itemId: activeItemForWorkflow.id,
                      name: workflowFile.name,
                      url: url,
                      type: 'file',
                      uploadedBy: profile?.name || 'Usuário'
                  }]);
                  if (attachError) {
                      console.error("Error saving attachment:", attachError);
                      alert(`Erro ao salvar anexo: ${attachError.message} (Verifique permissões no Supabase)`);
                  } else {
                      setWorkflowFile(null);
                  }
             }
          }

          // Refresh Data
          await fetchWorkflowData(activeItemForWorkflow.id);
          if (selectedContractId) fetchContractDetails(selectedContractId);
          alert("Fluxo da OS atualizado com sucesso!");

      } catch (e: any) {
          alert("Erro crítico ao salvar fluxo: " + e.message);
      } finally {
          if (btn && originalText) btn.innerText = originalText;
      }
  };

  const addWorkflowComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeItemForWorkflow || !newWorkflowComment.trim()) return;
      
      try {
          const { error } = await supabase.from('service_item_comments').insert([{
              itemId: activeItemForWorkflow.id,
              text: newWorkflowComment,
              author: profile?.name || 'Usuário',
              date: new Date().toISOString()
          }]);

          if (error) throw error;

          fetchWorkflowData(activeItemForWorkflow.id);
          setNewWorkflowComment('');
      } catch (err: any) {
          console.error("Error saving comment:", err);
          alert(`Erro ao salvar comentário: ${err.message}. Verifique se a tabela 'service_item_comments' existe e tem permissão.`);
      }
  };

  const addWorkflowAttachment = async () => {
      if (!activeItemForWorkflow || !workflowFile) return alert("Selecione um arquivo");
      setUploadingWorkflowDoc(true);
      
      try {
          const url = await uploadFileToSupabase(workflowFile);
          
          if (url) {
              const { error } = await supabase.from('service_item_attachments').insert([{
                  itemId: activeItemForWorkflow.id,
                  name: workflowFile.name,
                  url: url,
                  type: 'file',
                  uploadedBy: profile?.name || 'Usuário'
              }]);
              
              if (error) throw error;

              fetchWorkflowData(activeItemForWorkflow.id);
              setWorkflowFile(null);
          }
      } catch (err: any) {
          console.error("Error saving attachment:", err);
          alert(`Erro ao salvar anexo: ${err.message}. Verifique permissões.`);
      } finally {
          setUploadingWorkflowDoc(false);
      }
  };

  const formatCurrency = (val: any) => !isAdmin ? 'R$ --.--' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  if (loading && !client.name && !isNew) return <div className="p-8">Carregando...</div>;

  return (
    <div className="space-y-6 pb-20 bg-gray-50">
        <div className="flex items-center justify-between">
            <button onClick={() => navigate('/clients')} className="flex items-center text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </button>
            <div className="flex gap-2">
                 {isAdmin && (
                    <>
                        <button onClick={() => exportToCSV('items.csv', items)} className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded border border-green-200 hover:bg-green-100">
                            <Download className="w-4 h-4 mr-1"/> Excel
                        </button>
                        <button onClick={() => printElement('contract-content')} className="flex items-center text-gray-600 bg-gray-100 px-3 py-1 rounded border border-gray-300 hover:bg-gray-200">
                            <Printer className="w-4 h-4 mr-1"/> PDF
                        </button>
                    </>
                 )}
            </div>
        </div>

        {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                </div>
            </div>
        )}

        {/* --- CLIENT INFO --- */}
        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
             <h2 className="text-lg font-bold text-gray-900 mb-4">Dados do Cliente</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <input className={`input-field border rounded p-2 ${!isAdmin && 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} disabled={!isAdmin} name="name" value={client.name || ''} onChange={handleClientChange} placeholder="Nome do Cliente" />
                 <input className={`input-field border rounded p-2 ${!isAdmin && 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} disabled={!isAdmin} name="responsible" value={client.responsible || ''} onChange={handleClientChange} placeholder="Responsável" />
                 <input className={`input-field border rounded p-2 ${!isAdmin && 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} disabled={!isAdmin} name="email" value={client.email || ''} onChange={handleClientChange} placeholder="Email" />
                 
                 <input className={`input-field border rounded p-2 ${!isAdmin && 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} disabled={!isAdmin} name="whatsapp" value={client.whatsapp || ''} onChange={handleClientChange} placeholder="Whatsapp" />
                 <input className={`input-field border rounded p-2 ${!isAdmin && 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} disabled={!isAdmin} name="city" value={client.city || ''} onChange={handleClientChange} placeholder="Cidade" />
                 <input className={`input-field border rounded p-2 ${!isAdmin && 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} disabled={!isAdmin} name="address" value={client.address || ''} onChange={handleClientChange} placeholder="Endereço" />
                 
                 <input className={`input-field border rounded p-2 ${!isAdmin && 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} disabled={!isAdmin} name="neighborhood" value={client.neighborhood || ''} onChange={handleClientChange} placeholder="Bairro" />
                 <input className={`input-field border rounded p-2 ${!isAdmin && 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} disabled={!isAdmin} name="registrationNumber" value={client.registrationNumber || ''} onChange={handleClientChange} placeholder="Nr Registro" />
                 <input className={`input-field border rounded p-2 ${!isAdmin && 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} disabled={!isAdmin} name="minutesNumber" value={client.minutesNumber || ''} onChange={handleClientChange} placeholder="Nr ATA" />

                 <div className="flex flex-col">
                     <span className="text-xs text-gray-500">Data Registro</span>
                     <input type="date" className={`border rounded p-2 ${!isAdmin && 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} disabled={!isAdmin} name="registrationDate" value={client.registrationDate || ''} onChange={handleClientChange} />
                 </div>
                 <div className="flex flex-col">
                     <span className="text-xs text-gray-500">Prazo</span>
                     <input type="date" className={`border rounded p-2 ${!isAdmin && 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} disabled={!isAdmin} name="deadline" value={client.deadline || ''} onChange={handleClientChange} />
                 </div>
             </div>
             {isAdmin && (
                <div className="mt-4 flex justify-end">
                    <button onClick={saveClient} className="bg-primary-600 text-white px-4 py-2 rounded shadow hover:bg-primary-700"><Save className="w-4 h-4 inline mr-2"/> Salvar Cliente</button>
                </div>
             )}
        </div>

        {/* --- CONTRACTS & DETAILS SECTION --- */}
        {!isNew && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
                
                {/* LEFT COLUMN: CONTRACT LIST (SIDEBAR) */}
                <div className="lg:col-span-3 bg-white shadow rounded-lg border border-gray-200 overflow-hidden sticky top-24">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 text-sm">Contratos</h3>
                        {isAdmin && (
                            <button onClick={addNewContract} className="text-green-600 hover:text-green-800 bg-green-50 p-1 rounded transition-colors" title="Novo Contrato">
                                <Plus className="w-5 h-5"/>
                            </button>
                        )}
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                        {contracts.map(c => (
                            <button 
                                key={c.id} 
                                onClick={() => setSelectedContractId(c.id)}
                                className={`w-full text-left px-4 py-3 text-sm transition-all border-l-4 flex justify-between items-center group ${
                                    selectedContractId === c.id 
                                        ? 'border-primary-500 bg-primary-50 text-primary-900' 
                                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                                <div className="truncate pr-2">
                                    <div className="font-medium truncate" title={c.description || ''}>{c.description || 'Contrato Sem Nome'}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{c.contractNumber || 'S/N'}</div>
                                </div>
                                {selectedContractId === c.id && <ChevronRight className="w-4 h-4 text-primary-500 flex-shrink-0" />}
                            </button>
                        ))}
                        {contracts.length === 0 && (
                            <div className="p-8 text-xs text-center text-gray-500 italic">
                                Nenhum contrato cadastrado.
                                {isAdmin && <><br/>Click em + para adicionar.</>}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: CONTRACT DETAILS & CONTENT */}
                <div className="lg:col-span-9 space-y-6" id="contract-content">
                    
                    {/* Contract Details Form */}
                    <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
                        <h3 className="text-md font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 flex items-center">
                             <FileText className="w-5 h-5 mr-2 text-primary-600"/>
                             {selectedContractId === 'new' ? 'Novo Contrato' : 'Detalhes do Contrato'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                    <label className="text-xs text-gray-500 font-semibold uppercase">Nome/Objeto</label>
                                    <input className={`w-full border rounded p-2 mt-1 ${!isAdmin && 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} disabled={!isAdmin} name="description" value={contractFormData.description || ''} onChange={handleContractChange} />
                            </div>
                            <div>
                                    <label className="text-xs text-gray-500 font-semibold uppercase">Número</label>
                                    <input className={`w-full border rounded p-2 mt-1 ${!isAdmin && 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} disabled={!isAdmin} name="contractNumber" value={contractFormData.contractNumber || ''} onChange={handleContractChange} />
                            </div>
                            <div>
                                    <label className="text-xs text-gray-500 font-semibold uppercase">Valor Total</label>
                                    {isAdmin ? (
                                    <input type="number" className="w-full border rounded p-2 mt-1" name="totalValue" value={contractFormData.totalValue || ''} onChange={handleContractChange} />
                                    ) : <div className="p-2 mt-1 bg-gray-100 rounded text-gray-500 border border-transparent">R$ --.--</div>}
                            </div>
                            <div className="md:col-span-4">
                                <label className="text-xs text-gray-500 font-semibold uppercase">Descrição do Contrato</label>
                                <textarea 
                                    className={`w-full border rounded p-2 mt-1 ${!isAdmin && 'bg-gray-100 text-gray-500 cursor-not-allowed'}`} 
                                    disabled={!isAdmin} 
                                    rows={3}
                                    name="contractDescription" 
                                    value={contractFormData.contractDescription || ''} 
                                    onChange={handleContractChange}
                                    placeholder="Detalhes adicionais sobre o contrato..."
                                />
                            </div>
                        </div>
                        {isAdmin && (
                            <div className="mt-4 flex justify-end">
                                <button onClick={saveContract} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 text-sm font-medium flex items-center">
                                    <Save className="w-4 h-4 mr-2"/> Salvar Dados do Contrato
                                </button>
                            </div>
                        )}
                    </div>

                    {/* TABS & CONTENT */}
                    {selectedContractId && selectedContractId !== 'new' && (
                        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                            <div className="flex border-b border-gray-200 bg-gray-50">
                                    <button onClick={() => setActiveTab('items')} className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${activeTab === 'items' ? 'bg-white border-t-2 border-primary-500 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>Itens & Medições</button>
                                    <button onClick={() => setActiveTab('tasks')} className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${activeTab === 'tasks' ? 'bg-white border-t-2 border-primary-500 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>Tarefas</button>
                                    <button onClick={() => setActiveTab('docs')} className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${activeTab === 'docs' ? 'bg-white border-t-2 border-primary-500 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>Documentos</button>
                            </div>

                            {/* ITEMS TAB */}
                            {activeTab === 'items' && (
                                <div className="p-4">
                                    {isAdmin && (
                                        <div className="flex gap-2 mb-4 items-end bg-blue-50 p-3 rounded border border-blue-100 flex-wrap">
                                            <div className="flex-grow min-w-[200px]">
                                                <label className="text-xs text-blue-800 font-semibold uppercase">Descrição</label>
                                                <input className="w-full border border-blue-200 rounded p-2 text-sm" placeholder="Ex: Mão de obra" name="description" value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})} />
                                            </div>
                                            <div className="w-20">
                                                <label className="text-xs text-blue-800 font-semibold uppercase">Unid</label>
                                                <select className="w-full border border-blue-200 rounded p-2 text-sm" name="unit" value={newItem.unit || 'UN'} onChange={(e) => setNewItem({...newItem, unit: e.target.value})} >
                                                    {['UN','M','M2','M3','KG','HR','DIA','SV'].map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                            </div>
                                            <div className="w-24">
                                                <label className="text-xs text-blue-800 font-semibold uppercase">Qtd</label>
                                                <input type="number" className="w-full border border-blue-200 rounded p-2 text-sm" placeholder="0" name="quantity" value={newItem.quantity ?? ''} onChange={(e) => setNewItem({...newItem, quantity: parseFloat(e.target.value)})} />
                                            </div>
                                            <div className="w-28">
                                                <label className="text-xs text-blue-800 font-semibold uppercase">Valor Unit</label>
                                                <input type="number" className="w-full border border-blue-200 rounded p-2 text-sm" placeholder="0.00" name="unitPrice" value={newItem.unitPrice ?? ''} onChange={(e) => setNewItem({...newItem, unitPrice: parseFloat(e.target.value)})} />
                                            </div>
                                            <div>
                                                <button onClick={handleAddItem} className="bg-primary-600 text-white p-2 rounded shadow hover:bg-primary-700 mt-5"><Plus className="w-5 h-5"/></button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qtd</th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-blue-600 uppercase">Medido</th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-green-600 uppercase">Saldo</th>
                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {items.length === 0 ? (
                                                    <tr><td colSpan={6} className="text-center py-4 text-gray-400 italic">Nenhum item cadastrado.</td></tr>
                                                ) : items.map(item => {
                                                    const measured = item.totalMeasured || 0;
                                                    const balance = (item.quantity || 0) - measured;
                                                    return (
                                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-3 py-2 font-medium text-gray-800">{item.description}</td>
                                                            <td className="px-3 py-2 text-right">{item.quantity} {item.unit}</td>
                                                            <td className="px-3 py-2 text-right text-blue-600 font-bold">{measured}</td>
                                                            <td className="px-3 py-2 text-right text-green-600 font-bold">{balance}</td>
                                                            <td className="px-3 py-2 text-right font-mono text-gray-600">{formatCurrency(item.totalPrice)}</td>
                                                            <td className="px-3 py-2 text-right flex justify-end gap-2">
                                                                <button onClick={() => openWorkflowModal(item)} className="text-purple-600 hover:text-white hover:bg-purple-600 border border-purple-200 bg-purple-50 px-3 py-1 rounded text-xs flex items-center transition-colors">
                                                                    <Briefcase className="w-3 h-3 mr-1"/> Fluxo OS
                                                                </button>
                                                                {isAdmin && (
                                                                    <button onClick={() => openEditItemModal(item)} className="text-yellow-600 hover:text-white hover:bg-yellow-600 border border-yellow-200 bg-yellow-50 px-3 py-1 rounded text-xs flex items-center transition-colors">
                                                                        <Pencil className="w-3 h-3"/>
                                                                    </button>
                                                                )}
                                                                <button onClick={() => openMeasurementModal(item)} className="text-primary-600 hover:text-white hover:bg-primary-600 border border-primary-200 bg-primary-50 px-3 py-1 rounded text-xs flex items-center transition-colors">
                                                                    <Ruler className="w-3 h-3 mr-1"/> Medir
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TASKS TAB */}
                            {activeTab === 'tasks' && (
                                <div className="p-4">
                                    <div className="flex gap-2 mb-4 bg-gray-50 p-3 rounded">
                                        <input className="flex-grow border rounded p-2 text-sm" placeholder="Nova Tarefa para este contrato..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
                                        <select className="border rounded p-2 text-sm w-40" value={newTaskAssignedTo} onChange={e => setNewTaskAssignedTo(e.target.value)}>
                                            <option value="">Atribuir a...</option>
                                            {users.map(u => <option key={u.id} value={u.name || ''}>{u.name}</option>)}
                                        </select>
                                        <button onClick={handleCreateTask} className="bg-primary-600 text-white px-3 py-2 rounded text-sm hover:bg-primary-700">Adicionar</button>
                                    </div>
                                    <div className="space-y-2">
                                        {tasks.map(task => (
                                            <div key={task.id} className="border border-gray-200 p-3 rounded flex justify-between items-center bg-white hover:shadow-sm transition-shadow">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium text-gray-800">{task.title}</p>
                                                        <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{task.status}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">Atribuído: {task.assignedTo || 'Ninguém'}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => navigate('/tasks')} className="text-primary-600 hover:text-primary-800 bg-primary-50 p-2 rounded-full">
                                                        <MessageSquare className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {tasks.length === 0 && <p className="text-gray-500 text-sm italic text-center py-4">Nenhuma tarefa para este contrato.</p>}
                                    </div>
                                </div>
                            )}

                            {/* DOCS TAB */}
                            {activeTab === 'docs' && (
                                <div className="p-4">
                                    <div className="flex gap-2 mb-4 items-center bg-gray-50 p-3 rounded">
                                        <input className="flex-1 border rounded p-2 text-sm" placeholder="Nome do Documento" value={newDocName} onChange={e => setNewDocName(e.target.value)} />
                                        <input 
                                            type="file" 
                                            className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-white file:text-primary-700 hover:file:bg-primary-50"
                                            onChange={e => setDocFile(e.target.files ? e.target.files[0] : null)}
                                        />
                                        <button onClick={handleAddDoc} disabled={uploadingDoc} className="bg-primary-600 text-white px-3 py-2 rounded text-sm disabled:opacity-50 hover:bg-primary-700">
                                            {uploadingDoc ? 'Enviando...' : <Plus className="w-4 h-4"/>}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {contractDocs.map(doc => (
                                            <div key={doc.id} className="flex items-center justify-between border p-3 rounded bg-white hover:border-primary-300 transition-colors">
                                                <div className="flex items-center truncate">
                                                    <div className="bg-red-50 p-2 rounded mr-3">
                                                        <FileText className="w-5 h-5 text-red-500"/>
                                                    </div>
                                                    <div className="truncate">
                                                        <span className="text-sm font-medium text-gray-800 truncate block">{doc.name}</span>
                                                        <span className="text-xs text-gray-400">{new Date(doc.date).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <a href={doc.url} target="_blank" className="text-primary-600 hover:text-primary-800 text-xs font-medium flex items-center bg-primary-50 px-2 py-1 rounded">
                                                    <ExternalLink className="w-3 h-3 mr-1"/> Abrir
                                                </a>
                                            </div>
                                        ))}
                                        {contractDocs.length === 0 && <p className="text-gray-500 text-sm italic col-span-2 text-center py-4">Nenhum documento anexado.</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* --- MEASUREMENT MODAL --- */}
        {activeItemForMeasurement && (
            <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-60 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                     <div className="bg-primary-700 p-4 border-b border-primary-800 flex justify-between items-center text-white">
                         <h3 className="font-bold text-sm flex items-center">
                            <Ruler className="w-4 h-4 mr-2"/>
                            Medição: {activeItemForMeasurement.description}
                         </h3>
                         <button onClick={() => setActiveItemForMeasurement(null)} className="hover:text-gray-300"><X className="w-5 h-5"/></button>
                     </div>
                     <div className="p-6 space-y-4 overflow-y-auto bg-gray-50">
                         <div className="bg-white p-4 rounded shadow-sm space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Data</label>
                                    <input type="date" className="w-full border rounded p-2 text-sm mt-1" value={newMeasurement.date} onChange={e => setNewMeasurement({...newMeasurement, date: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Qtd ({activeItemForMeasurement.unit})</label>
                                    <input type="number" className="w-full border rounded p-2 text-sm mt-1" value={newMeasurement.quantity} onChange={e => setNewMeasurement({...newMeasurement, quantity: parseFloat(e.target.value)})}/>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Observações</label>
                                <textarea className="w-full border rounded p-2 text-sm mt-1" rows={2} value={newMeasurement.description || ''} onChange={e => setNewMeasurement({...newMeasurement, description: e.target.value})} placeholder="Detalhes da execução..."></textarea>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Anexar Comprovante</label>
                                <div className="flex items-center border rounded p-1 bg-gray-50">
                                    <UploadCloud className="w-4 h-4 text-gray-400 mr-2 ml-1"/>
                                    <input 
                                        type="file" 
                                        className="w-full text-xs text-gray-500"
                                        onChange={e => setMeasurementFile(e.target.files ? e.target.files[0] : null)}
                                    />
                                </div>
                            </div>
                            <button onClick={saveMeasurement} disabled={uploadingMeasurement} className="w-full bg-primary-600 text-white py-2 rounded shadow hover:bg-primary-700 disabled:opacity-50 font-medium">
                                {uploadingMeasurement ? 'Enviando e Salvando...' : 'Registrar Medição'}
                            </button>
                         </div>

                         <div className="mt-4 pt-2">
                             <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase flex items-center">
                                 <ClipboardList className="w-3 h-3 mr-1"/> Histórico
                             </h4>
                             <div className="space-y-2">
                                {measurements.map(m => (
                                    <div key={m.id} className="text-sm bg-white p-3 rounded border border-gray-200 shadow-sm">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-medium text-gray-800">{new Date(m.date || '').toLocaleDateString()}</span>
                                            <span className="font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded text-xs">{m.quantity} {activeItemForMeasurement.unit}</span>
                                        </div>
                                        {m.description && <p className="text-xs text-gray-500 italic border-l-2 border-gray-300 pl-2">{m.description}</p>}
                                    </div>
                                ))}
                                {measurements.length === 0 && <p className="text-center text-gray-400 text-xs py-2">Nenhuma medição anterior.</p>}
                             </div>
                         </div>
                     </div>
                </div>
            </div>
        )}

        {/* --- EDIT ITEM MODAL --- */}
        {editingItem && (
            <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-60 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                    <div className="bg-yellow-600 p-4 border-b border-yellow-700 flex justify-between items-center text-white">
                        <h3 className="font-bold text-sm flex items-center">
                            <Pencil className="w-4 h-4 mr-2"/>
                            Editar Item
                        </h3>
                        <button onClick={() => setEditingItem(null)} className="hover:text-gray-300"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="p-6 bg-gray-50">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Descrição</label>
                                <input className="w-full border rounded p-2 text-sm mt-1" value={editingItem.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Unidade</label>
                                    <select className="w-full border rounded p-2 text-sm mt-1" value={editingItem.unit || 'UN'} onChange={e => setEditingItem({...editingItem, unit: e.target.value})}>
                                        {['UN','M','M2','M3','KG','HR','DIA','SV'].map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Qtd</label>
                                    <input type="number" className="w-full border rounded p-2 text-sm mt-1" value={editingItem.quantity || 0} onChange={e => setEditingItem({...editingItem, quantity: parseFloat(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Preço Unit</label>
                                    <input type="number" className="w-full border rounded p-2 text-sm mt-1" value={editingItem.unitPrice || 0} onChange={e => setEditingItem({...editingItem, unitPrice: parseFloat(e.target.value)})} />
                                </div>
                            </div>
                            <div className="pt-2">
                                <button onClick={handleUpdateItem} className="w-full bg-yellow-600 text-white py-2 rounded shadow hover:bg-yellow-700 font-medium">Salvar Alterações</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --- WORKFLOW (OS) MODAL --- */}
        {activeItemForWorkflow && (
            <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-70 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="bg-purple-700 p-4 border-b border-purple-800 flex justify-between items-center text-white">
                        <div>
                            <h3 className="font-bold text-lg flex items-center">
                                <Briefcase className="w-5 h-5 mr-2"/>
                                Fluxo de Trabalho OS
                            </h3>
                            <p className="text-xs text-purple-100 mt-1 opacity-90">{activeItemForWorkflow.description}</p>
                        </div>
                        <button onClick={() => setActiveItemForWorkflow(null)} className="hover:text-purple-200 transition-colors"><X className="w-6 h-6"/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col md:flex-row">
                        {/* LEFT COLUMN: TIMELINE & STATUS */}
                        <div className="md:w-7/12 p-6 space-y-6 border-r border-gray-200">
                            {/* --- STATUS & EXECUTOR --- */}
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center"><User className="w-4 h-4 mr-1"/> Responsáveis e Status</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 font-semibold block mb-1">Executor</label>
                                        <select 
                                            className="w-full border rounded p-2 text-sm bg-gray-50 disabled:bg-gray-100"
                                            value={activeItemForWorkflow.executorId || ''}
                                            onChange={(e) => handleWorkflowChange('executorId', e.target.value)}
                                            disabled={!isAdmin}
                                        >
                                            <option value="">Selecione...</option>
                                            {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-semibold block mb-1">Status Atual</label>
                                        <select 
                                            className="w-full border rounded p-2 text-sm bg-white font-medium"
                                            value={activeItemForWorkflow.status || 'pending'}
                                            onChange={(e) => handleWorkflowChange('status', e.target.value)}
                                        >
                                            <option value="pending">Pendente</option>
                                            <option value="in_progress">Em Execução</option>
                                            <option value="conference">Conferência</option>
                                            <option value="review">Revisão</option>
                                            <option value="approved">Aprovado</option>
                                            <option value="delivered">Entregue</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* --- TIMELINE --- */}
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center"><Clock className="w-4 h-4 mr-1"/> Timeline do Projeto</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <label className="text-xs text-gray-400 block">Data Recebimento OS</label>
                                        <input type="date" className="w-full border rounded p-1.5 mt-1" value={activeItemForWorkflow.receptionDate || ''} onChange={(e) => handleWorkflowChange('receptionDate', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block">Prazo Interno</label>
                                        <input type="date" className="w-full border rounded p-1.5 mt-1" value={activeItemForWorkflow.internalDeadline || ''} onChange={(e) => handleWorkflowChange('internalDeadline', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block">Início Revisão</label>
                                        <input type="date" className="w-full border rounded p-1.5 mt-1" value={activeItemForWorkflow.startReviewDate || ''} onChange={(e) => handleWorkflowChange('startReviewDate', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block">Fim Revisão</label>
                                        <input type="date" className="w-full border rounded p-1.5 mt-1" value={activeItemForWorkflow.endReviewDate || ''} onChange={(e) => handleWorkflowChange('endReviewDate', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* --- FINANCIAL / DELIVERY --- */}
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Entrega e Financeiro</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <label className="text-xs text-gray-400 block">Aprovação Cliente</label>
                                        <input type="date" className="w-full border rounded p-1.5 mt-1" value={activeItemForWorkflow.clientApprovalDate || ''} onChange={(e) => handleWorkflowChange('clientApprovalDate', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block">Emissão ART</label>
                                        <input type="date" className="w-full border rounded p-1.5 mt-1" value={activeItemForWorkflow.artEmissionDate || ''} onChange={(e) => handleWorkflowChange('artEmissionDate', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block">Envio NF</label>
                                        <input type="date" className="w-full border rounded p-1.5 mt-1" value={activeItemForWorkflow.invoiceEmissionDate || ''} onChange={(e) => handleWorkflowChange('invoiceEmissionDate', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block">Limite Faturamento</label>
                                        <input type="date" className="w-full border rounded p-1.5 mt-1" value={activeItemForWorkflow.billingDeadline || ''} onChange={(e) => handleWorkflowChange('billingDeadline', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                <label className="text-xs font-bold text-yellow-800 uppercase mb-1 block">Observações do Supervisor</label>
                                <textarea 
                                    className="w-full border border-yellow-300 rounded p-2 text-sm bg-white" 
                                    rows={3}
                                    value={activeItemForWorkflow.supervisorObservation || ''}
                                    onChange={(e) => handleWorkflowChange('supervisorObservation', e.target.value)}
                                    placeholder="Correções, aprovações ou notas importantes..."
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: CHAT & FILES */}
                        <div className="md:w-5/12 p-0 flex flex-col bg-white h-[500px] md:h-auto">
                            {/* TABS */}
                            <div className="flex border-b border-gray-200">
                                <div className="flex-1 py-3 text-center text-sm font-bold text-gray-700 border-b-2 border-purple-500 bg-purple-50">Chat & Arquivos</div>
                            </div>

                            {/* CHAT AREA */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50" style={{maxHeight: '300px'}}>
                                {workflowComments.length === 0 && <p className="text-center text-gray-400 text-xs mt-4">Nenhum comentário nesta OS.</p>}
                                {workflowComments.map(c => {
                                    const isMe = c.author === profile?.name;
                                    return (
                                        <div key={c.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[90%] rounded-lg p-2.5 text-sm border shadow-sm ${isMe ? 'bg-purple-50 border-purple-100' : 'bg-white border-gray-100'}`}>
                                                <div className="flex justify-between items-baseline gap-2 mb-1">
                                                    <span className="font-bold text-xs text-gray-800">{c.author}</span>
                                                    <span className="text-[10px] text-gray-400">{new Date(c.date).toLocaleDateString()} {new Date(c.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                                <p className="text-gray-700 leading-snug">{c.text}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {/* INPUT AREA */}
                            <div className="p-3 border-t border-gray-200 bg-white">
                                <div className="flex gap-2 mb-4">
                                    <input 
                                        className="flex-1 border rounded-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="Comentar sobre esta OS..."
                                        value={newWorkflowComment}
                                        onChange={e => setNewWorkflowComment(e.target.value)}
                                    />
                                    {/* Botão de Enviar Comentário (opcional, já que o salvar geral faz isso) */}
                                    <button type="button" onClick={addWorkflowComment} className="bg-gray-200 text-gray-600 p-1.5 rounded-full hover:bg-gray-300" title="Enviar apenas comentário"><Send className="w-4 h-4"/></button>
                                </div>

                                {/* FILES AREA */}
                                <div className="border-t pt-3">
                                    <h5 className="text-xs font-bold text-gray-500 mb-2 flex items-center"><Paperclip className="w-3 h-3 mr-1"/> Arquivos da OS</h5>
                                    <div className="flex gap-2 mb-2">
                                        <input 
                                            type="file" 
                                            className="flex-1 text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700"
                                            onChange={e => setWorkflowFile(e.target.files ? e.target.files[0] : null)}
                                        />
                                        {/* Botão de Enviar Arquivo (opcional) */}
                                        <button onClick={addWorkflowAttachment} disabled={uploadingWorkflowDoc} className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded" title="Enviar apenas arquivo">
                                            {uploadingWorkflowDoc ? '...' : <Plus className="w-3 h-3"/>}
                                        </button>
                                    </div>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {workflowAttachments.map(att => (
                                            <div key={att.id} className="flex justify-between items-center text-xs bg-gray-50 p-1.5 rounded border border-gray-200">
                                                <span className="truncate max-w-[150px]">{att.name}</span>
                                                <a href={att.url} target="_blank" className="text-blue-600 hover:underline">Abrir</a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end">
                        <button 
                            id="btn-save-workflow"
                            onClick={saveWorkflow} 
                            className="bg-purple-600 text-white px-6 py-2 rounded shadow hover:bg-purple-700 font-medium text-sm flex items-center"
                        >
                            <Save className="w-4 h-4 mr-2"/> Salvar Alterações da OS
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};