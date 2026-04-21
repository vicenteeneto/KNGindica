import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { formatCurrency } from '../lib/formatters';
import { TabBar } from '../components/TabBar';
import { ServiceDashboardDetail } from '../components/ServiceDashboardDetail';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  open:             { label: 'Aberto',              color: 'bg-blue-500/20 text-blue-400' },
  proposed:         { label: 'Proposta recebida',   color: 'bg-orange-500/20 text-orange-400' },
  awaiting_payment: { label: 'Aguardando pagamento',color: 'bg-amber-500/20 text-amber-400' },
  paid:             { label: 'Confirmado / Pago',   color: 'bg-emerald-500/20 text-emerald-400' },
  accepted:         { label: 'Aceito',              color: 'bg-amber-500/20 text-amber-400' },
  in_progress:      { label: 'Em andamento',        color: 'bg-indigo-500/20 text-indigo-400' },
  completed:        { label: 'Finalizado',          color: 'bg-slate-500/20 text-slate-400' },
  cancelled:        { label: 'Cancelado',           color: 'bg-red-500/20 text-red-400' },
};

export default function MyRequestsScreen({ onNavigate, params }: NavigationProps) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [activeTab, setActiveTab] = useState<'ativos' | 'finalizados' | 'cancelados'>(
    params?.tab && params.tab !== 'freelance' ? params.tab : 'ativos'
  );
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    params?.requestId || null
  );

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('my_requests_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_requests', filter: `client_id=eq.${user.id}` }, () => fetchRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'freelance_orders', filter: `client_id=eq.${user.id}` }, () => fetchRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let statuses = ['open', 'proposed', 'accepted', 'in_progress', 'awaiting_payment', 'paid', 'scheduled'];
      if (activeTab === 'finalizados') statuses = ['completed'];
      else if (activeTab === 'cancelados') statuses = ['cancelled'];

      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          id, title, description, status, created_at,
          category_id, provider_id, display_id,
          profiles:provider_id(full_name, avatar_url),
          service_categories(name, icon),
          reviews(id)
        `)
        .eq('client_id', user.id)
        .in('status', statuses)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);

      // Auto-select first on desktop
      if (!selectedRequestId && (data || []).length > 0 && window.innerWidth >= 1024) {
        setSelectedRequestId((data || [])[0].id);
      }
    } catch (err: any) {
      showToast('Erro ao buscar pedidos: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [activeTab, user]);

  const filteredRequests = requests.filter(req => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      req.profiles?.full_name?.toLowerCase().includes(q) ||
      req.title?.toLowerCase().includes(q) ||
      req.service_categories?.name?.toLowerCase().includes(q) ||
      req.display_id?.toLowerCase().includes(q)
    );
  });

  const handleSelectRequest = (reqId: string) => {
    if (window.innerWidth < 1024) {
      // Mobile → full screen detail
      onNavigate('serviceStatus', { requestId: reqId });
    } else {
      setSelectedRequestId(reqId);
    }
  };

  return (
    <div className="flex flex-col h-screen netflix-main-bg font-display text-slate-100 antialiased overflow-hidden">

      {/* Header */}
      <div className="shrink-0 z-50 bg-slate-900 border-b border-white/5 h-[60px] flex items-center px-6">
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={() => onNavigate('home')}
            className="size-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </button>
          <div className="flex items-center gap-1.5 md:gap-2">
            <h1 className="text-sm md:text-lg font-black text-white italic leading-none truncate">Meus Pedidos</h1>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">

        {/* MASTER LIST */}
        <div className={`flex flex-col border-r border-white/5 bg-slate-900/50 ${selectedRequestId ? 'hidden lg:flex' : 'flex'} w-full lg:w-[570px] shrink-0 overflow-hidden`}>

          {/* Search Bar */}
          <div className="px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-white/5">
            <div className="relative group/search">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[20px] group-focus-within/search:text-primary transition-colors">search</span>
              <input
                type="text"
                placeholder="Pesquisar serviços..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/40 border-none rounded-xl py-2.5 pl-11 pr-4 text-sm font-medium placeholder:text-slate-500 focus:ring-1 focus:ring-primary/40 transition-all outline-none text-white shadow-inner"
              />
            </div>
          </div>

          {/* Tab Bar */}
          <TabBar
            variant="dark"
            active={activeTab}
            onChange={(key) => {
              setActiveTab(key as any);
              setSelectedRequestId(null);
            }}
            tabs={[
              { key: 'ativos',      label: 'Em andamento' },
              { key: 'finalizados', label: 'Finalizados'  },
              { key: 'cancelados',  label: 'Cancelados'   },
            ]}
          />

          {/* List */}
          <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-white/5 relative">
            {loading && requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                <div className="size-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <p className="text-[10px] font-black text-primary">Carregando...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-10 text-center opacity-30">
                <span className="material-symbols-outlined text-6xl mb-4">receipt_long</span>
                <p className="text-sm font-black">Nenhum serviço aqui</p>
                {activeTab === 'ativos' && (
                  <button
                    onClick={() => onNavigate('home')}
                    className="mt-4 px-4 py-2 bg-primary text-white rounded-full text-xs font-bold opacity-100"
                  >
                    Explorar serviços
                  </button>
                )}
              </div>
            ) : (
              filteredRequests.map((req) => {
                const isActive = selectedRequestId === req.id;
                const statusInfo = STATUS_LABEL[req.status];
                return (
                  <div
                    key={req.id}
                    onClick={() => handleSelectRequest(req.id)}
                    className={`p-4 flex gap-4 cursor-pointer transition-all relative group ${
                      isActive ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-white/5 border-l-4 border-l-transparent'
                    } ${req.status === 'cancelled' ? 'opacity-60' : ''}`}
                  >
                    {/* Avatar */}
                    <div className="size-12 rounded-2xl bg-slate-800 shrink-0 overflow-hidden border border-white/5">
                      <img
                        src={req.profiles?.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <div className="flex justify-between items-center gap-2 mb-1">
                        <h4 className={`text-sm font-black truncate leading-none ${isActive ? 'text-primary' : 'text-white'}`}>
                          {req.profiles?.full_name || 'Aguardando profissional'}
                        </h4>
                        <span className="text-[9px] font-bold text-slate-500 shrink-0">
                          {new Date(req.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[12px] font-bold text-slate-400 truncate leading-none mb-2">
                        {req.title || req.service_categories?.name || 'Serviço'}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${statusInfo?.color || 'bg-slate-700 text-slate-400'}`}>
                          {statusInfo?.label || req.status}
                        </span>
                        {/* Avaliar badge */}
                        {req.status === 'completed' && !req.reviews?.length && (
                          <span className="text-[9px] font-black text-amber-400 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">star</span>
                            Avaliar
                          </span>
                        )}
                        {req.status === 'completed' && req.reviews?.length > 0 && (
                          <span className="text-[9px] font-black text-emerald-400 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[12px]">check_circle</span>
                            Avaliado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* DETAIL PANEL */}
        <div className={`flex-1 flex flex-col netflix-main-bg ${selectedRequestId ? 'flex' : 'hidden lg:flex'} relative overflow-hidden`}>
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
                <span className="material-symbols-outlined text-6xl italic">receipt_long</span>
              </div>
              <h3 className="text-2xl font-black italic mb-2">Selecione um Serviço</h3>
              <p className="text-sm font-medium max-w-xs">Escolha um pedido da lista à esquerda para gerenciar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
