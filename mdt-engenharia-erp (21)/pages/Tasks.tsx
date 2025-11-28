import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Task, TaskComment, TaskAttachment, Profile, Client, Contract } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, Clock, CheckCircle, AlertCircle, MessageSquare, Paperclip, User as UserIcon, Send, Link as LinkIcon, X, UploadCloud } from 'lucide-react';

export const Tasks: React.FC = () => {
    const { profile } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<Profile[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // New Task State
    const [newTask, setNewTask] = useState<Partial<Task>>({
        title: '',
        description: '',
        status: 'pending',
        assignedTo: '',
        deadline: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        // Fetch Tasks
        const { data: tasksData } = await supabase.from('tasks').select('*').order('deadline', { ascending: true });
        if (tasksData) setTasks(tasksData);

        // Fetch Users for delegation
        const { data: usersData } = await supabase.from('profiles').select('*');
        if (usersData) setUsers(usersData);

        // Fetch Clients for context
        const { data: clientsData } = await supabase.from('clients').select('id, name');
        if (clientsData) setClients(clientsData);

        // Fetch Contracts for context
        const { data: contractsData } = await supabase.from('contracts').select('id, clientId, description');
        if (contractsData) setContracts(contractsData);

        setLoading(false);
    };

    const handleCreateTask = async () => {
        if (!newTask.title) return alert("Título é obrigatório");
        
        const taskPayload = {
            ...newTask,
            createdBy: profile?.name,
            status: 'pending'
        };

        const { error } = await supabase.from('tasks').insert([taskPayload]);
        if (error) {
            alert("Erro ao criar tarefa");
        } else {
            setIsModalOpen(false);
            setNewTask({ title: '', description: '', status: 'pending', assignedTo: '', deadline: '' });
            fetchData();
        }
    };

    const updateTaskStatus = async (taskId: string, newStatus: string) => {
        await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
        fetchData();
    };

    const getClientName = (clientId: string | null) => {
        if (!clientId) return '';
        return clients.find(c => c.id === clientId)?.name || '';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestão de Tarefas</h1>
                    <p className="text-gray-500">Acompanhe e delegue tarefas da equipe.</p>
                </div>
                <button 
                    onClick={() => { setSelectedTask(null); setIsModalOpen(true); }}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Nova Tarefa
                </button>
            </div>

            {/* Kanban-ish Board */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['pending', 'in_progress', 'completed'].map((status) => (
                    <div key={status} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="font-semibold text-gray-700 mb-4 capitalize flex items-center">
                            {status === 'pending' && <Clock className="w-4 h-4 mr-2 text-orange-500" />}
                            {status === 'in_progress' && <AlertCircle className="w-4 h-4 mr-2 text-blue-500" />}
                            {status === 'completed' && <CheckCircle className="w-4 h-4 mr-2 text-green-500" />}
                            {status === 'pending' ? 'Pendentes' : status === 'in_progress' ? 'Em Andamento' : 'Concluídas'}
                            <span className="ml-2 bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                                {tasks.filter(t => t.status === status).length}
                            </span>
                        </h3>
                        <div className="space-y-3">
                            {tasks.filter(t => t.status === status).map(task => (
                                <div 
                                    key={task.id} 
                                    onClick={() => setSelectedTask(task)}
                                    className="bg-white p-3 rounded shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{task.title}</h4>
                                        {task.deadline && (
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${new Date(task.deadline) < new Date() && status !== 'completed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                                                {new Date(task.deadline).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{task.description}</p>
                                    <div className="flex justify-between items-center text-xs text-gray-400">
                                        <div className="flex items-center">
                                            <UserIcon className="w-3 h-3 mr-1" />
                                            {task.assignedTo || 'Não atribuído'}
                                        </div>
                                        {task.clientId && (
                                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                                                {getClientName(task.clientId)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Task Detail / Edit / Create Modal */}
            {(isModalOpen || selectedTask) && (
                <TaskModal 
                    task={selectedTask} 
                    isOpen={true} 
                    onClose={() => { setIsModalOpen(false); setSelectedTask(null); }} 
                    onSave={selectedTask ? undefined : handleCreateTask}
                    onUpdateStatus={updateTaskStatus}
                    users={users}
                    clients={clients}
                    contracts={contracts}
                    newTask={newTask}
                    setNewTask={setNewTask}
                    currentUser={profile?.name || ''}
                />
            )}
        </div>
    );
};

// --- Sub-component for Task Modal (Details, Comments, Attachments) ---

const TaskModal = ({ task, onClose, onSave, onUpdateStatus, users, clients, contracts, newTask, setNewTask, currentUser }: any) => {
    const isNew = !task;
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [newAttachmentName, setNewAttachmentName] = useState('');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!isNew && task) {
            fetchInteractions();
        }
    }, [task]);

    const fetchInteractions = async () => {
        const { data: coms } = await supabase.from('task_comments').select('*').eq('taskId', task.id).order('date', {ascending: true});
        if (coms) setComments(coms);
        const { data: atts } = await supabase.from('task_attachments').select('*').eq('taskId', task.id);
        if (atts) setAttachments(atts);
    };

    const addComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment) return;
        const { error } = await supabase.from('task_comments').insert([{
            taskId: task.id,
            text: newComment,
            author: currentUser,
            date: new Date().toISOString()
        }]);
        if (!error) {
            setNewComment('');
            fetchInteractions();
        }
    };

    const addAttachment = async () => {
        if (!newAttachmentName || !attachmentFile) return alert("Preencha nome e selecione um arquivo");
        setUploading(true);

        try {
            // Upload to 'documents' bucket
            const fileExt = attachmentFile.name.split('.').pop();
            const fileName = `task-${task.id}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, attachmentFile);
            
            if (uploadError) {
                console.error(uploadError);
                alert("Erro ao enviar arquivo. Verifique o bucket.");
                setUploading(false);
                return;
            }

            const { data } = supabase.storage.from('documents').getPublicUrl(fileName);
            const url = data.publicUrl;

            const { error } = await supabase.from('task_attachments').insert([{
                taskId: task.id,
                name: newAttachmentName,
                url: url,
                type: 'file',
                uploadedBy: currentUser,
                date: new Date().toISOString()
            }]);

            if (!error) {
                setNewAttachmentName('');
                setAttachmentFile(null);
                fetchInteractions();
            }
        } catch (e: any) {
            alert(e.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start p-5 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                        {isNew ? 'Nova Tarefa' : task.title}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {/* Main Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Título</label>
                            {isNew ? (
                                <input className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                            ) : (
                                <p className="mt-1 text-sm text-gray-900">{task.title}</p>
                            )}
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Descrição</label>
                            {isNew ? (
                                <textarea className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" rows={3} value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
                            ) : (
                                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{task.description}</p>
                            )}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Atribuído a</label>
                            {isNew ? (
                                <select className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" value={newTask.assignedTo} onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {users.map((u: any) => <option key={u.id} value={u.name}>{u.name}</option>)}
                                </select>
                            ) : (
                                <p className="mt-1 text-sm text-gray-900 flex items-center"><UserIcon className="w-4 h-4 mr-1"/> {task.assignedTo || 'Ninguém'}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Prazo</label>
                            {isNew ? (
                                <input type="date" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} />
                            ) : (
                                <p className="mt-1 text-sm text-gray-900">{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'Sem prazo'}</p>
                            )}
                        </div>

                        {isNew && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Cliente</label>
                                    <select className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" value={newTask.clientId || ''} onChange={e => setNewTask({...newTask, clientId: e.target.value})}>
                                        <option value="">Opcional...</option>
                                        {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Contrato</label>
                                    <select className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" value={newTask.contractId || ''} onChange={e => setNewTask({...newTask, contractId: e.target.value})}>
                                        <option value="">Opcional...</option>
                                        {contracts.filter((c: any) => !newTask.clientId || c.clientId === newTask.clientId).map((c: any) => <option key={c.id} value={c.id}>{c.description}</option>)}
                                    </select>
                                </div>
                            </>
                        )}
                    </div>

                    {!isNew && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 border-t border-gray-200 pt-6">
                            {/* Comments Section */}
                            <div>
                                <h4 className="font-semibold text-gray-800 flex items-center mb-3"><MessageSquare className="w-4 h-4 mr-2"/> Comentários</h4>
                                <div className="bg-gray-50 rounded-md p-3 max-h-60 overflow-y-auto space-y-3 mb-3">
                                    {comments.length === 0 && <p className="text-xs text-gray-500">Nenhum comentário.</p>}
                                    {comments.map(c => (
                                        <div key={c.id} className="text-sm">
                                            <div className="flex justify-between text-xs text-gray-500">
                                                <span className="font-bold text-gray-700">{c.author}</span>
                                                <span>{new Date(c.date).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-gray-800">{c.text}</p>
                                        </div>
                                    ))}
                                </div>
                                <form onSubmit={addComment} className="flex gap-2">
                                    <input className="flex-1 text-sm border-gray-300 rounded-md" placeholder="Escreva um comentário..." value={newComment} onChange={e => setNewComment(e.target.value)} />
                                    <button className="bg-primary-600 text-white p-2 rounded-md"><Send className="w-4 h-4" /></button>
                                </form>
                            </div>

                            {/* Attachments Section */}
                            <div>
                                <h4 className="font-semibold text-gray-800 flex items-center mb-3"><Paperclip className="w-4 h-4 mr-2"/> Anexos</h4>
                                <div className="bg-gray-50 rounded-md p-3 max-h-60 overflow-y-auto space-y-2 mb-3">
                                    {attachments.length === 0 && <p className="text-xs text-gray-500">Nenhum anexo.</p>}
                                    {attachments.map(a => (
                                        <div key={a.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border border-gray-200">
                                            <div className="flex items-center truncate">
                                                <LinkIcon className="w-3 h-3 mr-2 text-gray-400" />
                                                <a href={a.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate max-w-[150px]">{a.name}</a>
                                            </div>
                                            <span className="text-xs text-gray-400">{a.uploadedBy}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    <input className="w-full text-sm border-gray-300 rounded-md" placeholder="Nome do documento" value={newAttachmentName} onChange={e => setNewAttachmentName(e.target.value)} />
                                    <div className="flex gap-2">
                                        <input 
                                            type="file" 
                                            className="flex-1 text-sm text-gray-500"
                                            onChange={e => setAttachmentFile(e.target.files ? e.target.files[0] : null)}
                                        />
                                        <button onClick={addAttachment} disabled={uploading} className="bg-gray-600 text-white p-2 rounded-md disabled:opacity-50">
                                            {uploading ? '...' : <Plus className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-between items-center">
                    {!isNew && (
                         <div className="space-x-2">
                            {task.status !== 'pending' && <button onClick={() => onUpdateStatus(task.id, 'pending')} className="text-xs bg-white border border-gray-300 px-2 py-1 rounded">Marcar Pendente</button>}
                            {task.status !== 'in_progress' && <button onClick={() => onUpdateStatus(task.id, 'in_progress')} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded">Marcar Em Andamento</button>}
                            {task.status !== 'completed' && <button onClick={() => onUpdateStatus(task.id, 'completed')} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded">Marcar Concluído</button>}
                         </div>
                    )}
                    
                    <div className="flex space-x-3 ml-auto">
                        {isNew && (
                            <button onClick={onSave} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">Criar Tarefa</button>
                        )}
                        <button onClick={onClose} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50">Fechar</button>
                    </div>
                </div>
            </div>
        </div>
    );
}