import React, { useState, useEffect } from 'react';
import { NavigationProps, Screen } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { formatCurrency } from '../lib/formatters';
import { FreelanceOrderDetail } from '../components/FreelanceOrderDetail';
import { TabBar } from '../components/TabBar';

export default function MyFreelancesScreen({ onNavigate, params }: NavigationProps) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [freelanceOrders, setFreelanceOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'open' | 'in_progress' | 'completed' | 'cancelled'>(params?.tab || 'open');
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    orderId: string | null; 
    title: string; 
  }>({
    isOpen: false,
    orderId: null,
    title: ''
  });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(params?.orderId || null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFreelances = async () => {
    if (!user) return;
    setLoading(true);
    try {
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
      const fetched = data || [];
      setFreelanceOrders(fetched);

      // Auto-select first item if none selected and on desktop (large screens)
      if (!selectedOrderId && fetched.length > 0 && window.innerWidth >= 1024) {
        setSelectedOrderId(fetched[0].id);
      }
    } catch (err: any) {
      console.error("Erro ao buscar freelances:", err);
      showToast("Erro ao buscar seus freelances.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFreelance = async () => {
    if (!confirmModal.orderId) return;
    try {
      const { error } = await supabase
        .from('freelance_orders')
        .delete()
        .eq('id', confirmModal.orderId);
      
      if (error) throw error;
      
      showToast("Freelance excluído com sucesso.", "success");
      setFreelanceOrders(prev => prev.filter(o => o.id !== confirmModal.orderId));
      if (selectedOrderId === confirmModal.orderId) setSelectedOrderId(null);
      setConfirmModal({ isOpen: false, orderId: null, title: '' });
    } catch (err: any) {
      console.error("Erro ao excluir freelance:", err);
      showToast("Falha ao excluir o freelance.", "error");
    }
  };

  useEffect(() => {
    fetchFreelances();
  }, [user]);

  useEffect(() => {
    if (params?.orderId) {
      setSelectedOrderId(params.orderId);
    }
    if (params?.tab) {
      setActiveTab(params.tab);
    }
  }, [params?.orderId, params?.tab]);

  return (
    <div className="flex flex-col h-screen bg-black font-display text-slate-100 antialiased overflow-hidden">
      
      {/* Header Centralizado */}
      <div className="shrink-0 z-50 bg-slate-900 border-b border-white/5 h-[60px] flex items-center px-6 justify-between">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
           <button 
             onClick={() => onNavigate('home')}
             className="size-9 md:size-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all shrink-0"
           >
             <span className="material-symbols-outlined text-sm md:text-base">arrow_back</span>
           </button>
           <div className="flex-1 min-w-0">
             <div className="flex items-center gap-1.5 md:gap-2">
               <div className="size-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
               <h1 className="text-sm md:text-lg font-black text-white italic leading-none truncate">Meus Freelances</h1>
             </div>
           </div>
        </div>

        <button 
          onClick={() => onNavigate('freelanceRequest')}
          className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-primary text-white rounded-xl font-black text-[9px] md:text-[10px] hover:brightness-110 transition-all shadow-lg shadow-primary/20 shrink-0"
        >
          <span className="material-symbols-outlined text-[16px] md:text-[18px]">add</span>
          <span className="hidden xs:inline">Postar</span> freelance
        </button>
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
                 placeholder="Pesquisar nos meus freelances..."
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
              setActiveTab(key as any);
              setSelectedOrderId(null);
              onNavigate('myFreelances', { tab: key, orderId: null });
            }}
            tabs={[
              { key: 'open',        label: 'Abertos'    },
              { key: 'in_progress', label: 'Em andamento' },
              { key: 'completed',   label: 'Finalizados' },
              { key: 'cancelled',   label: 'Cancelados' },
            ]}
          />

          {/* LISTA DE TRABALHOS */}
          <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-white/5 relative">
            {loading && freelanceOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                <div className="size-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <p className="text-[10px] font-black text-primary">Carregando seus freelances...</p>
              </div>
            ) : (
              (() => {
                const filteredOrders = freelanceOrders
                  .filter(o => {
                    if (activeTab === 'open') return o.status === 'open';
                    if (activeTab === 'in_progress') return ['scheduled', 'awaiting_payment', 'paid', 'in_service'].includes(o.status);
                    if (activeTab === 'completed') return ['completed', 'closed'].includes(o.status);
                    if (activeTab === 'cancelled') return o.status === 'cancelled';
                    return false;
                  })
                  .filter(o => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return o.title?.toLowerCase().includes(q) || o.display_id?.toLowerCase().includes(q);
                  });

                if (filteredOrders.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full p-10 text-center opacity-30">
                      <span className="material-symbols-outlined text-6xl mb-4 italic">work_off</span>
                      <p className="text-xs font-black">Nenhum freelance encontrado</p>
                    </div>
                  );
                }

                return filteredOrders.map(order => {
                  const isActive = selectedOrderId === order.id;
                  const bidsCount = order.freelance_bids?.length || 0;
                  
                  return (
                    <div 
                      key={order.id}
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        onNavigate('myFreelances', { tab: activeTab, orderId: order.id });
                      }}
                      className={`p-4 flex gap-4 cursor-pointer transition-all relative group ${
                        isActive ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-white/5 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="size-12 rounded-2xl bg-slate-800 shrink-0 overflow-hidden border border-white/5 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">{order.service_categories?.icon || 'work'}</span>
                      </div>
                      <div className="flex-1 min-w-0 py-0.5">
                        <div className="flex justify-between items-center gap-2 mb-1">
                          <h4 className={`text-sm font-black tracking-tighter truncate leading-none ${isActive ? 'text-primary' : 'text-white'}`}>
                            {order.title}
                          </h4>
                          <span className="text-[9px] font-bold text-slate-500 shrink-0">
                            {new Date(order.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 truncate leading-none mb-2">
                          {order.service_categories?.name} • {formatCurrency(order.budget || 0)}
                        </p>
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-1.5">
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${
                                bidsCount > 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-500'
                              }`}>
                                {bidsCount} {bidsCount === 1 ? 'Lance' : 'Lances'}
                              </span>
                              {order.status === 'open' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmModal({ isOpen: true, orderId: order.id, title: order.title });
                                  }}
                                  className="size-6 flex items-center justify-center rounded-full hover:bg-red-500/10 text-red-500 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              )}
                           </div>
                           <span className="text-[10px] font-black text-slate-600 tracking-tight">{order.status === 'open' ? 'Ativo' : 'Em andamento'}</span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </div>

        {/* DETAIL PANEL */}
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
                <h3 className="text-2xl font-black italic mb-2">Gerencie seus Freelances</h3>
                <p className="text-sm font-medium max-w-xs">Selecione um freelance à esquerda para ver os lances recebidos e gerenciar o andamento.</p>
             </div>
           )}
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="size-16 rounded-full bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-red-500 text-3xl">delete_forever</span>
              </div>
              <h3 className="text-lg font-black text-white mb-2 italic">Cancelar Freelance?</h3>
              <p className="text-xs text-slate-400 font-medium mb-1 truncate px-4">"{confirmModal.title}"</p>
              <p className="text-[10px] text-slate-500 mb-6 leading-relaxed">Esta ação removerá o freelance e todos os lances recebidos.</p>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleDeleteFreelance}
                  className="w-full py-3 bg-red-600 text-white rounded-xl font-black text-[10px] hover:bg-red-700 transition-colors"
                >
                  Confirmar Exclusão
                </button>
                <button 
                  onClick={() => setConfirmModal({ isOpen: false, orderId: null, title: '' })}
                  className="w-full py-3 text-slate-500 font-bold text-[10px]"
                >
                  Manter Freelance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}
