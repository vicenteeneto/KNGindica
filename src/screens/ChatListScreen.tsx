import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../NotificationContext';
import { ProviderHeader } from '../components/ProviderHeader';
import ChatScreen from './ChatScreen';

export default function ChatListScreen({ onNavigate, params }: NavigationProps) {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();

  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Todas' | 'Serviços' | 'Suporte' | 'Arquivadas'>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(params?.roomId || null);
  const [selectedChatParams, setSelectedChatParams] = useState<any>(params?.roomId ? params : null);

  const fetchRooms = async () => {
    if (!user) return;
    try {
      const { data: roomsData, error } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          request_id,
          freelance_order_id,
          client_id,
          provider_id,
          client_archived,
          provider_archived,
          created_at,
          client:profiles!chat_rooms_client_id_fkey(full_name, avatar_url, role),
          provider:profiles!chat_rooms_provider_id_fkey(full_name, avatar_url, role),
          service_requests(title, status),
          freelance_orders(title, status)
        `)
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`);

      if (error) throw error;

      const roomMap = new Map<string, any>();
      (roomsData || []).forEach(room => {
        const opponentId = room.provider_id === user.id ? room.client_id : room.provider_id;
        if (!opponentId) return;
        const key = opponentId;
        const existing = roomMap.get(key);
        if (!existing || new Date(room.created_at).getTime() > new Date(existing.created_at).getTime()) {
          roomMap.set(key, room);
        }
      });

      const uniqueRooms = Array.from(roomMap.values());
      const roomsWithMessages = await Promise.all(uniqueRooms.map(async (room) => {
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1);
        return { ...room, latestMessage: messages?.[0] || null };
      }));

      roomsWithMessages.sort((a, b) => {
        const dateA = a.latestMessage ? new Date(a.latestMessage.created_at).getTime() : 0;
        const dateB = b.latestMessage ? new Date(b.latestMessage.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setRooms(roomsWithMessages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [user, role]);

  useEffect(() => {
    if (params?.roomId) {
      setSelectedRoomId(params.roomId);
      setSelectedChatParams(params);
    }
  }, [params?.roomId]);

  const handleOpenChat = (roomId: string, requestTitle: string, opponentName: string, opponentAvatar: string, requestId?: string) => {
    const chatParams = { roomId, requestTitle, opponentName, opponentAvatar, requestId };
    setSelectedRoomId(roomId);
    setSelectedChatParams(chatParams);
    
    // Em mobile, mantemos a navegação padrão para a tela de chat full
    if (window.innerWidth < 1024) {
      onNavigate('chat', chatParams);
    } else {
      // No desktop, atualiza os params sem mudar de tela
      onNavigate('chatList', chatParams);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black font-display text-slate-100 antialiased overflow-hidden">
      
      {/* Header Centralizado */}
      <div className="shrink-0 z-50 bg-slate-900 border-b border-white/5 h-[60px] flex items-center px-6 justify-between">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
           <button 
             onClick={() => onNavigate(role === 'provider' ? 'dashboard' : 'home')}
             className="size-9 md:size-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all font-black shrink-0"
           >
             <span className="material-symbols-outlined text-sm md:text-base">arrow_back</span>
           </button>
           <div className="flex-1 min-w-0">
             <div className="flex items-center gap-1.5 md:gap-2">
               <div className="size-2 rounded-full bg-green-500 animate-pulse shrink-0" />
               <h1 className="text-sm md:text-lg font-black text-white uppercase tracking-[1px] italic leading-none truncate">Minhas Mensagens</h1>
             </div>
           </div>
        </div>

        <button 
          onClick={() => onNavigate('listing')}
          className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-primary text-white rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-primary/20 shrink-0"
        >
          <span className="material-symbols-outlined text-[16px] md:text-[18px]">add_comment</span>
          <span className="hidden xs:inline">Novo</span> Chat
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* MASTER LIST (WhatsApp Style) */}
        <div className={`flex flex-col border-r border-white/5 bg-slate-900/50 ${selectedRoomId ? 'hidden lg:flex' : 'flex'} w-full lg:w-[570px] shrink-0 overflow-hidden`}>
          
          {/* SEARCH BAR */}
          <div className="px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-white/5">
            <div className="relative group/search">
               <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[20px] group-focus-within/search:text-primary transition-colors">search</span>
               <input 
                 type="text"
                 placeholder="Pesquisar conversas ou contatos..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full bg-slate-800/40 border-none rounded-xl py-2.5 pl-11 pr-4 text-sm font-medium placeholder:text-slate-500 focus:ring-1 focus:ring-primary/40 transition-all outline-none text-white shadow-inner"
               />
            </div>
          </div>

          {/* TABS COMPACTAS */}
          <div className="p-1 px-2 border-b border-white/5 bg-slate-900/80 backdrop-blur-md">
            <div className="flex w-full gap-1">
              {(['Todas', 'Serviços', 'Suporte', 'Arquivadas'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setSelectedRoomId(null);
                  }}
                  className={`flex-1 flex items-center justify-center py-2.5 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all border whitespace-nowrap ${
                    activeTab === tab 
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                      : 'bg-white/5 border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* LISTA DE CONVERSAS */}
          <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-white/5 relative">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                <div className="size-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Carregando Conversas...</p>
              </div>
            ) : (
              (() => {
                const filteredRooms = rooms.filter(room => {
                  const isClient = user?.id === room.client_id;
                  const isArchived = isClient ? room.client_archived : room.provider_archived;
                  const profile = room.provider_id === user?.id ? room.client : room.provider;
                  const isSupport = room.service_requests?.status === 'disputed' || profile?.role === 'admin';
                  
                  if (activeTab === 'Arquivadas') return isArchived;
                  if (isArchived) return false;
                  if (activeTab === 'Todas') return true;
                  if (activeTab === 'Suporte') return isSupport;
                  return !isSupport;
                }).filter(room => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  const profile = room.provider_id === user?.id ? room.client : room.provider;
                  return (
                    profile?.full_name?.toLowerCase().includes(q) ||
                    room.service_requests?.title?.toLowerCase().includes(q) ||
                    room.freelance_orders?.title?.toLowerCase().includes(q)
                  );
                });

                if (filteredRooms.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full p-10 text-center opacity-30">
                      <span className="material-symbols-outlined text-6xl mb-4 italic">chat_bubble_outline</span>
                      <p className="text-xs font-black uppercase tracking-widest">Nenhuma conversa encontrada</p>
                    </div>
                  );
                }

                return filteredRooms.map(room => {
                  const isActive = selectedRoomId === room.id;
                  const profile = room.provider_id === user?.id ? room.client : room.provider;
                  const title = room.service_requests?.title || room.freelance_orders?.title || 'Serviço';
                  const latestMessage = room.latestMessage?.content || 'Inicie a conversa!';
                  const time = room.latestMessage ? new Date(room.latestMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  const hasUnread = room.latestMessage && room.latestMessage.sender_id !== user?.id && !room.latestMessage.is_read;

                  return (
                    <div 
                      key={room.id}
                      onClick={() => handleOpenChat(room.id, title, profile?.full_name || 'Usuário', profile?.avatar_url, room.request_id || room.freelance_order_id)}
                      className={`p-4 flex gap-4 cursor-pointer transition-all relative group ${
                        isActive ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-white/5 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="size-14 rounded-full bg-slate-800 shrink-0 overflow-hidden border border-white/5 relative">
                        <img src={profile?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-full h-full object-cover" />
                        {hasUnread && <div className="absolute top-0 right-0 size-3 bg-primary rounded-full border-2 border-slate-900" />}
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex justify-between items-center gap-2 mb-1">
                          <h4 className={`text-sm font-black uppercase tracking-tighter truncate leading-none ${isActive ? 'text-primary' : 'text-white'}`}>
                            {profile?.full_name || 'Usuário'}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-500 shrink-0">{time}</span>
                        </div>
                        <p className="text-[11px] font-bold text-primary truncate leading-none mb-1.5 uppercase tracking-tighter opacity-70">
                          {title}
                        </p>
                        <div className="flex items-center justify-between">
                           <p className={`text-[12px] truncate leading-none ${hasUnread ? 'text-white font-black' : 'text-slate-500'}`}>
                             {latestMessage.startsWith('[ANEXO]') ? '📷 Foto' : latestMessage}
                           </p>
                           {hasUnread && <span className="size-2 bg-primary rounded-full" />}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </div>

        {/* DETAIL PANEL (Embedded Chat) */}
        <div className={`flex-1 flex flex-col bg-slate-950 ${selectedRoomId ? 'flex' : 'hidden lg:flex'} relative overflow-hidden`}>
           {selectedRoomId && selectedChatParams ? (
             <div className="h-full flex flex-col">
                <button 
                  onClick={() => setSelectedRoomId(null)}
                  className="lg:hidden absolute top-4 left-4 z-[60] size-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-white"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <ChatScreen 
                  onNavigate={onNavigate} 
                  params={selectedChatParams} 
                  isEmbedded={true}
                  onClose={() => setSelectedRoomId(null)}
                />
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-20">
                <div className="size-32 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center mb-6">
                   <span className="material-symbols-outlined text-6xl italic">forum</span>
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Mensagens KNG</h3>
                <p className="text-sm font-medium max-w-xs">Selecione uma conversa ao lado para visualizar o chat e interagir com o cliente ou profissional.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
