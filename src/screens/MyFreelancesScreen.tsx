import React, { useState, useEffect } from 'react';
import { NavigationProps, Screen } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { formatCurrency } from '../lib/formatters';

export default function MyFreelancesScreen({ onNavigate }: NavigationProps) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [freelanceOrders, setFreelanceOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    orderId: string | null; 
    title: string; 
  }>({
    isOpen: false,
    orderId: null,
    title: ''
  });

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
      setFreelanceOrders(data || []);
    } catch (err: any) {
      console.error("Erro ao buscar freelances:", err);
      showToast("Erro", "Erro ao buscar seus freelances.", "error");
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
      
      showToast("Sucesso", "Freelance excluído com sucesso.", "success");
      setFreelanceOrders(prev => prev.filter(o => o.id !== confirmModal.orderId));
      setConfirmModal({ isOpen: false, orderId: null, title: '' });
    } catch (err: any) {
      console.error("Erro ao excluir freelance:", err);
      showToast("Erro", "Falha ao excluir o freelance.", "error");
    }
  };

  useEffect(() => {
    fetchFreelances();
  }, [user]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden">
      
      {/* Header */}
      <header className="flex flex-col bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative z-20">
        <div className="flex items-center justify-between p-4 max-w-4xl lg:mx-0 lg:ml-12 w-full transition-all duration-300">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate('home')}
              className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Meus Freelances</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Seu Histórico de Solicitações</p>
            </div>
          </div>

          <button 
            onClick={() => onNavigate('freelanceRequest')}
            className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Postar Novo
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
          ) : freelanceOrders.length === 0 ? (
            <div className="flex flex-col items-center lg:items-start justify-center py-20 text-center lg:text-left text-slate-500">
              <div className="size-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl opacity-30">work</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Nenhum freelance postado</h3>
              <p className="text-sm max-w-xs mb-8">Você ainda não publicou nenhuma solicitação de freelance para os profissionais.</p>
              <button 
                onClick={() => onNavigate('freelanceRequest')}
                className="px-8 py-3 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/25"
              >
                Postar meu primeiro Freelance
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {freelanceOrders.map((order) => (
                  <div
                    key={order.id}
                    className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden"
                    onClick={() => onNavigate('bidRoom', { orderId: order.id })}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                          <span className="material-symbols-outlined">{order.service_categories?.icon || 'work'}</span>
                        </div>
                        <div>
                          <h3 className="font-black text-base tracking-tight uppercase line-clamp-1">{order.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`size-2 rounded-full ${order.status === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                              {order.status === 'open' ? 'Aguardando Lances' : 'Finalizado'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmModal({ isOpen: true, orderId: order.id, title: order.title });
                        }}
                        className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>

                    <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Seu Valor</span>
                        <p className="text-lg font-black text-primary leading-none">{formatCurrency(order.budget || 0)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                           {order.freelance_bids?.slice(0, 3).map((bid: any, idx: number) => (
                             <img 
                               key={idx} 
                               src={bid.profiles?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} 
                               className="size-6 rounded-full border-2 border-white dark:border-slate-800 object-cover"
                             />
                           ))}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {order.freelance_bids?.length === 0 ? 'Sem lances ainda' : `${order.freelance_bids?.length} lances recebidos`}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">arrow_forward</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Confirm Delete Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 text-center">
            <div className="p-6">
              <div className="size-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-red-600 text-3xl">delete_forever</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Excluir Freelance?</h3>
              <p className="text-sm text-slate-500 font-medium mb-1 truncate px-4">"{confirmModal.title}"</p>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Esta ação é irreversível e removerá todos os lances recebidos até agora.
              </p>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleDeleteFreelance}
                  className="w-full py-3.5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-colors shadow-lg shadow-red-600/10"
                >
                  Confirmar Exclusão
                </button>
                <button 
                  onClick={() => setConfirmModal({ isOpen: false, orderId: null, title: '' })}
                  className="w-full py-3.5 text-slate-500 font-bold text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
