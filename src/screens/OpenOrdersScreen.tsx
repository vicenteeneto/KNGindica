import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { formatCurrency } from '../lib/formatters';

export default function OpenOrdersScreen({ onNavigate }: NavigationProps) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'bidded'>('available');
  
  // Track dismissed orders
  const dismissedKeys = user ? `kngindica_dismissed_orders_${user.id}` : null;
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    if (dismissedKeys) {
      const stored = localStorage.getItem(dismissedKeys);
      if (stored) setDismissed(JSON.parse(stored));
    }
  }, [dismissedKeys]);

  useEffect(() => {
    if (!user) return;
    fetchOrders();
    
    // Subscribe to new orders
    const channel = supabase
      .channel('freelance_orders_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'freelance_orders' }, payload => {
        if (!dismissed.includes(payload.new.id)) {
          // If active tab is available, just refetch to be safe with DB relations
          if (activeTab === 'available') fetchOrders();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, dismissed, activeTab]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    
    // Find orders the user already bid on
    const { data: userBids } = await supabase.from('freelance_bids').select('order_id, amount').eq('provider_id', user.id);
    const bidOrderIds = userBids?.map(b => b.order_id) || [];
    
    if (activeTab === 'available') {
      const toExclude = [...bidOrderIds, ...dismissed];
      let query = supabase
        .from('freelance_orders')
        .select(`
          *,
          profiles:client_id(full_name, avatar_url),
          service_categories(name, icon)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
        
      if (toExclude.length > 0) {
         query = query.not('id', 'in', `(${toExclude.join(',')})`);
      }

      const { data, error } = await query;
      if (!error) setOrders(data || []);
    } else {
      // Bidded tab
      if (bidOrderIds.length === 0) {
        setOrders([]);
      } else {
        const { data, error } = await supabase
          .from('freelance_orders')
          .select(`
            *,
            profiles:client_id(full_name, avatar_url),
            service_categories(name, icon)
          `)
          .in('id', bidOrderIds)
          .order('created_at', { ascending: false });
        if (!error) {
           // Attach user's bid amount locally
           const enhanced = data.map((o: any) => ({
             ...o,
             myBidAmount: userBids?.find(b => b.order_id === o.id)?.amount
           }));
           setOrders(enhanced || []);
        }
      }
    }
    setLoading(false);
  };

  const handeDismiss = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    const updated = [...dismissed, orderId];
    setDismissed(updated);
    if (dismissedKeys) localStorage.setItem(dismissedKeys, JSON.stringify(updated));
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col antialiased">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center p-4 justify-between max-w-4xl mx-auto w-full">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-xl font-black tracking-tighter italic uppercase text-primary">Freelance</h2>
          <button onClick={fetchOrders} className="size-10 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-3 text-sm font-bold tracking-widest uppercase transition-colors ${activeTab === 'available' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Disponíveis
          </button>
          <button 
            onClick={() => setActiveTab('bidded')}
            className={`flex-1 py-3 text-sm font-bold tracking-widest uppercase transition-colors ${activeTab === 'bidded' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Meus Lances
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 lg:p-8 space-y-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
            </div>
            <h3 className="text-xl font-bold">{activeTab === 'available' ? 'Nenhuma ordem aberta' : 'Nenhum lance feito'}</h3>
            <p className="text-slate-500 max-w-[250px] mx-auto">
              {activeTab === 'available' ? 'Fique ligado! Novas oportunidades podem aparecer a qualquer momento.' : 'Você ainda não enviou propostas para ordens freelance.'}
            </p>
          </div>
        ) : (
          orders.map(order => (
            <div 
              key={order.id} 
              onClick={() => onNavigate('bidRoom', { orderId: order.id })}
              className="cursor-pointer bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative group transition-all hover:shadow-xl hover:border-primary/20 hover:-translate-y-1 block"
            >
              {/* Dismiss Button - Só em disponíveis */}
              {activeTab === 'available' && (
                <button 
                  onClick={(e) => handeDismiss(e, order.id)}
                  className="absolute top-4 right-4 size-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-colors shadow-sm"
                  title="Não tenho interesse"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 pr-10">
                  <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined">{order.service_categories?.icon || 'work'}</span>
                  </div>
                  <div>
                    <h3 className="font-black text-lg leading-tight uppercase tracking-tight">{order.title}</h3>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">{order.service_categories?.name}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-end mb-4 pr-1">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Budget Cliente</p>
                  <p className="text-xl font-black text-emerald-500 leading-none">{formatCurrency(order.budget || 0)}</p>
                </div>
                {activeTab === 'bidded' && order.myBidAmount && (
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Seu Lance</p>
                    <p className="text-lg font-black text-primary leading-none">{formatCurrency(order.myBidAmount || 0)}</p>
                  </div>
                )}
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl leading-relaxed line-clamp-3">
                {order.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-slate-200 overflow-hidden">
                    <img src={order.profiles?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-full h-full object-cover" alt="" />
                  </div>
                  <p className="text-xs font-bold text-slate-500">{order.profiles?.full_name?.split(' ')[0]}</p>
                </div>

                <div className="flex items-center gap-1 text-primary text-sm font-bold">
                  <span>Entrar na Sala</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
