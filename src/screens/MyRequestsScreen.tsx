import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { formatCurrency } from '../lib/formatters';

export default function MyRequestsScreen({ onNavigate, params }: NavigationProps) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [activeTab, setActiveTab] = useState<'ativos' | 'concluidos' | 'cancelados'>(
    params?.tab && params.tab !== 'freelance' ? params.tab : 'ativos'
  );
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    // Configurar assinatura real-time para atualizar a lista automaticamente
    const channel = supabase.channel('my_requests_realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'service_requests',
        filter: `client_id=eq.${user.id}`
      }, () => {
        fetchRequests();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'freelance_orders',
        filter: `client_id=eq.${user.id}`
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let statuses = ['open', 'proposed', 'accepted', 'in_progress', 'awaiting_payment', 'paid'];
      if (activeTab === 'concluidos') statuses = ['completed'];
      else if (activeTab === 'cancelados') statuses = ['cancelled'];

      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          id,
          title,
          description,
          status,
          created_at,
          category_id,
          provider_id,
          profiles:provider_id(full_name, avatar_url),
          service_categories(name, icon)
        `)
        .eq('client_id', user.id)
        .in('status', statuses)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      console.error("Erro ao buscar pedidos:", err);
      showToast("Erro", "Erro ao buscar pedidos: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab, user]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden">

      {/* Header */}
      <header className="flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative z-20">
        <div className="flex items-center gap-3 p-4 max-w-4xl lg:mx-0 lg:ml-12 w-full transition-all duration-300">
          <button 
            onClick={() => onNavigate('back')}
            className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight">Serviços</h1>
        </div>

        {/* Tabs */}
        <div className="px-4 max-w-4xl lg:mx-0 lg:ml-12 w-full flex gap-6 overflow-x-auto no-scrollbar transition-all duration-300">
          <button
            onClick={() => setActiveTab('ativos')}
            className={`pb-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === 'ativos' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Em Andamento
          </button>
          <button
            onClick={() => setActiveTab('concluidos')}
            className={`pb-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === 'concluidos' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Concluídos
          </button>
          <button
            onClick={() => setActiveTab('cancelados')}
            className={`pb-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === 'cancelados' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Cancelados
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-4xl lg:mx-0 lg:ml-12 w-full p-4 space-y-4 transition-all duration-300">

          {loading ? (
            <div className="flex justify-center p-8">
              <span className="material-symbols-outlined animate-spin text-4xl text-slate-300">progress_activity</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
              <span className="material-symbols-outlined text-6xl mb-4 opacity-50">shopping_bag</span>
              <p className="text-lg font-medium">Você ainda não possui pedidos nesta categoria.</p>
              <button 
                onClick={() => onNavigate('home')}
                className="mt-6 px-6 py-2 bg-primary text-white rounded-full font-bold text-sm hover:opacity-90 transition-opacity"
              >
                Explorar Serviços
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              {requests.map((req) => (
                <div
                  key={req.id}
                  onClick={() => onNavigate('serviceStatus', { requestId: req.id })}
                  className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm cursor-pointer hover:border-primary/50 transition-colors ${req.status === 'cancelled' ? 'opacity-75 grayscale' : ''
                    }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden border border-slate-200 dark:border-slate-600">
                        <img
                          src={req.profiles?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                          alt="Provider"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">{req.profiles?.full_name || 'Aguardando Profissional'}</h3>
                        <p className="text-[13px] font-medium text-slate-500">{req.title || req.service_categories?.name || 'Serviço'}</p>
                      </div>
                    </div>
                    {/* Status Badge */}
                    {req.status === 'open' && (
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Aberto</span>
                    )}
                    {req.status === 'proposed' && (
                      <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Proposta Recebida</span>
                    )}
                    {req.status === 'awaiting_payment' && (
                      <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Aguardando Pagamento</span>
                    )}
                    {req.status === 'paid' && (
                      <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Confirmado / Pago</span>
                    )}
                    {req.status === 'accepted' && (
                      <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Aceito</span>
                    )}
                    {req.status === 'in_progress' && (
                      <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Iniciado</span>
                    )}
                    {req.status === 'completed' && (
                      <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Finalizado</span>
                    )}
                    {req.status === 'cancelled' && (
                      <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Cancelado</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50 dark:border-white/5">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(req.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>

                    {req.status === 'completed' ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('writeReview', { 
                            requestId: req.id, 
                            providerId: req.provider_id, 
                            providerName: req.profiles?.full_name,
                            serviceTitle: req.title || req.service_categories?.name
                          });
                        }}
                        className="h-8 px-4 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">star</span>
                        Avaliar
                      </button>
                    ) : (
                      <span className="material-symbols-outlined text-sm text-slate-400">arrow_forward</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
