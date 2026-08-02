import React from 'react';
import { formatCurrency } from '../../lib/formatters';
import { useAdminDashboard } from './AdminDashboardContext';

export function DashboardTab() {
  const {
    setActiveTab,
    growthData,
    handleDeleteOrder,
    loading,
    ordersList,
    pendingVerifications,
    providersList,
    recentUsersList,
    referralsHistory,
    reviewsList,
    role,
    stats,
  } = useAdminDashboard();

  return (
    <>
      {/* Statistics Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Estatísticas da Plataforma</h2>
          <span className="text-sm text-primary font-medium cursor-pointer hover:underline">Ver relatórios detalhados</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card: Providers - Clickable */}
          <div 
            onClick={() => setActiveTab('providers')}
            className="group cursor-pointer netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 hover:shadow-lg transition-all active:scale-95"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 group-hover:bg-primary group-hover:text-white rounded-lg flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[20px]">engineering</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-green-500 flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[10px]">trending_up</span>
                  +{stats.newToday} hoje
                </span>
                <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-[16px]">arrow_forward_ios</span>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Total de Prestadores</p>
            <p className="text-xl font-bold">{stats.providers}</p>
          </div>

          {/* Card: Clients - Clickable */}
          <div 
            onClick={() => setActiveTab('clients')}
            className="group cursor-pointer netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-purple-500/50 hover:shadow-lg transition-all active:scale-95"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 group-hover:bg-purple-600 group-hover:text-white rounded-lg flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[20px]">group</span>
              </div>
              <div className="flex flex-col items-end">
                 <span className="text-[10px] font-bold text-slate-400">{stats.clients} total</span>
                 <span className="material-symbols-outlined text-slate-300 group-hover:text-purple-500 transition-colors text-[16px]">arrow_forward_ios</span>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Total de Clientes</p>
            <p className="text-xl font-bold">{stats.clients}</p>
          </div>

          {/* Card: Referrals Audit - Clickable */}
          <div 
            onClick={() => setActiveTab('referrals')}
            className="group cursor-pointer netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 hover:shadow-lg transition-all active:scale-95"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 group-hover:bg-primary group-hover:text-white rounded-lg flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[20px]">share</span>
              </div>
              <div className="flex flex-col items-end">
                 <span className="text-[10px] font-bold text-slate-400">{referralsHistory.length} registros</span>
                 <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-[16px]">arrow_forward_ios</span>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Auditoria de Indicações</p>
            <p className="text-xl font-bold">{referralsHistory.length}</p>
          </div>

          <div 
            onClick={() => setActiveTab('verifications')}
            className="group cursor-pointer netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-500/50 hover:shadow-lg transition-all active:scale-95"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 group-hover:bg-amber-600 group-hover:text-white rounded-lg flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-[10px] font-bold ${pendingVerifications.length > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                  {pendingVerifications.length} pendentes
                </span>
                <span className="material-symbols-outlined text-slate-300 group-hover:text-amber-500 transition-colors text-[16px]">arrow_forward_ios</span>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Verificações de ID</p>
            <p className="text-xl font-bold">{pendingVerifications.length}</p>
          </div>

          {/* Card: Services - Clickable */}
          <div 
            onClick={() => setActiveTab('orders')}
            className="group cursor-pointer netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-green-500/50 hover:shadow-lg transition-all active:scale-95"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 group-hover:bg-green-600 group-hover:text-white rounded-lg flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[20px]">task_alt</span>
              </div>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-green-500 transition-colors text-[16px]">arrow_forward_ios</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Serviços Concluídos</p>
            <p className="text-xl font-bold">{stats.servicesCompleted}</p>
          </div>

          {/* Card: Revenue - Clickable */}
          <div 
            onClick={() => setActiveTab('orders')}
            className="group cursor-pointer netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-orange-500/50 hover:shadow-lg transition-all active:scale-95"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 group-hover:bg-orange-600 group-hover:text-white rounded-lg flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[20px]">payments</span>
              </div>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-orange-500 transition-colors text-[16px]">arrow_forward_ios</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Receita Estimada</p>
            <p className="text-xl font-bold">{formatCurrency(stats.revenue)}</p>
          </div>
        </div>
      </section>

      {/* Growth Overview Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Visão de Crescimento</h2>
              <p className="text-xs text-slate-500">Distribuição da base de usuários</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                <span className="w-2 h-2 rounded-full bg-primary"></span> Prestadores
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span> Clientes
              </span>
            </div>
          </div>
          
          <div className="relative h-48 flex items-end gap-2 px-2">
            {/* Real Dynamic Bar Graph */}
            {growthData.providers.map((pCount, i) => {
              const cCount = growthData.clients[i];
              const totalOnDay = Math.max(pCount + cCount, 1);
              const maxVal = Math.max(...growthData.providers, ...growthData.clients, 5);
              
              return (
                <div key={i} className="flex-1 flex flex-col justify-end gap-1 group">
                  <div className="flex flex-col-reverse gap-0.5">
                     <div 
                        className="w-full bg-primary/40 group-hover:bg-primary/60 rounded-t-sm transition-all" 
                        style={{ height: `${(pCount / maxVal) * 120}px`, minHeight: pCount > 0 ? '4px' : '0px' }}
                        title={`${pCount} Prestadores`}
                     ></div>
                     <div 
                        className="w-full bg-purple-500/40 group-hover:bg-purple-500/60 rounded-t-sm transition-all" 
                        style={{ height: `${(cCount / maxVal) * 120}px`, minHeight: cCount > 0 ? '4px' : '0px' }}
                        title={`${cCount} Clientes`}
                     ></div>
                  </div>
                  <span className="text-[9px] text-slate-400 text-center font-bold">
                    {new Date(new Date().setDate(new Date().getDate() - (6 - i))).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-around text-center">
             <div>
               <p className="text-xs text-slate-500 mb-1">Taxa de Conversão</p>
               <p className="text-lg font-bold text-primary">12.5%</p>
             </div>
             <div className="w-px h-8 bg-slate-100 dark:bg-slate-800 self-center"></div>
             <div>
               <p className="text-xs text-slate-500 mb-1">Crescimento Mensal</p>
               <p className="text-lg font-bold text-green-500">+18%</p>
             </div>
             <div className="w-px h-8 bg-slate-100 dark:bg-slate-800 self-center"></div>
             <div>
               <p className="text-xs text-slate-500 mb-1">Churn Rate</p>
               <p className="text-lg font-bold text-red-500">2.1%</p>
             </div>
          </div>
        </div>

        <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm overflow-hidden flex flex-col">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Últimos Cadastros</h2>
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            {recentUsersList.slice(0, 8).map((p, idx) => (
              <div key={idx} className="flex items-center gap-3 group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 p-2 rounded-xl transition-colors">
                <img src={p.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-10 h-10 rounded-full object-cover bg-slate-100" />
                <div className="flex-1 overflow-hidden">
                   <p className="text-sm font-bold truncate">{p.full_name || 'Novo Usuário'}</p>
                   <p className="text-[10px] text-slate-500 font-bold tracking-wider">
                      {p.role === 'provider' ? (
                         <span className="text-blue-500">Prestador</span>
                      ) : (
                         <span className="text-purple-500">Cliente</span>
                      )} • {new Date(p.created_at).toLocaleDateString('pt-BR')}
                   </p>
                </div>
                <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-lg">chevron_right</span>
              </div>
            ))}
            {recentUsersList.length === 0 && <p className="text-sm text-slate-500 text-center py-10">Nenhum cadastro recente.</p>}
          </div>
          <button onClick={() => setActiveTab('providers')} className="mt-4 w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors">
            Ver Todos os Usuários
          </button>
        </div>
      </section>

      {/* Management Section */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold">Gestão de Prestadores</h2>
          <div className="flex gap-2">
            <div className="relative flex-1 md:flex-none">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-xl pointer-events-none">search</span>
              <input
                className="pl-10 pr-4 py-2 netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all w-full md:w-64"
                placeholder="Buscar prestador..."
                type="text"
              />
            </div>
            <button className="flex items-center justify-center gap-2 bg-primary text-white px-2 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <span className="material-symbols-outlined text-sm md:text-xl">filter_list</span> <span className="hidden sm:inline">Filtrar</span>
            </button>
          </div>
        </div>

        <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-normal break-words">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Prestador</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Serviço</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Status</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Avaliação</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-500">Carregando...</td></tr>
                ) : providersList.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-500">Nenhum prestador encontrado.</td></tr>
                ) : (
                  providersList.slice(0, 5).map(provider => (
                    <tr key={provider.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                            <img className="h-full w-full object-cover" alt="Profile" src={provider.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{provider.full_name || 'Usuário Sem Nome'}</p>
                            <p className="text-xs text-slate-500 font-mono font-bold tracking-wider">{provider.display_id || provider.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm">-</td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded">Ativo</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 text-orange-400">
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{provider.rating}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Bloquear</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-500">Mostrando {Math.min(providersList.length, 5)} de {providersList.length} prestadores</p>
            <div className="flex gap-2">
              <button className="p-1 border border-slate-200 dark:border-slate-800 rounded text-slate-400 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" disabled>
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button className="p-1 border border-slate-200 dark:border-slate-800 rounded text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Lower Section: Reviews & Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Reviews */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Avaliações Recentes</h2>
            <button className="text-sm font-medium text-primary hover:underline" onClick={() => setActiveTab('reviews')}>Ver Todas</button>
          </div>
          <div className="space-y-3">
            {reviewsList.length === 0 ? (
              <p className="text-sm text-center text-slate-500 py-4">Nenhuma avaliação encontrada.</p>
            ) : (
              reviewsList.slice(0, 2).map((review: any) => (
                <div key={review.id} className="netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{review.reviewer?.full_name || 'Usuário'}</span>
                      <span className="text-[10px] text-slate-400">{new Date(review.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex text-orange-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: `\'FILL\' ${review.rating >= star ? 1 : 0}` }}>
                          star
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 italic">"{review.comment || 'Sem comentário'}"</p>
                  <p className="mt-2 text-[10px] font-bold text-primary">Para: {review.provider?.full_name || 'Prestador'}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Platform Orders */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Pedidos da Plataforma</h2>
            <button className="text-sm font-medium text-primary hover:underline" onClick={() => setActiveTab('orders')}>Gerenciar</button>
          </div>
          <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {ordersList.length === 0 ? (
                <p className="text-sm text-center text-slate-500 py-4">Nenhum pedido encontrado.</p>
              ) : (
                ordersList.slice(0, 3).map((order: any) => (
                  <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary p-2 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined">receipt_long</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-0.5">{order.display_id || `#...${order.id.substring(0, 6)}`}</p>
                        <p className="text-xs text-slate-500">{order.category?.name || 'Serviço'} • {order.price ? formatCurrency(order.price) : 'Em negociação'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded ${order.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : order.status === 'canceled' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                        {order.status === 'accepted' ? 'Aceito' : order.status === 'completed' ? 'Concluído' : order.status === 'canceled' ? 'Cancelado' : order.status}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOrder(order.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
