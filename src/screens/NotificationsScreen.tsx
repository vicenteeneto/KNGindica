import React, { useState, useEffect } from 'react';
import { NavigationProps, Screen } from '../types';
import MobileNav from '../components/MobileNav';
import ProviderMobileNav from '../components/ProviderMobileNav';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../NotificationContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_entity_id: string | null;
}

export default function NotificationsScreen({ onNavigate }: NavigationProps) {
  const { role, user } = useAuth();
  const { refreshCounts } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

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
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (!error) {
      setNotifications([]);
      refreshCounts();
    }
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
      <header className="sticky top-0 z-10 bg-white dark:bg-background-dark border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center px-4 h-16 max-w-2xl mx-auto w-full gap-4">
          <button onClick={() => onNavigate(role === 'provider' ? 'dashboard' : 'userProfile')} className="flex items-center justify-center size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold flex-1">Notificações</h1>
          <button onClick={handleClearAll} className="text-primary font-medium text-sm px-2">Limpar tudo</button>
        </div>
        {/* Tab Navigation */}
        <div className="flex px-4 max-w-2xl mx-auto w-full">
          <button onClick={() => setActiveTab('all')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-slate-500 dark:text-slate-400'}`}>
            Todas
          </button>
          <button onClick={() => setActiveTab('unread')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${activeTab === 'unread' ? 'border-primary text-primary' : 'border-transparent text-slate-500 dark:text-slate-400'}`}>
            Não lidas ({notifications.filter(n => !n.is_read).length})
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full pb-24">
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
                onClick={() => isUnread ? handleMarkAsRead(notification.id) : undefined}
                className={`${isUnread ? 'bg-primary/5 dark:bg-primary/10 cursor-pointer pointer-events-auto' : 'bg-white dark:bg-background-dark'} px-4 py-4 border-b border-slate-100 dark:border-slate-800 flex gap-4 items-start relative transition-colors`}
              >
                {isUnread && <div className="absolute right-4 top-4 size-2.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.6)]"></div>}

                <div className={`size-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <span className={`material-symbols-outlined ${color}`}>{icon}</span>
                </div>

                <div className="flex-1 flex flex-col gap-1 pr-6">
                  <div className="flex justify-between items-start">
                    <h3 className={`font-bold ${isUnread ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>{notification.title}</h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap ml-2">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${isUnread ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                    {notification.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Bottom Navigation Bar */}
      {role === 'provider' ? (
        <ProviderMobileNav onNavigate={onNavigate} currentScreen={'profile' as any} />
      ) : (
        <MobileNav onNavigate={onNavigate} currentScreen="notifications" />
      )}
    </div>
  );
}
