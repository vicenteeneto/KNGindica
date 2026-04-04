import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../NotificationContext';
import { formatCurrency } from '../lib/formatters';
import { useAuth } from '../AuthContext';

export default function FreelanceStatusScreen({ onNavigate, params }: NavigationProps) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [scheduleModal, setScheduleModal] = useState<{ isOpen: boolean; date: string; time: string }>({
    isOpen: false, date: '', time: '09:00'
  });
  const [isActing, setIsActing] = useState(false);
  const [imageModal, setImageModal] = useState<{ isOpen: boolean, url: string }>({ isOpen: false, url: '' });

  useEffect(() => {
    const fetchOrder = async () => {
      if (!params?.orderId) {
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase.from('freelance_orders').select(`
          *,
          provider:profiles!freelance_orders_assigned_provider_id_fkey(
            id, 
            full_name, 
            avatar_url, 
            rating, 
            profiles_private(cpf, birth_date)
          ),
          client:profiles!freelance_orders_client_id_fkey(
            id,
            full_name,
            avatar_url
          ),
          category:service_categories(name, icon)
        `).eq('id', params.orderId).single();
        
        if (error) {
           throw error;
        }
        
        if (data) {
          setOrder(data);
          
          // Verificar se já existe uma avaliação
          if (data.status === 'completed' && user?.id === data.client_id) {
            const { data: reviewData } = await supabase
              .from('reviews')
              .select('id')
              .eq('freelance_order_id', params.orderId)
              .eq('reviewer_id', user.id)
              .maybeSingle();
            
            if (reviewData) {
              setHasReviewed(true);
            }
          }
        }
      } catch (err: any) {
        console.error("Erro ao buscar freelance:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    if (params?.orderId) {
      const subscription = supabase
        .channel(`freelance_order_${params.orderId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'freelance_orders',
          filter: `id=eq.${params.orderId}`
        }, (payload) => {
          fetchOrder();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [params?.orderId]);

  if (loading && params?.orderId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  const handleScheduleFreelance = async () => {
    if (!scheduleModal.date || !scheduleModal.time || !order) return;
    setIsActing(true);
    try {
      const scheduledAt = `${scheduleModal.date}T${scheduleModal.time}:00`;
      const { error } = await supabase
        .from('freelance_orders')
        .update({ status: 'assigned', delivery_deadline: scheduledAt })
        .eq('id', order.id);
      if (error) throw error;

      // Notificar o cliente removida - Gatilho do banco de dados gerencia isso

      showToast('Sucesso', 'Serviço agendado!', 'success');
      setScheduleModal({ isOpen: false, date: '', time: '09:00' });
    } catch (e: any) {
      showToast('Erro', 'Falha ao agendar: ' + e.message, 'error');
    } finally {
      setIsActing(false);
    }
  };

  const displayData = order || {
    title: 'Carregando...',
    category: { name: 'Freelance', icon: 'work' },
    provider: null,
    budget: 0,
    created_at: new Date().toISOString(),
    status: 'open'
  };

  const isClient = user?.id === displayData.client_id;
  const isProvider = user?.id === displayData.assigned_provider_id;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col antialiased">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center p-4 justify-between max-w-4xl lg:mx-0 lg:ml-12 w-full transition-all duration-300">
          <button 
            onClick={() => onNavigate('back')}
            className="text-slate-900 dark:text-slate-100 flex size-10 items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center lg:text-left pr-10">
            {displayData.title || 'Status do Freelance'}
          </h2>
        </div>
      </header>

      <main className="flex-1 max-w-4xl lg:mx-0 lg:ml-12 w-full pb-24 transition-all duration-300">
        <div className="flex flex-col px-4 py-8">
          <div className="flex flex-col gap-6">
            {/* Freelance Roadmap (Stepper) */}
            <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-8 relative">
                {/* Connecting Line */}
                <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-100 dark:bg-slate-800 -z-0"></div>
                <div 
                  className="absolute top-5 left-8 h-0.5 bg-primary transition-all duration-500 -z-0"
                  style={{ 
                    width: `${
                      displayData.status === 'open' ? '0%' :
                      displayData.status === 'awaiting_payment' ? '25%' :
                      displayData.status === 'paid' ? '50%' :
                      displayData.status === 'assigned' ? '50%' :
                      displayData.status === 'in_service' ? '75%' :
                      displayData.status === 'completed' ? '100.1%' : '0%'
                    }`
                  }}
                ></div>

                {[
                  { id: 'open', label: 'Lances', icon: 'gavel' },
                  { id: 'awaiting_payment', label: 'Pagamento', icon: 'payments' },
                  { id: 'assigned', label: 'Agenda', icon: 'calendar_today' },
                  { id: 'in_service', label: 'Execução', icon: 'construction' },
                  { id: 'completed', label: 'Conclusão', icon: 'verified' }
                ].map((step, idx) => {
                  const isCompleted = (
                    (step.id === 'open' && ['open', 'awaiting_payment', 'paid', 'assigned', 'in_service', 'completed'].includes(displayData.status)) ||
                    (step.id === 'awaiting_payment' && ['paid', 'assigned', 'in_service', 'completed'].includes(displayData.status)) ||
                    (step.id === 'assigned' && ['assigned', 'in_service', 'completed'].includes(displayData.status)) ||
                    (step.id === 'in_service' && ['in_service', 'completed'].includes(displayData.status)) ||
                    (step.id === 'completed' && displayData.status === 'completed')
                  );
                  const isCurrent = (
                    (step.id === 'open' && displayData.status === 'open') ||
                    (step.id === 'awaiting_payment' && displayData.status === 'awaiting_payment') ||
                    (step.id === 'assigned' && displayData.status === 'paid') ||
                    (step.id === 'in_service' && displayData.status === 'assigned') ||
                    (step.id === 'completed' && (displayData.status === 'in_service' || (displayData.status === 'completed' && !hasReviewed)))
                  );

                  return (
                    <div key={step.id} className="flex flex-col items-center gap-2 relative z-10">
                      <div className={`size-10 rounded-full flex items-center justify-center transition-all duration-300 border-4 ${
                        isCompleted ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-110' :
                        isCurrent ? 'bg-white dark:bg-slate-900 border-primary text-primary animate-pulse' :
                        'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-300'
                      }`}>
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: isCompleted ? "'FILL' 1" : "'FILL' 0" }}>
                          {isCompleted ? 'check' : step.icon}
                        </span>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-tighter ${isCurrent ? 'text-primary' : isCompleted ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Status Header Contextual */}
              <div className="flex flex-col items-center text-center gap-2 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  displayData.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
                }`}>
                  Freelance: {
                    displayData.status === 'open' ? 'Em Leilão' : 
                    displayData.status === 'awaiting_payment' ? 'Aguardando Pagamento' :
                    displayData.status === 'paid' ? 'Pagamento Garantido' :
                    displayData.status === 'assigned' ? 'Início Agendado' : 
                    displayData.status === 'in_service' ? 'Em Execução' :
                    displayData.status === 'completed' ? 'Finalizado' : 
                    displayData.status === 'cancelled' ? 'Cancelado' : 'Status Desconhecido'
                  }
                </div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">
                  {displayData.status === 'open' ? 'Aguardando Lances' : 
                   displayData.status === 'awaiting_payment' ? 'Profissional Escolhido!' :
                   displayData.status === 'paid' ? 'Contrato Confirmado' :
                   displayData.status === 'assigned' ? 'Tudo pronto para começar' : 
                   displayData.status === 'in_service' ? 'Em pleno andamento' :
                   displayData.status === 'completed' ? 'Trabalho Entregue' : 'Aguarde...'}
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                  {displayData.status === 'open' ? 'Os melhores especialistas estão analisando seu projeto.' : 
                   displayData.status === 'awaiting_payment' ? (isClient ? 'Realize o pagamento para que o profissional possa agendar o início.' : 'O cliente está processando o pagamento da garantia.') :
                   displayData.status === 'paid' ? (isProvider ? 'O dinheiro já está seguro com a KNG. Agende agora o início do trabalho.' : 'O profissional recebeu seu pagamento e irá definir a data de início.') :
                   displayData.status === 'assigned' ? (isProvider ? 'Trabalho agendado. Clique em Iniciar quando começar a tarefa.' : `Início confirmado para ${displayData.delivery_deadline ? new Date(displayData.delivery_deadline).toLocaleString('pt-BR', {dateStyle:'short',timeStyle:'short'}) : '—'}`) : 
                   displayData.status === 'in_service' ? 'Execução técnica em andamento. Qualquer dúvida, use o chat.' :
                   displayData.status === 'completed' ? 'O trabalho foi finalizado pelo prestador. Não esqueça de avaliar!' : ''}
                </p>

                {displayData.status === 'completed' && isClient && !hasReviewed && (
                  <button 
                    onClick={() => onNavigate('writeReview', {
                      requestId: displayData.id,
                      providerId: displayData.assigned_provider_id,
                      providerName: displayData.provider?.full_name,
                      providerAvatar: displayData.provider?.avatar_url,
                      serviceTitle: displayData.title || displayData.category?.name || 'Freelance',
                      isFreelance: true
                    })}
                    className="mt-4 w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 animate-bounce"
                  >
                    <span className="material-symbols-outlined">star</span>
                    Avaliar e Finalizar
                  </button>
                )}
              </div>
            </div>
            
            {displayData.provider && (
              <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-primary/50 transition-colors" onClick={() => onNavigate('profile', { professionalId: isClient ? displayData.assigned_provider_id : displayData.client_id })}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm">
                        <img 
                          src={isClient ? (displayData.provider?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png") : (displayData.client?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png")} 
                          className="w-full h-full object-cover" 
                          alt="" 
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          {isClient ? displayData.provider?.full_name : displayData.client?.full_name}
                        </h3>
                        {isClient && (
                          <div className="flex items-center gap-1 text-amber-500">
                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            <span className="text-xs font-bold">{displayData.provider?.rating ? displayData.provider.rating : 'Novo'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="size-10 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-colors" onClick={async (e) => { 
                        e.stopPropagation(); 
                        if (!displayData.assigned_provider_id) {
                          showToast("Atenção", "O prestador ainda não foi atribuído.", "warning");
                          return;
                        }
                        const { data: room } = await supabase.from('chat_rooms').select('id').eq('freelance_order_id', order?.id).single();
                        onNavigate('chat', { 
                          roomId: room?.id, 
                          freelanceOrderId: order?.id,
                          opponentId: isClient ? displayData.assigned_provider_id : displayData.client_id,
                          opponentName: isClient ? displayData.provider?.full_name : displayData.client?.full_name, 
                          opponentAvatar: isClient ? displayData.provider?.avatar_url : displayData.client?.avatar_url
                        });
                      }}>
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                      </button>
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Service Details */}
        <div className="px-4 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Detalhes do Freelance</h3>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden shadow-sm">
            <div className="flex items-center gap-4 p-4">
                  <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined">{displayData.category?.icon || 'work'}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Serviço / Projeto</p>
                    <p className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                      {displayData.title || displayData.category?.name || 'Carregando...'}
                    </p>
                  </div>
            </div>
            
            <div className="flex items-center gap-4 p-4">
              <div className="size-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Valor Acordado</p>
                <p className="text-slate-900 dark:text-slate-100 font-bold text-lg">
                  {displayData.budget && displayData.budget > 0 
                    ? formatCurrency(displayData.budget) 
                    : 'A definir'}
                </p>
              </div>
              <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                displayData.status === 'paid' || displayData.status === 'in_service' || displayData.status === 'completed' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 
                displayData.status === 'cancelled' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' :
                'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
              }`}>
                {displayData.status === 'paid' || displayData.status === 'in_service' || displayData.status === 'completed' ? 'Pago' : 
                 displayData.status === 'cancelled' ? 'Cancelado' :
                 displayData.status === 'awaiting_payment' ? 'Aguardando Pagamento' : 'Pendente'}
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex flex-col gap-3">
            {/* PASSO 1 — Cliente: Ir para pagamento */}
            {displayData.status === 'awaiting_payment' && isClient && displayData.budget > 0 && (
              <div className="flex flex-col gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-500/20 mb-2">
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">enhanced_encryption</span>
                    Pagamento com Garantia KNG
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                      <span>Valor Acordado:</span>
                      <span className="font-semibold">{formatCurrency(displayData.budget)}</span>
                    </div>
                    <div className="pt-3 border-t border-emerald-200/50 dark:border-emerald-500/20 flex justify-between items-center font-bold text-slate-900 dark:text-white text-lg">
                      <span>Total a Pagar:</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(displayData.budget)}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-[10px] text-emerald-600/70 dark:text-emerald-400/50 leading-relaxed italic">
                    * Ao pagar pela plataforma, você garante que o dinheiro só será repassado ao concluir o trabalho.
                  </p>
                </div>
                <button 
                  onClick={() => onNavigate('checkout', { freelanceOrderId: order.id })}
                  className="w-full h-14 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-600 active:scale-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">payments</span>
                  Ir para Pagamento
                </button>
              </div>
            )}

            {/* PASSO 2 — Prestador: Agendar data/hora (status paid) */}
            {displayData.status === 'paid' && isProvider && (
              <button
                onClick={() => {
                  let prefilledDate = new Date().toISOString().split('T')[0];
                  let prefilledTime = '09:00';
                  
                  // if there's a deadline or preference already mentioned
                  if (displayData.delivery_deadline) {
                    const d = new Date(displayData.delivery_deadline);
                    if (!isNaN(d.getTime())) {
                      prefilledDate = d.toISOString().split('T')[0];
                      prefilledTime = d.toTimeString().split(' ')[0].substring(0, 5);
                    }
                  }

                  setScheduleModal({ isOpen: true, date: prefilledDate, time: prefilledTime });
                }}
                className="w-full h-14 bg-orange-500 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-orange-600 active:scale-95 transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">calendar_month</span>
                Agendar Data e Horário
              </button>
            )}

            {/* Cliente: mensagem aguardando agendamento */}
            {displayData.status === 'paid' && isClient && (
              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4 border border-amber-200 dark:border-amber-500/20 flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-500 mt-0.5">pending</span>
                <div>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Aguardando agendamento</p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/60 mt-1">O profissional irá propor uma data e horário para início.</p>
                </div>
              </div>
            )}

            {/* PASSO 3 — Prestador: Iniciar Trabalho (status assigned) */}
            {displayData.status === 'assigned' && isProvider && (
              <div className="flex flex-col gap-2">
                {displayData.delivery_deadline && (
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 flex items-center gap-3 border border-slate-100 dark:border-slate-700">
                    <span className="material-symbols-outlined text-primary text-xl">event</span>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Agendado para</p>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {new Date(displayData.delivery_deadline).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                )}
                <button
                  disabled={isActing}
                  onClick={async () => {
                    setIsActing(true);
                    try {
                      const { error } = await supabase.from('freelance_orders').update({ status: 'in_service' }).eq('id', order.id);
                      if (error) throw error;
                      showToast('Sucesso', 'Status atualizado para Em Andamento', 'success');
                      
                      // Refresh logic
                      const { data: updated } = await supabase.from('freelance_orders').select('*, provider:profiles!freelance_orders_assigned_provider_id_fkey(id, full_name, avatar_url, rating), client:profiles!freelance_orders_client_id_fkey(id, full_name, avatar_url), category:service_categories(name, icon)').eq('id', order.id).single();
                      if (updated) setOrder(updated);

                    } catch (e) { showToast('Erro', 'Erro ao atualizar status', 'error'); }
                    finally { setIsActing(false); }
                  }}
                  className="w-full h-14 bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-600 active:scale-95 transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined">play_arrow</span>
                  Iniciar Trabalho
                </button>
              </div>
            )}

            {/* Cliente: aguardando início (status assigned) */}
            {displayData.status === 'assigned' && isClient && (
              <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl p-4 border border-indigo-200 dark:border-indigo-500/20 flex items-start gap-3">
                <span className="material-symbols-outlined text-indigo-500 mt-0.5">schedule</span>
                <div>
                  <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400">Serviço agendado</p>
                  {displayData.delivery_deadline && (
                    <p className="text-xs text-indigo-600/70 dark:text-indigo-400/60 mt-0.5 font-semibold">
                      {new Date(displayData.delivery_deadline).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}
                    </p>
                  )}
                  <p className="text-xs text-indigo-600/60 dark:text-indigo-400/50 mt-1">Aguardando o profissional iniciar o trabalho.</p>
                </div>
              </div>
            )}

            {/* PASSO 4 — Cliente: Liberar pagamento (status in_service) */}
            {displayData.status === 'in_service' && isClient && (
              <div className="flex flex-col gap-3 mt-4">
                <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    O trabalho foi finalizado?
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    Confirme se o trabalho foi entregue conforme o acordado para liberar o pagamento ao profissional.
                  </p>
                      <button
                        disabled={isActing}
                        onClick={async () => {
                          setIsActing(true);
                          try {
                            const { error } = await supabase.from('freelance_orders').update({ status: 'completed' }).eq('id', order.id);
                            if (error) throw error;
                            
                            showToast('Sucesso', 'Freelance finalizado!', 'success');
                            
                            // Refresh logic
                            const { data: updated } = await supabase.from('freelance_orders').select('*, provider:profiles!freelance_orders_assigned_provider_id_fkey(id, full_name, avatar_url, rating), client:profiles!freelance_orders_client_id_fkey(id, full_name, avatar_url), category:service_categories(name, icon)').eq('id', order.id).single();
                            if (updated) setOrder(updated);

                            onNavigate('writeReview', {
                              requestId: displayData.id,
                              providerId: displayData.assigned_provider_id,
                              providerName: displayData.provider?.full_name,
                              providerAvatar: displayData.provider?.avatar_url,
                              serviceTitle: displayData.title || displayData.category?.name || 'Freelance',
                              isFreelance: true
                            });
                          } catch (e: any) {
                            showToast('Erro', 'Falha ao finalizar freelance.', 'error');
                          } finally { setIsActing(false); }
                        }}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        <span className="material-symbols-outlined">payments</span>
                        Confirmar e Liberar Valor
                      </button>
                </div>
              </div>
            )}

            {/* Prestador em andamento: botão para concluir */}
            {displayData.status === 'in_service' && isProvider && (
              <div className="flex flex-col gap-3">
                <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-4 border border-primary/20 flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-primary animate-pulse">construction</span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Trabalho em andamento. Ao finalizar, clique no botão abaixo para avisar o cliente.</p>
                </div>
                <button
                  disabled={isActing}
                  onClick={async () => {
                    setIsActing(true);
                    try {
                      const { error } = await supabase.from('freelance_orders').update({ status: 'completed' }).eq('id', order.id);
                      if (error) throw error;
                      showToast('Sucesso', 'Freelance marcado como concluído!', 'success');
                      
                      // Refresh logic
                      const { data: updated } = await supabase.from('freelance_orders').select('*, provider:profiles!freelance_orders_assigned_provider_id_fkey(id, full_name, avatar_url, rating), client:profiles!freelance_orders_client_id_fkey(id, full_name, avatar_url), category:service_categories(name, icon)').eq('id', order.id).single();
                      if (updated) setOrder(updated);

                    } catch (e) {
                      showToast('Erro', 'Falha ao concluir trabalho.', 'error');
                    } finally { setIsActing(false); }
                  }}
                  className="w-full h-14 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-600 active:scale-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined">task_alt</span>
                  Finalizar Trabalho
                </button>
              </div>
            )}
            
            {displayData.status !== 'cancelled' && (
              <button 
                onClick={() => onNavigate('helpCenter', { freelanceId: displayData.id })}
                className="w-full h-12 cursor-pointer bg-transparent text-slate-500 hover:text-red-500 font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">help</span>
                Tive um problema / Abrir Disputa
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Image Preview Modal */}
      {imageModal.isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 p-4" onClick={() => setImageModal({ isOpen: false, url: '' })}>
          <button className="absolute top-6 right-6 text-white text-4xl">&times;</button>
          <img src={imageModal.url} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModal.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-orange-500 text-2xl">calendar_month</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Agendar Início</h3>
                  <p className="text-xs text-slate-500">{order?.title || 'Freelance'}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Defina a data e horário em que você irá iniciar o trabalho. O cliente será notificado.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Data</label>
                  <input
                    type="date"
                    value={scheduleModal.date}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    onChange={(e) => setScheduleModal(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-sm text-slate-900 dark:text-slate-100 focus:border-orange-500 outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Horário</label>
                  <input
                    type="time"
                    value={scheduleModal.time}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    onChange={(e) => setScheduleModal(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-sm text-slate-900 dark:text-slate-100 focus:border-orange-500 outline-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <button
                onClick={() => setScheduleModal({ isOpen: false, date: '', time: '09:00' })}
                className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={isActing || !scheduleModal.date}
                onClick={handleScheduleFreelance}
                className="flex-[1.5] py-3 bg-orange-500 text-white rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isActing 
                  ? <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  : <><span>Confirmar</span><span className="material-symbols-outlined">done</span></>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
