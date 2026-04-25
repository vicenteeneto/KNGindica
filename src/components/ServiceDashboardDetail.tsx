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
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; reason: string; otherText: string }>({
    isOpen: false, reason: '', otherText: ''
  });

  const CANCEL_REASONS = [
    'Não preciso mais do serviço',
    'Encontrei outro profissional',
    'O orçamento estava alto demais',
    'O profissional demorou para responder',
    'Erro ao criar o pedido',
    'Outro motivo',
  ];

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
        status: 'scheduled',
        desired_date: scheduledAt
      }).eq('id', request.id);

      if (error) throw error;

      // Notificar o CLIENTE que o serviço foi agendado
      await supabase.from('notifications').insert({
        user_id: displayData.client_id,
        title: 'Serviço Agendado! 📅',
        message: `O profissional definiu uma data para "${displayData.title || displayData.category?.name}". Confira no painel.`,
        type: 'status',
        related_entity_id: displayData.id
      });
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
        <header className="h-[60px] shrink-0 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur-md border-b border-white/5 z-50">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden shadow-lg">
              <img src={displayData.profiles?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white italic leading-none mb-1">{displayData.profiles?.full_name || 'Cliente'}</h2>
              <div className="flex items-center gap-1.5 font-bold text-[8px] text-emerald-500">
                <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Pedido Ativo • {displayData.display_id || 'ID'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="px-2 py-0.5 rounded-md text-[8px] font-black bg-primary/20 text-primary border border-primary/20">
                {displayData.status}
             </div>
          </div>
        </header>
      ) : (
        <header className="h-[60px] shrink-0 flex items-center justify-between px-4 lg:px-8 bg-slate-900 border-b border-white/5 z-50">
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('home')} className="size-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-slate-400">arrow_back</span>
            </button>
            <div>
              <p className="text-[10px] font-black text-primary leading-none mb-1">Painel de Controle</p>
              <h1 className="text-sm lg:text-xl font-black text-white italic leading-none">{displayData.display_id || 'Pedido'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="px-3 py-1 rounded-full text-[10px] font-black bg-primary/20 text-primary border border-primary/20">
                {displayData.status}
             </div>
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto lg:overflow-hidden p-3 lg:p-6">
        <div className="max-w-[1600px] mx-auto h-full">
          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_1.3fr] gap-8 h-full">
            
            {/* COLUNA ESQUERDA: CENTRO DE COMANDO */}
            <div className="flex flex-col gap-4 h-full overflow-y-auto no-scrollbar">
               
               {/* 1. Card de Status Compacto */}
               <div className="bg-slate-900 rounded-[32px] p-6 border border-white/5 shadow-2xl relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <span className="material-symbols-outlined text-[100px] italic">target</span>
                  </div>
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="px-3 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-black mb-3">
                       {displayData.status}
                    </div>
                    <h2 className="text-xl lg:text-2xl font-black text-white tracking-tighter italic leading-tight mb-2">
                       {displayData.status === 'open' ? 'Solicitação em análise' : 
                        displayData.status === 'proposed' ? (isClient ? 'Proposta recebida' : 'Proposta enviada') :
                        displayData.status === 'awaiting_payment' ? (isClient ? 'Pague a taxa de indicação' : 'Aguardando cliente') :
                        displayData.status === 'paid' ? (isClient ? 'Pago e confirmado' : 'Pagamento garantido!') :
                        displayData.status === 'scheduled' ? (isClient ? 'Tudo agendado' : 'Horário definido') : 
                        displayData.status === 'in_service' ? 'Trabalho em curso' : 'Serviço concluído'}
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
                                
                                // Notificar o prestador sobre o aceite do orçamento
                                await supabase.from('notifications').insert({
                                  user_id: displayData.provider_id,
                                  title: 'Orçamento Aceito! 🎯',
                                  message: `O cliente aceitou seu orçamento para "${displayData.title || displayData.category?.name}". Realize o pagamento para confirmar.`,
                                  type: 'status',
                                  related_entity_id: displayData.id
                                });

                                showToast("Sucesso", "Orçamento aceito!", "success");
                                refreshData();
                              }} className="w-full h-11 bg-primary text-white text-xs font-black rounded-xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-sm">check_circle</span> Aceitar Orçamento
                              </button>
                            )}
                            {displayData.status === 'awaiting_payment' && (
                              <button onClick={() => onNavigate('checkout', { requestId: request.id })} className="w-full h-11 bg-emerald-500 text-white text-xs font-black rounded-xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-sm">payments</span> Realizar Pagamento
                              </button>
                            )}
                            {displayData.status === 'completed' && (
                              <button onClick={() => onNavigate('writeReview', { requestId: displayData.id, providerId: displayData.provider_id, providerName: displayData.provider?.full_name, serviceTitle: displayData.title || displayData.category?.name })} className="w-full h-11 bg-amber-500 text-white text-xs font-black rounded-xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-sm">star</span> Avaliar e Liberar
                              </button>
                            )}
                         </>
                       )}

                       {isProvider && (
                         <>
                             {displayData.status === 'open' && (
                               <button onClick={() => setBudgetModal({ isOpen: true, amount: '', description: '' })} className="w-full h-11 bg-primary text-white text-xs font-black rounded-xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 animate-pulse">
                                <span className="material-symbols-outlined text-sm">receipt_long</span> Enviar Orçamento
                               </button>
                             )}
                             {displayData.status === 'paid' && (
                                <button onClick={() => {
                                  let initDate = '';
                                  let initTime = '09:00';
                                  if (displayData.desired_date) {
                                    try {
                                      const d = new Date(displayData.desired_date);
                                      if (!isNaN(d.getTime())) {
                                        initDate = d.toISOString().split('T')[0];
                                        const hrs = String(d.getHours()).padStart(2, '0');
                                        const mins = String(d.getMinutes()).padStart(2, '0');
                                        initTime = `${hrs}:${mins}`;
                                      }
                                    } catch (e) {}
                                  }
                                  setScheduleModal({ isOpen: true, date: initDate, time: initTime });
                                }} className="w-full h-11 bg-orange-500 text-white text-xs font-black rounded-xl shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2">
                                 <span className="material-symbols-outlined text-sm">calendar_month</span> Agendar Horário
                                </button>
                             )}
                             {displayData.status === 'scheduled' && (
                                <button onClick={async () => {
                                  await supabase.from('service_requests').update({ status: 'in_service' }).eq('id', request.id);
                                  
                                  // Notificar o CLIENTE que o trabalho iniciou
                                  await supabase.from('notifications').insert({
                                    user_id: displayData.client_id,
                                    title: 'Trabalho Iniciado! 🚀',
                                    message: `O profissional iniciou a execução de "${displayData.title || displayData.category?.name}".`,
                                    type: 'status',
                                    related_entity_id: displayData.id
                                  });

                                  showToast("Sucesso", "Trabalho iniciado!", "success");
                                  refreshData();
                                }} className="w-full h-11 bg-blue-600 text-white text-xs font-black rounded-xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
                                 <span className="material-symbols-outlined text-sm">play_arrow</span> Iniciar Trabalho
                                </button>
                             )}
                             {displayData.status === 'in_service' && (
                                <button onClick={async () => {
                                  await supabase.from('service_requests').update({ status: 'completed' }).eq('id', request.id);
                                  showToast("Sucesso", "Serviço finalizado!", "success");
                                  refreshData();
                                }} className="w-full h-11 bg-emerald-600 text-white text-xs font-black rounded-xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">
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

                       {isClient && ['open', 'proposed', 'awaiting_payment'].includes(displayData.status) && (
                          <button
                            onClick={() => setCancelModal({ isOpen: true, reason: '', otherText: '' })}
                            className="w-full h-10 bg-red-500/10 text-red-400 text-xs font-bold rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 border border-red-500/20"
                          >
                            <span className="material-symbols-outlined text-sm">cancel</span> Cancelar Solicitação
                          </button>
                        )}
                    </div>
                  </div>
               </div>

               {/* 2. Info Grid: Financeiro e Prazos */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-white/5 p-5 rounded-[28px] shadow-xl relative overflow-hidden group hover:border-primary/30 transition-all">
                     <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-4xl italic">payments</span>
                     </div>
                     <p className="text-[10px] font-black text-slate-500 tracking-[1px] mb-2 leading-none">Orçamento do serviço</p>
                     {displayData.status === 'open' ? (
                        <p className="text-[10px] font-black text-primary animate-pulse italic">A DEFINIR</p>
                     ) : (
                        <div>
                           <p className="text-xl font-black text-white italic leading-none mb-1">{formatCurrency(displayData.budget_amount || 0)}</p>
                           <p className="text-[8px] font-bold text-emerald-500 tracking-tight">Pagamento via KNG Indica</p>
                        </div>
                     )}
                  </div>
 
                  <div className="bg-slate-900 border border-white/5 p-5 rounded-[28px] shadow-xl relative overflow-hidden group hover:border-orange-500/30 transition-all">
                     <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-4xl italic">event_available</span>
                     </div>
                     <p className="text-[10px] font-black text-slate-500 tracking-[1px] mb-2 leading-none">Prazo previsto</p>
                     <p className="text-xl font-black text-white italic leading-none mb-1">
                        {displayData.desired_date ? new Date(displayData.desired_date).toLocaleDateString('pt-BR') : 'A DEFINIR'}
                     </p>
                     <p className="text-[8px] font-bold text-slate-500 tracking-tight">
                        {displayData.desired_date ? new Date(displayData.desired_date).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}) : 'Horário pendente'}
                     </p>
                  </div>
               </div>

               {/* 3. Instruções e Galeria */}
               <div className="bg-slate-900 border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/20">
                     <div className="flex items-center gap-3 min-w-0">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                           <span className="material-symbols-outlined text-xl italic">{displayData.category?.icon || 'construction'}</span>
                        </div>
                        <div>
                           <p className="text-[8px] lg:text-[9px] font-black text-primary tracking-[1px] leading-none mb-1">Categoria do serviço</p>
                           <h4 className="text-xs lg:text-sm font-black text-white tracking-tighter truncate leading-none">{displayData.title || displayData.category?.name}</h4>
                        </div>
                     </div>
                     <button onClick={() => {
                        const handleLocate = () => {
                          if (displayData.latitude && displayData.longitude) {
                            window.open(`https://www.google.com/maps/search/?api=1&query=${displayData.latitude},${displayData.longitude}`, '_blank');
                          } else {
                            const address = `${displayData.street}, ${displayData.number}, ${displayData.neighborhood}, ${displayData.city} - ${displayData.state}`;
                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
                          }
                        };
                        handleLocate();
                     }} className="h-8 lg:h-10 px-3 lg:px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center gap-1 lg:gap-2 text-emerald-500 transition-colors border border-emerald-500/20 shrink-0">
                        <span className="material-symbols-outlined text-xs lg:text-sm">near_me</span>
                        <span className="text-[8px] lg:text-[9px] font-black tracking-tight">Localizar</span>
                     </button>
                  </div>
                  <div className="p-6">
                     <div className="mb-6">
                        <p className="text-[9px] font-black text-slate-500 tracking-[1px] mb-2 leading-none">Instruções do cliente</p>
                        <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                           <p className="text-[12px] text-slate-300 italic leading-relaxed">"{displayData.description || 'Sem descrição detalhada fornecida pelo cliente.'}"</p>
                        </div>
                     </div>

                     {displayData.attachments?.length > 0 && (
                        <div>
                           <p className="text-[9px] font-black text-slate-500 mb-3 leading-none">Galeria de Mídia ({displayData.attachments.length})</p>
                           <div className="grid grid-cols-4 gap-2">
                              {displayData.attachments.slice(0, 4).map((url: string, idx: number) => (
                                <div key={idx} onClick={() => setImageModal({ isOpen: true, url })} className="aspect-square rounded-xl bg-slate-800 border border-white/5 overflow-hidden cursor-pointer hover:border-primary/50 transition-all">
                                   <img src={url} className="w-full h-full object-cover" />
                                </div>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
                  <div className="bg-slate-950/40 px-6 py-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-slate-500 text-xs">location_on</span>
                      <p className="text-[9px] font-bold text-slate-400 truncate">{displayData.street}, {displayData.number} - {displayData.neighborhood}</p>
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 tracking-tight shrink-0">{displayData.city} / {displayData.state}</p>
                  </div>
               </div>
            </div>

            {/* COLUNA DIREITA: ROADMAP COMPACTO */}
            <div className="flex flex-col bg-slate-900 rounded-[32px] border border-white/5 p-6 relative overflow-hidden h-full">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
               <div className="relative z-10 flex flex-col h-full">
                  <div className="mb-6">
                     <p className="text-[10px] font-black text-primary mb-1 leading-none">Fluxo de Trabalho</p>
                     <h2 className="text-xl font-black text-white italic">Roteiro do Pedido</h2>
                  </div>

                  <div className="flex-1 flex flex-col justify-start space-y-4 py-4 overflow-y-auto no-scrollbar">
                     {[
                       { id: 'budget', label: 'Envio de Orçamento', icon: 'sell', status: ['proposed', 'awaiting_payment', 'paid', 'scheduled', 'in_service', 'completed'], details: isProvider ? 'Orçamento enviado e registrado no sistema' : 'Proposta recebida via plataforma KNG', color: 'text-primary' },
                       { id: 'payment', label: 'Pagamento Confirmado', icon: 'payments', status: ['awaiting_payment', 'paid', 'scheduled', 'in_service', 'completed'], details: 'Valor retido com segurança pela KNG Indica', color: 'text-emerald-500' },
                       { id: 'schedule', label: 'Agendamento Definido', icon: 'calendar_today', status: ['paid', 'scheduled', 'in_service', 'completed'], details: displayData.desired_date ? `Agendado para ${new Date(displayData.desired_date).toLocaleDateString('pt-BR')} às ${new Date(displayData.desired_date).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}` : 'Aguardando definição de data', color: 'text-orange-500' },
                       { id: 'execution', label: 'Execução do Trabalho', icon: 'construction', status: ['in_service', 'completed'], details: 'Prestador em atividade no local do serviço', color: 'text-blue-500' },
                       { id: 'final', label: 'Conclusão e Avaliação', icon: 'verified', status: ['completed'], details: 'Serviço finalizado e pagamento liberado', color: 'text-white' }
                     ].map((step, idx, arr) => {
                       const isDone = step.status.includes(displayData.status);
                       const isLast = idx === arr.length - 1;
                       return (
                         <div key={idx} className="flex items-start gap-6 relative p-4 rounded-3xl transition-all border border-transparent hover:bg-white/5">
                            {!isLast && (
                              <div className="absolute left-[34px] top-[50px] bottom-[-20px] w-[2px] bg-slate-800 z-0">
                                 <div className={`w-full transition-all duration-1000 ${isDone ? 'h-full bg-primary shadow-[0_0_15px_rgba(255,102,0,0.5)]' : 'h-0'}`} />
                              </div>
                            )}
                            <div className={`size-10 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all duration-500 z-10 ${
                              isDone ? `bg-slate-950 border-primary ${step.color} shadow-xl shadow-primary/20` : 'bg-slate-800 border-slate-700 text-slate-600'
                            }`}>
                               <span className="material-symbols-outlined text-sm">{isDone ? 'check' : step.icon}</span>
                            </div>
                            <div className="flex flex-col min-w-0">
                               <h4 className={`text-sm font-black italic leading-none mb-1.5 ${isDone ? 'text-white' : 'text-slate-700'}`}>{step.label}</h4>
                               <p className={`text-[10px] font-bold leading-relaxed ${isDone ? 'text-slate-400' : 'text-slate-800'}`}>{step.details}</p>
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
              <h3 className="text-lg font-black text-white italic mb-4">Enviar Orçamento</h3>
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
              <button onClick={handleBudgetSubmit} className="w-full h-12 bg-primary text-white font-black rounded-xl mb-3">Confirmar Valor</button>
              <button onClick={() => setBudgetModal({ ...budgetModal, isOpen: false })} className="w-full text-[10px] font-black text-slate-500">Cancelar</button>
           </div>
        </div>
      )}

      {scheduleModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in">
           <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[28px] p-6 shadow-2xl">
              <h3 className="text-lg font-black text-white italic mb-4">Agendar Serviço</h3>
              <div className="space-y-3 mb-4">
                <input type="date" value={scheduleModal.date} onChange={(e) => setScheduleModal({ ...scheduleModal, date: e.target.value })} className="w-full h-11 bg-slate-800 border border-white/5 rounded-xl px-4 text-white" />
                <input type="time" value={scheduleModal.time} onChange={(e) => setScheduleModal({ ...scheduleModal, time: e.target.value })} className="w-full h-11 bg-slate-800 border border-white/5 rounded-xl px-4 text-white" />
              </div>
              <button onClick={handleScheduleSubmit} className="w-full h-12 bg-orange-500 text-white font-black rounded-xl mb-3">Agendar Agora</button>
              <button onClick={() => setScheduleModal({ ...scheduleModal, isOpen: false })} className="w-full text-[10px] font-black text-slate-500">Voltar</button>
           </div>
        </div>
      )}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[28px] p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="size-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
                <span className="material-symbols-outlined">cancel</span>
              </div>
              <div>
                <h3 className="text-base font-black text-white italic">Cancelar Solicitação</h3>
                <p className="text-[10px] text-slate-400 font-medium">Informe o motivo para continuar</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {CANCEL_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setCancelModal(prev => ({ ...prev, reason: r, otherText: r === 'Outro motivo' ? prev.otherText : '' }))}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                    cancelModal.reason === r
                      ? 'bg-red-500/20 border-red-500/40 text-red-300'
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {cancelModal.reason === 'Outro motivo' && (
              <textarea
                value={cancelModal.otherText}
                onChange={(e) => setCancelModal(prev => ({ ...prev, otherText: e.target.value }))}
                placeholder="Descreva o motivo..."
                rows={3}
                className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none resize-none mb-4 placeholder:text-slate-600"
              />
            )}

            <button
              disabled={!cancelModal.reason || (cancelModal.reason === 'Outro motivo' && !cancelModal.otherText.trim()) || isActing}
              onClick={async () => {
                setIsActing(true);
                try {
                  const finalReason = cancelModal.reason === 'Outro motivo' ? cancelModal.otherText.trim() : cancelModal.reason;
                  const { error } = await supabase.from('service_requests').update({
                    status: 'cancelled'
                  }).eq('id', request.id);
                  if (error) throw error;

                  // Notificar o prestador se já havia um atribuído
                  if (displayData.provider_id) {
                    await supabase.from('notifications').insert({
                      user_id: displayData.provider_id,
                      title: 'Pedido Cancelado ❌',
                      message: `O cliente cancelou o pedido "${displayData.title || displayData.category?.name}". Motivo: ${finalReason}.`,
                      type: 'cancel',
                      related_entity_id: displayData.id
                    });
                  }

                  showToast('Solicitação cancelada', 'Seu pedido foi cancelado com sucesso.', 'success');
                  setCancelModal({ isOpen: false, reason: '', otherText: '' });
                  refreshData();
                } catch (e: any) {
                  showToast('Erro', e.message || 'Falha ao cancelar', 'error');
                } finally {
                  setIsActing(false);
                }
              }}
              className="w-full h-12 bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl mb-3 transition-opacity flex items-center justify-center gap-2"
            >
              {isActing ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : <span className="material-symbols-outlined text-sm">check</span>}
              {isActing ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </button>
            <button
              onClick={() => setCancelModal({ isOpen: false, reason: '', otherText: '' })}
              className="w-full text-[10px] font-black text-slate-500 py-2"
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
