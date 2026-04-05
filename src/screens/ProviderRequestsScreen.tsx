import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { formatCurrency } from '../lib/formatters';
import { ProviderHeader } from '../components/ProviderHeader';
import { ServiceDashboardDetail } from '../components/ServiceDashboardDetail';

type Tab = 'Novos' | 'Orçados' | 'Aprovados' | 'Agendados' | 'Finalizados' | 'Recusados';

export default function ProviderRequestsScreen({ onNavigate, params }: NavigationProps) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [activeTab, setActiveTab] = useState<Tab>((params?.tab as Tab) || 'Novos');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(params?.requestId || null);
  
  const tabs: Tab[] = ['Novos', 'Orçados', 'Aprovados', 'Agendados', 'Finalizados', 'Recusados'];

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('service_requests')
        .select(`
          id,
          title,
          description,
          status,
          created_at,
          client_id,
          category_id,
          budget_amount,
          display_id,
          rejection_reason,
          profiles!service_requests_client_id_fkey(full_name, avatar_url),
          service_categories(name, icon)
        `)
        .order('created_at', { ascending: false });

      let expectedStatuses: string[] = [];

      switch (activeTab) {
        case 'Novos':
          expectedStatuses = ['open'];
          const { data: profData } = await supabase.from('profiles').select('categories').eq('id', user.id).maybeSingle();
          const myCats = profData?.categories || [];
          const { data: catData } = await supabase.from('service_categories').select('id, name');
          let catIds: string[] = [];
          if (catData) {
            catIds = catData.filter(c => myCats.includes(c.name)).map(c => c.id);
          }
          const { data: dismissalData } = await supabase.from('provider_dismissals').select('order_id').eq('provider_id', user.id).eq('order_type', 'service');
          const dismissedIds = dismissalData?.map(d => d.order_id) || [];

          if (catIds.length > 0) {
            query = query.eq('status', 'open').or(`provider_id.eq.${user.id},and(provider_id.is.null,category_id.in.(${catIds.join(',')}))`);
          } else {
            query = query.eq('status', 'open').eq('provider_id', user.id);
          }
          if (dismissedIds.length > 0) {
            query = query.not('id', 'in', `(${dismissedIds.join(',')})`);
          }
          break;

        case 'Recusados':
          expectedStatuses = ['cancelled'];
          const { data: myDismissals } = await supabase.from('provider_dismissals').select('order_id').eq('provider_id', user.id).eq('order_type', 'service');
          const myDismissedIds = myDismissals?.map(d => d.order_id) || [];
          if (myDismissedIds.length > 0) {
            query = query.or(`and(status.eq.cancelled,provider_id.eq.${user.id}),id.in.(${myDismissedIds.join(',')})`);
          } else {
            query = query.eq('status', 'cancelled').eq('provider_id', user.id);
          }
          break;

        case 'Orçados':
          expectedStatuses = ['proposed', 'awaiting_payment'];
          query = query.in('status', ['proposed', 'awaiting_payment']).eq('provider_id', user.id);
          break;

        case 'Aprovados':
          expectedStatuses = ['accepted', 'paid'];
          query = query.in('status', ['accepted', 'paid']).eq('provider_id', user.id);
          break;

        case 'Agendados':
          expectedStatuses = ['scheduled'];
          query = query.eq('status', 'scheduled').eq('provider_id', user.id);
          break;

        case 'Finalizados':
          expectedStatuses = ['completed'];
          query = query.eq('status', 'completed').eq('provider_id', user.id);
          break;
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error("Error fetching requests:", err);
      showToast('Erro ao carregar serviços', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const channel = supabase.channel('requests_list_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests' }, () => fetchRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTab, user]);

  const statusMap: Record<string, { label: string; color: string }> = {
    'open': { label: 'Novo', color: 'bg-emerald-500 text-white' },
    'proposed': { label: 'Orçado', color: 'bg-blue-500 text-white' },
    'accepted': { label: 'Aceito', color: 'bg-indigo-500 text-white' },
    'awaiting_payment': { label: 'Pgto Pendente', color: 'bg-purple-500 text-white' },
    'scheduled': { label: 'Agendado', color: 'bg-primary text-white' },
    'paid': { label: 'Confirmado', color: 'bg-emerald-600 text-white' },
    'in_service': { label: 'Executando', color: 'bg-blue-400 text-white' },
    'completed': { label: 'Finalizado', color: 'bg-slate-500 text-white' },
    'cancelled': { label: 'Cancelado', color: 'bg-red-500 text-white' }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 font-display text-slate-100 antialiased overflow-hidden">
      
      <div className="shrink-0 z-50 bg-slate-900 border-b border-white/5 py-4 px-6">
        <div className="flex flex-col">
          <p className="text-[10px] font-black text-primary uppercase tracking-[2px] leading-none mb-1">Central de Serviços</p>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-sm font-black text-white uppercase tracking-[1px] italic leading-none">Painel do Prestador</h1>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* MASTER LIST (WhatsApp Style) */}
        <div className={`flex flex-col border-r border-white/5 bg-slate-900/50 ${selectedRequestId ? 'hidden lg:flex' : 'flex'} w-full lg:w-[350px] shrink-0 overflow-hidden`}>
          <div className="p-1 px-2 border-b border-white/5 bg-slate-900/80 backdrop-blur-md">
            <div className="flex w-full gap-1">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => { 
                    setActiveTab(tab); 
                    setSelectedRequestId(null);
                    onNavigate('providerRequests', { tab, requestId: null });
                  }}
                  className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-[8px] font-black uppercase tracking-tighter transition-all border whitespace-nowrap ${
                    activeTab === tab 
                      ? 'bg-primary border-primary text-white shadow-md' 
                      : 'bg-white/5 border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-white/5 relative">
            {loading && requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                <div className="size-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Carregando...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-10 text-center opacity-30">
                <span className="material-symbols-outlined text-6xl mb-4 italic">inbox</span>
                <p className="text-xs font-black uppercase tracking-widest">Nenhum serviço aqui</p>
              </div>
            ) : (
              <>
                {loading && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 overflow-hidden z-10">
                    <div className="h-full bg-primary animate-progress-indefinite w-40" />
                  </div>
                )}
                {requests.map(req => {
                const isActive = selectedRequestId === req.id;
                return (
                  <div 
                    key={req.id}
                    onClick={() => {
                      if (window.innerWidth < 1024) {
                        onNavigate('serviceStatus', { requestId: req.id });
                      } else {
                        setSelectedRequestId(req.id);
                        onNavigate('providerRequests', { tab: activeTab, requestId: req.id });
                      }
                    }}
                    className={`p-4 flex gap-4 cursor-pointer transition-all relative group ${
                      isActive ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-white/5 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="size-12 rounded-2xl bg-slate-800 shrink-0 overflow-hidden border border-white/5">
                      <img src={req.profiles?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      <div className="flex justify-between items-center gap-2 mb-1">
                        <h4 className={`text-sm font-black uppercase tracking-tighter truncate leading-none ${isActive ? 'text-primary' : 'text-white'}`}>
                          {req.profiles?.full_name || 'Cliente'}
                        </h4>
                        <span className="text-[9px] font-bold text-slate-500 shrink-0">
                          {new Date(req.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[12px] font-bold text-slate-400 truncate leading-none mb-2">
                        {req.display_id || 'PEDIDO'} • {req.service_categories?.name}
                      </p>
                      <div className="flex items-center justify-between">
                         <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${statusMap[req.status]?.color || 'bg-slate-700'}`}>
                           {statusMap[req.status]?.label || req.status}
                         </span>
                         {req.budget_amount > 0 && (
                           <span className="text-[10px] font-black text-white italic">{formatCurrency(req.budget_amount)}</span>
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

        {/* DETAIL PANEL */}
        <div className={`flex-1 flex flex-col bg-slate-950 ${selectedRequestId ? 'flex' : 'hidden lg:flex'} relative overflow-hidden`}>
           {selectedRequestId ? (
             <div className="h-full flex flex-col">
                <button 
                  onClick={() => setSelectedRequestId(null)}
                  className="lg:hidden absolute top-4 left-4 z-[60] size-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-white"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <ServiceDashboardDetail 
                  requestId={selectedRequestId} 
                  onNavigate={onNavigate} 
                  isEmbedded={true} 
                />
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-20">
                <div className="size-32 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center mb-6">
                   <span className="material-symbols-outlined text-6xl italic">ads_click</span>
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Selecione um Serviço</h3>
                <p className="text-sm font-medium max-w-xs">Escolha um pedido da lista à esquerda para gerenciar.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
