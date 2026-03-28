import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { useAuth } from './AuthContext';
import { Screen } from './types';

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
  targetScreen?: Screen;
  params?: any;
}

interface ModalConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  type?: 'success' | 'info' | 'warning' | 'danger';
}

interface NotificationContextType {
  unreadNotifications: number;
  unreadMessages: number;
  unreadRequests: number;
  toasts: Toast[];
  showToast: (title: string, message: string, type?: 'notification' | 'message' | 'success' | 'error', avatar?: string, targetScreen?: Screen, params?: any) => void;
  showModal: (config: ModalConfig) => void;
  removeToast: (id: string) => void;
  refreshCounts: () => Promise<void>;
  onNavigate?: (screen: Screen, params?: any) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children, onNavigate }: { children: ReactNode, onNavigate?: (screen: Screen, params?: any) => void }) {
  const { user, role } = useAuth();
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const showToast = (
    title: string, 
    message: string, 
    type: 'notification' | 'message' | 'success' | 'error' = 'notification', 
    avatar?: string,
    targetScreen?: Screen,
    params?: any
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type, avatar, targetScreen, params }]);
    
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
      const { data, error } = await supabase.rpc('get_unread_counts', { p_user_id: user.id });
      
      if (!error && data && data.length > 0) {
        setUnreadNotifications(Number(data[0].notifications_count));
        setUnreadMessages(Number(data[0].messages_count));
      } else {
        const [notifs] = await Promise.all([
          supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false)
        ]);
        setUnreadNotifications(notifs.count || 0);

        // Fetch unread messages
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

      // 3. Contar Novos Pedidos (Somente para profissionais)
      if (role === 'provider') {
        const { data: profData } = await supabase.from('profiles').select('categories').eq('id', user.id).maybeSingle();
        const myCats = profData?.categories || [];
        
        // Obter IDs das categorias por nome para busca mais rápida e precisa
        const { data: catData } = await supabase.from('service_categories').select('id, name');
        let catIds: string[] = [];
        if (catData) {
          catIds = catData.filter(c => myCats.includes(c.name)).map(c => c.id);
        }

        // Buscar ordens que eu já recusei/ocultei
        const { data: dismissalData } = await supabase.from('provider_dismissals')
          .select('order_id, order_type')
          .eq('provider_id', user.id);
        
        const dismissedServiceIds = dismissalData?.filter(d => d.order_type === 'service').map(d => d.order_id) || [];
        const dismissedFreelanceIds = dismissalData?.filter(d => d.order_type === 'freelance').map(d => d.order_id) || [];

        // Construir query de solicitações idêntica à do ProviderRequestsScreen
        let query = supabase.from('service_requests').select('id', { count: 'exact', head: true }).eq('status', 'open');
        
        if (catIds.length > 0) {
          // Solicitação direta OU Broadcast de categoria que eu atendo
          query = query.or(`provider_id.eq.${user.id},and(provider_id.is.null,category_id.in.(${catIds.join(',')}))`);
        } else {
          // Se não tem categoria, só vê as diretas
          query = query.eq('provider_id', user.id);
        }

        // Filtrar as ocultadas manualmente
        if (dismissedServiceIds.length > 0) {
          query = query.not('id', 'in', `(${dismissedServiceIds.join(',')})`);
        }
        
        const { count: reqCount } = await query;
        
        // Contar ordens freelance abertas nas categorias atendidas
        let freeCount = 0;
        if (catIds.length > 0) {
           let freeQuery = supabase.from('freelance_orders')
             .select('id', { count: 'exact', head: true })
             .eq('status', 'open')
             .in('category_id', catIds);
           
           if (dismissedFreelanceIds.length > 0) {
             freeQuery = freeQuery.not('id', 'in', `(${dismissedFreelanceIds.join(',')})`);
           }

           const { count } = await freeQuery;
           freeCount = count || 0;
        }

        setUnreadRequests((reqCount || 0) + freeCount);
      } else {
        setUnreadRequests(0);
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
        
        // Mapeamento de redirecionamento inteligente
        let target = 'notifications' as Screen;
        let navParams: any = {};
        
        if (payload.new.type === 'order') {
          target = role === 'provider' ? 'providerRequests' : 'serviceStatus';
          navParams = { requestId: payload.new.related_entity_id };
        } else if (payload.new.type === 'new_bid') {
          target = 'serviceStatus';
          navParams = { requestId: payload.new.related_entity_id };
        } else if (payload.new.type === 'status') {
          target = 'serviceStatus';
          navParams = { requestId: payload.new.related_entity_id };
        }

        showToast(payload.new.title, payload.new.message, 'notification', undefined, target, navParams);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchCounts();
      })
      .subscribe();

    // 2. Canal de Mensagens de Chat (Simplificado para ser dinâmico)
    const setupChatSubscription = async () => {
      // Subscribing to ALL chat_messages inserts. 
      // RLS ensures we only receive messages for rooms we belong to.
      supabase.channel('realtime_messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        }, async (payload) => {
          if (payload.new.sender_id !== user.id) {
            setUnreadMessages(prev => prev + 1);
            
            // Buscar dados do remetente e da sala
            const [{ data: sender }, { data: room }] = await Promise.all([
              supabase.from('profiles').select('full_name, avatar_url').eq('id', payload.new.sender_id).single(),
              supabase.from('chat_rooms').select('id').eq('id', payload.new.room_id).single()
            ]);
            
            if (room) {
              showToast(
                sender?.full_name || 'Nova Mensagem', 
                payload.new.content.substring(0, 100), 
                'message', 
                sender?.avatar_url,
                'chat',
                { 
                  roomId: payload.new.room_id, 
                  opponentName: sender?.full_name, 
                  opponentAvatar: sender?.avatar_url 
                }
              );
            }
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
        }, () => {
          fetchCounts();
        })
        .subscribe();
    };

    // 3. Canal de Pedidos de Serviço (Real-time para profissionais)
    let requestsChannel: any = null;
    if (role === 'provider') {
      requestsChannel = supabase.channel('realtime_requests')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'service_requests'
        }, async (payload) => {
          // Quando algo muda em service_requests, atualizamos os contadores
          fetchCounts();
          
          if (payload.eventType === 'INSERT' && payload.new.status === 'open') {
             // Checar se é para este profissional
             const { data: prof } = await supabase.from('profiles').select('categories').eq('id', user.id).single();
             const myCats = prof?.categories || [];
             const { data: cat } = await supabase.from('service_categories').select('name').eq('id', payload.new.category_id).single();
             
             if (payload.new.provider_id === user.id || (cat && myCats.includes(cat.name))) {
               showToast(
                 "Novo Pedido Disponível!", 
                 payload.new.title || "Um novo cliente solicitou um serviço na sua categoria.",
                 'notification',
                 undefined,
                 'providerRequests'
               );
             }
          }
        })
        .subscribe();

      // 4. Canal de Ordens Freelance
      const freelanceChannel = supabase.channel('realtime_freelance')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'freelance_orders'
        }, async (payload) => {
          fetchCounts();
          
          if (payload.eventType === 'INSERT' && payload.new.status === 'open') {
             const { data: prof } = await supabase.from('profiles').select('categories').eq('id', user.id).single();
             const myCats = prof?.categories || [];
             const { data: cat } = await supabase.from('service_categories').select('name').eq('id', payload.new.category_id).single();
             
             if (cat && myCats.includes(cat.name)) {
               showToast(
                 "Novo Pedido Freelance!", 
                 payload.new.title || "Um novo projeto freelance está disponível para lance.",
                 'notification',
                 undefined,
                 'openOrders'
               );
             }
          }
        })
        .subscribe();
        
      requestsChannel = { sr: requestsChannel, fr: freelanceChannel };
    }

    setupChatSubscription();

    return () => {
      supabase.removeChannel(notificationsChannel);
      if (requestsChannel) {
        supabase.removeChannel(requestsChannel.sr);
        supabase.removeChannel(requestsChannel.fr);
      }
      supabase.channel('realtime_messages').unsubscribe();
    };
  }, [user, role]);

  return (
    <NotificationContext.Provider value={{ unreadNotifications, unreadMessages, unreadRequests, toasts, showToast, showModal, removeToast, refreshCounts: fetchCounts, onNavigate }}>
      {children}
      
      {/* Modal Container */}
      {modal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.5)] border border-white/20 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="p-8 flex flex-col items-center text-center">
              <div className={`size-20 rounded-3xl mb-6 flex items-center justify-center shadow-lg ${
                modal.type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
                modal.type === 'warning' ? 'bg-amber-500 text-white shadow-amber-500/20' :
                modal.type === 'danger' ? 'bg-red-500 text-white shadow-red-500/20' :
                'bg-primary text-white shadow-primary/20'
              }`}>
                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {modal.type === 'success' ? 'check_circle' : 
                   modal.type === 'warning' ? 'warning' : 
                   modal.type === 'danger' ? 'delete_forever' : 'info'}
                </span>
              </div>
              
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-2">
                {modal.title}
              </h3>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                {modal.message}
              </p>
              
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => {
                    if (modal.onConfirm) modal.onConfirm();
                    setModal(null);
                  }}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95 ${
                    modal.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20' :
                    modal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20' :
                    modal.type === 'danger' ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' :
                    'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
                  }`}
                >
                  {modal.confirmLabel || 'Entendido'}
                </button>

                {modal.onCancel && (
                  <button
                    onClick={() => {
                      modal.onCancel?.();
                      setModal(null);
                    }}
                    className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                  >
                    {modal.cancelLabel || 'Cancelar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 left-4 md:left-auto md:w-[380px] z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div 
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ right: 0.5, left: 0 }}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.x > 80 || velocity.x > 400) {
                  removeToast(toast.id);
                }
              }}
              className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-4 flex gap-4 items-center pointer-events-auto cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group"
              style={{ touchAction: 'none' }}
              onClick={() => {
                if (toast.targetScreen && onNavigate) {
                  onNavigate(toast.targetScreen, toast.params);
                }
                removeToast(toast.id);
              }}
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
              
              <div className="flex-1 min-w-0 pointer-events-none">
                <h4 className="font-black text-sm text-slate-900 dark:text-white truncate flex items-center gap-2 italic uppercase tracking-tighter">
                  {toast.title}
                  <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
                </h4>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                  {toast.message}
                </p>
              </div>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(toast.id);
                }}
                className="size-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
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
