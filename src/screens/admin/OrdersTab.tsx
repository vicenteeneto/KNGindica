import React from 'react';
import { formatCurrency } from '../../lib/formatters';
import { useAdminDashboard } from './AdminDashboardContext';

export function OrdersTab() {
  const {
    setActiveTab,
    handleBulkDelete,
    handleDeleteOrder,
    handleToggleOrderSelection,
    handleToggleSelectAll,
    loading,
    ordersFilter,
    ordersList,
    selectedOrders,
    setOrdersFilter,
    setSelectedOrderDetail,
    setSelectedOrders,
    statusMap,
    supportTickets,
  } = useAdminDashboard();

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-2 font-medium">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar ao Dashboard
          </button>
          <h2 className="text-xl font-bold">Gestão Operacional e Financeira</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Acompanhe os pedidos, fluxo de caixa e chamados de suporte</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center justify-center gap-2 netflix-main-bg text-white border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-sm md:text-xl">calendar_month</span> <span className="hidden sm:inline">Últimos 30 Dias</span>
          </button>
          <button className="flex items-center justify-center gap-2 bg-primary text-white px-2 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-sm md:text-xl">download</span> <span className="hidden sm:inline">Exportar Relatório</span>
          </button>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <p className="text-xs text-slate-500 font-medium mb-1">Total Pedidos</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{ordersList.length}</h3>
            <span className="text-xs text-green-500 font-bold"></span>
          </div>
        </div>
        <div className="netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <p className="text-xs text-slate-500 font-medium mb-1">Volume Transacionado (GMV)</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(ordersList.reduce((acc, order) => acc + (order.price || 0), 0))}</h3>
            <span className="text-xs text-green-500 font-bold"></span>
          </div>
        </div>
        <div className="netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-primary">
          <p className="text-xs text-slate-500 font-medium mb-1">Receita da Plataforma</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(ordersList.reduce((acc, order) => acc + ((order.price || 0) * 0.15), 0))}</h3>
            <span className="text-xs text-green-500 font-bold"></span>
          </div>
        </div>
        <div className="netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-primary cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors">
          <p className="text-xs text-slate-500 font-medium mb-1 text-primary">Chamados em Aberto</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{supportTickets.filter(t => (t.status === 'open' || t.status === 'in_progress')).length}</h3>
            <span className="material-symbols-outlined text-sm text-primary">support_agent</span>
          </div>
        </div>
      </div>

      {/* Orders Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button 
          onClick={() => setOrdersFilter('all')}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${ordersFilter === 'all' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
          Todos
        </button>
        <button 
          onClick={() => setOrdersFilter('awaiting_payment')}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${ordersFilter === 'awaiting_payment' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
          Aguardando Pagamento
        </button>
        <button 
          onClick={() => setOrdersFilter('scheduled')}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${ordersFilter === 'scheduled' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
          Agendados
        </button>
        <button 
          onClick={() => setOrdersFilter('in_progress')}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${ordersFilter === 'in_progress' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
          Em Andamento
        </button>
        <button 
          onClick={() => setOrdersFilter('completed')}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${ordersFilter === 'completed' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
          Concluídos
        </button>
        <button 
          onClick={() => setOrdersFilter('disputed')}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors flex items-center gap-1 ${ordersFilter === 'disputed' ? 'bg-primary text-white' : 'border border-primary/20 text-primary hover:bg-primary/5'}`}>
          Em Disputa <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${ordersFilter === 'disputed' ? 'bg-white text-primary' : 'bg-primary text-white'}`}>{ordersList.filter(o => o.status === 'disputed').length}</span>
        </button>
      </div>

      <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm relative">
        {selectedOrders.length > 0 && (
          <div className="absolute top-0 left-0 right-0 bg-primary/10 dark:bg-primary/20 backdrop-blur-sm border-b border-primary/20 px-6 py-2 flex items-center justify-between z-10 animate-in slide-in-from-top duration-300">
            <p className="text-sm font-bold text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              {selectedOrders.length} pedido{selectedOrders.length > 1 ? 's' : ''} selecionado{selectedOrders.length > 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedOrders([])}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                Limpar Seleção
              </button>
              <button 
                onClick={handleBulkDelete}
                className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Excluir Selecionados
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-normal break-words">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-2 py-1.5 w-10">
                  <div className="flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                      checked={
                        ordersList.filter(order => {
                          if (ordersFilter === 'all') return true;
                          if (ordersFilter === 'awaiting_payment') return order.status === 'awaiting_payment';
                          if (ordersFilter === 'scheduled') return order.status === 'scheduled';
                          if (ordersFilter === 'in_progress') return ['proposed', 'quoted', 'accepted', 'in_service'].includes(order.status);
                          if (ordersFilter === 'completed') return order.status === 'completed';
                          if (ordersFilter === 'disputed') return order.status === 'disputed';
                          return true;
                        }).length > 0 && 
                        selectedOrders.length === ordersList.filter(order => {
                          if (ordersFilter === 'all') return true;
                          if (ordersFilter === 'awaiting_payment') return order.status === 'awaiting_payment';
                          if (ordersFilter === 'scheduled') return order.status === 'scheduled';
                          if (ordersFilter === 'in_progress') return ['proposed', 'quoted', 'accepted', 'in_service'].includes(order.status);
                          if (ordersFilter === 'completed') return order.status === 'completed';
                          if (ordersFilter === 'disputed') return order.status === 'disputed';
                          return true;
                        }).length
                      }
                      onChange={() => handleToggleSelectAll(ordersList.filter(order => {
                        if (ordersFilter === 'all') return true;
                        if (ordersFilter === 'awaiting_payment') return order.status === 'awaiting_payment';
                        if (ordersFilter === 'scheduled') return order.status === 'scheduled';
                        if (ordersFilter === 'in_progress') return ['proposed', 'quoted', 'accepted', 'in_service'].includes(order.status);
                        if (ordersFilter === 'completed') return order.status === 'completed';
                        if (ordersFilter === 'disputed') return order.status === 'disputed';
                        return true;
                      }))}
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500">ID / Data</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500">Cliente</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500">Prestador / Serviço</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500">Valor</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500">Status</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={7} className="p-6 text-center text-slate-500">Carregando...</td></tr>
              ) : ordersList.filter(order => {
                if (ordersFilter === 'all') return true;
                if (ordersFilter === 'awaiting_payment') return order.status === 'awaiting_payment';
                if (ordersFilter === 'scheduled') return order.status === 'scheduled';
                if (ordersFilter === 'in_progress') return ['proposed', 'quoted', 'accepted', 'in_service'].includes(order.status);
                if (ordersFilter === 'completed') return order.status === 'completed';
                if (ordersFilter === 'disputed') return order.status === 'disputed';
                return true;
              }).length === 0 ? (
                <tr><td colSpan={7} className="p-6 text-center text-slate-500">Nenhum pedido encontrado para este filtro.</td></tr>
              ) : (
                ordersList
                  .filter(order => {
                    if (ordersFilter === 'all') return true;
                    if (ordersFilter === 'awaiting_payment') return order.status === 'awaiting_payment';
                    if (ordersFilter === 'scheduled') return order.status === 'scheduled';
                    if (ordersFilter === 'in_progress') return ['proposed', 'quoted', 'accepted', 'in_service'].includes(order.status);
                    if (ordersFilter === 'completed') return order.status === 'completed';
                    if (ordersFilter === 'disputed') return order.status === 'disputed';
                    return true;
                  })
                  .map(order => (
                  <tr 
                    key={order.id} 
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${selectedOrders.includes(order.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                    onClick={() => handleToggleOrderSelection(order.id)}
                  >
                    <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                       <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => handleToggleOrderSelection(order.id)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                       <p className="font-bold text-xs text-slate-900 dark:text-white leading-tight">{order.display_id || `#...${order.id.substring(0, 4)}`}</p>
                       <p className="text-[10px] text-slate-400 font-medium">{new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                    </td>
                    <td className="px-2 py-1.5">
                      <p className="text-[11px] font-semibold text-slate-900 dark:text-white">{order.client?.full_name?.split(' ')[0] || 'Cliente'}</p>
                    </td>
                    <td className="px-2 py-1.5">
                      <p className="text-[11px] font-semibold text-slate-900 dark:text-white leading-tight">{order.provider?.full_name?.split(' ')[0] || '-'}</p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[120px]">{order.category?.name || 'Serviço'}</p>
                    </td>
                    <td className="px-2 py-1.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{order.price ? formatCurrency(order.price) : '---'}</p>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded ${
                        ['completed', 'paid'].includes(order.status) ? 'bg-green-100 text-green-700' : 
                        ['cancelled', 'disputed'].includes(order.status) ? 'bg-red-100 text-red-700' : 
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {statusMap[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <div className="flex gap-1 justify-end">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedOrderDetail(order);
                          }}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                          title="Visualizar Detalhes do Pedido"
                        >
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(order.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-500">Mostrando {ordersList.length} pedidos</p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Anterior
            </button>
            <button className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
