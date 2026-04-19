import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { formatCurrency } from '../lib/formatters';
import { ProviderHeader } from '../components/ProviderHeader';
import { FreelanceOrderDetail } from '../components/FreelanceOrderDetail';
import { TabBar } from '../components/TabBar';

export default function OpenOrdersScreen({ onNavigate, params }: NavigationProps) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'bidded' | 'approved' | 'scheduled' | 'in_progress' | 'completed' | 'dismissed'>(params?.tab || 'available');
  const [detailsModal, setDetailsModal] = useState<{ isOpen: boolean, order: any | null }>({
    isOpen: false, order: null
  });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, orderId: string | null }>({
    isOpen: false, orderId: null
  });
  const [imageModal, setImageModal] = useState<{ isOpen: boolean, url: string }>({
    isOpen: false, url: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(params?.orderId || null);
  
  // Track dismissed orders via database
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchDismissedIds();
    }
  }, [user]);

  const fetchDismissedIds = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('provider_dismissals')
      .select('order_id')
      .eq('provider_id', user.id)
      .eq('order_type', 'freelance');
    if (data) setDismissedIds(data.map(d => d.order_id));
  };

  useEffect(() => {
    if (params?.orderId) {
      setSelectedOrderId(params.orderId);
    }
    if (params?.tab) {
      setActiveTab(params.tab);
    }
  }, [params?.orderId, params?.tab]);

  useEffect(() => {
    if (!user) return;
    fetchOrders();
    
    // Subscribe to new orders
    const channel = supabase
      .channel('freelance_orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'freelance_orders' }, () => {
        fetchOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'provider_dismissals' }, () => {
        fetchDismissedIds().then(() => fetchOrders());
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeTab]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    
    // Find orders the user already bid on
    const { data: userBids } = await supabase.from('freelance_bids').select('order_id, amount').eq('provider_id', user.id);
    const bidOrderIds = userBids?.map(b => b.order_id) || [];
    
    let fetched: any[] = [];

    if (activeTab === 'available') {
      const toExclude = [...bidOrderIds, ...dismissedIds];
      let query = supabase
        .from('freelance_orders')
        .select(`
          *,
          profiles:client_id(full_name, avatar_url, phone),
          service_categories(name, icon)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
        
      if (toExclude.length > 0) {
         query = query.not('id', 'in', `(${toExclude.join(',')})`);
      }

      const { data, error } = await query;
      if (!error) fetched = data || [];
    } else if (activeTab === 'bidded') {
      if (bidOrderIds.length > 0) {
        const { data, error } = await supabase
          .from('freelance_orders')
          .select(`
            *,
            profiles:client_id(full_name, avatar_url, phone),
            service_categories(name, icon)
          `)
          .in('id', bidOrderIds)
          .eq('status', 'open')
          .order('created_at', { ascending: false });
        if (!error && data) {
           fetched = data.map((o: any) => ({
             ...o,
             myBidAmount: userBids?.find(b => b.order_id === o.id)?.amount
           }));
         }
      }
    } else if (activeTab === 'approved') {
      const { data, error } = await supabase
        .from('freelance_orders')
        .select(`
          *,
          profiles:client_id(full_name, avatar_url, phone),
          service_categories(name, icon)
        `)
        .eq('assigned_provider_id', user.id)
        .in('status', ['awaiting_payment', 'paid'])
        .order('created_at', { ascending: false });
      if (!error) fetched = data || [];
    } else if (activeTab === 'scheduled') {
      const { data, error } = await supabase
        .from('freelance_orders')
        .select(`
          *,
          profiles:client_id(full_name, avatar_url, phone),
          service_categories(name, icon)
        `)
        .eq('assigned_provider_id', user.id)
        .eq('status', 'scheduled')
        .order('created_at', { ascending: false });
      if (!error) fetched = data || [];
    } else if (activeTab === 'in_progress') {
      const { data, error } = await supabase
        .from('freelance_orders')
        .select(`
          *,
          profiles:client_id(full_name, avatar_url, phone),
          service_categories(name, icon)
        `)
        .eq('assigned_provider_id', user.id)
        .eq('status', 'in_service')
        .order('created_at', { ascending: false });
      if (!error) fetched = data || [];
    } else if (activeTab === 'completed') {
      const { data, error } = await supabase
        .from('freelance_orders')
        .select(`
          *,
          profiles:client_id(full_name, avatar_url, phone),
          service_categories(name, icon)
        `)
        .eq('assigned_provider_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      if (!error) fetched = data || [];
    } else if (activeTab === 'dismissed') {
      if (dismissedIds.length > 0) {
        const { data, error } = await supabase
          .from('freelance_orders')
          .select(`
            *,
            profiles:client_id(full_name, avatar_url, phone),
            service_categories(name, icon)
          `)
          .in('id', dismissedIds)
          .order('created_at', { ascending: false });
        if (!error) fetched = data || [];
      }
    }

    setOrders(fetched);
    
    // Auto-select first item if none selected and on desktop (large screens)
    if (!selectedOrderId && fetched.length > 0 && window.innerWidth >= 1024) {
      setSelectedOrderId(fetched[0].id);
    }
    
    setLoading(false);
  };

  const handleDismissClick = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    setConfirmModal({ isOpen: true, orderId });
  };

  const confirmDismiss = async () => {
    if (!confirmModal.orderId || !user) return;
    
    const dismissedOrderId = confirmModal.orderId;
    
    try {
      const { error } = await supabase
        .from('provider_dismissals')
        .insert({
          provider_id: user.id,
          order_id: dismissedOrderId,
          order_type: 'freelance'
        });

      if (error) throw error;
      
      // Remove immediately from the visible list — no need to wait for refetch
      setOrders(prev => prev.filter(o => o.id !== dismissedOrderId));
      setConfirmModal({ isOpen: false, orderId: null });
      showToast('Oportunidade movida para recusados', 'success');
      
      // Sync dismissed IDs in background for consistency
      fetchDismissedIds();
    } catch (error: any) {
      showToast('Erro ao recusar: ' + error.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black font-display text-slate-100 antialiased overflow-hidden">
      
      {/* Header Centralizado */}
      <div className="shrink-0 z-50 bg-slate-900 border-b border-white/5 h-[60px] flex items-center px-6">
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="size-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <h1 className="text-lg font-black text-white italic leading-none truncate">Painel de Oportunidades</h1>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* MASTER LIST (WhatsApp Style) */}
        <div className={`flex flex-col border-r border-white/5 bg-slate-900/50 ${selectedOrderId ? 'hidden lg:flex' : 'flex'} w-full lg:w-[570px] shrink-0 overflow-hidden`}>
          
          {/* SEARCH BAR */}
          <div className="px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-white/5">
            <div className="relative group/search">
               <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[20px] group-focus-within/search:text-primary transition-colors">search</span>
               <input 
                 type="text"
                 placeholder="Pesquisar oportunidades..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full bg-slate-800/40 border-none rounded-xl py-2.5 pl-11 pr-4 text-sm font-medium placeholder:text-slate-500 focus:ring-1 focus:ring-primary/40 transition-all outline-none text-white shadow-inner"
               />
            </div>
          </div>

          {/* TAB BAR — componente unificado */}
          <TabBar
            variant="dark"
            active={activeTab}
            onChange={(key) => {
              setActiveTab(key);
              setSelectedOrderId(null);
              onNavigate('openOrders', { tab: key, orderId: null });
            }}
            tabs={[
              { key: 'available',   label: 'Disponíveis'  },
              { key: 'bidded',      label: 'Lances'       },
              { key: 'approved',    label: 'Aprovados'    },
              { key: 'scheduled',   label: 'Agendados'    },
              { key: 'in_progress', label: 'Em andamento' },
              { key: 'completed',   label: 'Finalizados'  },
              { key: 'dismissed',   label: 'Recusados'    },
            ]}
          />

          {/* LISTA DE TRABALHOS */}
          <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-white/5 relative">
            {loading && orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                <div className="size-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <p className="text-[10px] font-black text-primary">Carregando Oportunidades...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-10 text-center opacity-30">
                <span className="material-symbols-outlined text-6xl mb-4 italic">inbox</span>
                <p className="text-sm font-black">Nenhuma oportunidade encontrada</p>
              </div>
            ) : (
              <>
                {loading && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 overflow-hidden z-10">
                    <div className="h-full bg-primary animate-pulse w-full" />
                  </div>
                )}
                {orders
                  .filter(o => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      o.title?.toLowerCase().includes(q) ||
                      o.profiles?.full_name?.toLowerCase().includes(q) ||
                      o.display_id?.toLowerCase().includes(q)
                    );
                  })
                  .map(order => {
                  const isActive = selectedOrderId === order.id;
                  return (
                    <div 
                      key={order.id}
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        onNavigate('openOrders', { tab: activeTab, orderId: order.id });
                      }}
                      className={`p-4 flex gap-4 cursor-pointer transition-all relative group ${
                        isActive ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-white/5 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="size-12 rounded-2xl bg-slate-800 shrink-0 overflow-hidden border border-white/5">
                        <img src={order.profiles?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 py-0.5">
                        <div className="flex justify-between items-center gap-2 mb-1">
                          <h4 className={`text-sm font-black truncate leading-none ${isActive ? 'text-primary' : 'text-white'}`}>
                            {order.title}
                          </h4>
                          <span className="text-[9px] font-bold text-slate-500 shrink-0">
                            {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[12px] font-bold text-slate-400 truncate leading-none mb-2">
                          {order.profiles?.full_name} • {order.service_categories?.name}
                        </p>
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-slate-400`}>
                                {activeTab}
                              </span>
                              {activeTab === 'available' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDismissClick(e, order.id);
                                  }}
                                  className="text-[9px] font-black text-red-500 hover:underline"
                                >
                                  Ocultar
                                </button>
                              )}
                           </div>
                           {order.budget > 0 && (
                             <span className="text-[10px] font-black text-white italic">{formatCurrency(order.budget)}</span>
                           )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>

        {/* DETAIL PANEL (Desktop) / FULL DETAIL (Mobile) */}
        <div className={`flex-1 flex flex-col bg-slate-950 ${selectedOrderId ? 'flex' : 'hidden lg:flex'} relative overflow-hidden`}>
           {selectedOrderId ? (
             <div className="h-full flex flex-col">
                <button 
                  onClick={() => setSelectedOrderId(null)}
                  className="lg:hidden absolute top-4 left-4 z-[60] size-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-white"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <FreelanceOrderDetail 
                  orderId={selectedOrderId} 
                  onNavigate={onNavigate} 
                  isEmbedded={true} 
                />
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-20">
                <div className="size-32 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center mb-6">
                   <span className="material-symbols-outlined text-6xl italic">ads_click</span>
                </div>
                <h3 className="text-2xl font-black italic mb-2">Selecione uma Oportunidade</h3>
                <p className="text-sm font-medium max-w-xs">Escolha um freelance da lista à esquerda para ver detalhes e enviar lances.</p>
             </div>
           )}
        </div>
      </div>

      {/* MODALS PERSISTENTES */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="size-16 rounded-full bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-red-500 text-3xl">delete_sweep</span>
              </div>
              <h3 className="text-lg font-black text-white mb-2 italic">Ocultar Oportunidade?</h3>
              <p className="text-xs text-slate-400 font-medium mb-6 leading-relaxed text-center">
                Esta oportunidade será movida para o histórico de recusadas.
              </p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={confirmDismiss}
                  className="w-full py-3 bg-red-600 text-white rounded-xl font-black text-[10px] hover:bg-red-700 transition-colors"
                >
                  Confirmar recusa
                </button>
                <button 
                  onClick={() => setConfirmModal({ isOpen: false, orderId: null })}
                  className="w-full py-3 text-slate-500 font-bold text-[10px]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {imageModal.isOpen && (
        <div 
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={() => setImageModal({ isOpen: false, url: '' })}
        >
          <button 
            className="absolute top-6 right-6 size-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-50"
            onClick={() => setImageModal({ isOpen: false, url: '' })}
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
          <div 
            className="relative w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={imageModal.url} 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
              alt="Visualização ampliada" 
            />
          </div>
        </div>
      )}
    </div>
  );

}
