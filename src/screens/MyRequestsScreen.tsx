import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';

export default function MyRequestsScreen({ onNavigate }: NavigationProps) {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();
  const [activeTab, setActiveTab] = useState<'ativos' | 'concluidos' | 'cancelados' | 'freelance'>('ativos');
  const [requests, setRequests] = useState<any[]>([]);
  const [freelanceOrders, setFreelanceOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (activeTab === 'freelance') {
        const { data, error } = await supabase
          .from('freelance_orders')
          .select(`
            *,
            service_categories(name, icon),
            freelance_bids(
              *,
              profiles:provider_id(full_name, avatar_url)
            )
          `)
          .eq('client_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setFreelanceOrders(data || []);
      } else {
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
      }
    } catch (err: any) {
      console.error("Erro ao buscar pedidos:", err);
      showToast("Erro", "Erro ao buscar pedidos: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = async (req: any) => {
    if (!user) return;
    try {
      // Find existing room
      let { data: room } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('request_id', req.id)
        .single();
        
      if (!room) {
        // Create fallback if not exists somehow
        const { data: newRoom, error: createError } = await supabase
          .from('chat_rooms')
          .insert({
            request_id: req.id,
            client_id: user.id,
            provider_id: req.provider_id
          })
          .select('id')
          .single();
        if (createError) throw createError;
        room = newRoom;
      }
      
      onNavigate('chat', { 
        roomId: room.id, 
        opponentName: req.profiles?.full_name || 'Profissional', 
        opponentAvatar: req.profiles?.avatar_url,
        requestId: req.id
      });
    } catch (err) {
      console.error("Error opening chat:", err);
      showToast("Erro", "Erro ao abrir chat.", "error");
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab, user]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden">

      {/* Header */}
      <header className="flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="flex items-center gap-3 p-4 max-w-4xl mx-auto w-full">
          <button 
            onClick={() => onNavigate('back')}
            className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight">Serviços</h1>
        </div>

        {/* Tabs */}
        <div className="px-4 max-w-4xl mx-auto w-full flex gap-6 overflow-x-auto no-scrollbar">
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
          <button
            onClick={() => setActiveTab('freelance')}
            className={`pb-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === 'freelance' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Open Orders (Freelance)
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full pb-32">
        <div className="max-w-4xl mx-auto w-full p-4 space-y-4">

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
          ) : activeTab === 'freelance' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              {freelanceOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined">{order.service_categories?.icon || 'work'}</span>
                      </div>
                      <div>
                        <h3 className="font-black text-lg tracking-tight uppercase">{order.title}</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Status: {order.status === 'open' ? 'Aguardando Lances' : 'Finalizado'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Seu Orçamento</p>
                      <p className="text-xl font-black text-emerald-500 leading-none">R$ {order.budget?.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Bids Link */}
                  <div className="mt-6 border-t border-slate-100 dark:border-slate-700 pt-4 cursor-pointer" onClick={() => onNavigate('bidRoom', { orderId: order.id })}>
                    <div className="flex items-center justify-between text-primary font-bold bg-primary/5 hover:bg-primary/10 rounded-2xl p-4 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined">forum</span>
                        <span>Ver Sala de Freelance</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black bg-primary text-white px-2 py-1 rounded-full">{order.freelance_bids?.length || 0} Lances</span>
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
                        <h3 className="font-bold text-sm">{req.profiles?.full_name || 'Aguardando Profissional'}</h3>
                        <p className="text-xs text-slate-500">{req.title || req.service_categories?.name || 'Serviço'}</p>
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
                      <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Em Andamento</span>
                    )}
                    {req.status === 'completed' && (
                      <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Concluído</span>
                    )}
                    {req.status === 'cancelled' && (
                      <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest">Cancelado</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                    {new Date(req.created_at).toLocaleDateString()}
                  </div>
                  
                  {(req.status === 'accepted' || req.status === 'in_progress') && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenChat(req);
                        }}
                        className="flex-1 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-500 font-bold py-2 rounded-lg text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors flex justify-center items-center gap-2 border border-emerald-200 dark:border-emerald-800/30"
                      >
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                        Conversar
                      </button>
                    </div>
                  )}

                  {req.status === 'completed' && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('writeReview', {
                            requestId: req.id,
                            providerId: req.provider_id,
                            providerName: req.profiles?.full_name,
                            providerAvatar: req.profiles?.avatar_url,
                            serviceTitle: req.title || req.service_categories?.name || 'Serviço'
                          });
                        }}
                        className="flex-1 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-500 font-bold py-2 rounded-lg text-xs hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors flex justify-center items-center gap-1 border border-amber-200 dark:border-amber-800/30"
                      >
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        Avaliar Prestador
                      </button>
                    </div>
                  )}
                  {req.status === 'cancelled' && (
                    <p className="text-xs text-slate-400 italic mt-2">"Cancelado pelo sistema ou usuário."</p>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
