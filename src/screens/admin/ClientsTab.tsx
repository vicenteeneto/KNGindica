import React from 'react';
import { useAdminDashboard } from './AdminDashboardContext';

export function ClientsTab() {
  const {
    setActiveTab,
    clientSearch,
    clientsList,
    handleOpenEditModal,
    handleUpdateUserStatus,
    loading,
    ordersList,
    setClientSearch,
  } = useAdminDashboard();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className="group flex items-center gap-2 text-slate-500 hover:text-primary transition-colors mb-2"
          >
            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
            <span className="text-xs font-bold">Voltar ao Dashboard</span>
          </button>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gestão de Clientes</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie todos os clientes cadastrados na plataforma</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-xl pointer-events-none">search</span>
            <input
              className="pl-10 pr-4 py-2 netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all w-full md:w-64"
              placeholder="Buscar cliente por nome, e-mail..."
              type="text"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Metric Cards for this Tab */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <p className="text-xs text-slate-500 font-medium mb-1">Total Cadastrados</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{clientsList.length}</h3>
          </div>
        </div>
        <div className="netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-green-500">
          <p className="text-xs text-slate-500 font-medium mb-1">Ativos</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{clientsList.filter(c => c.status !== 'blocked').length}</h3>
          </div>
        </div>
        <div className="netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-primary">
          <p className="text-xs text-slate-500 font-medium mb-1">Total Pedidos</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{ordersList.filter(o => clientsList.some(c => c.id === o.client_id)).length}</h3>
          </div>
        </div>
        <div className="netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-red-500">
          <p className="text-xs text-slate-500 font-medium mb-1">Bloqueados</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{clientsList.filter(c => c.status === 'blocked').length}</h3>
          </div>
        </div>
      </div>

      <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-normal break-words">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Cliente</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Contato</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Localidade</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Cadastro</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Status</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">Carregando clientes...</td></tr>
              ) : clientsList.filter(c =>
                  c.full_name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                  c.email?.toLowerCase().includes(clientSearch.toLowerCase())
                ).length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">Nenhum cliente encontrado para sua busca.</td></tr>
              ) : (
                clientsList
                  .filter(c =>
                    c.full_name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
                    c.email?.toLowerCase().includes(clientSearch.toLowerCase())
                  )
                  .map(client => (
                  <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                          <img className="h-full w-full object-cover" alt="Profile" src={client.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[13px] text-slate-900 dark:text-white truncate">{client.full_name || 'Usuário Sem Nome'}</p>
                          <p className="text-[11px] text-slate-500 font-mono font-bold tracking-tight truncate">{client.display_id || `#${client.id.substring(0, 6)}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[13px] font-medium text-slate-900 dark:text-white truncate max-w-[140px]">{client.email || 'S/E'}</p>
                      <p className="text-[10px] text-slate-500 font-bold tracking-tight">{client.phone || 'S/T'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[13px] font-medium text-slate-900 dark:text-white truncate max-w-[120px]">{client.city ? `${client.city}/${client.state || '??'}` : 'n/i'}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[120px]">{client.neighborhood || 'Bairro n/i'}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[11px] text-slate-500 font-bold tracking-tight">{new Date(client.created_at).toLocaleDateString('pt-BR')}</p>
                    </td>
                    <td className="px-3 py-3">
                      {client.status === 'blocked' ? (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-[11px] font-semibold rounded-full flex items-center gap-1 w-max">
                          <span className="material-symbols-outlined text-[12px]">lock</span> Bloqueado
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-[11px] font-semibold rounded-full flex items-center gap-1 w-max">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Ativo
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => handleOpenEditModal(client)} 
                          className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors" 
                          title="Editar Perfil"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 self-center mx-1"></div>
                        {client.status === 'blocked' ? (
                          <button 
                            onClick={() => handleUpdateUserStatus(client.id, 'active')} 
                            className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" 
                            title="Desbloquear"
                          >
                            <span className="material-symbols-outlined text-[20px]">lock_open</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleUpdateUserStatus(client.id, 'blocked')} 
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" 
                            title="Bloquear"
                          >
                            <span className="material-symbols-outlined text-[20px]">block</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
