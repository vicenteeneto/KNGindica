import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import ProviderMobileNav from '../components/ProviderMobileNav';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';

type Tab = 'Novos' | 'Aceitos' | 'Em Andamento' | 'Finalizados';

export default function ProviderRequestsScreen({ onNavigate }: NavigationProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('Novos');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const tabs: Tab[] = ['Novos', 'Aceitos', 'Em Andamento', 'Finalizados'];

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Map tabs to DB statuses
      let statusFilter = 'open';
      if (activeTab === 'Aceitos') statusFilter = 'accepted';
      else if (activeTab === 'Em Andamento') statusFilter = 'in_progress';
      else if (activeTab === 'Finalizados') statusFilter = 'completed';

      let query = supabase
        .from('service_requests')
        .select(`
          id,
          title,
          description,
          address,
          status,
          created_at,
          client_id,
          category_id,
          profiles!service_requests_client_id_fkey(full_name, avatar_url),
          service_categories(name, icon)
        `)
        .eq('status', statusFilter)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'open') {
        query = query.eq('provider_id', user.id);
      } else {
        // Para "Novos" (open), pega os globais (null) e os diretos para mim
        query = query.or(`provider_id.is.null,provider_id.eq.${user.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab, user]);

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
            client_id: req.client_id,
            provider_id: user.id
          })
          .select('id')
          .single();
        if (createError) throw createError;
        room = newRoom;
      }
      
      onNavigate('chat', { 
        roomId: room.id, 
        opponentName: req.profiles?.full_name || 'Cliente', 
        opponentAvatar: req.profiles?.avatar_url 
      });
    } catch (err) {
      console.error("Error opening chat:", err);
      alert("Erro ao abrir chat.");
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ status: 'accepted', provider_id: user.id })
        .eq('id', requestId);

      if (error) throw error;

      // Fetch client_id to create chat room
      const { data: reqData } = await supabase
        .from('service_requests')
        .select('client_id')
        .eq('id', requestId)
        .single();

      if (reqData?.client_id) {
        // Create a chat room for this request
        await supabase
          .from('chat_rooms')
          .insert({
            request_id: requestId,
            client_id: reqData.client_id,
            provider_id: user.id
          });
      }

      alert('Pedido aceito com sucesso!');
      fetchRequests(); // Refresh list
    } catch (err) {
      console.error(err);
      alert('Erro ao aceitar pedido');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden">
      <div className="relative flex min-h-screen w-full flex-col bg-white dark:bg-slate-900 shadow-xl overflow-x-hidden">

        {/* Header */}
        <div className="flex items-center bg-white dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 transition-colors">
          <button onClick={() => onNavigate('dashboard')} className="text-primary flex size-10 shrink-0 items-center justify-center cursor-pointer rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 ml-2">Meus Pedidos</h2>
          <button onClick={() => onNavigate('notifications')} className="text-slate-500 dark:text-slate-400 flex size-10 shrink-0 items-center justify-center cursor-pointer rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-[24px]">notifications</span>
          </button>
        </div>

        {/* Status Tabs */}
        <div className="bg-white dark:bg-slate-900 sticky top-[73px] z-10 transition-colors">
          <div className="flex justify-center border-b border-slate-200 dark:border-slate-800 px-4 overflow-x-auto no-scrollbar gap-6 sm:gap-12">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-center justify-center border-b-2 pb-3 pt-4 whitespace-nowrap transition-colors ${activeTab === tab
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 font-medium hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
              >
                <p className="text-sm">{tab}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 w-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-slate-900 dark:text-white text-lg font-bold">
              {loading ? 'Carregando...' : `${activeTab} (${requests.length})`}
            </h3>
            <button className="text-sm text-primary font-medium hover:underline">Ver mapa</button>
          </div>

          {!loading && requests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {requests.map(req => (
                <div key={req.id} className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all hover:shadow-md">
                  <div className="p-4 flex flex-col h-full">
                    <div className="flex gap-4 items-start flex-1">
                      <div className="w-16 h-16 rounded-lg bg-cover bg-center shrink-0 border border-slate-100 dark:border-slate-800" style={{ backgroundImage: `url('${req.profiles?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}')` }}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="text-slate-900 dark:text-white text-base font-bold truncate">{req.profiles?.full_name || 'Cliente'}</p>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {req.status === 'open' ? 'Novo' : req.status}
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1 mt-0.5" title={req.description}>
                          <span className="material-symbols-outlined text-[16px]">{req.service_categories?.icon || 'work'}</span>
                          {req.service_categories?.name || 'Serviço'}
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">location_on</span>
                          <span className="truncate">{req.address || 'Local não informado'}</span>
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                          {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex-1">
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line line-clamp-3">
                        {req.description || 'Sem descrição.'}
                      </p>
                    </div>

                    {activeTab === 'Novos' && (
                      <div className="mt-4 flex flex-col gap-2">
                        <button
                          onClick={() => handleOpenChat(req)}
                          className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-500 text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/20 active:scale-[0.98] transition-colors border border-emerald-200 dark:border-emerald-800/30">
                          <span className="material-symbols-outlined text-[18px]">chat</span>
                          Conversar e Orçar
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="flex-1 cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold transition-opacity hover:opacity-90 active:scale-[0.98]">
                            Aceitar Pedido
                          </button>
                          <button className="flex-1 cursor-pointer items-center justify-center rounded-lg h-10 px-4 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition-colors">
                            Recusar
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {(activeTab === 'Aceitos' || activeTab === 'Em Andamento') && (
                      <div className="mt-6 flex gap-2">
                        <button
                          onClick={() => handleOpenChat(req)}
                          className="flex-1 cursor-pointer flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-500 text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/20 active:scale-[0.98] transition-colors border border-emerald-200 dark:border-emerald-800/30">
                          <span className="material-symbols-outlined text-[18px]">chat</span>
                          Conversar com Cliente
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : !loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
              <span className="material-symbols-outlined text-6xl mb-4 opacity-50">inbox</span>
              <p className="text-lg">Nenhuma solicitação encontrada nesta categoria.</p>
            </div>
          ) : null}

          <div className="h-24"></div> {/* Spacer for BottomNav */}
        </div>



        <ProviderMobileNav onNavigate={onNavigate} currentScreen="providerRequests" />
      </div>
    </div>
  );
}
