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

  const fetchOrder = async () => {
    if (!params?.orderId) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.from('freelance_orders').select(`
        *,
        provider:profiles!freelance_orders_assigned_provider_id_fkey(
          id, full_name, avatar_url, rating, 
          profiles_private(cpf, birth_date)
        ),
        client:profiles!freelance_orders_client_id_fkey(id, full_name, avatar_url),
        category:service_categories(name, icon)
      `).eq('id', params.orderId).single();
      
      if (data) {
        setOrder(data);
        if (data.status === 'completed' && user?.id === data.client_id) {
          const { data: rev } = await supabase.from('reviews').select('id').eq('freelance_order_id', params.orderId).maybeSingle();
          setHasReviewed(!!rev);
        }
      }
    } catch (err: any) {
      console.error("Erro ao buscar freelance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const sub = supabase.channel(`freelance_${params?.orderId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'freelance_orders', filter: `id=eq.${params.orderId}` }, () => fetchOrder()).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [params?.orderId]);

  if (loading && params?.orderId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  const displayData = order || { title: 'Carregando...', status: 'open', budget: 0 };
  const isClient = user?.id === displayData.client_id;
  const isProvider = user?.id === displayData.assigned_provider_id;

  return (
    <div className="bg-slate-950 font-display text-slate-100 min-h-screen lg:h-screen flex flex-col antialiased overflow-hidden">
      
      {/* Header */}
      <header className="h-14 lg:h-20 shrink-0 flex items-center justify-between px-4 lg:px-8 bg-slate-900 border-b border-white/5 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('home')} className="size-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-slate-400">arrow_back</span>
          </button>
          <div>
            <p className="text-[10px] font-black text-primary uppercase tracking-[2px] mb-1 leading-none">Freelance Workspace</p>
            <h1 className="text-sm lg:text-xl font-black text-white uppercase tracking-tighter italic leading-none">{displayData.title || 'Freelance'}</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto lg:overflow-hidden p-4 lg:p-8">
        <div className="max-w-[1600px] mx-auto h-full">
          <div className="flex flex-col lg:grid lg:grid-cols-[1.2fr_0.8fr] gap-8 h-full">
            
            {/* COLUNA ESQUERDA: INFOS E AÇÕES */}
            <div className="flex flex-col gap-6 h-full overflow-y-auto no-scrollbar pb-24 lg:pb-0">
               
               {/* Centro de Ação Próximo Passo */}
               <div className="bg-slate-900 rounded-[32px] p-6 lg:p-10 border border-white/5 shadow-2xl relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                    <span className="material-symbols-outlined text-[140px] italic">rocket_launch</span>
                  </div>
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="px-4 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-4">
                       {displayData.status === 'open' ? 'Em Leilão' : 
                        displayData.status === 'awaiting_payment' ? 'Pendente de Pagamento' :
                        displayData.status === 'paid' ? 'Contrato Garantido' : 
                        displayData.status === 'scheduled' ? 'Agendado' :
                        displayData.status === 'in_service' ? 'Desenvolvimento' : 'Finalizado'}
                    </div>
                    <h2 className="text-2xl lg:text-4xl font-black text-white uppercase tracking-tighter italic leading-tight mb-3">
                      {displayData.status === 'open' ? 'Aguardando Lances' : 
                       displayData.status === 'awaiting_payment' ? (isClient ? 'Profissional Escolhido' : 'Você Venceu o Leilão!') :
                       displayData.status === 'paid' ? (isClient ? 'Tudo Pronto para Iniciar' : 'Mãos à Obra!') :
                       displayData.status === 'scheduled' ? 'Cronograma Definido' : 
                       displayData.status === 'in_service' ? 'Execução Técnica' : 'Freelance Entregue'}
                    </h2>
                    <p className="text-sm text-slate-400 max-w-sm mb-8 font-medium leading-relaxed">
                       {displayData.status === 'open' ? (isClient ? 'Especialistas estão enviando propostas para o seu projeto agora.' : 'Analise os requisitos e lance sua melhor oferta para o cliente.') : 
                        displayData.status === 'awaiting_payment' ? (isClient ? 'Realize o pagamento para que o profissional possa garantir sua vaga e agendar.' : 'O cliente aceitou seu lance! Ele está agora processando o pagamento da garantia.') :
                        displayData.status === 'paid' ? (isClient ? 'O pagamento foi confirmado. O profissional irá agendar o início do trabalho em breve.' : 'O valor já está seguro com a KNG. Agende agora o início da execução.') :
                        displayData.status === 'scheduled' ? (isClient ? 'O cronograma foi definido. Você receberá atualizações constantes por aqui.' : 'Tudo certo. No horário combinado, basta clicar em Iniciar Trabalho.') : ''}
                    </p>

                    <div className="w-full max-w-sm space-y-4">
                       {isClient && (
                         <>
                            {displayData.status === 'awaiting_payment' && (
                              <button onClick={() => onNavigate('checkout', { freelanceOrderId: displayData.id })} className="w-full h-14 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">payments</span> Ir para Pagamento
                              </button>
                            )}
                            {displayData.status === 'completed' && !hasReviewed && (
                               <button onClick={() => onNavigate('writeReview', { requestId: displayData.id, providerId: displayData.assigned_provider_id, providerName: displayData.provider?.full_name, isFreelance: true })} className="w-full h-14 bg-amber-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">star</span> Avaliar e Liberar
                               </button>
                            )}
                         </>
                       )}

                       {isProvider && (
                         <>
                            {displayData.status === 'paid' && (
                               <button onClick={() => setScheduleModal({ isOpen: true, date: new Date().toISOString().split('T')[0], time: '09:00' })} className="w-full h-14 bg-orange-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2 animate-bounce">
                                <span className="material-symbols-outlined">calendar_month</span> Agendar Serviço
                               </button>
                            )}
                            {displayData.status === 'scheduled' && (
                               <button onClick={async () => {
                                 await supabase.rpc('advance_freelance_status', { order_id: displayData.id, new_status: 'in_service' });
                                 showToast("Sucesso", "Trabalho iniciado!", "success");
                                 fetchOrder();
                               }} className="w-full h-14 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">play_arrow</span> Começar Trabalho Agora
                               </button>
                            )}
                            {displayData.status === 'in_service' && (
                               <button onClick={async () => {
                                 await supabase.rpc('advance_freelance_status', { order_id: displayData.id, new_status: 'completed' });
                                 showToast("Sucesso", "Trabalho finalizado!", "success");
                                 fetchOrder();
                               }} className="w-full h-14 bg-emerald-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">task_alt</span> Finalizar e Entregar
                               </button>
                            )}
                         </>
                       )}

                       {displayData.assigned_provider_id && (
                         <button onClick={async () => {
                             const { data: room } = await supabase.from('chat_rooms').select('id').eq('freelance_order_id', displayData.id).single();
                             onNavigate('chat', { roomId: room?.id, freelanceOrderId: displayData.id, opponentId: isClient ? displayData.assigned_provider_id : displayData.client_id, opponentName: isClient ? displayData.provider?.full_name : displayData.client?.full_name });
                         }} className="w-full h-12 bg-white/5 text-slate-300 font-bold rounded-2xl flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined">chat</span> Abrir Chat do Freelance
                         </button>
                       )}
                    </div>
                  </div>
               </div>

               {/* Grid de Detalhes */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 p-4 rounded-[24px] border border-white/5 flex items-center gap-4">
                     <div className="size-16 rounded-full bg-slate-800 overflow-hidden border-2 border-white/5">
                        <img src={isClient ? (displayData.provider?.avatar_url || "#") : (displayData.client?.avatar_url || "#")} className="w-full h-full object-cover" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{isClient ? 'Especialista' : 'Cliente'}</p>
                        <h3 className="font-black text-white uppercase tracking-tighter italic">{isClient ? displayData.provider?.full_name : displayData.client?.full_name}</h3>
                     </div>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-[24px] border border-white/5 flex flex-col justify-center">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Orçamento do Freelance</p>
                     <p className="text-xl font-black text-white uppercase tracking-tighter italic">{formatCurrency(displayData.budget || 0)}</p>
                  </div>
               </div>

               <div className="bg-slate-900/50 rounded-[28px] border border-white/5 overflow-hidden p-6 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                     <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">{displayData.category?.icon}</span>
                        <h4 className="font-black text-white uppercase tracking-tighter italic">{displayData.title || displayData.category?.name}</h4>
                     </div>
                     <button onClick={() => {
                        const address = `${displayData.street}, ${displayData.number}, ${displayData.neighborhood}, ${displayData.city} - ${displayData.state}`;
                        const url = displayData.latitude && displayData.longitude 
                          ? `https://www.google.com/maps/search/?api=1&query=${displayData.latitude},${displayData.longitude}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                        window.open(url, '_blank');
                     }} className="h-10 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center gap-2 text-emerald-500 transition-colors border border-emerald-500/20">
                        <span className="material-symbols-outlined text-sm">near_me</span>
                        <span className="text-[9px] font-black uppercase tracking-widest">Localizar</span>
                     </button>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed italic">"{displayData.description || 'Nenhuma descrição detalhada.'}"</p>
                  {displayData.attachments?.length > 0 && (
                     <div className="flex gap-3 overflow-x-auto no-scrollbar pt-2">
                        {displayData.attachments.map((u: string, i: number) => (
                           <button key={i} onClick={() => setImageModal({ isOpen: true, url: u })} className="size-24 rounded-2xl overflow-hidden shrink-0 border border-white/10">
                              <img src={u} className="w-full h-full object-cover" />
                           </button>
                        ))}
                     </div>
                  )}
               </div>
            </div>

            {/* COLUNA DIREITA: ROADMAP (STEPPER) */}
            <div className="hidden lg:flex flex-col bg-slate-900 rounded-[40px] border border-white/5 p-10 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
               <div className="relative z-10 h-full flex flex-col">
                  <div className="mb-12">
                     <p className="text-xs font-black text-primary uppercase tracking-[4px] mb-2 leading-none">Freelance workflow</p>
                     <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Roteiro Técnico</h2>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-2 max-w-sm mx-auto w-full">
                     {[
                       { label: 'Leilão', icon: 'gavel', status: ['open', 'awaiting_payment', 'paid', 'scheduled', 'in_service', 'completed'] },
                       { label: 'Garantia', icon: 'payments', status: ['awaiting_payment', 'paid', 'scheduled', 'in_service', 'completed'] },
                       { label: 'Agenda', icon: 'calendar_today', status: ['scheduled', 'in_service', 'completed'] },
                       { label: 'Execução', icon: 'construction', status: ['in_service', 'completed'] },
                       { label: 'Entrega', icon: 'verified', status: ['completed'] }
                     ].map((step, idx, arr) => {
                       const isDone = step.status.includes(displayData.status);
                       return (
                         <div key={idx} className="flex items-center gap-8 relative group">
                            {idx !== arr.length - 1 && <div className="absolute left-7 top-14 bottom-0 w-1 bg-slate-800" />}
                            <div className={`size-14 rounded-[20px] flex items-center justify-center shrink-0 border-2 z-10 shadow-2xl ${isDone ? 'bg-primary border-primary text-white' : 'bg-slate-800 border-slate-700 text-slate-600'}`}>
                               <span className="material-symbols-outlined text-2xl">{isDone ? 'check' : step.icon}</span>
                            </div>
                            <div>
                               <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDone ? 'text-primary' : 'text-slate-600'}`}>Passo {idx+1}</p>
                               <h4 className={`text-xl font-black uppercase tracking-tighter italic leading-none ${isDone ? 'text-white' : 'text-slate-700'}`}>{step.label}</h4>
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

      {/* Modals */}
      {scheduleModal.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
           <div className="bg-slate-900 w-full max-w-sm rounded-[32px] p-8 border border-white/5">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-6 text-center">Agendar Serviço</h3>
              <div className="space-y-4">
                 <input type="date" value={scheduleModal.date} onChange={e => setScheduleModal(p => ({...p, date: e.target.value}))} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-white" />
                 <input type="time" value={scheduleModal.time} onChange={e => setScheduleModal(p => ({...p, time: e.target.value}))} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-white" />
                 <button onClick={async () => {
                    setIsActing(true);
                    try {
                       const deadlineObj = new Date(`${scheduleModal.date}T${scheduleModal.time}`);
                       const deadlineFormatted = deadlineObj.toLocaleString('pt-BR');

                       const { error } = await supabase.rpc('advance_freelance_status', { 
                          order_id: order.id,
                          new_status: 'scheduled'
                       });

                       if (error) throw error;

                       // Buscar a sala de chat para registrar o agendamento
                       const { data: rooms } = await supabase.from('chat_rooms').select('id').eq('freelance_order_id', order.id).maybeSingle();
                       if (rooms?.id) {
                         await supabase.from('chat_messages').insert({
                           room_id: rooms.id,
                           sender_id: user?.id,
                           content: `📅 **Agendamento Confirmado!**\nO início do freelance foi agendado para: **${deadlineFormatted}**.`
                         });
                       }

                       // Notificar o cliente sobre o agendamento
                       await supabase.from('notifications').insert({
                         user_id: order.client_id,
                         title: 'Serviço Agendado! 📅',
                         message: `O profissional agendou o início de "${order.title}" para ${deadlineFormatted}.`,
                         type: 'freelance_scheduled',
                         related_entity_id: order.id
                       });

                       showToast("Sucesso", "Cronograma definido!", "success");
                       setScheduleModal({ isOpen: false, date: '', time: '' });
                       
                       // Ajuste de sincronismo: atualizar estado local imediatamente
                       setOrder((prev: any) => ({ ...prev, status: 'scheduled' }));
                       
                       fetchOrder();
                    } catch (err: any) {
                      showToast("Erro", "Falha ao agendar: " + err.message, "error");
                    } finally { setIsActing(false); }
                 }} className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-xl">{isActing ? 'Processando...' : 'Confirmar Agenda'}</button>
                 <button onClick={() => setScheduleModal({ isOpen: false, date: '', time: '' })} className="w-full py-2 text-slate-500 font-bold">Voltar</button>
              </div>
           </div>
        </div>
      )}

      {imageModal.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 p-4" onClick={() => setImageModal({ isOpen: false, url: '' })}>
           <img src={imageModal.url} className="max-w-full max-h-full object-contain rounded-2xl" />
        </div>
      )}
    </div>
  );
}
