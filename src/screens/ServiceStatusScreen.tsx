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
  const [hasBeenReviewed, setHasBeenReviewed] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [refusalReason, setRefusalReason] = useState('');
  const [isRefusing, setIsRefusing] = useState(false);
  const [imageModal, setImageModal] = useState<{ isOpen: boolean, url: string }>({ isOpen: false, url: '' });
  const [budgetModal, setBudgetModal] = useState<{ isOpen: boolean; amount: string; description: string }>({
    isOpen: false, amount: '', description: ''
  });
  const [isSendingBudget, setIsSendingBudget] = useState(false);

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
          provider:profiles!service_requests_provider_id_fkey(
            id, 
            full_name, 
            avatar_url, 
            rating, 
            profiles_private(cpf, birth_date)
          ),
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
                  provider:profiles!service_requests_provider_id_fkey(
                    id, 
                    full_name, 
                    avatar_url, 
                    rating, 
                    profiles_private(cpf, birth_date)
                  ),
                  category:service_categories(name, icon)
                `)
                .eq('display_id', params.requestId)
                .single();
              
              if (!fallbackError && fallbackData) {
                setRequest(fallbackData);
                // Check review too
                const { data: reviewData } = await supabase.from('reviews').select('id').eq('request_id', fallbackData.id).limit(1);
                if (reviewData && reviewData.length > 0) setHasBeenReviewed(true);
                setLoading(false);
                return;
              }
           }
           throw error;
        }
        
        if (data) {
          setRequest(data);
          // Check review too
          const { data: reviewData } = await supabase.from('reviews').select('id').eq('request_id', data.id).limit(1);
          if (reviewData && reviewData.length > 0) setHasBeenReviewed(true);
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
        <div className="flex items-center p-4 justify-between max-w-4xl lg:mx-0 lg:ml-12 w-full transition-all duration-300">
          <button 
            onClick={() => onNavigate('back')}
            className="text-slate-900 dark:text-slate-100 flex size-10 items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center lg:text-left pr-10">
            {displayData.display_id || 'Status do Serviço'}
          </h2>
        </div>
      </header>

      <main className="flex-1 max-w-4xl lg:mx-0 lg:ml-12 w-full pb-24 transition-all duration-300">
        <div className="flex flex-col px-4 py-8">
          <div className="flex flex-col gap-6">
            {/* Project Roadmap (Stepper) */}
            <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-8 relative">
                {/* Connecting Line */}
                <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-100 dark:bg-slate-800 -z-0"></div>
                <div 
                  className="absolute top-5 left-8 h-0.5 bg-primary transition-all duration-500 -z-0"
                  style={{ 
                    width: `${
                      displayData.status === 'open' ? '0%' :
                      displayData.status === 'proposed' ? '0%' :
                      displayData.status === 'awaiting_payment' ? '25%' :
                      displayData.status === 'paid' ? '50%' :
                      displayData.status === 'scheduled' ? '50%' :
                      displayData.status === 'in_service' ? '75%' :
                      displayData.status === 'completed' ? '100.1%' : '0%'
                    }`
                  }}
                ></div>

                {[
                  { id: 'proposed', label: 'Orçamento', icon: 'sell' },
                  { id: 'paid', label: 'Pagamento', icon: 'payments' },
                  { id: 'scheduled', label: 'Agenda', icon: 'calendar_today' },
                  { id: 'in_service', label: 'Execução', icon: 'construction' },
                  { id: 'completed', label: 'Conclusão', icon: 'verified' }
                ].map((step, idx) => {
                  const isCompleted = (
                    (step.id === 'proposed' && ['proposed', 'awaiting_payment', 'paid', 'scheduled', 'in_service', 'completed'].includes(displayData.status)) ||
                    (step.id === 'paid' && ['paid', 'scheduled', 'in_service', 'completed'].includes(displayData.status)) ||
                    (step.id === 'scheduled' && ['scheduled', 'in_service', 'completed'].includes(displayData.status)) ||
                    (step.id === 'in_service' && ['in_service', 'completed'].includes(displayData.status)) ||
                    (step.id === 'completed' && displayData.status === 'completed')
                  );
                  const isCurrent = (
                    (step.id === 'proposed' && displayData.status === 'proposed') ||
                    (step.id === 'paid' && displayData.status === 'awaiting_payment') ||
                    (step.id === 'scheduled' && displayData.status === 'paid') ||
                    (step.id === 'in_service' && displayData.status === 'scheduled') ||
                    (step.id === 'completed' && displayData.status === 'in_service')
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
                  Status: {
                    displayData.status === 'open' ? 'Aguardando Profissional' : 
                    displayData.status === 'proposed' ? 'Orçamento Recebido' :
                    displayData.status === 'awaiting_payment' ? 'Aguardando Pagamento' :
                    displayData.status === 'paid' ? 'Contatos Liberados' :
                    displayData.status === 'scheduled' ? 'Serviço Agendado' : 
                    displayData.status === 'in_service' ? 'Em Execução' :
                    displayData.status === 'completed' ? 'Serviço Finalizado' : 
                    displayData.status === 'cancelled' ? 'Pedido Cancelado' : 'Status Desconhecido'
                  }
                </div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">
                  {displayData.status === 'open' ? 'Solicitação em Análise' : 
                   displayData.status === 'proposed' ? 'Proposta Recebida' :
                   displayData.status === 'awaiting_payment' ? 'Quase lá! Falta o pagamento' :
                   displayData.status === 'paid' ? 'Pagamento Confirmado' :
                   displayData.status === 'scheduled' ? 'Prepare o ambiente!' : 
                   displayData.status === 'in_service' ? 'Mão na massa!' :
                   displayData.status === 'completed' ? 'Missão Cumprida' : 'Aguarde...'}
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                  {displayData.status === 'open' ? 'Sua solicitação foi enviada aos melhores profissionais da região.' : 
                   displayData.status === 'proposed' ? 'Confira o valor e os detalhes do orçamento enviado pelo profissional.' :
                   displayData.status === 'awaiting_payment' ? 'Realize o pagamento da taxa para liberar o chat e agendar o serviço.' :
                   displayData.status === 'paid' ? 'O profissional já pode ver seus dados. Combine os detalhes pelo chat.' :
                   displayData.status === 'scheduled' ? 'O serviço está agendado e o profissional virá na data combinada.' : 
                   displayData.status === 'in_service' ? 'O profissional iniciou a execução do serviço. Acompanhe por aqui.' :
                   displayData.status === 'completed' ? 'O serviço foi finalizado. Não esqueça de avaliar o profissional!' : ''}
                </p>

                {displayData.status === 'completed' && !hasBeenReviewed && (
                  <button 
                    onClick={() => onNavigate('writeReview', {
                      requestId: displayData.id,
                      providerId: displayData.provider_id,
                      providerName: displayData.provider?.full_name,
                      providerAvatar: displayData.provider?.avatar_url,
                      serviceTitle: displayData.title || displayData.category?.name || 'Serviço'
                    })}
                    className="mt-4 w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 animate-bounce"
                  >
                    <span className="material-symbols-outlined">star</span>
                    Avaliar e Finalizar
                  </button>
                )}
              </div>
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

        {/* Condo Access Section (for Client) */}
        {(displayData.status === 'paid' || displayData.status === 'scheduled' || displayData.status === 'in_service' || displayData.status === 'completed') && (
          <div className="px-4 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 border-primary/20 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">shield_person</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white leading-tight">Liberação no Condomínio</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Utilize os dados abaixo na portaria</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Profissional</p>
                  <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{displayData.provider?.full_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">CPF</p>
                  <p className="font-bold text-sm text-slate-700 dark:text-slate-200">
                    {displayData.provider?.profiles_private?.[0]?.cpf || 'Não informado'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Data Nasc.</p>
                  <p className="font-bold text-sm text-slate-700 dark:text-slate-200">
                    {displayData.provider?.profiles_private?.[0]?.birth_date || 'Não informada'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Ordem de Serviço (OS)</p>
                  <p className="font-bold text-sm text-primary">{displayData.display_id}</p>
                </div>
              </div>
            </div>
          </div>
        )}
{/* Service Details */}
        <div className="px-4 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Detalhes do Agendamento</h3>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden shadow-sm">
            <div className="flex items-center gap-4 p-4 border-b border-slate-100 dark:border-slate-700">
                  <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined">{displayData.category?.icon || 'work'}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Serviço / Projeto</p>
                    <p className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                      {displayData.title || displayData.category?.name || 'Carregando...'}
                    </p>
                  </div>
                  {displayData.latitude && displayData.longitude && (
                    <div className="flex gap-2">
                       <button 
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${displayData.latitude},${displayData.longitude}`, '_blank')}
                        className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center hover:bg-emerald-500/20 transition-all"
                        title="Abrir no Google Maps"
                       >
                        <span className="material-symbols-outlined text-xl">map</span>
                       </button>
                       <button 
                        onClick={() => window.open(`google.navigation:q=${displayData.latitude},${displayData.longitude}`, '_blank')}
                        className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center hover:bg-blue-500/20 transition-all"
                        title="Abrir no Waze"
                       >
                        <span className="material-symbols-outlined text-xl">navigation</span>
                       </button>
                    </div>
                  )}
            </div>

            {/* Descrição Detalhada */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição do Pedido</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {(displayData.description || 'Nenhuma descrição detalhada fornecida.')}
              </p>
            </div>

            {/* Galeria de Anexos */}
            {displayData.attachments && displayData.attachments.length > 0 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Anexos ({displayData.attachments.length})</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {displayData.attachments.map((url: string, idx: number) => (
                    <button 
                      key={idx} 
                      onClick={() => setImageModal({ isOpen: true, url })}
                      className="size-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700"
                    >
                      <img src={url} className="w-full h-full object-cover" alt="" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            
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
              {displayData.latitude && displayData.longitude && (
                <button 
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${displayData.latitude},${displayData.longitude}`, '_blank')}
                  className="size-10 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer shrink-0"
                  title="Abrir no Google Maps / Waze"
                >
                  <span className="material-symbols-outlined">map</span>
                </button>
              )}
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

                          // Notificar o prestador que o orçamento foi aceito
                          if (displayData.provider_id) {
                            await supabase.from('notifications').insert({
                              user_id: displayData.provider_id,
                              title: 'Orçamento Aceito!',
                              message: `O cliente aceitou sua proposta para "${displayData.title || 'Serviço'}". Aguardando confirmação do pagamento.`,
                              type: 'status',
                              related_entity_id: request.id
                            });
                          }
                          
                          showToast("Sucesso", "Orçamento aceito! Continue para o pagamento da taxa.", "success");
                          // Recarregar imediatamente para atualizar a UI
                          const { data: updated } = await supabase.from('service_requests').select(`
                            *,
                            provider:profiles!service_requests_provider_id_fkey(
                              id, full_name, avatar_url, rating, 
                              profiles_private(cpf, birth_date)
                            ),
                            category:service_categories(name, icon)
                          `).eq('id', request.id).single();
                          if (updated) setRequest(updated);
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

            {/* Ações do Prestador */}
            {user?.id === displayData.provider_id && (
              <div className="flex flex-col gap-3 mt-4">
                {(displayData.status === 'scheduled' || displayData.status === 'in_service') && (
                  <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">construction</span>
                      O serviço foi finalizado?
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                      Ao clicar em concluir, o cliente será avisado que o trabalho foi entregue e poderá liberar seu pagamento.
                    </p>
                    <button 
                      onClick={async () => {
                        try {
                          const { error } = await supabase
                            .from('service_requests')
                            .update({ status: 'completed' })
                            .eq('id', request.id);
                          if (error) throw error;
                          showToast("Sucesso", "Serviço finalizado! O cliente já pode liberar o pagamento.", "success");
                          // Refresh data
                          const { data: updated } = await supabase.from('service_requests').select(`
                            *,
                            provider:profiles!service_requests_provider_id_fkey(
                              id, full_name, avatar_url, rating, 
                              profiles_private(cpf, birth_date)
                            ),
                            category:service_categories(name, icon)
                          `).eq('id', request.id).single();
                          if (updated) setRequest(updated);
                        } catch (e: any) {
                          showToast("Erro", "Falha ao finalizar serviço.", "error");
                        }
                      }}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">task_alt</span>
                      Finalizar e Avisar Cliente
                    </button>
                  </div>
                )}
                {displayData.status === 'completed' && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 truncate">Serviço finalizado. Aguardando liberação do pagamento pelo cliente.</p>
                  </div>
                )}
              </div>
            )}

            {/* Caso o prestador ainda não tenha enviado orçamento (ou seja um broadcast aberto) */}
            {displayData.status === 'open' && !displayData.provider_id && (
              <div className="mt-4 p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20">
                 <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Enviar sua Proposta</h4>
                 <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">Analise os detalhes acima e envie seu orçamento para este cliente.</p>
                 <button 
                  onClick={() => setBudgetModal({ isOpen: true, amount: '', description: '' })}
                  className="w-full h-12 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                   <span className="material-symbols-outlined">send</span>
                   Enviar Orçamento
                 </button>
              </div>
            )}

            {/* Fluxo de Conclusão e Liberação de Pagamento (Cliente) */}
            {user?.id === displayData.client_id && !hasBeenReviewed && (
              <div className="flex flex-col gap-3 mt-4">
                {displayData.status === 'completed' ? (
                  <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">celebration</span>
                      Serviço finalizado pelo Prestador!
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                      O profissional informou que já concluiu o trabalho. Se estiver tudo OK, confirme para liberar o pagamento.
                    </p>
                    
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={async () => {
                          try {
                            onNavigate('writeReview', {
                              requestId: displayData.id,
                              providerId: displayData.provider_id,
                              providerName: displayData.provider?.full_name,
                              providerAvatar: displayData.provider?.avatar_url,
                              serviceTitle: displayData.title || displayData.category?.name || 'Serviço'
                            });
                          } catch (e: any) {
                            showToast("Erro", "Falha ao finalizar serviço.", "error");
                          }
                        }}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined">payments</span>
                        Confirmar e Liberar Valor
                      </button>

                      <button 
                        onClick={() => onNavigate('helpCenter', { requestId: displayData.id })}
                        className="w-full cursor-pointer bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 font-bold py-3 rounded-xl transition-all text-xs hover:bg-red-500/20 flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">report_problem</span>
                        Tarefa não concluída / Abrir Disputa
                      </button>
                    </div>
                  </div>
                ) : (['paid', 'scheduled', 'in_service'].includes(displayData.status)) ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">hourglass_empty</span>
                      Trabalho em andamento
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                      O valor do serviço está seguro com a KNG. A opção de liberar pagamento aparecerá assim que o profissional finalizar a tarefa.
                    </p>
                    <button 
                      onClick={() => onNavigate('helpCenter', { requestId: displayData.id })}
                      className="w-full cursor-pointer bg-transparent text-slate-400 font-bold py-2 rounded-xl transition-all text-[10px] uppercase tracking-widest hover:text-red-500 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">help</span>
                      Tive um problema / Abrir Disputa
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {hasBeenReviewed && displayData.status === 'completed' && (
              <div className="mt-6 p-6 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-3xl border border-emerald-500/20 flex flex-col items-center text-center">
                 <div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-emerald-500 text-3xl">verified</span>
                 </div>
                 <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">Serviço Concluído e Avaliado</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                   O pagamento foi liberado ao profissional e seu feedback foi registrado. Obrigado por confiar na KNG!
                 </p>
                 <button 
                   onClick={() => onNavigate('home')}
                   className="mt-6 text-sm font-bold text-primary hover:underline"
                 >
                   Voltar para o Início
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
                onClick={() => onNavigate('helpCenter', { requestId: displayData.id })}
                className="w-full h-12 cursor-pointer bg-transparent text-slate-500 hover:text-red-500 font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">help</span>
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
      {/* Image Preview Modal */}
      {imageModal.isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 p-4" onClick={() => setImageModal({ isOpen: false, url: '' })}>
          <button className="absolute top-6 right-6 text-white text-4xl">&times;</button>
          <img src={imageModal.url} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" alt="" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Budget Submission Modal */}
      {budgetModal.isOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Enviar Orçamento</h3>
               <p className="text-xs text-slate-500 mb-6 font-medium italic">"{displayData.title || 'Serviço'}"</p>
               
               <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor do Serviço (Mão de Obra)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                      <input 
                        type="number"
                        placeholder="0,00"
                        value={budgetModal.amount}
                        onChange={(e) => setBudgetModal(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 outline-none focus:border-primary text-lg font-black text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <button 
                    disabled={isSendingBudget || !budgetModal.amount}
                    onClick={async () => {
                      if (!user || !displayData.id) return;
                      setIsSendingBudget(true);
                      try {
                        const amount = parseFloat(budgetModal.amount);
                        const { error } = await supabase
                          .from('service_requests')
                          .update({ 
                            status: 'proposed',
                            budget_amount: amount,
                            provider_id: user.id,
                            budget_description: budgetModal.description
                          })
                          .eq('id', displayData.id);
                        
                        if (error) throw error;
                        
                        // Notificar Cliente
                        await supabase.from('notifications').insert({
                          user_id: displayData.client_id,
                          title: 'Novo Orçamento!',
                          message: `Um profissional enviou um orçamento de ${formatCurrency(amount)} para seu pedido.`,
                          type: 'status',
                          related_entity_id: displayData.id
                        });

                        showToast("Sucesso", "Orçamento enviado com sucesso!", "success");
                        setBudgetModal({ isOpen: false, amount: '', description: '' });
                        
                        // Refresh data
                        const { data: updated } = await supabase.from('service_requests').select(`
                            *,
                            provider:profiles!service_requests_provider_id_fkey(
                              id, full_name, avatar_url, rating, 
                              profiles_private(cpf, birth_date)
                            ),
                            category:service_categories(name, icon)
                          `).eq('id', request.id).single();
                        if (updated) setRequest(updated);

                      } catch (e: any) {
                        showToast("Erro", "Falha ao enviar orçamento.", "error");
                      } finally {
                        setIsSendingBudget(false);
                      }
                    }}
                    className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSendingBudget ? (
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">send</span>
                        Confirmar Envio
                      </>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => setBudgetModal({ isOpen: false, amount: '', description: '' })}
                    className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
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
