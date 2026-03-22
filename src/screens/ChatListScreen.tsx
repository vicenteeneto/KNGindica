import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../NotificationContext';

export default function ChatListScreen({ onNavigate }: NavigationProps) {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();

  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Todas' | 'Serviços' | 'Suporte' | 'Arquivadas'>('Todas');

  useEffect(() => {
    const fetchRooms = async () => {
      if (!user) return;
      try {
        const { data: roomsData, error } = await supabase
          .from('chat_rooms')
          .select(`
            id,
            request_id,
            client_id,
            provider_id,
            client_archived,
            provider_archived,
            client:profiles!chat_rooms_client_id_fkey(full_name, avatar_url),
            provider:profiles!chat_rooms_provider_id_fkey(full_name, avatar_url),
            service_requests(title, status)
          `)
          .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`);

        if (error) throw error;

        // Group by opponent ID and keep only the latest room
        const roomMap = new Map<string, any>();

        (roomsData || []).forEach(room => {
          const opponentId = room.provider_id === user.id ? room.client_id : room.provider_id;
          if (!opponentId) return;

          const existing = roomMap.get(opponentId);
          if (!existing) {
            roomMap.set(opponentId, room);
          } else {
            // Keep the one with the higher ID (assuming higher ID = newer, or we can refine after fetching messages)
             if (room.id > existing.id) {
               roomMap.set(opponentId, room);
             }
          }
        });

        const uniqueRooms = Array.from(roomMap.values());

        // Fetch latest messages for each unique room
        const roomsWithMessages = await Promise.all(uniqueRooms.map(async (room) => {
          const { data: messages } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...room,
            latestMessage: messages?.[0] || null
          };
        }));

        // Sort by the latest message date
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

    fetchRooms();
  }, [user, role]);

  const handleOpenChat = (roomId: string, requestTitle: string, opponentName: string, opponentAvatar: string, requestId?: string) => {
    onNavigate('chat', { roomId, requestTitle, opponentName, opponentAvatar, requestId });
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-white dark:bg-slate-900 shadow-xl relative font-display text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button onClick={() => onNavigate('home')} className="material-symbols-outlined text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-full transition-colors">arrow_back</button>
            <h1 className="text-xl font-bold tracking-tight">Mensagens</h1>
          </div>
          <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">search</span>
          </button>
        </div>
        {/* Categories / Tabs */}
        <div className="flex gap-6 mt-4 overflow-x-auto no-scrollbar max-w-7xl mx-auto w-full px-4 md:px-0">
          <button onClick={() => setActiveTab('Todas')} className={`pb-2 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors ${activeTab === 'Todas' ? 'border-primary text-primary' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>Todas</button>
          <button onClick={() => setActiveTab('Serviços')} className={`pb-2 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors ${activeTab === 'Serviços' ? 'border-primary text-primary' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>Serviços</button>
          <button onClick={() => setActiveTab('Suporte')} className={`pb-2 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors ${activeTab === 'Suporte' ? 'border-primary text-primary' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>Suporte</button>
          <button onClick={() => setActiveTab('Arquivadas')} className={`pb-2 border-b-2 font-semibold text-sm whitespace-nowrap transition-colors ${activeTab === 'Arquivadas' ? 'border-primary text-primary' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>Arquivadas</button>
        </div>
      </header>

      {/* Inbox List */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto w-full">
          {loading ? (
            <div className="flex justify-center p-8">
              <span className="material-symbols-outlined animate-spin text-4xl text-slate-300">progress_activity</span>
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
              <span className="material-symbols-outlined text-6xl mb-4 opacity-50">chat_bubble</span>
              <p className="text-lg">Você não possui nenhuma conversa.</p>
            </div>
          ) : (
            (() => {
              const filteredRooms = rooms.filter(room => {
                const isClient = user?.id === room.client_id;
                const isArchived = isClient ? room.client_archived : room.provider_archived;
                const isSupport = room.service_requests?.status === 'disputed' || room.provider?.role === 'admin' || room.client?.role === 'admin';
                
                if (activeTab === 'Arquivadas') return isArchived;
                if (isArchived) return false; // Hide archived from other tabs
                
                if (activeTab === 'Todas') return true;
                if (activeTab === 'Suporte') return isSupport;
                if (activeTab === 'Serviços') return !isSupport;
                return true;
              });

              if (filteredRooms.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                    <span className="material-symbols-outlined text-6xl mb-4 opacity-50">search_off</span>
                    <p className="text-lg">Nenhuma conversa encontrada nesta aba.</p>
                  </div>
                );
              }

              return filteredRooms.map((room) => {
                // Unified logic: opponent is whoever is NOT the current user
                const profile = room.provider_id === user?.id ? room.client : room.provider;
              const title = room.service_requests?.title || 'Serviço';
              const latestMessage = room.latestMessage?.message || 'Inicie a conversa!';
              const time = room.latestMessage ? new Date(room.latestMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

              return (
                <div
                  key={room.id}
                  onClick={() => handleOpenChat(room.id, title, profile?.full_name || 'Usuário', profile?.avatar_url, room.request_id)}
                  className="flex items-center gap-4 px-4 py-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative"
                >
                  {room.latestMessage && room.latestMessage.sender_id !== user?.id && !room.latestMessage.is_read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                  )}
                  
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img className="w-full h-full object-cover" alt={profile?.full_name || 'Usuário'} src={profile?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className={`font-semibold transition-colors ${room.latestMessage && room.latestMessage.sender_id !== user?.id && !room.latestMessage.is_read ? 'text-primary' : 'text-slate-800 dark:text-slate-200'} truncate`}>{profile?.full_name || 'Usuário'}</h3>
                      <span className="text-xs text-slate-400">{time}</span>
                    </div>
                    <p className="text-xs font-bold text-primary mb-0.5 truncate">{title}</p>
                    <div className="flex justify-between items-center">
                      <p className={`text-sm truncate ${room.latestMessage && room.latestMessage.sender_id !== user?.id && !room.latestMessage.is_read ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400'}`}>{latestMessage}</p>
                      {room.latestMessage && room.latestMessage.sender_id !== user?.id && !room.latestMessage.is_read && (
                        <div className="size-2 bg-primary rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
            })()
          )}
        </div>
      </main>


      {/* Action Button */}
      <button onClick={() => showToast('Novo Chat', 'Funcionalidade de contatos em breve.', 'info')} className="absolute bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-40">
        <span className="material-symbols-outlined text-3xl">add_comment</span>
      </button>
    </div>
  );
}
