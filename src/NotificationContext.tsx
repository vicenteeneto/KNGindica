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
  type: 'notification' | 'message' | 'success' | 'error';
  avatar?: string;
}

interface ModalConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  type?: 'success' | 'info' | 'warning';
}

interface NotificationContextType {
  unreadNotifications: number;
  unreadMessages: number;
  toasts: Toast[];
  showToast: (title: string, message: string, type?: 'notification' | 'message' | 'success' | 'error', avatar?: string) => void;
  showModal: (config: ModalConfig) => void;
  removeToast: (id: string) => void;
  refreshCounts: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const showToast = (title: string, message: string, type: 'notification' | 'message' | 'success' | 'error' = 'notification', avatar?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type, avatar }]);
    
    // Play subtle notification sound if possible
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore auto-play blocking
    } catch (e) {}

    // Auto-remove after 6 seconds
    setTimeout(() => {
      removeToast(id);
    }, 6000);
  };

  const showModal = (config: ModalConfig) => {
    setModal(config);
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
        showToast(payload.new.title, payload.new.message, 'notification');
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
              // Buscar nome do remetente
              const fetchSender = async () => {
                const { data: sender } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', payload.new.sender_id).single();
                showToast(sender?.full_name || 'Nova Mensagem', payload.new.content.substring(0, 100), 'message', sender?.avatar_url);
              };
              fetchSender();
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
    <NotificationContext.Provider value={{ unreadNotifications, unreadMessages, toasts, showToast, showModal, removeToast, refreshCounts: fetchCounts }}>
      {children}
      
      {/* Modal Container */}
      {modal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.5)] border border-white/20 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="p-8 flex flex-col items-center text-center">
              <div className={`size-20 rounded-3xl mb-6 flex items-center justify-center shadow-lg ${
                modal.type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
                modal.type === 'warning' ? 'bg-amber-500 text-white shadow-amber-500/20' :
                'bg-primary text-white shadow-primary/20'
              }`}>
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {modal.type === 'success' ? 'check_circle' : 
                   modal.type === 'warning' ? 'warning' : 'info'}
                </span>
              </div>
              
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-2">
                {modal.title}
              </h3>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                {modal.message}
              </p>
              
              <button
                onClick={() => {
                  if (modal.onConfirm) modal.onConfirm();
                  setModal(null);
                }}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95 ${
                  modal.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20' :
                  modal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20' :
                  'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
                }`}
              >
                {modal.confirmLabel || 'Entendido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 left-4 md:left-auto md:w-[380px] z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-4 flex gap-4 items-center animate-in slide-in-from-right-full duration-500 pointer-events-auto cursor-pointer hover:scale-[1.02] active:scale-95 transition-all group"
            onClick={() => removeToast(toast.id)}
          >
            <div className="relative shrink-0">
               {toast.avatar ? (
                 <img src={toast.avatar} className="size-12 rounded-full border-2 border-primary shadow-sm" alt="Avatar" />
               ) : (
                 <div className={`size-12 rounded-full flex items-center justify-center ${toast.type === 'message' ? 'bg-primary text-white' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'}`}>
                   <span className="material-symbols-outlined text-2xl">
                     {toast.type === 'message' ? 'chat' : 'notifications'}
                   </span>
                 </div>
               )}
               <div className="absolute -bottom-1 -right-1 size-5 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm">
                 <span className={`material-symbols-outlined text-[10px] ${toast.type === 'message' ? 'text-primary' : 'text-amber-500'}`}>
                   {toast.type === 'message' ? 'chat' : 'notifications'}
                 </span>
               </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-sm text-slate-900 dark:text-white truncate flex items-center gap-2 italic uppercase tracking-tighter">
                {toast.title}
                <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
              </h4>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                {toast.message}
              </p>
            </div>
            
            <button className="size-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-base">close</span>
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
