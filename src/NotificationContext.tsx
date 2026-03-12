import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './lib/supabase';
import { useAuth } from './AuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'notification' | 'message';
}

interface NotificationContextType {
  unreadNotifications: number;
  unreadMessages: number;
  toasts: Toast[];
  removeToast: (id: string) => void;
  refreshCounts: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (title: string, message: string, type: 'notification' | 'message') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const fetchCounts = async () => {
    if (!user) return;
    
    try {
      // Usando a função RPC que criamos no SQL v11
      const { data, error } = await supabase.rpc('get_unread_counts', { p_user_id: user.id });
      
      if (!error && data && data.length > 0) {
        setUnreadNotifications(Number(data[0].notifications_count));
        setUnreadMessages(Number(data[0].messages_count));
      } else {
        // Fallback caso a função RPC não exista ou falhe
        const [notifs, msgs] = await Promise.all([
          supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
          supabase.from('chat_messages').select('id, chat_rooms!inner(id)').eq('is_read', false).neq('sender_id', user.id)
        ]);
        
        setUnreadNotifications(notifs.count || 0);
        // Filtragem manual de mensagens baseada em salas que o usuário participa
        // (Nota: O join acima aproximado, no real precisamos garantir que a sala pertence ao usuário)
        const { data: userRooms } = await supabase.from('chat_rooms')
          .select('id')
          .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`);
        
        if (userRooms) {
          const roomIds = userRooms.map(r => r.id);
          const { count } = await supabase.from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .in('room_id', roomIds)
            .neq('sender_id', user.id)
            .eq('is_read', false);
          setUnreadMessages(count || 0);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar contadores:", err);
    }
  };

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      setUnreadMessages(0);
      setToasts([]);
      return;
    }

    fetchCounts();

    // 1. Canal de Notificações
    const notificationsChannel = supabase.channel('realtime_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setUnreadNotifications(prev => prev + 1);
        addToast(payload.new.title, payload.new.message, 'notification');
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchCounts(); // Atualiza contagem quando marcar como lida
      })
      .subscribe();

    // 2. Canal de Mensagens de Chat
    // Precisamos descobrir quais salas o usuário participa para filtrar
    const setupChatSubscription = async () => {
      const { data: rooms } = await supabase.from('chat_rooms')
        .select('id')
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`);

      if (rooms && rooms.length > 0) {
        const roomIds = rooms.map(r => r.id);
        
        supabase.channel('realtime_messages')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
          }, (payload) => {
            if (roomIds.includes(payload.new.room_id) && payload.new.sender_id !== user.id) {
              setUnreadMessages(prev => prev + 1);
              // Para mensagens, o toast pode ser mais direto
              addToast('Nova Mensagem', payload.new.content.substring(0, 50) + (payload.new.content.length > 50 ? '...' : ''), 'message');
            }
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
          }, (payload) => {
            if (roomIds.includes(payload.new.room_id)) {
              fetchCounts();
            }
          })
          .subscribe();
      }
    };

    setupChatSubscription();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.channel('realtime_messages').unsubscribe();
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ unreadNotifications, unreadMessages, toasts, removeToast, refreshCounts: fetchCounts }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 left-4 md:left-auto md:w-80 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 flex gap-4 items-center animate-fade-in-up pointer-events-auto cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => removeToast(toast.id)}
          >
            <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'message' ? 'bg-primary/20 text-primary' : 'bg-amber-100 text-amber-600'}`}>
              <span className="material-symbols-outlined text-2xl">
                {toast.type === 'message' ? 'chat' : 'notifications'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{toast.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{toast.message}</p>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
