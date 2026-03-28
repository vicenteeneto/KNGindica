import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../NotificationContext';
import { formatCurrency } from '../lib/formatters';
import { calculateServiceFees } from '../lib/billing';
import { useAuth } from '../AuthContext';

export default function ServiceStatusScreen({ onNavigate, params }: NavigationProps) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [refusalReason, setRefusalReason] = useState('');
  const [isRefusing, setIsRefusing] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      if (!params?.requestId) {
        setLoading(false);
        return;
      }
      
      try {
        console.log("Buscando pedido com ID:", params.requestId);
        
        // Tentamos primeiro por UUID, depois por display_id se falhar ou for formato de ORD-
        let query = supabase.from('service_requests').select(`
          *,
          provider:profiles!service_requests_provider_id_fkey(full_name, avatar_url, rating),
          category:service_categories(name, icon)
        `);

        if (params.requestId.startsWith('ORD-')) {
          query = query.eq('display_id', params.requestId);
        } else {
          query = query.eq('id', params.requestId);
        }

        const { data, error } = await query.single();
        
        if (error) {
           // Se deu erro buscando por ID e não era ORD-, tenta por display_id como fallback
           if (!params.requestId.startsWith('ORD-')) {
              const { data: fallbackData, error: fallbackError } = await supabase
                .from('service_requests')
                .select(`
                  *,
                  provider:profiles!service_requests_provider_id_fkey(full_name, avatar_url, rating),
                  category:service_categories(name, icon)
                `)
                .eq('display_id', params.requestId)
                .single();
              
              if (!fallbackError && fallbackData) {
                setRequest(fallbackData);
                setLoading(false);
                return;
              }
           }
           throw error;
        }
        
        if (data) {
          setRequest(data);
          console.log("ServiceStatusScreen carregado:", data);
        }
      } catch (err: any) {
        console.error("Erro ao buscar pedido:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();

    // Inscrição em tempo real para atualizações do pedido (orçamento, status, etc)
    if (params?.requestId) {
      const subscription = supabase
        .channel(`service_request_${params.requestId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_requests',
          filter: `id=eq.${params.requestId}`
        }, (payload) => {
          console.log("Pedido atualizado em tempo real:", payload.new);
          // Recarregar dados completos para pegar os profiles/categories relacionados
          fetchRequest();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [params?.requestId]);

  if (loading && params?.requestId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  const displayData = request || {
    title: 'Carregando...',
    category: { name: 'Serviço', icon: 'work' },
    provider: { full_name: 'Aguardando Atribuição', avatar_url: '' },
    budget_amount: 0,
    created_at: new Date().toISOString(),
    status: 'open'
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col antialiased">


      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center p-4 justify-between max-w-4xl mx-auto w-full">
          <button 
            onClick={() => onNavigate('back')}
            className="text-slate-900 dark:text-slate-100 flex size-10 items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">Status do Serviço</h2>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full pb-24">
        <div className="flex flex-col px-4 py-8">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="flex items-center justify-center">
                <span className={`material-symbols-outlined text-6xl ${displayData.status === 'cancelled' ? 'text-red-600' : 'text-primary'}`}>
                  {displayData.status === 'cancelled' ? 'cancel' : 'check_circle'}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {displayData.status === 'open' ? 'Solicitação Aberta' : 
                 displayData.status === 'proposed' ? 'Orçamento Recebido' :
                 displayData.status === 'awaiting_payment' ? 'Aguardando Pagamento' :
                 displayData.status === 'paid' ? 'Pedido Pago' :
                 displayData.status === 'completed' ? 'Serviço Concluído' : 
                 displayData.status === 'cancelled' ? 'Pedido Recusado' : 'Serviço em Andamento'}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {displayData.status === 'open' ? 'Estamos aguardando um profissional aceitar sua solicitação.' : 
                 displayData.status === 'proposed' ? 'Você recebeu uma proposta. Confira os detalhes abaixo.' :
                 displayData.status === 'awaiting_payment' ? 'Sua proposta foi aceita! Realize o pagamento da taxa de intermediação para liberar o contato direto.' :
                 displayData.status === 'paid' ? 'Pagamento confirmado! O profissional entrará em contato em breve.' :
                 displayData.status === 'completed' ? 'Obrigado por utilizar o KNGindica! Por favor, avalie o atendimento do profissional.' :
                 displayData.status === 'cancelled' ? (
                   <>
                     Infelizmente o profissional recusou este serviço.
                     {displayData.rejection_reason && (
                       <span className="block mt-2 font-bold text-red-600 dark:text-red-400 italic">
                         " {displayData.rejection_reason} "
                       </span>
                     )}
                   </>
                 ) : 'O profissional está pronto para realizar o seu atendimento.'}
              </p>
              
              {displayData.status === 'completed' && (
                <button 
                  onClick={() => onNavigate('writeReview', {
                    requestId: displayData.id,
                    providerId: displayData.provider_id,
                    providerName: displayData.provider?.full_name,
                    providerAvatar: displayData.provider?.avatar_url,
                    serviceTitle: displayData.title || displayData.category?.name || 'Serviço'
                  })}
                  className="mt-4 px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2 animate-bounce"
                >
                  <span className="material-symbols-outlined">star</span>
                  Avaliar Profissional
                </button>
              )}
            </div>
            
            <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-primary/50 transition-colors" onClick={() => displayData.provider_id && onNavigate('profile', { professionalId: displayData.provider_id })}>
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm">
                      <img 
                        src={displayData.provider?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} 
                        className="w-full h-full object-cover" 
                        alt="" 
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{displayData.provider?.full_name || 'Aguardando Profissional'}</h3>
                      <div className="flex items-center gap-1 text-amber-500">
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="text-xs font-bold">{displayData.provider?.rating ? displayData.provider.rating : 'Novo'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="size-10 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-colors" onClick={async (e) => { 
                      e.stopPropagation(); 
                      if (!displayData.provider_id) {
                        showToast("Atenção", "Aguarde um profissional aceitar seu pedido para iniciar o chat.", "warning");
                        return;
                      }
                      const { data: room } = await supabase.from('chat_rooms').select('id').eq('request_id', request?.id).single();
                      onNavigate('chat', { 
                        roomId: room?.id, 
                        opponentId: displayData.provider_id,
                        opponentName: displayData.provider?.full_name, 
                        opponentAvatar: displayData.provider?.avatar_url,
                        requestId: request?.id
                      });
                    }}>
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                    </button>
                  </div>
              </div>
            </div>
          </div>
        </div>

        {/* Service Details */}
        <div className="px-4 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Detalhes do Agendamento</h3>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden shadow-sm">
            <div className="flex items-center gap-4 p-4">
                  <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined">{displayData.category?.icon || 'work'}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Serviço</p>
                    <p className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                      {displayData.title || displayData.category?.name || 'Carregando...'}
                    </p>
                  </div>
            </div>
            
            <div className="flex items-center gap-4 p-4">
              <div className="size-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined">calendar_today</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Data e Horário</p>
                <p className="text-slate-900 dark:text-slate-100 font-semibold">
                  {displayData.desired_date 
                    ? `${new Date(displayData.desired_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}, ${new Date(displayData.desired_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                    : `${new Date(displayData.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}, ${new Date(displayData.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4">
              <div className="size-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined">location_on</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Localização</p>
                <p className="text-slate-900 dark:text-slate-100 font-semibold line-clamp-2">
                  {displayData.address || 'Localização não informada'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4">
              <div className="size-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Valor do Serviço</p>
                <p className="text-slate-900 dark:text-slate-100 font-bold text-lg">
                  {displayData.budget_amount && displayData.budget_amount > 0 
                    ? formatCurrency(displayData.budget_amount) 
                    : 'A definir'}
                </p>
              </div>
              <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                displayData.status === 'paid' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 
                displayData.status === 'cancelled' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' :
                'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
              }`}>
                {displayData.status === 'paid' ? 'Pago' : 
                 displayData.status === 'cancelled' ? 'Recusado' :
                 displayData.status === 'proposed' ? 'Orçamento' : 
                 displayData.status === 'awaiting_payment' ? 'Aguardando Pagamento' : 'Pendente'}
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex flex-col gap-3">
            {(displayData.status === 'proposed' || displayData.status === 'awaiting_payment') && user?.id === displayData.client_id && displayData.budget_amount > 0 && (
              <div className="flex flex-col gap-3">
                {/* Resumo de Taxas para o Cliente */}
                <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-500/20 mb-2">
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">enhanced_encryption</span>
                    Pagamento com Garantia KNG
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                      <span>Valor do Serviço:</span>
                      <span className="font-semibold">{formatCurrency(displayData.budget_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                      <span>Taxa de Intermediação:</span>
                      <span className="font-semibold">{formatCurrency(9.90)}</span>
                    </div>
                    <div className="pt-3 border-t border-emerald-200/50 dark:border-emerald-500/20 flex justify-between items-center font-bold text-slate-900 dark:text-white text-lg">
                      <span>Total a Pagar:</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(displayData.budget_amount + 9.90)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-[10px] text-emerald-600/70 dark:text-emerald-400/50 leading-relaxed italic">
                    * Ao pagar pela plataforma, você tem garantia de serviço concluído ou seu dinheiro de volta.
                  </p>
                </div>

                {displayData.status === 'proposed' && (
                  <>
                    {/* 1. Aceitar Orçamento */}
                    <button 
                      onClick={async () => {
                        try {
                          const { error } = await supabase
                            .from('service_requests')
                            .update({ status: 'awaiting_payment' })
                            .eq('id', request.id);
                          if (error) throw error;

                          // Notificar o prestador (sininho)
                          if (request?.provider_id) {
                            await supabase.from('notifications').insert({
                              user_id: request.provider_id,
                              title: 'Orçamento Aceito!',
                              message: `O cliente aceitou seu orçamento para "${request.title || 'Serviço'}".`,
                              type: 'status',
                              related_entity_id: request.id
                            });
                          }

                          onNavigate('checkout', { requestId: request.id });
                        } catch (e: any) {
                          showToast("Erro", "Falha ao aceitar orçamento.", "error");
                        }
                      }}
                      className="w-full h-14 bg-orange-500 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-orange-600 active:scale-95 transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">check_circle</span>
                      Aceitar Orçamento
                    </button>

                    {/* 2. Recusar Orçamento */}
                    <button 
                      onClick={() => setShowRefuseModal(true)}
                      className="w-full h-12 bg-white dark:bg-slate-800 text-red-500 border-2 border-red-100 dark:border-red-900/30 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">cancel</span>
                      Recusar Orçamento
                    </button>
                  </>
                )}

                {displayData.status === 'awaiting_payment' && (
                  <button 
                    onClick={() => onNavigate('checkout', { requestId: request.id })}
                    className="w-full h-14 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-600 active:scale-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">payments</span>
                    Ir para Pagamento (Taxa R$ 9,90)
                  </button>
                )}

                {/* 3. Conversar pelo chat */}
                <button 
                  onClick={async () => {
                    const { data: room } = await supabase.from('chat_rooms').select('id').eq('request_id', request?.id).single();
                    onNavigate('chat', { 
                      roomId: room?.id,
                      requestId: request?.id,
                      opponentId: displayData.provider_id,
                      opponentName: displayData.provider?.full_name,
                      opponentAvatar: displayData.provider?.avatar_url
                    });
                  }}
                  className="w-full h-12 bg-white dark:bg-slate-800 text-blue-600 border-2 border-blue-100 dark:border-blue-900/30 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">chat</span>
                  Conversar pelo chat
                </button>
              </div>
            )}

            {displayData.status === 'cancelled' && (
              <button 
                onClick={() => onNavigate('listing')}
                className="w-full h-12 bg-primary text-white font-bold rounded-xl hover:brightness-110 transition-all shadow-lg shadow-primary/20"
              >
                Buscar Outro Profissional
              </button>
            )}
            {displayData.status !== 'cancelled' && (
              <button 
                onClick={() => onNavigate('helpCenter', { requestId: params?.requestId })}
                className="w-full h-12 bg-transparent text-slate-500 hover:text-red-500 font-bold rounded-xl transition-colors text-sm"
              >
                Tive um problema / Abrir Disputa
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 pb-6 pt-2 z-20">
        <div className="flex max-w-4xl mx-auto gap-2">
          <button onClick={() => onNavigate('home')} className="flex flex-1 flex-col items-center justify-end gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
            <span className="material-symbols-outlined">home</span>
            <p className="text-[10px] font-medium leading-normal tracking-[0.015em]">Início</p>
          </button>
          <button onClick={() => onNavigate('listing')} className="flex flex-1 flex-col items-center justify-end gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
            <span className="material-symbols-outlined">search</span>
            <p className="text-[10px] font-medium leading-normal tracking-[0.015em]">Busca</p>
          </button>
          <button className="flex flex-1 flex-col items-center justify-end gap-1 text-primary">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
            <p className="text-[10px] font-medium leading-normal tracking-[0.015em]">Agenda</p>
          </button>
          <button onClick={() => onNavigate('userProfile')} className="flex flex-1 flex-col items-center justify-end gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
            <span className="material-symbols-outlined">person</span>
            <p className="text-[10px] font-medium leading-normal tracking-[0.015em]">Perfil</p>
          </button>
        </div>
      </nav>

      {/* Custom Refusal Modal */}
      {showRefuseModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 flex flex-col items-center text-center shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="size-16 rounded-2xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-red-500 text-3xl">cancel</span>
            </div>
            
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">
              RECUSAR ORÇAMENTO?
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">
              Esta ação informará ao profissional que você não aceitou a proposta agora.
            </p>

            <textarea
              className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium focus:border-red-500/50 outline-none transition-all resize-none mb-4"
              placeholder="Motivo da recusa (opcional)..."
              value={refusalReason}
              onChange={(e) => setRefusalReason(e.target.value)}
            />

            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 italic">
              Este motivo será enviado ao profissional.
            </p>

            <div className="flex flex-col gap-3 w-full">
              <button
                disabled={isRefusing}
                onClick={async () => {
                  setIsRefusing(true);
                  try {
                    const { error } = await supabase
                      .from('service_requests')
                      .update({ 
                        status: 'cancelled',
                        cancellation_reason: refusalReason 
                      })
                      .eq('id', request.id);
                    if (error) throw error;

                    // Enviar mensagem no chat com o motivo
                    if (refusalReason.trim() && request.id) {
                      const { data: room } = await supabase.from('chat_rooms').select('id').eq('request_id', request.id).single();
                      if (room) {
                        await supabase.from('chat_messages').insert({
                          room_id: room.id,
                          sender_id: user.id,
                          content: `❌ Orçamento recusado. Motivo: ${refusalReason}`
                        });
                      }
                    }

                    // Notificar o prestador (sininho)
                    if (request?.provider_id) {
                      await supabase.from('notifications').insert({
                        user_id: request.provider_id,
                        title: 'Orçamento Recusado',
                        message: `O cliente recusou seu orçamento para "${request.title || 'Serviço'}".`,
                        type: 'status',
                        related_entity_id: request.id
                      });
                    }

                    showToast("Sucesso", "Orçamento recusado.", "success");
                    setShowRefuseModal(false);
                    // Refresh data
                    const { data } = await supabase.from('service_requests').select('*').eq('id', request.id).single();
                    setRequest(data);
                  } catch (e: any) {
                    showToast("Erro", "Falha ao recusar orçamento.", "error");
                  } finally {
                    setIsRefusing(false);
                  }
                }}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-600/20 active:scale-95 transition-all"
              >
                {isRefusing ? 'Processando...' : 'Confirmar Recusa'}
              </button>

              <button
                onClick={() => setShowRefuseModal(false)}
                className="w-full py-2 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
