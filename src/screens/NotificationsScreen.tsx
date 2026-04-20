import React, { useState, useEffect } from 'react';
import { NavigationProps, Screen } from '../types';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../NotificationContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { formatCurrency } from '../lib/formatters';
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
  params?: { returnTo?: any; [key: string]: any };
}

const formatNotificationText = (text: string) => {
  if (!text) return text;
  return text.replace(/R\$\s*([\d.,\s]+)/g, (match, value) => {
    let clean = value.replace(/[^\d.,]/g, '');
    let num;
    if (clean.includes(',') && clean.includes('.')) {
      num = clean.lastIndexOf(',') > clean.lastIndexOf('.')
        ? parseFloat(clean.replace(/\./g, '').replace(',', '.'))
        : parseFloat(clean.replace(/,/g, ''));
    } else if (clean.includes(',')) {
      num = parseFloat(clean.replace(',', '.'));
    } else {
      num = parseFloat(clean);
    }
    return !isNaN(num) ? formatCurrency(num) : match;
  });
};

const ICON_FOR_TYPE: Record<string, { icon: string; color: string; bg: string }> = {
  order:               { icon: 'pending_actions',       color: 'text-primary',    bg: 'bg-primary/20' },
  status:              { icon: 'check_circle',           color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  service_paid:        { icon: 'check_circle',           color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  review:              { icon: 'star',                   color: 'text-amber-400',  bg: 'bg-amber-500/20' },
  payment:             { icon: 'payments',               color: 'text-slate-400',  bg: 'bg-slate-500/20' },
  cancel:              { icon: 'cancel',                 color: 'text-red-400',    bg: 'bg-red-500/20' },
  new_bid:             { icon: 'gavel',                  color: 'text-primary',    bg: 'bg-primary/20' },
  freelance_bid:       { icon: 'gavel',                  color: 'text-primary',    bg: 'bg-primary/20' },
  freelance_approved:  { icon: 'task_alt',               color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  freelance_cancelled: { icon: 'cancel',                 color: 'text-red-400',    bg: 'bg-red-500/20' },
  freelance_scheduled: { icon: 'event_available',        color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  freelance_paid:      { icon: 'payments',               color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  freelance_status:    { icon: 'work_history',           color: 'text-blue-400',   bg: 'bg-blue-500/20' },
  freelance_review:    { icon: 'star',                   color: 'text-amber-400',  bg: 'bg-amber-500/20' },
  message:             { icon: 'chat',                   color: 'text-primary',    bg: 'bg-primary/20' },
  chat:                { icon: 'chat',                   color: 'text-primary',    bg: 'bg-primary/20' },
};

function getIconForType(type: string) {
  return ICON_FOR_TYPE[type] || { icon: 'notifications', color: 'text-primary', bg: 'bg-primary/20' };
}

export default function NotificationsScreen({ onNavigate, params }: NotificationsScreenProps) {
  const { role, user } = useAuth();
  const { refreshCounts, showToast } = useNotifications();
  const push = usePushNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [showPushBanner, setShowPushBanner] = useState(
    () => localStorage.getItem('KNGindica_dismissed_push_prompt') !== 'true'
  );
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; action: () => void }>({
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
      if (!error && data) setNotifications(data);
      setLoading(false);
    };
    fetchNotifications();

    const subs = supabase.channel('notif_channel_local')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
          refreshCounts();
        })
      .subscribe();
    return () => { supabase.removeChannel(subs); };
  }, [user]);

  const handleClearAll = async () => {
    setConfirmModal({
      isOpen: true,
      action: async () => {
        if (!user) return;
        try {
          const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
          if (error) throw error;
          setNotifications([]);
          setSelectedNotif(null);
          refreshCounts();
          showToast('Notificações limpas', 'success');
        } catch (err: any) {
          showToast('Erro ao limpar notificações', 'error');
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleMarkAsRead = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      refreshCounts();
    }
  };

  const getNavigationTarget = (notification: Notification): { target: Screen; navParams: any } | null => {
    if (!notification.related_entity_id) return null;
    const id = notification.related_entity_id;
    switch (notification.type) {
      case 'order':
      case 'status':
      case 'service_paid':
      case 'review':    return { target: 'serviceStatus', navParams: { requestId: id } };
      case 'new_bid':
      case 'freelance_bid': return { target: 'bidRoom', navParams: { orderId: id } };
      case 'freelance_cancelled': return { target: 'bidRoom', navParams: { orderId: id } };
      case 'freelance_approved':
      case 'freelance_scheduled':
      case 'freelance_status':
      case 'freelance_paid':
      case 'freelance_review': return { target: 'freelanceStatus', navParams: { orderId: id } };
      case 'message':
      case 'chat':      return { target: 'chatList', navParams: {} };
      default:          return null;
    }
  };

  const handleSelectNotif = (notification: Notification) => {
    if (!notification.is_read) handleMarkAsRead(notification.id);

    if (window.innerWidth < 1024) {
      // Mobile: navigate directly
      const nav = getNavigationTarget(notification);
      if (nav) onNavigate(nav.target, nav.navParams);
    } else {
      setSelectedNotif(notification);
    }
  };

  const handleDismissPushBanner = () => {
    setShowPushBanner(false);
    localStorage.setItem('KNGindica_dismissed_push_prompt', 'true');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filteredNotifications = notifications.filter(n => {
    const matchesTab = activeTab === 'all' ? true : !n.is_read;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery.trim() ||
      n.title?.toLowerCase().includes(q) ||
      n.message?.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const backTarget = params?.returnTo ?? (role === 'provider' ? 'dashboard' : 'userProfile');

  return (
    <div className="flex flex-col h-screen netflix-main-bg font-display text-slate-100 antialiased overflow-hidden">

      {/* Header */}
      <div className="shrink-0 z-50 bg-[#000814]/80 backdrop-blur-md border-b border-white/5 h-[60px] flex items-center justify-between px-6">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={() => onNavigate(backTarget)}
            className="size-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <h1 className="text-lg font-black text-white italic leading-none truncate">Notificações</h1>
          </div>
        </div>

        <button
          onClick={handleClearAll}
          className="text-primary font-bold text-xs px-3 py-1.5 bg-primary/10 rounded-full hover:bg-primary/20 transition-all"
        >
          Limpar tudo
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">

        {/* ── MASTER LIST ─────────────────────────────────── */}
        <div className={`flex flex-col border-r border-white/5 bg-[#000814]/30 ${selectedNotif ? 'hidden lg:flex' : 'flex'} w-full lg:w-[570px] shrink-0 overflow-hidden`}>

          {/* Search */}
          <div className="px-4 py-3 bg-[#000814]/60 backdrop-blur-md border-b border-white/5">
            <div className="relative group/search">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[20px] group-focus-within/search:text-primary transition-colors">search</span>
              <input
                type="text"
                placeholder="Pesquisar notificações..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/40 border-none rounded-xl py-2.5 pl-11 pr-4 text-sm font-medium placeholder:text-slate-500 focus:ring-1 focus:ring-primary/40 transition-all outline-none text-white shadow-inner"
              />
            </div>
          </div>

          {/* Push Notification Banner */}
          {showPushBanner && push.permission !== 'granted' && (
            <div className="mx-4 my-2 bg-slate-800/60 rounded-xl border border-white/5 p-3 flex items-center gap-3 relative">
              <button onClick={handleDismissPushBanner} className="absolute top-2 right-2 text-slate-500 hover:text-white">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
              <div className="size-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[18px]">notifications</span>
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-xs font-bold text-white">Alertas no celular</p>
                <p className="text-[10px] text-slate-400">Receba avisos de novos pedidos instantaneamente.</p>
              </div>
              <button
                onClick={push.subscribeUser}
                disabled={push.loading}
                className="bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shrink-0 hover:brightness-110 disabled:opacity-50"
              >
                {push.loading ? '...' : 'Ativar'}
              </button>
            </div>
          )}

          {/* Tab Bar */}
          <TabBar
            variant="dark"
            active={activeTab}
            onChange={key => { setActiveTab(key as any); setSelectedNotif(null); }}
            tabs={[
              { key: 'all',    label: 'Todas' },
              { key: 'unread', label: 'Não lidas', badge: unreadCount },
            ]}
          />

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-white/5">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                <div className="size-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <p className="text-[10px] font-black text-primary">Carregando...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-10 text-center opacity-30">
                <span className="material-symbols-outlined text-6xl mb-4">notifications_off</span>
                <p className="text-sm font-black">
                  {activeTab === 'unread' ? 'Tudo lido!' : 'Sem notificações'}
                </p>
              </div>
            ) : (
              filteredNotifications.map(notif => {
                const { icon, color, bg } = getIconForType(notif.type);
                const isUnread = !notif.is_read;
                const isSelected = selectedNotif?.id === notif.id;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleSelectNotif(notif)}
                    className={`p-4 flex gap-3 cursor-pointer transition-all relative border-l-4 ${
                      isSelected
                        ? 'bg-primary/10 border-l-primary'
                        : isUnread
                          ? 'bg-primary/5 border-l-primary/40 hover:bg-primary/10'
                          : 'border-l-transparent hover:bg-white/5'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`size-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                      <span className={`material-symbols-outlined ${color} text-[22px]`}
                        style={notif.type === 'review' || notif.type === 'freelance_review' ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >{icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <div className="flex justify-between items-center gap-2 mb-0.5">
                        <h4 className={`text-[12px] font-black truncate leading-none ${isSelected ? 'text-primary' : isUnread ? 'text-white' : 'text-slate-300'}`}>
                          {formatNotificationText(notif.title)}
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isUnread && <div className="size-2 rounded-full bg-primary" />}
                          <span className="text-[9px] font-bold text-slate-500">
                            {new Date(notif.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight line-clamp-1">
                        {formatNotificationText(notif.message)}
                      </p>
                      <p className="text-[9px] text-slate-600 mt-1">
                        {new Date(notif.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── DETAIL PANEL ────────────────────────────────── */}
        <div className={`flex-1 flex flex-col bg-transparent ${selectedNotif ? 'flex' : 'hidden lg:flex'} relative overflow-hidden`}>
          {selectedNotif ? (
            <div className="h-full flex flex-col overflow-y-auto">
              {/* Mobile back button */}
              <button
                onClick={() => setSelectedNotif(null)}
                className="lg:hidden absolute top-4 left-4 z-[60] size-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-white"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>

              {/* Detail Content */}
              <div className="flex-1 p-8 pt-12 lg:pt-8 max-w-2xl mx-auto w-full">
                {/* Icon large */}
                {(() => {
                  const { icon, color, bg } = getIconForType(selectedNotif.type);
                  return (
                    <div className={`size-16 rounded-2xl ${bg} flex items-center justify-center mb-6`}>
                      <span
                        className={`material-symbols-outlined ${color} text-3xl`}
                        style={selectedNotif.type === 'review' || selectedNotif.type === 'freelance_review'
                          ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >{icon}</span>
                    </div>
                  );
                })()}

                <p className="text-[11px] font-bold text-primary mb-2">
                  {new Date(selectedNotif.created_at).toLocaleString('pt-BR', {
                    day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
                <h2 className="text-xl font-black text-white leading-tight mb-4">
                  {formatNotificationText(selectedNotif.title)}
                </h2>
                <div className="bg-slate-900/60 rounded-2xl border border-white/5 p-5 mb-6">
                  <p className="text-sm text-slate-300 leading-relaxed font-medium">
                    {formatNotificationText(selectedNotif.message)}
                  </p>
                </div>

                {/* Action button if navigable */}
                {(() => {
                  const nav = getNavigationTarget(selectedNotif);
                  if (!nav) return null;
                  const labels: Record<string, string> = {
                    serviceStatus: 'Ver pedido',
                    bidRoom: 'Ir para a sala de lances',
                    freelanceStatus: 'Ver freelance',
                    chatList: 'Abrir mensagens',
                  };
                  return (
                    <button
                      onClick={() => onNavigate(nav.target, nav.navParams)}
                      className="w-full h-12 bg-primary text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                      {labels[nav.target] || 'Ver detalhes'}
                    </button>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-20">
              <div className="size-32 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-6xl italic">notifications</span>
              </div>
              <h3 className="text-2xl font-black italic mb-2">Selecione um aviso</h3>
              <p className="text-sm font-medium max-w-xs">Escolha uma notificação da lista à esquerda para ver os detalhes completos.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Clear Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-200 text-center">
            <div className="p-6">
              <div className="size-16 rounded-full bg-amber-900/20 text-amber-500 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">delete_sweep</span>
              </div>
              <h3 className="text-lg font-black text-white mb-2 italic">Limpar tudo?</h3>
              <p className="text-sm text-slate-400 font-medium mb-6 leading-relaxed">
                Deseja apagar todas as notificações permanentemente?
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={confirmModal.action}
                  className="w-full py-3 bg-primary text-white rounded-xl font-black text-xs hover:brightness-110 transition-all"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-full py-3 text-slate-500 font-bold text-xs"
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
