import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';

export default function ServiceStatusScreen({ onNavigate, params }: NavigationProps) {
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
          provider:profiles!service_requests_provider_id_fkey(full_name, avatar_url),
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
                  provider:profiles!service_requests_provider_id_fkey(full_name, avatar_url),
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
      {/* Floating Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-10 flex flex-col gap-3 max-w-4xl mx-auto">
        <button 
          onClick={() => onNavigate('checkout', { requestId: params?.requestId })}
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:translate-y-0 hover:-translate-y-0.5 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex justify-center items-center gap-2"
        >
          <span className="material-symbols-outlined">payments</span>
          Efetuar Pagamento (Taxa R$ 10)
        </button>
        <div className="flex gap-3">
          <button 
            onClick={() => displayData.provider_id && onNavigate('chat', { requestId: params?.requestId })}
            className="flex-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 font-bold py-3.5 px-6 rounded-xl transition-all flex justify-center items-center gap-2"
          >
            <span className="material-symbols-outlined">chat</span>
            Chat
          </button>
          <button 
            onClick={() => alert(`Ligando para o profissional...`)}
            className="flex-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 font-bold py-3.5 px-6 rounded-xl transition-all flex justify-center items-center gap-2"
          >
            <span className="material-symbols-outlined">call</span>
            Ligar
          </button>
        </div>
      </div>

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
              <div className="size-24 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-5xl">check_circle</span>
              </div>
              <div className="absolute -bottom-1 -right-1 size-8 bg-green-500 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xs">priority_high</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {displayData.status === 'open' ? 'Solicitação Aberta' : 
                 displayData.status === 'proposed' ? 'Orçamento Recebido' :
                 displayData.status === 'awaiting_payment' ? 'Aguardando Pagamento' :
                 displayData.status === 'paid' ? 'Pedido Pago' :
                 displayData.status === 'completed' ? 'Serviço Concluído' : 'Serviço em Andamento'}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-[280px]">
                {displayData.status === 'open' ? 'Estamos aguardando um profissional aceitar sua solicitação.' : 
                 displayData.status === 'proposed' ? 'Você recebeu uma proposta. Confira os detalhes abaixo.' :
                 displayData.status === 'awaiting_payment' ? 'Sua proposta foi aceita! Realize o pagamento da taxa de intermediação para liberar o contato direto.' :
                 displayData.status === 'paid' ? 'Pagamento confirmado! O profissional entrará em contato em breve.' :
                 displayData.status === 'completed' ? 'Obrigado por utilizar o KNGindica! Por favor, avalie o atendimento do profissional.' :
                 'O profissional está pronto para realizar o seu atendimento.'}
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
                        <span className="text-xs font-bold">{displayData.provider?.rating || '5.0'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="size-10 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); alert('Iniciando chamada...'); }}>
                      <span className="material-symbols-outlined">call</span>
                    </button>
                    <button className="size-10 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-colors" onClick={async (e) => { 
                      e.stopPropagation(); 
                      if (!displayData.provider_id) {
                        alert("Aguarde um profissional aceitar seu pedido para iniciar o chat.");
                        return;
                      }
                      const { data: room } = await supabase.from('chat_rooms').select('id').eq('request_id', params?.requestId).single();
                      if (room) {
                        onNavigate('chat', { 
                          roomId: room.id, 
                          opponentName: displayData.provider?.full_name, 
                          opponentAvatar: displayData.provider?.avatar_url,
                          requestId: params?.requestId
                        });
                      }
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
                <p className="text-slate-900 dark:text-slate-100 font-semibold">{new Date(displayData.created_at).toLocaleDateString([], { day: 'numeric', month: 'long' })}, {new Date(displayData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4">
              <div className="size-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined">location_on</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Localização</p>
                <p className="text-slate-900 dark:text-slate-100 font-semibold line-clamp-1">{displayData.address || 'Localização não informada'}</p>
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
                    ? `R$ ${displayData.budget_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                    : 'A definir'}
                </p>
              </div>
              <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${displayData.status === 'paid' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                {displayData.status === 'paid' ? 'Pago' : displayData.status === 'proposed' ? 'Aprovar Orçamento' : displayData.status === 'awaiting_payment' ? 'Aguardando Pagamento' : 'Pendente'}
              </div>
            </div>
          </div>
          
          <div className="pt-4 flex flex-col gap-3">
            {(displayData.status === 'proposed' || displayData.status === 'awaiting_payment') && (
              <button 
                onClick={() => onNavigate('chat', { requestId: params?.requestId })}
                className="w-full h-12 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
              >
                Aceitar Orçamento no Chat
              </button>
            )}
            <button 
              onClick={() => onNavigate('home')}
              className="w-full h-12 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
            >
              Ver Meus Agendamentos
            </button>
            <button 
              onClick={async () => {
                if (!window.confirm("Deseja abrir uma disputa para este pedido? Um administrador analisará o caso.")) return;
                try {
                  const { error } = await supabase
                    .from('service_requests')
                    .update({ status: 'disputed' })
                    .eq('id', params?.requestId);
                  if (error) throw error;
                  alert("Disputa aberta com sucesso. Aguarde o contato da nossa equipe.");
                  onNavigate('myRequests');
                } catch (err: any) {
                  alert("Erro ao abrir disputa: " + err.message);
                }
              }}
              className="w-full h-12 bg-transparent text-slate-500 hover:text-red-500 font-bold rounded-xl transition-colors text-sm"
            >
              Tive um problema / Abrir Disputa
            </button>
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
          <button className="flex flex-1 flex-col items-center justify-end gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
            <span className="material-symbols-outlined">person</span>
            <p className="text-[10px] font-medium leading-normal tracking-[0.015em]">Perfil</p>
          </button>
        </div>
      </nav>
    </div>
  );
}
