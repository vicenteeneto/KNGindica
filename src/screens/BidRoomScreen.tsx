import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { formatCurrency, maskCurrency, parseCurrency } from '../lib/formatters';

interface BidRoomScreenProps extends NavigationProps {
  params?: any;
}

export default function BidRoomScreen({ onNavigate, params }: BidRoomScreenProps) {
  const { user, role } = useAuth();
  const { showToast } = useNotifications();
  const [order, setOrder] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');

  // Form state
  const [bidAmount, setBidAmount] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    confirmText: string; 
    action: () => void; 
    variant: 'danger' | 'success' | 'warning' 
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    action: () => {},
    variant: 'warning'
  });

  useEffect(() => {
    if (!params?.orderId) {
      onNavigate('home');
      return;
    }

    const fetchOrderAndBids = async () => {
      const { data: orderData, error: orderError } = await supabase
        .from('freelance_orders')
        .select(`
          *,
          profiles:client_id(full_name, avatar_url),
          service_categories(name, icon)
        `)
        .eq('id', params.orderId)
        .single();
        
      if (orderError) {
        showToast("Erro", "Ordem não encontrada", "error");
        onNavigate('back');
        return;
      }
      setOrder(orderData);

      const { data: bidsData } = await supabase
        .from('freelance_bids')
        .select('*, profiles(full_name, avatar_url, rating)')
        .eq('order_id', params.orderId)
        .order('created_at', { ascending: true });
        
      if (bidsData) setBids(bidsData);
      setLoading(false);
    };

    fetchOrderAndBids();

    const channel = supabase.channel(`bids_${params.orderId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'freelance_bids', filter: `order_id=eq.${params.orderId}` }, async (payload) => {
        const { data } = await supabase.from('profiles').select('full_name, avatar_url, rating').eq('id', payload.new.provider_id).single();
        setBids(prev => [...prev, { ...payload.new, profiles: data }]);
      }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params?.orderId]);

  useEffect(() => {
    if (!order?.expires_at) {
      setTimeLeft(order?.status === 'closed' ? 'Encerrado' : 'Sem prazo definido');
      return;
    }
    
    // Initial check
    updateTimer();
    
    const interval = setInterval(updateTimer, 60000); // update every minute
    return () => clearInterval(interval);

    function updateTimer() {
      if (order?.status === 'closed') {
        setTimeLeft('Encerrado');
        return;
      }
      const now = new Date().getTime();
      const expire = new Date(order.expires_at).getTime();
      const diff = expire - now;
      if (diff <= 0) {
        setTimeLeft('Expirado');
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (d > 0) {
          setTimeLeft(`${d}d ${hours}h`);
        } else {
          setTimeLeft(`${hours}h ${mins}m`);
        }
      }
    }
  }, [order?.expires_at, order?.status]);

  const handleCancelBid = async (bidId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Retirar Proposta?",
      message: "Tem certeza que deseja retirar sua proposta? Esta ação não pode ser desfeita.",
      confirmText: "Sim, Retirar",
      variant: 'danger',
      action: async () => {
        try {
          const { error } = await supabase.from('freelance_bids').delete().eq('id', bidId);
          if (error) throw error;
          showToast("Sucesso", "Proposta retirada", "success");
          setBids(prev => prev.filter(b => b.id !== bidId));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (e) {
          console.error(e);
          showToast("Erro", "Falha ao retirar proposta", "error");
        }
      }
    });
  };

  const handleCancelOrder = async () => {
    setConfirmModal({
      isOpen: true,
      title: "Cancelar Freelance?",
      message: "Certeza que deseja CANCELAR este freelance? Esta ação é irreversível.",
      confirmText: "Sim, Cancelar",
      variant: 'danger',
      action: async () => {
        try {
          const { error } = await supabase.from('freelance_orders').update({ status: 'cancelled' }).eq('id', order.id);
          if (error) throw error;
          showToast("Cancelado", "Freelance cancelado com sucesso", "notification");
          onNavigate('back');
        } catch (e) {
          console.error(e);
          showToast("Erro", "Falha ao cancelar freelance", "error");
        }
      }
    });
  };

  const handleSendBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const amountNum = parseCurrency(bidAmount);
    if (!amountNum || amountNum <= 0) {
      showToast("Atenção", "O valor não pode ser vazio ou zero.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('freelance_bids').insert([{
        order_id: order.id,
        provider_id: user?.id,
        amount: amountNum,
        message: bidMessage || 'Tenho interesse no serviço.'
      }]);
      if (error) {
        if (error.code === '23505') showToast("Atenção", "Você já enviou um lance.", "warning");
        else throw error;
      } else {
        showToast("Sucesso", "Lance enviado e visível para o cliente!", "success");
        setBidAmount('');
        setBidMessage('');
      }
    } catch (err: any) {
      showToast("Erro", "Falha ao dar lance: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptBid = async (bid: any) => {
    setConfirmModal({
      isOpen: true,
      title: "Contratar Prestador?",
      message: "Deseja aceitar esta proposta e ir para o pagamento?",
      confirmText: "Sim, Contratar",
      variant: 'success',
      action: async () => {
        try {
          const { error: closeError } = await supabase.from('freelance_orders').update({ 
            status: 'awaiting_payment',
            assigned_provider_id: bid.provider_id,
            budget: bid.amount
          }).eq('id', order.id);
          
          if (closeError) throw closeError;

          // Notificar o prestador que ele foi contratado
          await supabase.from('notifications').insert({
            user_id: bid.provider_id,
            title: 'Você foi contratado!',
            message: `Sua proposta para "${order.title}" foi aceita.`,
            type: 'order',
            related_entity_id: order.id
          });

          showToast("Sucesso", "Prestador contratado!", "success");
          onNavigate('freelanceStatus', { orderId: order.id });
        } catch (err: any) {
          console.error(err);
          showToast("Erro", "Ocorreu um erro: " + err.message, "error");
        }
      }
    });
  };

  if (loading || !order) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  const isClient = user?.id === order.client_id;
  const isExpired = timeLeft === 'Expirado' || timeLeft === 'Encerrado';
  const hasBidded = bids.some(b => b.provider_id === user?.id);

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 font-display">
      {/* Header */}
      <header className="shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 lg:pl-12 flex items-center gap-4 z-10 shadow-sm relative transition-all duration-300">
        <button onClick={() => onNavigate('back')} className="text-slate-500 hover:text-primary transition-colors size-10 flex items-center justify-center bg-slate-100 dark:bg-slate-700/50 rounded-full">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-black uppercase tracking-tighter truncate text-slate-800 dark:text-slate-100">Sala de Freelance</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{order.title}</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-black shrink-0 ${isExpired ? 'bg-red-50 text-red-500 dark:bg-red-500/10' : 'bg-primary/10 text-primary'}`}>
          <span className="material-symbols-outlined shrink-0 text-sm">timer</span>
          {timeLeft}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto w-full max-w-4xl lg:mx-0 lg:ml-12 flex flex-col p-4 space-y-4 transition-all duration-300">
        
        {/* Order Briefing */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary">{order.service_categories?.icon || 'work'}</span>
            <span className="text-xs font-bold text-primary uppercase tracking-widest">{order.service_categories?.name}</span>
          </div>
          <h3 className="font-black text-xl leading-tight tracking-tight mb-2 text-slate-800 dark:text-slate-100">{order.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{order.description}</p>
          <div className="flex gap-4 border-t border-slate-100 dark:border-slate-700 pt-4">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Budget</p>
              <p className="text-lg font-black text-emerald-500">{formatCurrency(order.budget || 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cidade</p>
              <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{order.city}</p>
            </div>
          </div>
        </div>

        {/* Bids Timeline */}
        <div className="flex-1 pb-20">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">history</span>
            Linha do Tempo de Propostas
          </p>
          
          <div className="space-y-4">
            {bids.length === 0 ? (
              <div className="text-center py-10 bg-slate-100/50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">gavel</span>
                <p className="text-slate-500 font-bold">Nenhum lance ainda.</p>
              </div>
            ) : (
              bids.map((bid) => {
                const isMine = bid.provider_id === user?.id;
                // Anonymize for other providers
                const providerName = isMine 
                  ? "Seu Lance" 
                  : (isClient ? bid.profiles?.full_name : `Prestador ${bid.profiles?.full_name?.split(' ')?.[0]?.[0] || 'A'}.${bid.profiles?.full_name?.split(' ')?.[1]?.[0] || 'X'}.`);
                
                return (
                  <div key={bid.id} className={`p-4 rounded-2xl border ${isMine ? 'bg-primary/5 border-primary/20' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'} shadow-sm flex flex-col gap-2 relative`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {isClient && (
                          <img src={bid.profiles?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} alt="" className="size-8 rounded-full object-cover" />
                        )}
                        <div>
                          <p className={`text-sm font-bold ${isMine ? 'text-primary' : 'text-slate-700 dark:text-slate-200'}`}>{providerName}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {new Date(bid.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-black ${isMine ? 'text-primary' : 'text-emerald-500'}`}>{formatCurrency(bid.amount || 0)}</p>
                        {isMine && !isExpired && (
                          <button 
                            onClick={() => handleCancelBid(bid.id)}
                            className="text-[10px] text-red-500 font-bold uppercase hover:bg-red-50 px-2 py-1 rounded-lg transition-colors mt-1"
                          >
                            Mudar de ideia? Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                    {bid.message && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl mt-1">
                        "{bid.message}"
                      </p>
                    )}
                    
                    {isClient && !isExpired && (
                      <div className="mt-3 flex justify-end">
                        <button onClick={() => handleAcceptBid(bid)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                          Aceitar Proposta
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer Form (Only for Providers) */}
      {!isClient && !isExpired && !hasBidded && role === 'provider' && (
        <form onSubmit={handleSendBid} className="shrink-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 pb-safe z-20 transition-all duration-300">
          <div className="max-w-4xl lg:mx-0 lg:ml-12 flex gap-2 items-center">
            <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-transparent focus-within:border-primary/30 flex items-center px-4 py-2 transition-colors">

              <input 
                type="text" 
                placeholder="Seu valor..."
                className="bg-transparent w-full outline-none font-black text-lg text-slate-800 dark:text-slate-100"
                value={bidAmount}
                onChange={e => setBidAmount(maskCurrency(e.target.value))}
              />
            </div>
            <button 
              type="submit" 
              disabled={submitting || !bidAmount}
              className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:active:scale-100 text-white rounded-2xl h-11 px-4 font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/30 active:scale-95 transition-all w-28 flex items-center justify-center shrink-0"
            >
              {submitting ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : 'Enviar'}
            </button>
          </div>
        </form>
      )}

      {!isClient && hasBidded && (
        <div className="shrink-0 bg-primary/10 text-primary p-4 text-center font-bold text-sm z-20">
          Você já enviou uma proposta para este serviço. Aguarde a avaliação.
        </div>
      )}
      
      {isClient && !isExpired && (
        <div className="shrink-0 p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-20 text-center">
          <p className="text-sm font-bold text-slate-500 mb-2">Você é o criador deste pedido.</p>
          <div className="flex flex-col gap-2">
            <button onClick={async () => {
              setConfirmModal({
                isOpen: true,
                title: "Encerrar Lances?",
                message: "Certeza que deseja encerrar preventivamente? Ninguém mais poderá dar lances.",
                confirmText: "Sim, Encerrar",
                variant: 'warning',
                action: async () => {
                  try {
                    await supabase.from('freelance_orders').update({status: 'assigned'}).eq('id', order.id);
                    onNavigate('back');
                  } catch (e) {
                    showToast("Erro ao encerrar", "error");
                  }
                }
              });
            }} className="text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-500/10 px-4 py-2 rounded-xl text-xs font-bold transition-colors">
              Encerrar Freelance Antecipadamente
            </button>
            <button onClick={handleCancelOrder} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-colors">
              CANCELAR ESTE FREELANCE
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal Render */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 text-center">
            <div className="p-6">
              <div className={`size-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                confirmModal.variant === 'danger' ? 'bg-red-100 dark:bg-red-900/20 text-red-600' : 
                confirmModal.variant === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600' : 
                'bg-amber-100 dark:bg-amber-900/20 text-amber-600'
              }`}>
                <span className="material-symbols-outlined text-3xl">
                  {confirmModal.variant === 'danger' ? 'report' : 
                   confirmModal.variant === 'success' ? 'check_circle' : 
                   'help'}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">
                {confirmModal.title}
              </h3>
              <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
                {confirmModal.message}
              </p>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={confirmModal.action}
                  className={`w-full py-3.5 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-colors shadow-lg ${
                    confirmModal.variant === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/10' : 
                    confirmModal.variant === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10' : 
                    'bg-primary hover:bg-primary/95 shadow-primary/10'
                  }`}
                >
                  {confirmModal.confirmText}
                </button>
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
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
