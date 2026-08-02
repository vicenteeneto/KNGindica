import React from 'react';
import { formatCurrency } from '../../lib/formatters';
import { useAdminDashboard } from './AdminDashboardContext';

export function ProvidersTab() {
  const {
    setActiveTab,
    onNavigate,
    handleOpenEditModal,
    handleUpdateUserStatus,
    loading,
    profile,
    providerSearch,
    providersList,
    setProviderSearch,
  } = useAdminDashboard();

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-2 font-medium">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar ao Dashboard
          </button>
          <h2 className="text-xl font-bold">Gestão de Prestadores</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie todos os prestadores cadastrados na plataforma</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 md:flex-none">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-xl pointer-events-none">search</span>
            <input
              className="pl-10 pr-4 py-2 netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all w-full md:w-64"
              placeholder="Buscar prestador por nome, email ou serviço..."
              type="text"
              value={providerSearch}
              onChange={(e) => setProviderSearch(e.target.value)}
            />
          </div>
          <button className="flex items-center justify-center gap-2 netflix-main-bg text-white border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-sm md:text-xl">filter_list</span> <span className="hidden sm:inline">Filtros</span>
          </button>
        </div>
      </div>

      {/* Metric Cards for this Tab */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <p className="text-xs text-slate-500 font-medium mb-1">Total Cadastrados</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{providersList.length}</h3>
          </div>
        </div>
        <div className="netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-green-500">
          <p className="text-xs text-slate-500 font-medium mb-1">Ativos</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{providersList.filter(p => p.status !== 'blocked' && p.status !== 'pending').length}</h3>
          </div>
        </div>
        <div className="netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-yellow-500">
          <p className="text-xs text-slate-500 font-medium mb-1">Em Análise (KYC)</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{providersList.filter(p => p.status === 'pending').length}</h3>
          </div>
        </div>
        <div className="netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-red-500">
          <p className="text-xs text-slate-500 font-medium mb-1">Bloqueados</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{providersList.filter(p => p.status === 'blocked').length}</h3>
          </div>
        </div>
      </div>

      <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-normal break-words">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Prestador</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Especialidade</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Contato</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Localidade</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Status</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Avaliação</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={7} className="p-6 text-center text-slate-500">Carregando prestadores...</td></tr>
              ) : providersList.filter(p =>
                  p.full_name?.toLowerCase().includes(providerSearch.toLowerCase()) ||
                  p.email?.toLowerCase().includes(providerSearch.toLowerCase()) ||
                  p.service_category?.toLowerCase().includes(providerSearch.toLowerCase())
                ).length === 0 ? (
                <tr><td colSpan={7} className="p-6 text-center text-slate-500">Nenhum prestador encontrado.</td></tr>
              ) : (
                providersList
                  .filter(p =>
                    p.full_name?.toLowerCase().includes(providerSearch.toLowerCase()) ||
                    p.email?.toLowerCase().includes(providerSearch.toLowerCase()) ||
                    p.service_category?.toLowerCase().includes(providerSearch.toLowerCase())
                  )
                  .map(provider => (
                  <tr key={provider.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                          <img className="h-full w-full object-cover" alt="Profile" src={provider.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="font-bold text-[13px] text-slate-900 dark:text-white truncate">{provider.full_name || 'Usuário Sem Nome'}</p>
                            {provider.is_verified && <span className="material-symbols-outlined text-blue-500 text-[14px]" title="Identidade Verificada">verified</span>}
                          </div>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                            <span className="font-mono font-bold">{provider.display_id || `#${provider.id.substring(0, 6)}`}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                            {provider.email || 'S/E'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[13px] font-medium text-slate-900 dark:text-white truncate max-w-[140px]">{provider.service_category || 'Serviços'}</p>
                      <p className="text-[11px] text-slate-500">{provider.completed_services || 0} concluídos • <span className="text-green-600 font-semibold">{provider.earnings ? formatCurrency(provider.earnings) : 'R$ 0,00'}</span></p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[13px] font-medium text-slate-900 dark:text-white truncate max-w-[120px]">{provider.phone || 'S/T'}</p>
                      <p className="text-[10px] text-slate-500 font-bold tracking-tight">WhatsApp</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[13px] font-medium text-slate-900 dark:text-white truncate max-w-[120px]">{provider.city ? `${provider.city}/${provider.state || '??'}` : 'n/i'}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[120px]">{provider.neighborhood || 'Bairro n/i'}</p>
                    </td>
                    <td className="px-3 py-3">
                      {provider.status === 'blocked' ? (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-[11px] font-semibold rounded-full flex items-center gap-1 w-max">
                          <span className="material-symbols-outlined text-[12px]">lock</span> Bloqueado
                        </span>
                      ) : provider.status === 'pending' ? (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 text-[11px] font-semibold rounded-full flex items-center gap-1 w-max">
                          <span className="material-symbols-outlined text-[12px]">schedule</span> Em Análise
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-[11px] font-semibold rounded-full flex items-center gap-1 w-max">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Ativo
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-orange-400">
                          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="text-[13px] font-bold text-slate-900 dark:text-white">{provider.rating}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">({provider.total_reviews || 0} aval)</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => onNavigate('profile', { providerId: provider.id })} 
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors" 
                          title="Ver Perfil"
                        >
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(provider)} 
                          className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors" 
                          title="Editar Perfil"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 self-center mx-1"></div>
                        {provider.status === 'blocked' ? (
                          <button 
                            onClick={() => handleUpdateUserStatus(provider.id, 'active')} 
                            className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" 
                            title="Desbloquear"
                          >
                            <span className="material-symbols-outlined text-[20px]">lock_open</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleUpdateUserStatus(provider.id, 'blocked')} 
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
        <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">Mostrando {providersList.length} de {providersList.length} prestadores</p>
          <div className="flex gap-2">
            <button className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" disabled>
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
