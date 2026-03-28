import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { formatCurrency, maskCurrency } from '../lib/formatters';
import { ProviderHeader } from '../components/ProviderHeader';
import PullToRefresh from '../components/PullToRefresh';

type Tab = 'Novos' | 'Orçados' | 'Aprovados' | 'Agendados' | 'Finalizados' | 'Recusados';

export default function ProviderRequestsScreen({ onNavigate, params }: NavigationProps) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(
    (params?.tab as Tab) || 'Novos'
  );
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const tabs: Tab[] = ['Novos', 'Orçados', 'Aprovados', 'Agendados', 'Finalizados', 'Recusados'];

  // Custom Modals State
  const [budgetModal, setBudgetModal] = useState<{ isOpen: boolean, requestId: string | null, requestTitle: string, currentAmount: string }>({ 
    isOpen: false, requestId: null, requestTitle: '', currentAmount: '' 
  });
  const [scheduleModal, setScheduleModal] = useState<{ isOpen: boolean, requestId: string | null, requestTitle: string, date: string, time: string }>({
    isOpen: false, requestId: null, requestTitle: '', date: '', time: '09:00'
  });
  const [detailsModal, setDetailsModal] = useState<{ isOpen: boolean, request: any | null }>({
    isOpen: false, request: null
  });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, requestId: string | null, action: 'cancel' | 'dismiss' | null }>({
    isOpen: false, requestId: null, action: null
  });
  const [imageModal, setImageModal] = useState<{ isOpen: boolean, url: string }>({
    isOpen: false, url: ''
  });
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('service_requests')
        .select(`
          id,
          title,
          description,
          status,
          created_at,
          client_id,
          category_id,
          budget_amount,
          street,
          number,
          neighborhood,
          city,
          state,
          cep,
          address_complement,
          desired_date,
          attachments,
          rejection_reason,
          profiles!service_requests_client_id_fkey(full_name, avatar_url),
          service_categories(name, icon)
        `)
        .order('created_at', { ascending: false });

      let expectedStatuses: string[] = [];

      switch (activeTab) {
        case 'Novos':
          expectedStatuses = ['open'];
          const { data: profData } = await supabase.from('profiles').select('categories').eq('id', user.id).maybeSingle();
          const myCats = profData?.categories || [];
          
          // Buscar IDs das categorias
          const { data: catData } = await supabase.from('service_categories').select('id, name');
          let catIds: string[] = [];
          if (catData) {
            catIds = catData.filter(c => myCats.includes(c.name)).map(c => c.id);
          }

          // Buscar ordens que eu já recusei/ocultei
          const { data: dismissalData } = await supabase.from('provider_dismissals')
            .select('order_id')
            .eq('provider_id', user.id)
            .eq('order_type', 'service');
          const dismissedIds = dismissalData?.map(d => d.order_id) || [];

          if (catIds.length > 0) {
            query = query.eq('status', 'open')
              .or(`provider_id.eq.${user.id},and(provider_id.is.null,category_id.in.(${catIds.join(',')}))`);
          } else {
            query = query.eq('status', 'open').eq('provider_id', user.id);
          }

          // Filtrar as ocultadas manualmente se for broadcast
          if (dismissedIds.length > 0) {
            query = query.not('id', 'in', `(${dismissedIds.join(',')})`);
          }
          break;

        case 'Recusados':
          expectedStatuses = ['cancelled'];
          
          // 1. Minhas recusas diretas (status = cancelled e provider_id = eu)
          // 2. Broadcasts que eu ocultei (id está em provider_dismissals)
          const { data: myDismissals } = await supabase.from('provider_dismissals')
            .select('order_id')
            .eq('provider_id', user.id)
            .eq('order_type', 'service');
          const myDismissedIds = myDismissals?.map(d => d.order_id) || [];

          if (myDismissedIds.length > 0) {
            query = query.or(`and(status.eq.cancelled,provider_id.eq.${user.id}),id.in.(${myDismissedIds.join(',')})`);
          } else {
            query = query.eq('status', 'cancelled').eq('provider_id', user.id);
          }
          break;

        case 'Orçados':
          // Awaiting client approval OR payment
          expectedStatuses = ['proposed', 'awaiting_payment'];
          query = query.in('status', ['proposed', 'awaiting_payment']).eq('provider_id', user.id);
          break;

        case 'Aprovados':
          // Approved by client (paid or accepted), needs scheduling
          expectedStatuses = ['accepted', 'paid'];
          query = query.in('status', ['accepted', 'paid']).eq('provider_id', user.id);
          break;

        case 'Agendados':
          expectedStatuses = ['scheduled'];
          query = query.eq('status', 'scheduled').eq('provider_id', user.id);
          break;

        case 'Finalizados':
          expectedStatuses = ['completed'];
          query = query.eq('status', 'completed').eq('provider_id', user.id);
          break;
        
        default:
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Secondary JS-side filter as a safety guard to prevent any leakage
      const filteredData = (data || []).filter((req: any) => {
        if (expectedStatuses.length > 0) {
          return expectedStatuses.includes(req.status);
        }
        return true;
      });

      setRequests(filteredData);
    } catch (err: any) {
      console.error("Error fetching requests:", err);
      showToast('Erro ao carregar serviços: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params?.tab && params.tab !== activeTab) {
      setActiveTab(params.tab as Tab);
    }
  }, [params?.tab]);

  useEffect(() => {
    fetchRequests();

    // Iniciar canal de real-time para atualizar a lista automaticamente
    const channel = supabase.channel('requests_list_updates')
      .on('postgres_changes', {
        event: '*', // Listen to INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'service_requests'
      }, () => {
        // Debounce or just fetch again. For simplicity, we fetch again.
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, user]);

  const handleOpenChat = async (req: any) => {
    if (!user) return;
    try {
      let { data: room } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('request_id', req.id)
        .single();
        
      if (!room) {
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
      
      // If the request has no provider_id assigned (it was a broadcast), assign it to the current user
      // but DO NOT change the status to 'proposed' yet. It should stay 'open' until a budget is sent.
      if (req.status === 'open' && !req.provider_id) {
        const { error: updateError } = await supabase
          .from('service_requests')
          .update({ 
            provider_id: user.id 
          })
          .eq('id', req.id);
        
        if (updateError) throw updateError;
        fetchRequests();
      }

      onNavigate('chat', { 
        roomId: room.id, 
        opponentName: req.profiles?.full_name || 'Cliente', 
        opponentAvatar: req.profiles?.avatar_url,
        requestId: req.id
      });
    } catch (err: any) {
      console.error("Error opening chat:", err);
      showToast("Erro ao abrir chat: " + err.message, "error");
    }
  };

  const handleRequestRecusar = (id: string, isDirect: boolean) => {
    setConfirmModal({ 
      isOpen: true, 
      requestId: id, 
      action: isDirect ? 'cancel' : 'dismiss' 
    });
  };

  const confirmRecusar = async () => {
    if (!confirmModal.requestId || !user) return;
    
    setIsSubmitting(true);
    try {
      if (confirmModal.action === 'cancel') {
        // Recusa direta (status do pedido)
        const { data: requestData } = await supabase
          .from('service_requests')
          .select('client_id, title')
          .eq('id', confirmModal.requestId)
          .single();

        const { error } = await supabase
          .from('service_requests')
          .update({ 
            status: 'cancelled',
            rejection_reason: rejectionReason || null 
          })
          .eq('id', confirmModal.requestId);
        
        if (error) throw error;
      } else {
        // Rejeição de broadcast (ocultar)
        const { error } = await supabase
          .from('provider_dismissals')
          .insert({
            provider_id: user.id,
            order_id: confirmModal.requestId,
            order_type: 'service'
          });
        
        if (error) throw error;
      }

      showToast('Pedido movido para recusados', 'success');
      setConfirmModal({ isOpen: false, requestId: null, action: null });
      setRejectionReason(''); // Limpar motivo
      fetchRequests();
    } catch (error: any) {
      showToast(error.message || 'Erro ao processar recusa', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;
      fetchRequests();
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao atualizar status: ' + err.message, 'error');
    }
  };



  const handleSendBudget = (id: string, currentAmount?: number, title?: string) => {
    setBudgetModal({
      isOpen: true,
      requestId: id,
      requestTitle: title || 'Serviço',
      currentAmount: currentAmount ? formatCurrency(currentAmount) : ''
    });
  };

  const confirmSendBudget = async () => {
    if (!budgetModal.requestId) return;
    const rawValue = budgetModal.currentAmount.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    const amount = parseFloat(rawValue);
    
    if (isNaN(amount) || amount <= 0) {
      showToast('Por favor, insira um valor válido.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('service_requests')
        .update({ 
          status: 'proposed', 
          budget_amount: amount,
          provider_id: user?.id
        })
        .eq('id', budgetModal.requestId);

      if (error) throw error;
      
      // Notify client
      await supabase.from('notifications').insert({
        user_id: requests.find(r => r.id === budgetModal.requestId)?.client_id,
        title: 'Orçamento Recebido',
        message: `O profissional enviou um orçamento de ${formatCurrency(amount)} para o seu pedido.`,
        type: 'order',
        related_entity_id: budgetModal.requestId
      });

      showToast('Orçamento enviado com sucesso!', 'success');
      setBudgetModal({ isOpen: false, requestId: null, requestTitle: '', currentAmount: '' });
      
      // Delay de 500ms para garantir que a transação do Supabase foi processada em todos os nós
      // antes de recarregar a lista na nova aba.
      setTimeout(() => {
        setActiveTab('Orçados');
        fetchRequests();
      }, 500);
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao enviar orçamento: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleService = (id: string, title?: string) => {
    setScheduleModal({
      isOpen: true,
      requestId: id,
      requestTitle: title || 'Serviço',
      date: new Date().toISOString().split('T')[0],
      time: '09:00'
    });
  };

  const confirmScheduleService = async () => {
    if (!scheduleModal.requestId) return;
    if (!scheduleModal.date || !scheduleModal.time) {
      showToast('Por favor, informe a data e o horário.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const scheduledAt = `${scheduleModal.date}T${scheduleModal.time}:00`;
      const { error } = await supabase
        .from('service_requests')
        .update({ 
            status: 'scheduled',
            delivery_deadline: scheduledAt
        })
        .eq('id', scheduleModal.requestId);

      if (error) throw error;
      
      showToast('Serviço agendado com sucesso!', 'success');
      setScheduleModal({ isOpen: false, requestId: null, requestTitle: '', date: '', time: '09:00' });
      // Changing tab triggers useEffect re-fetch automatically
      setActiveTab('Agendados');
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao agendar serviço: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    'open': { label: 'Novo Pedido', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    'proposed': { label: 'Orçamento Enviado', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    'accepted': { label: 'Aprovado ✓', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
    'quoted': { label: 'Orçamento Enviado', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    'awaiting_payment': { label: 'Aguardando Pagamento', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
    'scheduled': { label: 'Agendado ✓', color: 'bg-primary text-white border-primary/20 shadow-sm' },
    'paid': { label: 'Pago', color: 'bg-emerald-600 text-white' },
    'in_service': { label: 'Em Execução...', color: 'bg-primary animate-pulse text-white' },
    'completed': { label: 'Finalizado', color: 'bg-slate-500 text-white' },
    'cancelled': { label: 'Cancelado', color: 'bg-red-500 text-white' }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden">
      <div className="relative flex min-h-screen w-full flex-col bg-white dark:bg-slate-900 shadow-xl overflow-x-hidden">

      {/* Header & Tabs */}
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <ProviderHeader 
          title="Serviços" 
          onBack={() => onNavigate('dashboard')} 
          onNavigate={onNavigate} 
        />
        
        {/* Status Tabs */}
        <div className="flex justify-center px-4 overflow-x-auto no-scrollbar gap-6 sm:gap-12 max-w-7xl mx-auto">
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

      {/* Budget Modal */}
      {budgetModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-2xl">payments</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">Enviar Orçamento</h3>
                  <p className="text-xs text-slate-500 font-medium line-clamp-1">{budgetModal.requestTitle}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Valor do Serviço (R$)</label>
                  <div className="relative">

                    <input 
                      type="text"
                      inputMode="decimal"
                      autoFocus
                      required
                      value={budgetModal.currentAmount}
                      onChange={(e) => {
                        const val = maskCurrency(e.target.value);
                        setBudgetModal(prev => ({ ...prev, currentAmount: val }))
                      }}
                      placeholder="0,00"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-lg text-slate-900 dark:text-slate-100 focus:border-primary transition-colors outline-none"
                    />
                  </div>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200/50 dark:border-amber-700/30">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed font-bold">
                    <span className="material-symbols-outlined text-[14px] align-middle mr-1">info</span> 
                    Lembre-se que o cliente pagará uma taxa de R$ 9,90 para liberar o contato direto após aprovar este orçamento.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <button 
                onClick={() => setBudgetModal({ isOpen: false, requestId: null, requestTitle: '', currentAmount: '' })}
                className="flex-1 py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmSendBudget}
                disabled={isSubmitting}
                className="flex-[1.5] py-3.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                ) : (
                  <>
                    <span>Confirmar</span>
                    <span className="material-symbols-outlined text-lg">send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-orange-500 text-2xl">calendar_today</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">Agendar Serviço</h3>
                  <p className="text-xs text-slate-500 font-medium line-clamp-1">{scheduleModal.requestTitle}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Data</label>
                    <input 
                      type="date"
                      value={scheduleModal.date}
                      onChange={(e) => setScheduleModal(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-sm text-slate-900 dark:text-slate-100 focus:border-orange-500 transition-colors outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Horário</label>
                    <input 
                      type="time"
                      value={scheduleModal.time}
                      onChange={(e) => setScheduleModal(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold text-sm text-slate-900 dark:text-slate-100 focus:border-orange-500 transition-colors outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <button 
                onClick={() => setScheduleModal({ isOpen: false, requestId: null, requestTitle: '', date: '', time: '09:00' })}
                className="flex-1 py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmScheduleService}
                disabled={isSubmitting}
                className="flex-[1.5] py-3.5 bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                ) : (
                  <>
                    <span>Agendar</span>
                    <span className="material-symbols-outlined text-lg">done</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Content */}
        <PullToRefresh>
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 w-full max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-slate-900 dark:text-white text-lg font-bold">
                {loading ? 'Carregando...' : `${activeTab} (${requests.length})`}
              </h3>
              <button className="text-sm text-primary font-medium hover:underline">Ver mapa</button>
            </div>

          {!loading && requests.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {requests.map(req => (
                <div key={req.id} className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all hover:shadow-md">
                  <div className="p-4 flex flex-col h-full">
                    <div className="flex gap-4 items-start flex-1">
                      <div className="w-16 h-16 rounded-lg bg-cover bg-center shrink-0 border border-slate-100 dark:border-slate-800" style={{ backgroundImage: `url('${req.profiles?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}')` }}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-slate-900 dark:text-white text-lg font-black tracking-tight truncate">{req.profiles?.full_name || 'Cliente'}</p>
                           <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shrink-0 ${statusMap[req.status]?.color || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {statusMap[req.status]?.label || req.status}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1">
                            <span className="material-symbols-outlined text-[18px] text-primary">{req.service_categories?.icon || 'work'}</span>
                            <span className="font-bold border-b border-primary/20">{req.service_categories?.name || 'Serviço'}</span>
                          </p>
                          {req.attachments && Array.isArray(req.attachments) && req.attachments.length > 0 && (
                             <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-lg border border-primary/20">
                               <span className="material-symbols-outlined text-sm">photo_library</span>
                               <span className="text-[10px] font-black uppercase tracking-widest">{req.attachments.length} {req.attachments.length === 1 ? 'Foto' : 'Fotos'}</span>
                             </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Endereço e Datas alinhados à esquerda (fora do flex lateral anterior) */}
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">location_on</span>
                        <p className="text-slate-700 dark:text-slate-200 text-sm font-medium leading-relaxed">
                          {req.street ? `${req.street}, ${req.number || 'S/N'}` : 'Local não informado'}
                          {req.neighborhood && <><br /><span className="text-slate-400 font-normal">{req.neighborhood}</span></>}
                          {req.city && <><br /><span className="text-slate-400 font-normal">{req.city} - {req.state || ''}</span></>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                        <span className="material-symbols-outlined text-slate-400 text-[18px]">event</span>
                        <p className="text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-widest">
                          Publicado: {new Date(req.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    {req.desired_date && (
                      <div className="mt-4 p-3 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-center shadow-sm">
                         <div className="size-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-orange-500">schedule</span>
                         </div>
                         <div className="ml-3">
                           <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Preferência do Cliente</p>
                           <p className="text-sm font-black text-slate-800 dark:text-orange-100">
                             {new Date(req.desired_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                           </p>
                         </div>
                      </div>
                    )}

                    <div className="mt-4 bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex-1 relative group/desc">
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line line-clamp-2">
                        {(req.description || 'Sem descrição.').split('📅 Preferência de Horário:')[0].trim()}
                      </p>
                      <button 
                        onClick={() => setDetailsModal({ isOpen: true, request: req })}
                        className="mt-3 text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:underline"
                      >
                        Visualizar Pedido Completo
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                      </button>
                    </div>

                    {activeTab === 'Novos' && (
                      <div className="mt-4 flex flex-col gap-2">
                        <button
                          onClick={() => handleSendBudget(req.id, req.budget_amount, req.title)}
                          className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all">
                          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                          {req.budget_amount > 0 ? 'Alterar Valor do Orçamento' : 'Enviar Valor do Orçamento'}
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenChat(req)}
                            className="flex-1 cursor-pointer flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">chat</span>
                            Conversar
                          </button>
                          <button 
                            onClick={() => handleRequestRecusar(req.id, req.provider_id !== null)}
                            className="w-24 cursor-pointer flex items-center justify-center rounded-lg h-10 px-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-500 text-sm font-bold border border-red-200 dark:border-red-800/30">
                            Recusar
                          </button>
                        </div>
                      </div>
                    )}

                     {activeTab === 'Recusados' && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
                        <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Motivo da Recusa:</p>
                        <p className="text-sm text-red-700 dark:text-red-300 font-medium italic">
                          "{req.rejection_reason || 'Nenhum motivo informado.'}"
                        </p>
                      </div>
                    )}

                    {activeTab === 'Orçados' && (
                      <div className="mt-4 flex flex-col gap-2">
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800/30 flex items-center gap-2">
                          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">sync</span>
                          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Aguardando aprovação do cliente...</p>
                        </div>
                        <div className="flex gap-2">
                          <p className="flex-1 text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                            {req.budget_amount ? formatCurrency(req.budget_amount) : 'Valor não informado'}
                          </p>
                          <button
                            onClick={() => handleOpenChat(req)}
                            className="flex-1 cursor-pointer flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-500 text-sm font-bold border border-emerald-200 dark:border-emerald-800/30">
                            <span className="material-symbols-outlined text-[18px]">chat</span>
                            Conversar
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'Aprovados' && (
                      <div className="mt-4 flex flex-col gap-2">
                        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/30 flex items-center gap-2">
                          <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-[20px]">check_circle</span>
                          <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium font-bold uppercase">Cliente Aprovou o Orçamento!</p>
                        </div>
                        <button
                          onClick={() => handleScheduleService(req.id, req.title)}
                          className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all">
                          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                          Agendar Data/Hora
                        </button>
                        <button
                          onClick={() => handleOpenChat(req)}
                          className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold border border-slate-200 dark:border-slate-700">
                          <span className="material-symbols-outlined text-[18px]">chat</span>
                          Falar com Cliente
                        </button>
                      </div>
                    )}

                    {activeTab === 'Agendados' && (
                      <div className="mt-4 flex flex-col gap-2">
                        <button
                          onClick={() => updateRequestStatus(req.id, 'completed')}
                          className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-md shadow-emerald-500/20">
                          <span className="material-symbols-outlined text-[18px]">task_alt</span>
                          Finalizar Serviço
                        </button>
                        <button
                          onClick={() => handleOpenChat(req)}
                          className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold border border-slate-200 dark:border-slate-700">
                          <span className="material-symbols-outlined text-[18px]">chat</span>
                          Avisar algo ao Cliente
                        </button>
                      </div>
                    )}

                    {activeTab === 'Finalizados' && (
                      <div className="mt-4">
                        <p className="text-xs text-slate-400 dark:text-slate-500 text-center italic">Pedido finalizado em {new Date(req.updated_at || req.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                    )}

                  </div>
                </div>
              ))}
            </div>
          ) : !loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
              <span className="material-symbols-outlined text-6xl mb-4 opacity-50">auto_stories</span>
              <p className="text-lg font-bold">Nenhum pedido nesta fase.</p>
              <p className="text-sm">Acompanhe sua esteira de trabalho para não perder prazos.</p>
            </div>
          ) : null}

          <div className="h-24"></div> {/* Spacer for BottomNav */}
        </div>
      </PullToRefresh>

        {/* Details Modal */}
        {detailsModal.isOpen && detailsModal.request && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl bg-white dark:bg-slate-900 md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
              
              {/* Header */}
              <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setDetailsModal({ isOpen: false, request: null })}
                    className="md:hidden size-10 flex items-center justify-center text-slate-400"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-2xl">{detailsModal.request.service_categories?.icon || 'work'}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tighter truncate">
                      {detailsModal.request.profiles?.full_name || 'Detalhes do Pedido'}
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Orçamento para {detailsModal.request.service_categories?.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDetailsModal({ isOpen: false, request: null })}
                  className="hidden md:flex size-10 items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">
                
                {/* 1. Descrição */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="size-2 bg-primary rounded-full"></span>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Descrição do Serviço</h4>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                    <p className="text-lg text-slate-800 dark:text-slate-200 font-medium leading-relaxed whitespace-pre-line">
                      {(detailsModal.request.description || 'Nenhuma descrição detalhada fornecida.').split('📅 Preferência de Horário:')[0].trim()}
                    </p>
                  </div>
                </section>

                {/* 2. Fotos */}
                {detailsModal.request.attachments && detailsModal.request.attachments.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="size-2 bg-amber-500 rounded-full"></span>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Anexos ({detailsModal.request.attachments.length})</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      {detailsModal.request.attachments.map((url: string, idx: number) => (
                        <button 
                          key={idx} 
                          onClick={() => setImageModal({ isOpen: true, url })}
                          className="aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 hover:ring-4 hover:ring-primary/20 transition-all group"
                        >
                          <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={`Anexo ${idx + 1}`} />
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* 3. Informações de Agendamento e Local */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="size-2 bg-orange-500 rounded-full"></span>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Preferência de Horário</h4>
                    </div>
                    <div className="bg-orange-500/5 border border-orange-500/10 p-6 rounded-3xl flex items-center gap-4">
                      <div className="size-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">event_available</span>
                      </div>
                      <div>
                        <p className="text-xl font-black text-slate-900 dark:text-white">
                          {detailsModal.request.desired_date ? new Date(detailsModal.request.desired_date).toLocaleDateString('pt-BR') : 'A combinar'}
                        </p>
                        <p className="text-sm font-bold text-orange-500 uppercase tracking-widest">
                          {detailsModal.request.desired_date ? new Date(detailsModal.request.desired_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Qualquer horário'}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="size-2 bg-emerald-500 rounded-full"></span>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Endereço Completo</h4>
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl space-y-2">
                       <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                         {detailsModal.request.street}, {detailsModal.request.number || 'S/N'}
                       </p>
                       <p className="text-base font-bold text-slate-600 dark:text-slate-300">
                         {detailsModal.request.neighborhood}
                       </p>
                       <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">
                         {detailsModal.request.city} - {detailsModal.request.state} | CEP: {detailsModal.request.cep}
                       </p>
                       {detailsModal.request.address_complement && (
                         <div className="mt-3 pt-3 border-t border-emerald-500/20 italic text-xs text-emerald-600 dark:text-emerald-400">
                           Complemento: {detailsModal.request.address_complement}
                         </div>
                       )}
                    </div>
                  </section>
                </div>

                <div className="h-10 md:h-0"></div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-3">
                 {detailsModal.request.status === 'open' && (
                   <button 
                     onClick={() => {
                       handleSendBudget(detailsModal.request.id, detailsModal.request.budget_amount, detailsModal.request.title);
                       setDetailsModal({ isOpen: false, request: null });
                     }}
                     className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                     <span className="material-symbols-outlined">receipt_long</span>
                     Enviar Orçamento
                   </button>
                 )}
                 <button 
                   onClick={() => {
                     handleOpenChat(detailsModal.request);
                     setDetailsModal({ isOpen: false, request: null });
                   }}
                   className="flex-1 py-4 bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2"
                 >
                   <span className="material-symbols-outlined">chat</span>
                   Abrir Chat
                 </button>
              </div>

            </div>
          </div>
        )}

        {/* Confirm Recusal Modal */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
              <div className="p-6 text-center">
                <div className="size-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-red-600 text-3xl">delete_forever</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Recusar Pedido?</h3>
                <p className="text-sm text-slate-500 font-medium mb-4">
                  {confirmModal.action === 'cancel' 
                    ? "Esta ação informará ao cliente que você não pode atender este pedido agora."
                    : "Esta oportunidade será removida da sua lista e movida para o histórico de recusados."}
                </p>
                
                {confirmModal.action === 'cancel' && (
                  <div className="mb-6">
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Motivo da recusa (opcional)..."
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 outline-none transition-all resize-none h-24"
                    />
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest italic">Este motivo será enviado ao cliente.</p>
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={confirmRecusar}
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="animate-spin size-4 border-2 border-white/30 border-t-white rounded-full" />
                    ) : 'Confirmar Recusa'}
                  </button>
                  <button 
                    onClick={() => setConfirmModal({ isOpen: false, requestId: null, action: null })}
                    className="w-full py-3.5 text-slate-500 font-bold text-xs"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Viewer Modal */}
        {imageModal.isOpen && (
          <div 
            className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300"
            onClick={() => setImageModal({ isOpen: false, url: '' })}
          >
            <button 
              className="absolute top-6 right-6 size-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-50"
              onClick={() => setImageModal({ isOpen: false, url: '' })}
            >
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
            <div 
              className="relative w-full h-full flex items-center justify-center p-4 md:p-12"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={imageModal.url} 
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
                alt="Visualização ampliada" 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
