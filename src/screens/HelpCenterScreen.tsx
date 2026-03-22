import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';

export default function HelpCenterScreen({ onNavigate, params }: NavigationProps) {
  const [activeTab, setActiveTab] = useState<'faq' | 'tickets'>('tickets');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  const { user } = useAuth();
  const { showToast } = useNotifications();

  const [tickets, setTickets] = useState<any[]>([]);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchSupportData = async () => {
      setLoading(true);
      const [ticketsRes, ordersRes] = await Promise.all([
        supabase.from('support_tickets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('service_requests').select('id, title, status').or(`client_id.eq.${user.id},provider_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(30)
      ]);
      
      if (ticketsRes.data) setTickets(ticketsRes.data);
      if (ordersRes.data) setUserOrders(ordersRes.data);
      setLoading(false);
    };
    fetchSupportData();

    if (params?.requestId) {
      setIsCreatingTicket(true);
      setNewCategory('dispute');
      setNewRelatedOrder(params.requestId);
    }
  }, [user, params]);

  const [newCategory, setNewCategory] = useState('question');
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRelatedOrder, setNewRelatedOrder] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newCategory === 'dispute' && !newRelatedOrder) {
      showToast("Atenção", "Selecione a ordem que deseja disputar.", "error");
      return;
    }
    
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('support_tickets').insert({
        user_id: user.id,
        category: newCategory,
        subject: newSubject,
        description: newDescription,
        related_order_id: newCategory === 'dispute' ? newRelatedOrder : null,
      }).select().single();
      
      if (error) throw error;
      
      if (newCategory === 'dispute' && newRelatedOrder) {
        // Freeze order
        await supabase.from('service_requests').update({ status: 'disputed' }).eq('id', newRelatedOrder);
      }
      
      setTickets([data, ...tickets]);
      setIsCreatingTicket(false);
      setNewSubject('');
      setNewDescription('');
      setNewCategory('question');
      setNewRelatedOrder('');
      showToast("Chamado Aberto", "Sua solicitação foi enviada à nossa equipe.", "success");
    } catch (err: any) {
      showToast("Erro", err.message || "Erro ao abrir chamado.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'dispute': return 'Disputa de Serviço';
      case 'question': return 'Dúvida Geral';
      case 'suggestion': return 'Sugestão';
      case 'account': return 'Problema na Conta';
      default: return 'Suporte';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Aberto</span>;
      case 'in_review':
        return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Em Análise</span>;
      case 'resolved':
        return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Resolvido</span>;
      case 'closed':
        return <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Fechado</span>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate('back')}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-bold text-lg">Central de Ajuda</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full p-4 pb-24">
        <div className="max-w-2xl mx-auto">
          
          {/* Hero */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white mb-6">
            <h2 className="text-2xl font-bold mb-2">Como podemos ajudar?</h2>
            <p className="text-slate-300 text-sm mb-4">Seja para tirar uma dúvida ou resolver um problema com seu pedido, nossa equipe está pronta para atender você.</p>
            
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input 
                type="text" 
                placeholder="Buscar em artigos de ajuda..." 
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
            <button 
              onClick={() => setActiveTab('tickets')}
              className={`pb-3 px-4 text-sm font-bold flex-1 text-center ${activeTab === 'tickets' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Meus Chamados
            </button>
            <button 
              onClick={() => setActiveTab('faq')}
              className={`pb-3 px-4 text-sm font-bold flex-1 text-center ${activeTab === 'faq' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Dúvidas Frequentes
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'tickets' && (
            <div className="space-y-4">
              
              {!isCreatingTicket ? (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">Histórico</h3>
                    <button 
                      onClick={() => setIsCreatingTicket(true)}
                      className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Abrir Chamado
                    </button>
                  </div>

                  {loading ? (
                    <div className="flex justify-center p-8">
                      <span className="material-symbols-outlined animate-spin text-4xl text-slate-300">progress_activity</span>
                    </div>
                  ) : tickets.map(ticket => (
                    <div key={ticket.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs text-slate-500 font-bold mb-0.5 flex gap-2 items-center">
                            {ticket.id.substring(0, 8).toUpperCase()} 
                            <span className="w-1 h-1 bg-slate-400 rounded-full"></span> 
                            {getCategoryLabel(ticket.category)}
                          </p>
                          <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{ticket.subject}</h4>
                        </div>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-2">{ticket.description}</p>
                      
                      {ticket.category === 'dispute' && ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg">
                          <span className="material-symbols-outlined text-[16px]">lock</span>
                          Pagamento retido temporariamente. Mediação em análise.
                        </div>
                      )}
                    </div>
                  ))}

                  {!loading && tickets.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                      <p>Você não tem nenhum chamado em aberto.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl shadow-sm animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Novo Chamado</h3>
                    <button onClick={() => setIsCreatingTicket(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
                  </div>
                  
                  {newCategory === 'dispute' && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-xs p-3 rounded-lg flex gap-2 mb-4 border border-amber-200 dark:border-amber-900/30">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      <p>Ao abrir uma disputa, transferimos o valor retido do serviço para uma conta garantia (Escrow) até que o problema seja resolvido por nossa equipe.</p>
                    </div>
                  )}

                  <form onSubmit={handleCreateTicket} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                      <select 
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="question">Dúvida / Ajuda com uso</option>
                        <option value="suggestion">Sugerir Melhoria</option>
                        <option value="account">Problema na Conta / Dados</option>
                        <option value="dispute">Causar Disputa / Problema com Serviço</option>
                      </select>
                    </div>

                    {newCategory === 'dispute' && (
                      <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-1">Qual ordem causou problema?</label>
                        <select 
                          required
                          value={newRelatedOrder}
                          onChange={(e) => setNewRelatedOrder(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-red-200 dark:border-red-900/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        >
                          <option value="">Selecione um serviço recente...</option>
                          {userOrders.map(order => (
                            <option key={order.id} value={order.id}>
                              {order.title} ({order.status})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Motivo / Assunto</label>
                      <input 
                        type="text" 
                        required
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="Ex: Não consigo trocar minha foto"
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição Detalhada</label>
                      <textarea 
                        required
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Explique o que aconteceu da forma mais clara possível..."
                        rows={4}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Anexar Provas (Opcional)</label>
                      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <span className="material-symbols-outlined text-slate-400 mb-1">add_a_photo</span>
                        <p className="text-xs text-slate-500">Clique para enviar fotos ou vídeos do problema detectado.</p>
                      </div>
                    </div>
                    <div className="pt-2 flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setIsCreatingTicket(false)}
                        className="flex-1 py-2 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit" 
                        disabled={submitting}
                        className="flex-1 py-2 font-bold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                      >
                        {submitting ? '...' : 'Enviar Chamado'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-3">
               {[
                 { q: 'Como funciona a garantia KNG?', a: 'Todos os serviços contratados pela plataforma possuem garantia de 7 dias para falhas de execução. O dinheiro só é repassado ao prestador 24h após a conclusão.' },
                 { q: 'O que é uma Disputa?', a: 'É um processo de mediação onde nossa equipe analisa o serviço prestado quando há discordância entre cliente e profissional. O repasse financeiro fica bloqueado até o fim da análise.' },
                 { q: 'Como obtenho reembolso?', a: 'Se a disputa for decidida a seu favor devido a não comparecimento ou serviço não prestado, o valor será estornado na sua fatura do cartão ou creditado na sua carteira KNGflow em até 3 dias úteis.' }
               ].map((item, idx) => (
                 <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl">
                    <h4 className="font-bold flex gap-2 items-center mb-2"><span className="material-symbols-outlined text-primary text-[20px]">help</span> {item.q}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{item.a}</p>
                 </div>
               ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
