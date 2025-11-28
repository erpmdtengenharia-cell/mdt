import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, X, Send, Users, ChevronLeft, Circle } from 'lucide-react';
import { ChatMessage, Profile } from '../types';

interface OnlineUser {
    id: string;
    name: string;
    online_at: string;
}

export const ChatWidget: React.FC = () => {
    const { profile, user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    
    // UI State
    const [view, setView] = useState<'list' | 'chat'>('list'); // 'list' of users or 'chat' room
    const [activeRecipient, setActiveRecipient] = useState<{id: string, name: string} | null>(null); // null = General Chat
    
    // Data State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 1. Manage Presence (Online Users)
    useEffect(() => {
        if (!user || !profile) return;

        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const usersArray: OnlineUser[] = [];
                
                // Map presence state to a simple array
                for (let key in newState) {
                    // We need to fetch the name. 
                    // Ideally, pass name in tracking payload, but for now we assume we know who they are or fetch profiles
                    // Simulating name passing via tracking if possible, else we might just list IDs
                    // Let's track with extra data
                }
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                // Simplified: Re-fetch or update list
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                // Simplified: Re-fetch or update list
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        id: user.id,
                        name: profile.name,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        // Listen for presence state changes explicitly to build the UI list
        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const users: OnlineUser[] = [];
            Object.values(state).forEach((presences: any) => {
                presences.forEach((p: any) => {
                    if (!users.find(u => u.id === p.id)) {
                        users.push(p);
                    }
                });
            });
            setOnlineUsers(users);
        });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, profile]);

    // 2. Manage Messages & Notifications
    useEffect(() => {
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('chat_messages')
                .select('*')
                .order('timestamp', { ascending: true })
                .limit(100);
            if (data) setMessages(data);
        };
        fetchMessages();

        const channel = supabase
            .channel('public:chat_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
                const newMsg = payload.new as ChatMessage;
                setMessages(prev => [...prev, newMsg]);

                // Notification Logic
                const isForMe = newMsg.recipient_id === user?.id;
                const isPublic = !newMsg.recipient_id;
                const iAmSender = newMsg.sender_id === user?.id;

                if (!isOpen && !iAmSender && (isForMe || isPublic)) {
                    setUnreadCount(prev => prev + 1);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isOpen, user]);

    // 3. Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, view, activeRecipient, isOpen]);

    // Reset unread when opening
    useEffect(() => {
        if (isOpen) setUnreadCount(0);
    }, [isOpen]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        const payload = {
            text: newMessage,
            author: profile?.name || 'Usuário',
            sender_id: user.id,
            recipient_id: activeRecipient?.id || null, // null = public
            timestamp: new Date().toISOString()
        };

        const { error } = await supabase.from('chat_messages').insert([payload]);
        if (error) console.error(error);

        setNewMessage('');
    };

    const getFilteredMessages = () => {
        return messages.filter(msg => {
            if (!activeRecipient) {
                // Public Channel: Show messages with NO recipient
                return !msg.recipient_id;
            } else {
                // Private Channel: Show messages between Me and Recipient
                const isMeSender = msg.sender_id === user?.id;
                const isMeRecipient = msg.recipient_id === user?.id;
                const isThemSender = msg.sender_id === activeRecipient.id;
                const isThemRecipient = msg.recipient_id === activeRecipient.id;

                return (isMeSender && isThemRecipient) || (isThemSender && isMeRecipient);
            }
        });
    };

    const openChat = (recipient: {id: string, name: string} | null) => {
        setActiveRecipient(recipient);
        setView('chat');
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
            {isOpen && (
                <div className="bg-white border border-gray-200 shadow-xl rounded-lg w-80 h-[500px] flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                    
                    {/* HEADER */}
                    <div className="bg-primary-700 text-white p-3 flex justify-between items-center shadow-md z-10">
                        <div className="flex items-center">
                            {view === 'chat' && (
                                <button onClick={() => setView('list')} className="mr-2 hover:bg-primary-600 rounded p-1">
                                    <ChevronLeft className="w-5 h-5"/>
                                </button>
                            )}
                            <h3 className="font-semibold text-sm">
                                {view === 'list' ? 'MDT Chat' : (activeRecipient ? activeRecipient.name : 'Chat Geral')}
                            </h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* CONTENT - LIST VIEW */}
                    {view === 'list' && (
                        <div className="flex-1 overflow-y-auto bg-gray-50">
                            {/* General Channel */}
                            <div 
                                onClick={() => openChat(null)}
                                className="p-4 border-b border-gray-100 bg-white hover:bg-gray-50 cursor-pointer flex items-center"
                            >
                                <div className="bg-primary-100 p-2 rounded-full mr-3">
                                    <Users className="w-5 h-5 text-primary-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 text-sm">Chat Geral</p>
                                    <p className="text-xs text-gray-500">Mensagens para toda a equipe</p>
                                </div>
                            </div>

                            <div className="p-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Online ({onlineUsers.length})</div>
                            
                            {/* Online Users List */}
                            {onlineUsers.filter(u => u.id !== user?.id).map(u => (
                                <div 
                                    key={u.id}
                                    onClick={() => openChat(u)}
                                    className="px-4 py-3 hover:bg-white cursor-pointer flex items-center border-b border-gray-100 transition-colors"
                                >
                                    <div className="relative mr-3">
                                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                                            {u.name.substring(0,2).toUpperCase()}
                                        </div>
                                        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-green-400" />
                                    </div>
                                    <span className="text-sm text-gray-700 font-medium">{u.name}</span>
                                </div>
                            ))}
                            {onlineUsers.length <= 1 && (
                                <p className="px-4 text-xs text-gray-400 italic">Ninguém mais online no momento.</p>
                            )}
                        </div>
                    )}

                    {/* CONTENT - CHAT VIEW */}
                    {view === 'chat' && (
                        <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                                {getFilteredMessages().length === 0 && (
                                    <div className="text-center text-gray-400 text-xs mt-10">
                                        Nenhuma mensagem aqui ainda.<br/>Diga olá! 👋
                                    </div>
                                )}
                                {getFilteredMessages().map((msg) => {
                                    const isMe = msg.sender_id === user?.id;
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                                                isMe 
                                                ? 'bg-primary-600 text-white rounded-br-none' 
                                                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                                            }`}>
                                                {msg.text}
                                            </div>
                                            <span className="text-[10px] text-gray-400 mt-1 px-1">
                                                {!isMe && <span className="font-bold mr-1">{msg.author}</span>} 
                                                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                            <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2">
                                <input 
                                    type="text" 
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={activeRecipient ? `Mensagem para ${activeRecipient.name}...` : "Mensagem para todos..."}
                                    className="flex-1 text-sm border-gray-300 rounded-full px-4 focus:ring-primary-500 focus:border-primary-500"
                                />
                                <button type="submit" className="bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700 shadow-sm">
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </>
                    )}
                </div>
            )}
            
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
            >
                {unreadCount > 0 && !isOpen && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                        {unreadCount}
                    </span>
                )}
                <MessageSquare className="w-6 h-6" />
                {!isOpen && <span className="text-sm font-medium pr-1">Chat</span>}
            </button>
        </div>
    );
};