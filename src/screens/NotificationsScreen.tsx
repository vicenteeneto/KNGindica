import React, { useState, useEffect } from 'react';
import { NavigationProps, Screen } from '../types';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../NotificationContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { formatCurrency } from '../lib/formatters';
import { ProviderHeader } from '../components/ProviderHeader';
import { TabBar } from '../components/TabBar';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_entity_id: string | null;
}

interface NotificationsScreenProps extends NavigationProps {
  params?: {
    returnTo?: any;
    [key: string]: any;
  };
}

// Utility to fix American currency formatting to Brazilian BRL
const formatNotificationText = (text: string) => {
  if (!text) return text;
  // Regex to catch R$ values or raw values that look like currency
  return text.replace(/R\$\s*([\d.,\s]+)/g, (match, value) => {
    let clean = value.replace(/[^\d.,]/g, '');
    let num;
    if (clean.includes(',') && clean.includes('.')) {
       if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
         num = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
       } else {
         num = parseFloat(clean.replace(/,/g, ''));
       }
    } else if (clean.includes(',')) {
      num = parseFloat(clean.replace(',', '.'));
    } else {
      num = parseFloat(clean);
    }
    if (!isNaN(num)) {
      return formatCurrency(num);
    }
    return match;
  });
};

export default function NotificationsScreen({ onNavigate, params }: NotificationsScreenProps) {
  const { role, user } = useAuth();
  const { refreshCounts, showToast } = useNotifications();
  const push = usePushNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [showPushBanner, setShowPushBanner] = useState(() => localStorage.getItem('KNGindica_dismissed_push_prompt') !== 'true');
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    action: () => void; 
  }>({
    isOpen: false,
    action: () => {},
  });

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setNotifications(data);
      }
      setLoading(false);
    };

    fetchNotifications();

    const subs = supabase.channel('notif_channel_local')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
        refreshCounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subs);
    };
  }, [user]);

  const handleClearAll = async () => {
    setConfirmModal({
      isOpen: true,
      action: async () => {
        if (!user) return;
        try {
          const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', user.id);

          if (error) throw error;

          setNotifications([]);
          refreshCounts();
          showToast("Sucesso", "Todas as notificações foram limpas.", "success");
        } catch (err: any) {
          console.error("Erro ao limpar notificações:", err);
          showToast("Erro", "Não foi possível limpar as notificações.", "error");
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDismissPushBanner = () => {
    setShowPushBanner(false);
    localStorage.setItem('KNGindica_dismissed_push_prompt', 'true');
  };

  const handleMarkAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      refreshCounts();
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }

    if (!notification.type || !notification.related_entity_id) return;

    // Mapeamento de redirecionamento idêntico ao do Toast
    let target: Screen = 'notifications';
    let navParams: any = {};

    if (notification.type === 'order') {
      target = 'serviceStatus';
      navParams = { requestId: notification.related_entity_id };
    } else if (notification.type === 'new_bid') {
      target = 'bidRoom';
      navParams = { orderId: notification.related_entity_id };
    } else if (notification.type === 'freelance_bid') {
      target = 'bidRoom';
      navParams = { orderId: notification.related_entity_id };
    } else if (notification.type === 'freelance_approved' || notification.type === 'freelance_scheduled') {
      target = 'freelanceStatus';
      navParams = { orderId: notification.related_entity_id };
    } else if (notification.type === 'freelance_status' || notification.type === 'freelance_paid') {
      target = 'freelanceStatus';
      navParams = { orderId: notification.related_entity_id };
    } else if (notification.type === 'freelance_review') {
      target = 'freelanceStatus';
      navParams = { orderId: notification.related_entity_id };
    } else if (notification.type === 'review') {
      target = 'serviceStatus';
      navParams = { requestId: notification.related_entity_id };
    } else if (notification.type === 'status' || notification.type === 'service_paid') {
      target = 'serviceStatus';
      navParams = { requestId: notification.related_entity_id };
    } else if (notification.type === 'message' || notification.type === 'chat') {
      target = 'chatList';
    }

    if (target !== 'notifications') {
      onNavigate(target, navParams);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'order': return { icon: 'pending_actions', color: 'text-primary', bg: 'bg-primary/20' };
      case 'status': return { icon: 'check_circle', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' };
      case 'review': return { icon: 'star', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' };
      case 'payment': return { icon: 'payments', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' };
      case 'cancel': return { icon: 'cancel', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' };
      default: return { icon: 'notifications', color: 'text-primary', bg: 'bg-primary/20' };
    }
  };

  const filteredNotifications = notifications.filter(n => activeTab === 'all' ? true : !n.is_read);
  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Header Section */}
      {role === 'provider' ? (
        <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <ProviderHeader 
            title="Avisos e Notificações" 
            onBack={() => {
              if (params?.returnTo) {
                onNavigate(params.returnTo);
              } else {
                onNavigate('dashboard');
              }
            }}
            onNavigate={onNavigate} 
            rightActions={
              <button onClick={handleClearAll} className="text-primary font-bold text-xs md:text-sm px-4 hover:brightness-110 transition-all italic">
                Limpar tudo
              </button>
            }
          />
          <TabBar
            variant="light"
            active={activeTab}
            onChange={(key) => setActiveTab(key as any)}
            tabs={[
              { key: 'all',    label: 'Todas' },
              { key: 'unread', label: 'Não lidas', badge: notifications.filter(n => !n.is_read).length },
            ]}
          />
        </div>
      ) : (
        <header className="sticky top-0 z-10 bg-white dark:bg-background-dark border-b border-slate-200 dark:border-slate-800">
          <div className="flex px-4 h-16 w-full gap-4 justify-between">
            <button 
              onClick={() => {
                if (params?.returnTo) {
                  onNavigate(params.returnTo);
                } else {
                  onNavigate('userProfile');
                }
              }}
              className="flex items-center justify-center size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">arrow_back</span>
            </button>
            <h1 className="text-xl font-bold flex-1">Notificações</h1>
            <button onClick={handleClearAll} className="text-primary font-medium text-sm px-2">Limpar tudo</button>
          </div>
          <TabBar
            variant="light"
            active={activeTab}
            onChange={(key) => setActiveTab(key as any)}
            tabs={[
              { key: 'all',    label: 'Todas' },
              { key: 'unread', label: 'Não lidas', badge: notifications.filter(n => !n.is_read).length },
            ]}
          />
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto pb-24">
        {/* Push Notifications Opt-in */}
        {(showPushBanner && push.permission !== 'granted') && (
          <section className="px-4 py-4 relative">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm relative overflow-hidden">
              <button onClick={handleDismissPushBanner} className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-10" title="Dispensar">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
              <div className="flex items-center gap-3 pr-8">
                <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${push.permission === 'granted' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-primary/10'}`}>
                  <span className={`material-symbols-outlined ${push.permission === 'granted' ? 'text-emerald-600' : 'text-primary'}`}>
                    {push.permission === 'granted' ? 'notifications_active' : 'notifications'}
                  </span>
                </div>
                <div className="flex-1 pr-4">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Alertas no Celular</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {push.permission === 'granted' 
                      ? 'Você receberá avisos mesmo com o app fechado.' 
                      : 'Receba avisos de novos pedidos instantaneamente.'}
                  </p>
                </div>
                {push.permission !== 'granted' ? (
                  <button
                    onClick={push.subscribeUser}
                    disabled={push.loading}
                    className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {push.loading ? '...' : 'Ativar'}
                  </button>
                ) : (
                  <span className="text-emerald-600 material-symbols-outlined">check_circle</span>
                )}
              </div>
              {push.permission === 'denied' && (
                <p className="text-[10px] text-red-500 mt-2 text-center">
                  As notificações foram bloqueadas no navegador. Por favor, ative nas configurações do site.
                </p>
              )}
            </div>
          </section>
        )}

        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
            <p className="mt-2 text-sm">Carregando notificações...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-slate-400 text-3xl">notifications_off</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Nenhuma notificação encontrada.</p>
          </div>
        ) : (
          filteredNotifications.map(notification => {
            const { icon, color, bg } = getIconForType(notification.type);
            const isUnread = !notification.is_read;

            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`${isUnread ? 'bg-primary/5 dark:bg-primary/10 cursor-pointer pointer-events-auto' : 'bg-white dark:bg-background-dark cursor-pointer'} px-4 py-4 border-b border-slate-100 dark:border-slate-800 flex gap-4 items-start relative transition-colors`}
              >
                {isUnread && <div className="absolute right-4 top-4 size-2.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.6)]"></div>}

                <div className={`size-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined ${color}`}>{icon}</span>
                </div>

                <div className="flex-1 flex flex-col gap-1 pr-6">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`text-sm font-semibold tracking-tight ${isUnread ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>{formatNotificationText(notification.title)}</h3>
                    <p className="text-[12px] text-slate-500 font-medium">{new Date(notification.created_at).toLocaleDateString('pt-BR')} às {new Date(notification.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <p className={`text-[13px] leading-snug ${isUnread ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                    {formatNotificationText(notification.message)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Confirm Clear Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 text-center">
            <div className="p-6">
              <div className="size-16 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">delete_sweep</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 italic">Limpar Tudo?</h3>
              <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
                Deseja apagar todas as suas notificações permanentemente?
              </p>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={confirmModal.action}
                  className="w-full py-3.5 bg-primary text-white rounded-2xl font-black text-xs hover:brightness-110 transition-all shadow-lg"
                >
                  Confirmar
                </button>
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-full py-3.5 text-slate-500 font-bold text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
