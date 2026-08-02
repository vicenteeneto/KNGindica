import React from 'react';
import { useAdminDashboard } from './AdminDashboardContext';

export function TicketsTab() {
  const {
    setActiveTab,
    ordersList,
    setSelectedDispute,
    setSelectedTicket,
    showToast,
    supportTickets,
    user,
  } = useAdminDashboard();

    const openTickets = supportTickets.filter(t => t.status === 'open' || t.status === 'in_review');
    const answeredTickets = supportTickets.filter(t => t.status === 'answered');
    const resolvedTickets = supportTickets.filter(t => t.status === 'resolved' || t.status === 'closed');

    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-2 font-medium">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar ao Dashboard
            </button>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Central de Resoluções</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Atendimento aos usuários e mediação de conflitos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm text-center border-t-4 border-t-amber-500">
            <span className="material-symbols-outlined text-4xl text-amber-500 mb-2">support_agent</span>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{openTickets.length}</h3>
            <p className="text-sm text-slate-500 font-bold">Abertos</p>
          </div>
          <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm text-center border-t-4 border-t-blue-500">
            <span className="material-symbols-outlined text-4xl text-blue-500 mb-2">quickreply</span>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{answeredTickets.length}</h3>
            <p className="text-sm text-slate-500 font-bold">Respondidos</p>
          </div>
          <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm text-center border-t-4 border-t-green-500">
            <span className="material-symbols-outlined text-4xl text-green-500 mb-2">check_circle</span>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{resolvedTickets.length}</h3>
            <p className="text-sm text-slate-500 font-bold">Resolvidos</p>
          </div>
        </div>

        <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
            <h3 className="font-bold">Tickets Recentes</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {supportTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">task_alt</span>
                <p>Nenhum ticket encontrado.</p>
              </div>
            ) : (
              supportTickets.map(ticket => (
                <div key={ticket.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center justify-between group">
                  <div className="flex gap-4 items-start">
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                      ticket.category === 'dispute' ? 'bg-red-100 dark:bg-red-900/40 text-red-600' :
                      ticket.category === 'suggestion' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' :
                      ticket.category === 'question' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-600'
                    }`}>
                      <span className="material-symbols-outlined text-2xl">
                        {ticket.category === 'dispute' ? 'warning' :
                         ticket.category === 'suggestion' ? 'lightbulb' :
                         ticket.category === 'question' ? 'help' : 'account_circle'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          ticket.status === 'open' ? 'bg-amber-100 text-amber-700' :
                          ticket.status === 'in_review' ? 'bg-indigo-100 text-indigo-700' : 
                          ticket.status === 'answered' ? 'bg-blue-100 text-blue-700' : 
                          'bg-green-100 text-green-700'
                        }`}>{
                          ticket.status === 'open' ? 'Aberto' :
                          ticket.status === 'in_review' ? 'Em análise' :
                          ticket.status === 'answered' ? 'Respondido' :
                          'Resolvido'
                        }</span>
                        <p className="font-bold text-slate-900 dark:text-white truncate lg:max-w-md">{ticket.subject}</p>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                        Enviado por <span className="font-semibold text-slate-800 dark:text-slate-200">{ticket.user?.full_name || 'Usuário'}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono tracking-wider">TICKET-ID: {ticket.id.split('-')[0].toUpperCase()} • {new Date(ticket.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                        if (ticket.category === 'dispute' && ticket.related_order_id) {
                            const order = ordersList.find(o => o.id === ticket.related_order_id);
                            if (order) setSelectedDispute(order);
                            else showToast("Aviso", "O pedido relacionado não foi encontrado.", "notification");
                        } else {
                            setSelectedTicket(ticket);
                        }
                    }}
                    className="px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group-hover:bg-primary group-hover:text-white group-hover:border-primary font-bold rounded-xl transition-all flex items-center justify-center gap-2 w-full md:w-auto shadow-sm"
                  >
                    Examinar <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
}
