import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../NotificationContext';
import { formatCurrency } from '../lib/formatters';
import { useAuth } from '../AuthContext';

export default function ServiceStatusScreen({ onNavigate, params }: NavigationProps) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasBeenReviewed, setHasBeenReviewed] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [refusalReason, setRefusalReason] = useState('');
  const [isRefusing, setIsRefusing] = useState(false);
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
    if (!params?.requestId) {
      setLoading(false);
      return;
    }
    
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
        category:service_categories(name, icon)
      `);

      if (params.requestId.startsWith('ORD-')) {
        query = query.eq('display_id', params.requestId);
      } else {
        query = query.eq('id', params.requestId);
      }

      const { data, error } = await query.single();
      if (error) throw error;
      
      if (data) {
        setRequest(data);
        const { data: rev } = await supabase.from('reviews').select('id').eq('service_request_id', data.id).maybeSingle();
        setHasBeenReviewed(!!rev);
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
      .channel(`service_status_${params?.requestId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'service_requests', 
        filter: params?.requestId?.startsWith('ORD-') ? `display_id=eq.${params.requestId}` : `id=eq.${params.requestId}` 
      }, () => fetchRequest())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params?.requestId]);

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

  if (loading && params?.requestId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  const displayData = request || {
    title: 'Carregando...',
    category: { name: 'Serviço', icon: 'work' },
    status: 'open',
    budget_amount: 0
  };

  const isClient = user?.id === displayData.client_id;
  const isProvider = user?.id !== displayData.client_id;

  return (
    <div className="bg-slate-950 font-display text-slate-100 min-h-screen lg:h-screen flex flex-col antialiased overflow-hidden">
      
      {/* Header Compacto */}
      <header className="h-14 lg:h-20 shrink-0 flex items-center justify-between px-4 lg:px-8 bg-slate-900 border-b border-white/5 z-50">
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
           <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/20 text-primary border border-primary/20`}>
              {displayData.status}
           </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto lg:overflow-hidden p-4 lg:p-8">
        <div className="max-w-[1600px] mx-auto h-full">
          <div className="flex flex-col lg:grid lg:grid-cols-[1.2fr_0.8fr] gap-8 h-full">
            
            {/* COLUNA ESQUERDA: CENTRO DE COMANDO */}
            <div className="flex flex-col gap-6 h-full overflow-y-auto no-scrollbar pb-24 lg:pb-0">
               
               {/* 1. Card de Status e Ação Imediata */}
               <div className="bg-slate-900 rounded-[32px] p-6 lg:p-10 border border-white/5 shadow-2xl relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                    <span className="material-symbols-outlined text-[140px] italic">target</span>
                  </div>
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="px-4 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
                       {displayData.status === 'open' ? 'Aguardando Orçamentos' : 
                        displayData.status === 'proposed' ? 'Proposta Recebida' :
                        displayData.status === 'awaiting_payment' ? 'Pagamento Pendente' :
                        displayData.status === 'paid' ? 'Agendamento Disponível' : 
                        displayData.status === 'scheduled' ? 'Serviço Agendado' :
                        displayData.status === 'in_service' ? 'Em Execução' : 'Finalizado'}
                    </div>
                    <h2 className="text-2xl lg:text-4xl font-black text-white uppercase tracking-tighter italic leading-tight mb-3">
                      {displayData.status === 'open' ? 'Solicitação em Análise' : 
                       displayData.status === 'proposed' ? (isClient ? 'Proposta Recebida' : 'Proposta Enviada') :
                       displayData.status === 'awaiting_payment' ? (isClient ? 'Falta o Pagamento' : 'Aguardando Cliente') :
                       displayData.status === 'paid' ? (isClient ? 'Pago e Confirmado' : 'Pagamento Garantido!') :
                       displayData.status === 'scheduled' ? (isClient ? 'Tudo Agendado' : 'Horário Definido') : 
                       displayData.status === 'in_service' ? 'Trabalho em Curso' : 'Serviço Concluído'}
                    </h2>
                    <p className="text-sm text-slate-400 max-w-md mb-8 font-medium leading-relaxed">
                      {displayData.status === 'open' ? (isClient ? 'Sua solicitação foi enviada aos melhores profissionais.' : 'Nova oportunidade! Envie seu orçamento para o cliente.') : 
                       displayData.status === 'proposed' ? (isClient ? 'Confira o orçamento enviado pelo profissional e aceite para prosseguir.' : 'Seu orçamento está em análise pelo cliente. Aguarde a aprovação.') :
                       displayData.status === 'awaiting_payment' ? (isClient ? 'Pague a taxa KNG para liberar o chat e os dados do profissional.' : 'O cliente aceitou seu orçamento! Ele está realizando o pagamento.') :
                       displayData.status === 'paid' ? (isClient ? 'O profissional já pode ver seus dados. Combine os detalhes pelo chat.' : 'O cliente pagou! Agora você deve agendar a data do serviço.') :
                       displayData.status === 'scheduled' ? (isClient ? 'O serviço foi agendado. Prepare o ambiente para receber o técnico.' : 'Tudo certo. No dia combinado, inicie o trabalho por aqui.') : ''}
                    </p>

                    <div className="w-full max-w-sm space-y-4">
                       {/* Ações Dinâmicas */}
                       {isClient && !hasBeenReviewed && (
                         <>
                            {displayData.status === 'proposed' && (
                              <button onClick={async () => {
                                await supabase.from('service_requests').update({ status: 'awaiting_payment' }).eq('id', request.id);
                                showToast("Sucesso", "Orçamento aceito!", "success");
                                refreshData();
                              }} className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">check_circle</span> Aceitar Orçamento
                              </button>
                            )}
                            {displayData.status === 'awaiting_payment' && (
                              <button onClick={() => onNavigate('checkout', { requestId: request.id })} className="w-full h-14 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">payments</span> Realizar Pagamento
                              </button>
                            )}
                            {displayData.status === 'completed' && (
                              <button onClick={() => onNavigate('writeReview', { requestId: displayData.id, providerId: displayData.provider_id, providerName: displayData.provider?.full_name, serviceTitle: displayData.title || displayData.category?.name })} className="w-full h-14 bg-amber-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">star</span> Avaliar e Liberar Valor
                              </button>
                            )}
                         </>
                       )}

                       {isProvider && (
                         <>
                             {displayData.status === 'open' && (
                               <button onClick={() => setBudgetModal({ isOpen: true, amount: '', description: '' })} className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 animate-pulse">
                                <span className="material-symbols-outlined">receipt_long</span> Enviar Orçamento Profissional
                               </button>
                             )}
                             {displayData.status === 'paid' && (
                                <button onClick={() => setScheduleModal({ isOpen: true, date: '', time: '09:00' })} className="w-full h-14 bg-orange-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2">
                                 <span className="material-symbols-outlined">calendar_month</span> Agendar Data e Horário
                                </button>
                             )}
                             {displayData.status === 'scheduled' && (
                                <button onClick={async () => {
                                  await supabase.from('service_requests').update({ status: 'in_service' }).eq('id', request.id);
                                  showToast("Sucesso", "Trabalho iniciado!", "success");
                                  refreshData();
                                }} className="w-full h-14 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
                                 <span className="material-symbols-outlined">play_arrow</span> Iniciar Trabalho Agora
                                </button>
                             )}
                             {displayData.status === 'in_service' && (
                                <button onClick={async () => {
                                  await supabase.from('service_requests').update({ status: 'completed' }).eq('id', request.id);
                                  showToast("Sucesso", "Serviço finalizado!", "success");
                                  refreshData();
                                }} className="w-full h-14 bg-emerald-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">
                                 <span className="material-symbols-outlined">task_alt</span> Concluir Serviço
                                </button>
                             )}
                         </>
                       )}

                       {/* Chat Button (Common) */}
                       {['proposed', 'awaiting_payment', 'paid', 'scheduled', 'in_service'].includes(displayData.status) && (
                         <button onClick={async () => {
                           const { data: room } = await supabase.from('chat_rooms').select('id').eq('request_id', request?.id).single();
                           onNavigate('chat', { roomId: room?.id, requestId: request?.id, opponentId: isClient ? displayData.provider_id : displayData.client_id, opponentName: isClient ? displayData.provider?.full_name : displayData.profiles?.full_name });
                         }} className="w-full h-12 bg-white/5 text-slate-300 font-bold rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                           <span className="material-symbols-outlined">chat</span> Abrir Chat com {isClient ? 'Profissional' : 'Cliente'}
                         </button>
                       )}
                    </div>
                  </div>
               </div>

               {/* 2. Grid de Informações Detalhadas */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card do Prestador/Cliente */}
                  <div className="bg-slate-900/50 p-4 rounded-[24px] border border-white/5 flex items-center gap-4">
                     <div className="size-16 rounded-full bg-slate-800 overflow-hidden border-2 border-white/5">
                        <img src={isClient ? (displayData.provider?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png") : (displayData.profiles?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png")} className="w-full h-full object-cover" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{isClient ? 'Prestador' : 'Cliente'}</p>
                        <h3 className="font-black text-white uppercase tracking-tighter italic">{isClient ? displayData.provider?.full_name : displayData.profiles?.full_name}</h3>
                        <div className="flex gap-2 mt-2">
                           <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center text-primary">
                              <span className="material-symbols-outlined text-sm">verified</span>
                           </div>
                           <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center text-amber-500">
                              <span className="material-symbols-outlined text-sm">star</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Valor e Data */}
                  <div className="bg-slate-900/50 p-4 rounded-[24px] border border-white/5 grid grid-cols-2 gap-4">
                     <div className="relative group/price">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Custo Total</p>
                        {displayData.status === 'open' ? (
                          <p className="text-sm font-black text-primary uppercase tracking-tighter italic animate-pulse">A DEFINIR</p>
                        ) : (
                          <p className="text-xl font-black text-white uppercase tracking-tighter italic">{formatCurrency(displayData.budget_amount || 0)}</p>
                        )}
                        <div className="mt-2 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase inline-block border border-emerald-500/20">Pago via KNG</div>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Previsão</p>
                        <p className="text-sm font-black text-white">{displayData.desired_date ? new Date(displayData.desired_date).toLocaleDateString('pt-BR') : 'A definir'}</p>
                        <p className="text-sm font-black text-slate-400">{displayData.desired_date ? new Date(displayData.desired_date).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}) : '--:--'}</p>
                     </div>
                  </div>
               </div>

               {/* 3. Detalhes do Pedido com Anexos */}
               <div className="bg-slate-900/50 rounded-[28px] border border-white/5 overflow-hidden">
                  <div className="p-5 border-b border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">{displayData.category?.icon}</span>
                        <h4 className="font-black text-white uppercase tracking-tighter italic">{displayData.title || displayData.category?.name}</h4>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${displayData.latitude},${displayData.longitude}`)} className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-500 hover:bg-white/10 transition-colors">
                           <span className="material-symbols-outlined">map</span>
                        </button>
                        <button onClick={() => window.open(`google.navigation:q=${displayData.latitude},${displayData.longitude}`)} className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-blue-500 hover:bg-white/10 transition-colors">
                           <span className="material-symbols-outlined">navigation</span>
                        </button>
                     </div>
                  </div>
                  <div className="p-5 space-y-4">
                     <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Instruções do Cliente</p>
                        <p className="text-sm text-slate-400 leading-relaxed italic">"{displayData.description || 'Sem descrição adicional.'}"</p>
                     </div>
                     {displayData.attachments?.length > 0 && (
                        <div>
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Material Visual de Apoio</p>
                           <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                              {displayData.attachments.map((u: string, idx: number) => (
                                <button key={idx} onClick={() => setImageModal({ isOpen: true, url: u })} className="size-24 rounded-2xl overflow-hidden shrink-0 border border-white/10 hover:border-primary transition-all">
                                   <img src={u} className="w-full h-full object-cover" />
                                </button>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
                  <div className="bg-slate-800/30 p-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-500 text-sm">location_on</span>
                    <p className="text-xs font-medium text-slate-500 truncate">{displayData.street}, {displayData.number} - {displayData.neighborhood}, {displayData.city}</p>
                  </div>
               </div>
            </div>

            {/* COLUNA DIREITA: ROADMAP VISUAL (STEPPER) */}
            <div className="hidden lg:flex flex-col bg-slate-900 rounded-[40px] border border-white/5 p-10 relative overflow-hidden animate-in fade-in zoom-in-95 duration-1000">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
               
               <div className="relative z-10 h-full flex flex-col">
                  <div className="mb-12">
                     <p className="text-xs font-black text-primary uppercase tracking-[4px] mb-2 leading-none">Status Workflow</p>
                     <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Roteiro do Pedido</h2>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-2 max-w-sm mx-auto w-full">
                     {[
                       { id: 'budget', label: 'Proposta', icon: 'sell', status: ['proposed', 'awaiting_payment', 'paid', 'scheduled', 'in_service', 'completed'] },
                       { id: 'payment', label: 'Pagamento', icon: 'payments', status: ['awaiting_payment', 'paid', 'scheduled', 'in_service', 'completed'] },
                       { id: 'schedule', label: 'Agendamento', icon: 'calendar_today', status: ['paid', 'scheduled', 'in_service', 'completed'] },
                       { id: 'execution', label: 'Execução', icon: 'construction', status: ['in_service', 'completed'] },
                       { id: 'final', label: 'Conclusão', icon: 'verified', status: ['completed'] }
                     ].map((step, idx, arr) => {
                       const isDone = step.status.includes(displayData.status);
                       const isLast = idx === arr.length - 1;
                       
                       return (
                         <div key={idx} className="flex items-center gap-8 relative group">
                            {!isLast && (
                              <div className="absolute left-7 top-14 bottom-0 w-1 bg-slate-800 z-0">
                                 <div className={`w-full transition-all duration-1000 ${isDone ? 'h-full bg-primary' : 'h-0'}`} />
                              </div>
                            )}
                            <div className={`size-14 rounded-[20px] flex items-center justify-center shrink-0 border-2 transition-all duration-500 z-10 shadow-2xl ${
                              isDone ? 'bg-primary border-primary text-white shadow-primary/20' : 'bg-slate-800 border-slate-700 text-slate-600'
                            }`}>
                               <span className="material-symbols-outlined text-2xl">{isDone ? 'check' : step.icon}</span>
                            </div>
                            <div className="flex flex-col">
                               <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${isDone ? 'text-primary' : 'text-slate-600'}`}>Etapa {idx+1}</p>
                               <h4 className={`text-xl font-black uppercase tracking-tighter italic leading-none ${isDone ? 'text-white' : 'text-slate-700'}`}>{step.label}</h4>
                            </div>
                         </div>
                       )
                     })}
                  </div>

                  <div className="mt-auto pt-10 border-t border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400">
                           <span className="material-symbols-outlined">support_agent</span>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Central de Ajuda</p>
                           <button onClick={() => onNavigate('helpCenter')} className="text-white hover:text-primary font-bold text-sm transition-colors">Tive um problema</button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Mobile Horizontal Stepper Overlay */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-slate-900/90 backdrop-blur-xl border-t border-white/5 z-[60] flex justify-between items-center px-8">
               {['sell', 'payments', 'calendar_today', 'construction', 'verified'].map((icon, i) => (
                 <div key={i} className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500">
                    <span className="material-symbols-outlined text-sm">{icon}</span>
                 </div>
               ))}
            </div>

          </div>
        </div>
      </main>

      {/* Modals Section */}
      <div className="modals-container">
        {/* Budget Modal */}
        {budgetModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
             <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl scale-in-center transition-all">
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-3xl">receipt_long</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Enviar Orçamento</h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Defina o valor do seu serviço</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                     <div className="relative">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Valor do Orçamento (R$)</p>
                        <input 
                          type="text"
                          value={budgetModal.amount}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(val) / 100);
                            setBudgetModal({ ...budgetModal, amount: val ? formatted : "" });
                          }}
                          placeholder="R$ 0,00"
                          className="w-full h-16 bg-slate-800 border border-white/5 rounded-2xl px-6 text-2xl font-black text-white focus:border-primary/50 outline-none transition-all placeholder:text-slate-700"
                        />
                     </div>

                     <button 
                       onClick={handleBudgetSubmit}
                       disabled={isSendingBudget || !budgetModal.amount}
                       className="w-full h-16 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                     >
                       {isSendingBudget ? (
                         <span className="material-symbols-outlined animate-spin">progress_activity</span>
                       ) : (
                         <>Enviar Proposta Agora <span className="material-symbols-outlined">send</span></>
                       )}
                     </button>
                     
                     <button onClick={() => setBudgetModal({ ...budgetModal, isOpen: false })} className="w-full text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">Voltar para o Painel</button>
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* Schedule Modal */}
        {scheduleModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
             <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
                <div className="p-8 text-center">
                  <div className="size-20 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 mx-auto mb-6">
                    <span className="material-symbols-outlined text-4xl">calendar_month</span>
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-2">Agendar Serviço</h3>
                  <p className="text-sm text-slate-400 mb-8 leading-relaxed px-4">Combine com o cliente e defina o melhor momento para realizar o trabalho.</p>

                  <div className="space-y-4">
                     <input 
                      type="date"
                      value={scheduleModal.date}
                      onChange={(e) => setScheduleModal({ ...scheduleModal, date: e.target.value })}
                      className="w-full h-14 bg-slate-800 border border-white/5 rounded-2xl px-6 text-white font-bold focus:border-orange-500/50 outline-none transition-all"
                     />
                     <input 
                      type="time"
                      value={scheduleModal.time}
                      onChange={(e) => setScheduleModal({ ...scheduleModal, time: e.target.value })}
                      className="w-full h-14 bg-slate-800 border border-white/5 rounded-2xl px-6 text-white font-bold focus:border-orange-500/50 outline-none transition-all"
                     />
                     
                     <button 
                       onClick={handleScheduleSubmit}
                       disabled={isActing || !scheduleModal.date || !scheduleModal.time}
                       className="w-full h-14 bg-orange-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                     >
                       {isActing ? (
                         <span className="material-symbols-outlined animate-spin">progress_activity</span>
                       ) : (
                         'Confirmar Agendamento'
                       )}
                     </button>
                     
                     <button onClick={() => setScheduleModal({ ...scheduleModal, isOpen: false })} className="w-full text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors pt-2">Cancelar</button>
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* Image Viewer */}
        {imageModal.isOpen && (
          <div className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center p-4 lg:p-20 animate-in fade-in zoom-in duration-300" onClick={() => setImageModal({ isOpen: false, url: '' })}>
            <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-4xl">close</span>
            </button>
            <img src={imageModal.url} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
          </div>
        )}
      </div>

    </div>
  );
}
