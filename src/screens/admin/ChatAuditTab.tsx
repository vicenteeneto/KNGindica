import React from 'react';
import { useAdminDashboard } from './AdminDashboardContext';

export function ChatAuditTab() {
  const {
    setActiveTab,
    chatAuditSearchTerm,
    chatRoomsList,
    setChatAuditSearchTerm,
    setSelectedChatRoom,
  } = useAdminDashboard();

    const filteredRooms = chatRoomsList.filter(room => {
      const clientName = (room.client?.full_name || '').toLowerCase();
      const providerName = (room.provider?.full_name || '').toLowerCase();
      const requestTitle = (room.request?.title || '').toLowerCase();
      const term = chatAuditSearchTerm.toLowerCase();
      return clientName.includes(term) || providerName.includes(term) || requestTitle.includes(term);
    });

    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-2 font-medium">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar ao Dashboard
            </button>
            <h2 className="text-xl font-bold">Auditoria de Conversas</h2>
            <p className="text-sm text-slate-500 font-medium">Monitore o conteúdo das interações entre usuários</p>
          </div>
          <div className="relative w-full md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-xl pointer-events-none">search</span>
            <input
              type="text"
              placeholder="Buscar por nome ou pedido..."
              value={chatAuditSearchTerm}
              onChange={(e) => setChatAuditSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>
        </div>
      <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Sala de Chat / Pedido</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Participantes</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-slate-500 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRooms.length === 0 ? (
              <tr><td colSpan={3} className="p-6 text-center text-slate-500">Nenhuma sala de chat encontrada para sua busca.</td></tr>
            ) : (
              filteredRooms.map(room => (
                <tr key={room.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-3 py-3">
                    <p className="font-bold text-sm">{room.request?.title || 'Conversa Direta'}</p>
                    <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 ${room.request?.status === 'disputed' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                      {room.request?.status === 'disputed' ? 'Em disputa' : room.request?.status || 'Ativo'}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-normal break-words">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium">Cli: {room.client?.full_name}</span>
                      <span className="text-xs font-medium">Pre: {room.provider?.full_name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => setSelectedChatRoom(room)}
                      className="text-primary hover:bg-primary/10 px-2 py-1.5 rounded-lg text-sm font-bold transition-all"
                    >
                      Auditar Conversa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    );
}
