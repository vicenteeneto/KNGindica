import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../NotificationContext';
import { formatCurrency } from '../lib/formatters';
import { useAuth } from '../AuthContext';

interface ServiceDashboardDetailProps {
  requestId: string;
  onNavigate: (screen: any, params?: any) => void;
  isEmbedded?: boolean;
}

export function ServiceDashboardDetail({ requestId, onNavigate, isEmbedded = false }: ServiceDashboardDetailProps) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasBeenReviewed, setHasBeenReviewed] = useState(false);
  const [imageModal, setImageModal] = useState<{ isOpen: boolean, url: string }>({ isOpen: false, url: '' });
  const [budgetModal, setBudgetModal] = useState<{ isOpen: boolean; amount: string; description: string }>({
    isOpen: false, amount: '', description: ''
  });
  const [scheduleModal, setScheduleModal] = useState<{ isOpen: boolean; date: string; time: string }>({
    isOpen: false, date: '', time: '09:00'
  });
  const [isActing, setIsActing] = useState(false);
  const [isSendingBudget, setIsSendingBudget] = useState(false);

  const fetchRequest = async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      let query = supabase.from('service_requests').select(`
        *,
        provider:profiles!service_requests_provider_id_fkey(
          id, full_name, avatar_url, rating, 
          profiles_private(cpf, birth_date)
        ),
        profiles!service_requests_client_id_fkey(
          id, full_name, avatar_url
        ),
        category:service_categories(name, icon),
        reviews(*)
      `);

      if (requestId.startsWith('ORD-')) {
        query = query.eq('display_id', requestId);
      } else {
        query = query.eq('id', requestId);
      }

      const { data, error } = await query.single();
      if (error) throw error;
      
      if (data) {
        setRequest(data);
        setHasBeenReviewed(!!data.reviews?.length);
      }
    } catch (e) {
      console.error("Erro ao buscar pedido:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();

    const channel = supabase
      .channel(`service_detail_${requestId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'service_requests', 
        filter: requestId.startsWith('ORD-') ? `display_id=eq.${requestId}` : `id=eq.${requestId}` 
      }, () => fetchRequest())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [requestId]);

  const refreshData = async () => {
     await fetchRequest();
  };

  const handleBudgetSubmit = async () => {
    if (!budgetModal.amount) return;
    setIsSendingBudget(true);
    try {
      const amount = parseFloat(budgetModal.amount.replace(/[^\d]/g, '')) / 100;
      const { error } = await supabase.from('service_requests').update({
        budget_amount: amount,
        status: 'proposed',
        provider_id: user?.id
      }).eq('id', request.id);

      if (error) throw error;
      showToast("Sucesso", "Orçamento enviado com sucesso!", "success");
      setBudgetModal({ ...budgetModal, isOpen: false });
      refreshData();
    } catch (e: any) {
      showToast("Erro", e.message, "error");
    } finally {
      setIsSendingBudget(false);
    }
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleModal.date || !scheduleModal.time) return;
    setIsActing(true);
    try {
      const scheduledAt = `${scheduleModal.date}T${scheduleModal.time}:00`;
      const { error } = await supabase.from('service_requests').update({
        desired_date: scheduledAt,
        status: 'scheduled'
      }).eq('id', request.id);

      if (error) throw error;
      showToast("Sucesso", "Agendamento realizado!", "success");
      setScheduleModal({ ...scheduleModal, isOpen: false });
      refreshData();
    } catch (e: any) {
      showToast("Erro", e.message, "error");
    } finally {
      setIsActing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-950/20 rounded-[40px]">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  const displayData = request || {
    title: 'Não encontrado',
    status: 'open',
    budget_amount: 0
  };

  const isClient = user?.id === displayData.client_id;
  const isProvider = user?.id !== displayData.client_id;

  return (
    <div className={`flex flex-col h-full bg-slate-950 font-display text-slate-100 antialiased overflow-hidden ${isEmbedded ? 'rounded-[40px] border border-white/5' : ''}`}>
      
      {isEmbedded ? (
        <header className="h-16 shrink-0 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur-md border-b border-white/5 z-50">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden shadow-lg">
              <img src={displayData.profiles?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-tighter italic leading-none mb-1">{displayData.profiles?.full_name || 'Cliente'}</h2>
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-[8px] text-emerald-500">
                <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Pedido Ativo • {displayData.display_id || 'ID'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-primary/20 text-primary border border-primary/20">
                {displayData.status}
             </div>
          </div>
        </header>
      ) : (
        <header className="h-16 lg:h-20 shrink-0 flex items-center justify-between px-4 lg:px-8 bg-slate-900 border-b border-white/5 z-50">
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('home')} className="size-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-slate-400">arrow_back</span>
            </button>
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-[2px] leading-none mb-1">Painel de Controle</p>
              <h1 className="text-sm lg:text-xl font-black text-white uppercase tracking-tighter italic leading-none">{displayData.display_id || 'Pedido'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/20 text-primary border border-primary/20">
                {displayData.status}
             </div>
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto lg:overflow-hidden p-3 lg:p-6">
        <div className="max-w-[1600px] mx-auto h-full">
          <div className="flex flex-col lg:grid lg:grid-cols-[1.1fr_0.9fr] gap-6 h-full">
            
            {/* COLUNA ESQUERDA: CENTRO DE COMANDO */}
            <div className="flex flex-col gap-4 h-full overflow-y-auto no-scrollbar">
               
               {/* 1. Card de Status Compacto */}
               <div className="bg-slate-900 rounded-[32px] p-6 border border-white/5 shadow-2xl relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <span className="material-symbols-outlined text-[100px] italic">target</span>
                  </div>
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="px-3 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest mb-3">
                       {displayData.status}
                    </div>
                    <h2 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tighter italic leading-tight mb-2">
                       {displayData.status === 'open' ? 'Solicitação em Análise' : 
                        displayData.status === 'proposed' ? (isClient ? 'Proposta Recebida' : 'Proposta Enviada') :
                        displayData.status === 'awaiting_payment' ? (isClient ? 'Pague a Taxa' : 'Aguardando Cliente') :
                        displayData.status === 'paid' ? (isClient ? 'Pago e Confirmado' : 'Pagamento Garantido!') :
                        displayData.status === 'scheduled' ? (isClient ? 'Tudo Agendado' : 'Horário Definido') : 
                        displayData.status === 'in_service' ? 'Trabalho em Curso' : 'Serviço Concluído'}
                    </h2>
                    <p className="text-[11px] text-slate-400 max-w-sm mb-6 font-medium leading-relaxed">
                       {displayData.status === 'open' ? 'Tudo pronto para iniciar. Envie seu orçamento.' : 'Acompanhe o progresso do pedido abaixo.'}
                    </p>

                    <div className="w-full max-w-xs space-y-3">
                       {isClient && !hasBeenReviewed && (
                         <>
                            {displayData.status === 'proposed' && (
                              <button onClick={async () => {
                                await supabase.from('service_requests').update({ status: 'awaiting_payment' }).eq('id', request.id);
                                showToast("Sucesso", "Orçamento aceito!", "success");
                                refreshData();
                              }} className="w-full h-11 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-sm">check_circle</span> Aceitar Orçamento
                              </button>
                            )}
                            {displayData.status === 'awaiting_payment' && (
                              <button onClick={() => onNavigate('checkout', { requestId: request.id })} className="w-full h-11 bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-sm">payments</span> Realizar Pagamento
                              </button>
                            )}
                            {displayData.status === 'completed' && (
                              <button onClick={() => onNavigate('writeReview', { requestId: displayData.id, providerId: displayData.provider_id, providerName: displayData.provider?.full_name, serviceTitle: displayData.title || displayData.category?.name })} className="w-full h-11 bg-amber-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-sm">star</span> Avaliar e Liberar
                              </button>
                            )}
                         </>
                       )}

                       {isProvider && (
                         <>
                             {displayData.status === 'open' && (
                               <button onClick={() => setBudgetModal({ isOpen: true, amount: '', description: '' })} className="w-full h-11 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 animate-pulse">
                                <span className="material-symbols-outlined text-sm">receipt_long</span> Enviar Orçamento
                               </button>
                             )}
                             {displayData.status === 'paid' && (
                                <button onClick={() => setScheduleModal({ isOpen: true, date: '', time: '09:00' })} className="w-full h-11 bg-orange-500 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2">
                                 <span className="material-symbols-outlined text-sm">calendar_month</span> Agendar Horário
                                </button>
                             )}
                             {displayData.status === 'scheduled' && (
                                <button onClick={async () => {
                                  await supabase.from('service_requests').update({ status: 'in_service' }).eq('id', request.id);
                                  showToast("Sucesso", "Trabalho iniciado!", "success");
                                  refreshData();
                                }} className="w-full h-11 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
                                 <span className="material-symbols-outlined text-sm">play_arrow</span> Iniciar Trabalho
                                </button>
                             )}
                             {displayData.status === 'in_service' && (
                                <button onClick={async () => {
                                  await supabase.from('service_requests').update({ status: 'completed' }).eq('id', request.id);
                                  showToast("Sucesso", "Serviço finalizado!", "success");
                                  refreshData();
                                }} className="w-full h-11 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">
                                 <span className="material-symbols-outlined text-sm">task_alt</span> Concluir Serviço
                                </button>
                             )}
                         </>
                       )}

                       {['proposed', 'awaiting_payment', 'paid', 'scheduled', 'in_service'].includes(displayData.status) && (
                         <button onClick={async () => {
                           const { data: room } = await supabase.from('chat_rooms').select('id').eq('request_id', request?.id).single();
                           onNavigate('chat', { roomId: room?.id, requestId: request?.id, opponentId: isClient ? displayData.provider_id : displayData.client_id, opponentName: isClient ? displayData.provider?.full_name : displayData.profiles?.full_name });
                         }} className="w-full h-10 bg-white/5 text-slate-300 text-xs font-bold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                           <span className="material-symbols-outlined text-sm">chat</span> Abrir Chat
                         </button>
                       )}
                    </div>
                  </div>
               </div>

               {/* 2. Info Grid Miniaturizada */}
               <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/50 p-3 rounded-[20px] border border-white/5 flex items-center gap-3">
                     <div className="size-10 rounded-full bg-slate-800 overflow-hidden shrink-0">
                        <img src={isClient ? (displayData.provider?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png") : (displayData.profiles?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png")} className="w-full h-full object-cover" />
                     </div>
                     <div className="min-w-0">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{isClient ? 'Prestador' : 'Cliente'}</p>
                        <h3 className="text-xs font-black text-white uppercase tracking-tighter truncate">{isClient ? displayData.provider?.full_name : displayData.profiles?.full_name}</h3>
                     </div>
                  </div>

                  <div className="bg-slate-900/50 p-3 rounded-[20px] border border-white/5 flex items-center justify-between">
                     <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Valor</p>
                        {displayData.status === 'open' ? (
                          <p className="text-[10px] font-black text-primary animate-pulse italic">A DEFINIR</p>
                        ) : (
                          <p className="text-xs font-black text-white italic">{formatCurrency(displayData.budget_amount || 0)}</p>
                        )}
                     </div>
                     <div className="text-right">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Data</p>
                        <p className="text-[10px] font-black text-white">{displayData.desired_date ? new Date(displayData.desired_date).toLocaleDateString('pt-BR') : 'A definir'}</p>
                     </div>
                  </div>
               </div>

               {/* 3. Instruções e Localização Compactas */}
               <div className="bg-slate-900/50 rounded-[24px] border border-white/5 overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-3 min-w-0">
                        <span className="material-symbols-outlined text-primary text-base shrink-0">{displayData.category?.icon}</span>
                        <h4 className="text-xs font-black text-white uppercase tracking-tighter truncate">{displayData.title || displayData.category?.name}</h4>
                     </div>
                     <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${displayData.latitude},${displayData.longitude}`)} className="size-8 rounded-lg bg-white/5 flex items-center justify-center text-emerald-500 shrink-0">
                        <span className="material-symbols-outlined text-sm">map</span>
                     </button>
                  </div>
                  <div className="p-4">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Instruções</p>
                     <p className="text-[11px] text-slate-400 line-clamp-3 italic leading-relaxed">"{displayData.description || 'Sem descrição.'}"</p>
                  </div>
                  <div className="bg-slate-800/30 px-4 py-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-500 text-xs">location_on</span>
                    <p className="text-[10px] font-medium text-slate-500 truncate">{displayData.street}, {displayData.number}</p>
                  </div>
               </div>
            </div>

            {/* COLUNA DIREITA: ROADMAP COMPACTO */}
            <div className="flex flex-col bg-slate-900 rounded-[32px] border border-white/5 p-6 relative overflow-hidden h-full">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
               <div className="relative z-10 flex flex-col h-full">
                  <div className="mb-6">
                     <p className="text-[9px] font-black text-primary uppercase tracking-[3px] mb-1 leading-none">Workflow</p>
                     <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Roteiro do Pedido</h2>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-1 overflow-y-auto no-scrollbar">
                     {[
                       { id: 'budget', label: 'Proposta', icon: 'sell', status: ['proposed', 'awaiting_payment', 'paid', 'scheduled', 'in_service', 'completed'], details: isProvider ? 'Enviada com sucesso' : 'Proposta recebida' },
                       { id: 'payment', label: 'Pagamento', icon: 'payments', status: ['awaiting_payment', 'paid', 'scheduled', 'in_service', 'completed'], details: 'Confirmado via KNG' },
                       { id: 'schedule', label: 'Agendamento', icon: 'calendar_today', status: ['paid', 'scheduled', 'in_service', 'completed'], details: displayData.desired_date ? `${new Date(displayData.desired_date).toLocaleDateString('pt-BR')} ${new Date(displayData.desired_date).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}` : 'Aguardando' },
                       { id: 'execution', label: 'Execução', icon: 'construction', status: ['in_service', 'completed'], details: 'Trabalho realizado' },
                       { id: 'final', label: 'Conclusão', icon: 'verified', status: ['completed'], details: 'Serviço finalizado' }
                     ].map((step, idx, arr) => {
                       const isDone = step.status.includes(displayData.status);
                       const isLast = idx === arr.length - 1;
                       return (
                         <div key={idx} className="flex items-start gap-4 relative p-2 min-h-0">
                            {!isLast && (
                              <div className="absolute left-[20px] top-[28px] bottom-[-4px] w-[1.5px] bg-slate-800 z-0">
                                 <div className={`w-full transition-all duration-1000 ${isDone ? 'h-full bg-primary' : 'h-0'}`} />
                              </div>
                            )}
                            <div className={`size-6 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-500 z-10 ${
                              isDone ? 'bg-primary border-primary text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-600'
                            }`}>
                               <span className="material-symbols-outlined text-[10px]">{isDone ? 'check' : step.icon}</span>
                            </div>
                            <div className="flex flex-col">
                               <h4 className={`text-[11px] font-black uppercase tracking-tighter italic leading-none ${isDone ? 'text-white' : 'text-slate-700'}`}>{step.label}</h4>
                               {isDone && <p className="text-[9px] text-slate-500 mt-1">{step.details}</p>}
                            </div>
                         </div>
                       )
                     })}
                  </div>
               </div>
            </div>

          </div>
        </div>
      </main>

      {/* Modals Compactos */}
      {budgetModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in">
           <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[28px] p-6 shadow-2xl">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter italic mb-4">Enviar Orçamento</h3>
              <input 
                type="text"
                value={budgetModal.amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(val) / 100);
                  setBudgetModal({ ...budgetModal, amount: val ? formatted : "" });
                }}
                placeholder="R$ 0,00"
                className="w-full h-12 bg-slate-800 border border-white/5 rounded-xl px-4 text-xl font-black text-white outline-none mb-4"
              />
              <button onClick={handleBudgetSubmit} className="w-full h-12 bg-primary text-white font-black uppercase tracking-widest rounded-xl mb-3">Confirmar Valor</button>
              <button onClick={() => setBudgetModal({ ...budgetModal, isOpen: false })} className="w-full text-[10px] font-black text-slate-500 uppercase">Cancelar</button>
           </div>
        </div>
      )}

      {scheduleModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in">
           <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[28px] p-6 shadow-2xl">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter italic mb-4">Agendar Serviço</h3>
              <div className="space-y-3 mb-4">
                <input type="date" value={scheduleModal.date} onChange={(e) => setScheduleModal({ ...scheduleModal, date: e.target.value })} className="w-full h-11 bg-slate-800 border border-white/5 rounded-xl px-4 text-white" />
                <input type="time" value={scheduleModal.time} onChange={(e) => setScheduleModal({ ...scheduleModal, time: e.target.value })} className="w-full h-11 bg-slate-800 border border-white/5 rounded-xl px-4 text-white" />
              </div>
              <button onClick={handleScheduleSubmit} className="w-full h-12 bg-orange-500 text-white font-black uppercase tracking-widest rounded-xl mb-3">Agendar Agora</button>
              <button onClick={() => setScheduleModal({ ...scheduleModal, isOpen: false })} className="w-full text-[10px] font-black text-slate-500 uppercase">Voltar</button>
           </div>
        </div>
      )}
    </div>
  );
}
