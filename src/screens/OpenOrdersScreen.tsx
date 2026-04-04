import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { formatCurrency } from '../lib/formatters';
import { ProviderHeader } from '../components/ProviderHeader';

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
    if (!user) return;
    fetchOrders();
    
    // Deep Linking: Auto-open order details from notification
    if (params?.orderId) {
      const loadInitialOrder = async () => {
        try {
          const { data, error } = await supabase
            .from('freelance_orders')
            .select(`
              *,
              profiles:client_id(full_name, avatar_url, phone),
              service_categories(name, icon)
            `)
            .eq('id', params.orderId)
            .single();
          
          if (data && !error) {
            // Determine active tab based on status
            let tab: any = 'available';
            if (data.status === 'open') tab = 'available';
            else if (data.status === 'proposed') tab = 'bidded';
            else if (data.status === 'accepted') tab = 'approved';
            else if (['paid', 'assigned'].includes(data.status)) tab = 'scheduled';
            else if (data.status === 'in_service') tab = 'in_progress';
            else if (['completed', 'review'].includes(data.status)) tab = 'completed';
            
            setActiveTab(tab);
            setDetailsModal({ isOpen: true, order: data });
          }
        } catch (e) {
          console.warn("Could not load initial deep-linked order", e);
        }
      };
      loadInitialOrder();
    }
    
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
  }, [user, activeTab, params?.orderId]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    
    // Find orders the user already bid on
    const { data: userBids } = await supabase.from('freelance_bids').select('order_id, amount').eq('provider_id', user.id);
    const bidOrderIds = userBids?.map(b => b.order_id) || [];
    
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
      if (!error) setOrders(data || []);
    } else if (activeTab === 'bidded') {
      // Meus Lances: dei lance mas ainda não fui selecionado (order ainda open)
      if (bidOrderIds.length === 0) {
        setOrders([]);
      } else {
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
        if (!error) {
           const enhanced = data.map((o: any) => ({
             ...o,
             myBidAmount: userBids?.find(b => b.order_id === o.id)?.amount
           }));
           setOrders(enhanced || []);
         }
      }
    } else if (activeTab === 'approved') {
      // Aprovados: fui selecionado, aguardando pagamento
      const { data, error } = await supabase
        .from('freelance_orders')
        .select(`
          *,
          profiles:client_id(full_name, avatar_url, phone),
          service_categories(name, icon)
        `)
        .eq('assigned_provider_id', user.id)
        .in('status', ['assigned', 'awaiting_payment'])
        .order('created_at', { ascending: false });
      if (!error) setOrders(data || []);
    } else if (activeTab === 'scheduled') {
      // Agendados: cliente pagou E prestador definiu data/hora
      const { data, error } = await supabase
        .from('freelance_orders')
        .select(`
          *,
          profiles:client_id(full_name, avatar_url, phone),
          service_categories(name, icon)
        `)
        .eq('assigned_provider_id', user.id)
        .in('status', ['paid', 'assigned'])
        .order('created_at', { ascending: false });
      if (!error) setOrders(data || []);
    } else if (activeTab === 'in_progress') {
      // Em Andamento
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
      if (!error) setOrders(data || []);
    } else if (activeTab === 'completed') {
      // Finalizados
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
      if (!error) setOrders(data || []);
    } else {
      // Recusados
      if (dismissedIds.length === 0) {
        setOrders([]);
      } else {
        const { data, error } = await supabase
          .from('freelance_orders')
          .select(`
            *,
            profiles:client_id(full_name, avatar_url, phone),
            service_categories(name, icon)
          `)
          .in('id', dismissedIds)
          .order('created_at', { ascending: false });
        if (!error) setOrders(data || []);
      }
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
    <div className="bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col antialiased">
      <div className="relative z-40 bg-white dark:bg-slate-900">
        <ProviderHeader 
          title="Freelance" 
          onBack={() => onNavigate('dashboard')} 
          onNavigate={onNavigate} 
          rightActions={
            <button onClick={fetchOrders} className="size-10 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">refresh</span>
            </button>
          }
        />
        
        {/* Tabs - scrollable for 7 items */}
        <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none">
          <div className="flex min-w-max max-w-7xl mx-auto">
            {([
              { key: 'available', label: 'Disponíveis' },
              { key: 'bidded', label: 'Meus Lances' },
              { key: 'approved', label: 'Aprovados' },
              { key: 'scheduled', label: 'Agendados' },
              { key: 'in_progress', label: 'Em Andamento' },
              { key: 'completed', label: 'Finalizados' },
              { key: 'dismissed', label: 'Recusados' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-xs font-bold tracking-widest uppercase transition-colors whitespace-nowrap ${activeTab === tab.key ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
            </div>
            <h3 className="text-xl font-bold">
              {activeTab === 'available' ? 'Nenhuma ordem disponível' :
               activeTab === 'bidded' ? 'Nenhum lance enviado' :
               activeTab === 'approved' ? 'Nenhum aprovado ainda' :
               activeTab === 'scheduled' ? 'Nenhum agendado' :
               activeTab === 'in_progress' ? 'Nenhum em andamento' :
               activeTab === 'completed' ? 'Nenhum finalizado' :
               'Nenhum recusado'}
            </h3>
            <p className="text-slate-500 max-w-[250px] mx-auto mt-2">
              {activeTab === 'available' ? 'Fique ligado! Novas oportunidades aparecem a qualquer momento.' :
               activeTab === 'bidded' ? 'Acesse "Disponíveis" e envie suas propostas.' :
               activeTab === 'approved' ? 'Quando o cliente aceitar seu lance, ele aparecerá aqui.' :
               activeTab === 'scheduled' ? 'Trabalhos pagos e prontos para iniciar aparecerão aqui.' :
               activeTab === 'in_progress' ? 'Trabalhos em execução aparecerão aqui.' :
               activeTab === 'completed' ? 'Trabalhos concluídos aparecerão aqui.' :
               'Ordens que você recusou aparecerão aqui.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {orders.map(order => (
              <div 
                key={order.id} 
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative transition-all hover:shadow-xl hover:border-primary/20 flex flex-col h-full"
              >
                {/* Header with Title & Category */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined">{order.service_categories?.icon || 'work'}</span>
                    </div>
                    <div>
                      <h3 className="font-black text-lg leading-tight uppercase tracking-tight line-clamp-1">{order.title}</h3>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{order.service_categories?.name}</p>
                        {order.attachments && Array.isArray(order.attachments) && order.attachments.length > 0 && (
                          <span className="flex items-center gap-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">
                            <span className="material-symbols-outlined text-[10px]">photo_library</span>
                            {order.attachments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {activeTab === 'available' && (
                    <button 
                      onClick={(e) => handleDismissClick(e, order.id)}
                      className="size-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  )}
                </div>

                {/* Budget Indicators */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest mb-1">Budget Sugerido</p>
                    <p className="text-xl font-black text-emerald-500">{formatCurrency(order.budget || 0)}</p>
                  </div>
                  {activeTab === 'bidded' && order.myBidAmount && (
                    <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10">
                      <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest mb-1">Seu Lance</p>
                      <p className="text-xl font-black text-primary">{formatCurrency(order.myBidAmount || 0)}</p>
                    </div>
                  )}
                </div>

                {/* Description Preview */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl mb-6 flex-1">
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 italic">
                    "{order.description}"
                  </p>
                  <button 
                    onClick={() => setDetailsModal({ isOpen: true, order })}
                    className="mt-3 text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:underline"
                  >
                    Ver Solicitação Completa
                    <span className="material-symbols-outlined text-xs">open_in_new</span>
                  </button>
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-full bg-slate-200 overflow-hidden border border-white dark:border-slate-800">
                      <img src={order.profiles?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">{order.profiles?.full_name?.split(' ')[0]}</p>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-widest">
                        Publicado: {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      if (['approved', 'scheduled', 'in_progress', 'completed'].includes(activeTab)) {
                        onNavigate('freelanceStatus', { orderId: order.id });
                      } else {
                        onNavigate('bidRoom', { orderId: order.id });
                      }
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-125 transition-all shadow-lg active:scale-95"
                  >
                    <span>
                      {activeTab === 'available' ? 'Dar Lance' :
                       activeTab === 'bidded' ? 'Ver Lance' :
                       activeTab === 'approved' ? 'Ver Aprovação' :
                       activeTab === 'scheduled' ? 'Iniciar Trabalho' :
                       activeTab === 'in_progress' ? 'Ver Progresso' :
                       activeTab === 'completed' ? 'Ver Finalizado' :
                       'Ver Ordem'}
                    </span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="h-24"></div>
      </main>

      {/* Details Modal */}
      {detailsModal.isOpen && detailsModal.order && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl bg-white dark:bg-slate-900 md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setDetailsModal({ isOpen: false, order: null })}
                  className="md:hidden size-10 flex items-center justify-center text-slate-400"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-2xl">{detailsModal.order.service_categories?.icon || 'work'}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tighter truncate">
                    {detailsModal.order.profiles?.full_name || 'Detalhes da Ordem Freelance'}
                  </h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Job para {detailsModal.order.service_categories?.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setDetailsModal({ isOpen: false, order: null })}
                className="hidden md:flex size-10 items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">
              
              {/* 1. Descrição */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="size-2 bg-primary rounded-full"></span>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Briefing do Cliente</h4>
                </div>
                <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                  <p className="text-lg text-slate-800 dark:text-slate-200 font-medium leading-relaxed whitespace-pre-line">
                    {detailsModal.order.description || 'Nenhuma descrição detalhada fornecida.'}
                  </p>
                </div>
              </section>

              {/* 2. Fotos */}
              {detailsModal.order.attachments && detailsModal.order.attachments.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="size-2 bg-amber-500 rounded-full"></span>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Anexos do Job ({detailsModal.order.attachments.length})</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {detailsModal.order.attachments.map((url: string, idx: number) => (
                      <button 
                        key={idx} 
                        onClick={() => setImageModal({ isOpen: true, url })}
                        className="aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 hover:ring-4 hover:ring-primary/20 transition-all group"
                      >
                        <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={`Anexo Job ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* 3. Localização */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="size-2 bg-emerald-500 rounded-full"></span>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Local de Atendimento</h4>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl space-y-2">
                   {detailsModal.order.street ? (
                     <>
                        <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                          {detailsModal.order.street}, {detailsModal.order.number || 'S/N'}
                        </p>
                        <p className="text-base font-bold text-slate-600 dark:text-slate-300">
                          {detailsModal.order.neighborhood}
                        </p>
                        <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">
                          {detailsModal.order.city} - {detailsModal.order.state} | CEP: {detailsModal.order.cep}
                        </p>
                     </>
                   ) : (
                     <p className="text-slate-500 italic">Localização não especificada (pode ser serviço remoto ou a combinar).</p>
                   )}
                </div>
              </section>

              {/* 4. Budget e Prazo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <section>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="size-2 bg-emerald-500 rounded-full"></span>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Budget Sugerido</h4>
                  </div>
                  <div className="bg-emerald-500/10 p-6 rounded-3xl flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl">payments</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(detailsModal.order.budget || 0)}
                    </p>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="size-2 bg-orange-500 rounded-full"></span>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Prazo Estimado</h4>
                  </div>
                  <div className="bg-orange-500/10 p-6 rounded-3xl flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl">timer</span>
                    </div>
                    <p className="text-xl font-black text-orange-600 dark:text-orange-400">
                      {detailsModal.order.delivery_deadline ? new Date(detailsModal.order.delivery_deadline).toLocaleDateString('pt-BR') : 'A combinar'}
                    </p>
                  </div>
                </section>
              </div>

              <div className="h-10 md:h-0"></div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800">
               <button 
                 onClick={() => {
                   onNavigate('bidRoom', { orderId: detailsModal.order.id });
                   setDetailsModal({ isOpen: false, order: null });
                 }}
                 className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
               >
                 <span className="material-symbols-outlined">send_money</span>
                 Entrar na Sala de Lance
               </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirm Dismiss Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="size-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-red-600 text-3xl">delete_sweep</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Ocultar Ordem?</h3>
              <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed text-center">
                Esta oportunidade será removida da sua lista principal e movida para o histórico de recusadas.
              </p>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={confirmDismiss}
                  className="w-full py-3.5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-colors"
                >
                  Confirmar
                </button>
                <button 
                  onClick={() => setConfirmModal({ isOpen: false, orderId: null })}
                  className="w-full py-3.5 text-slate-500 font-bold text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
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
            className="relative w-full h-full flex items-center justify-center p-4 md:p-12"
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
