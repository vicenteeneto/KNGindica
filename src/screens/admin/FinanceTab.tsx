import React from 'react';
import { formatCurrency } from '../../lib/formatters';
import { calculateServiceFees } from '../../lib/billing';
import { useAdminDashboard } from './AdminDashboardContext';

export function FinanceTab() {
  const {
    setActiveTab,
    conversionMetrics,
    exportToCSV,
    ordersList,
  } = useAdminDashboard();

    const concludedOrders = ordersList.filter(o => o.status === 'completed');
    const grossVolume = concludedOrders.reduce((acc, order) => acc + (order.price || 0), 0);
    const platformRevenue = concludedOrders.reduce(
      (acc, order) => acc + calculateServiceFees(order.price || 0, order.provider?.plan_type).providerFee,
      0
    );
    const avgTicket = concludedOrders.length > 0 ? grossVolume / concludedOrders.length : 0;

    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-2 font-medium">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar ao Dashboard
            </button>
            <h2 className="text-xl font-bold">Relatórios Financeiros</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Visão geral do faturamento e repasses da plataforma</p>
          </div>
          <button onClick={exportToCSV} className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[20px]">download</span>
            Exportar CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg inline-flex mb-3">
              <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
            </div>
            <p className="text-sm text-slate-500 font-medium">Volume Bruto Transacionado</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {formatCurrency(grossVolume)}
            </h3>
          </div>

          <div className="bg-gradient-to-br from-primary to-primary-hover p-6 rounded-xl shadow-md text-white">
            <div className="p-2 bg-white/20 rounded-lg inline-flex mb-3">
              <span className="material-symbols-outlined text-2xl text-white">savings</span>
            </div>
            <p className="text-sm text-white/80 font-medium">Receita da Plataforma (R$ 10 / serv)</p>
            <h3 className="text-3xl font-black mt-1">
              {formatCurrency(platformRevenue)}
            </h3>
          </div>

          <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg inline-flex mb-3">
              <span className="material-symbols-outlined text-2xl">monitoring</span>
            </div>
            <p className="text-sm text-slate-500 font-medium">Ticket Médio por Serviço</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {formatCurrency(avgTicket)}
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold mb-6">Desempenho Simplificado</h3>
            <div className="space-y-4">
              {/* CSS Progress Bar Mockup for Service Types */}
              {['Limpeza', 'Eletricista', 'Encanador', 'Mudanças'].map((cat, idx) => {
                const percentage = [45, 25, 20, 10][idx];
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{cat}</span>
                      <span className="text-slate-500">{percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-6 text-center">* Dados ilustrativos de distribuição por categoria.</p>
          </div>

          <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
             <div className="w-20 h-20 bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl">inventory</span>
             </div>
             <h3 className="font-bold text-lg mb-2">Exportar Relatório</h3>
             <p className="text-sm text-slate-500 mb-6">
                Baixe a planilha contendo os dados brutos de todos os pedidos finalizados com sucesso para realizar seus fechamentos de mês.
             </p>
             <button onClick={exportToCSV} className="w-full px-2 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
               <span className="material-symbols-outlined text-[18px]">table_chart</span>
               Gerar Planilha
             </button>
          </div>
        </div>

        {/* Conversion Metrics Section */}
        <section className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg">
              <span className="material-symbols-outlined">trending_up</span>
            </div>
            <h3 className="text-lg font-bold">Conversão de Leads por Prestador</h3>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2">Prestador</th>
                    <th className="py-2">Plano</th>
                    <th className="py-2 text-center">Leads (Cliques)</th>
                    <th className="py-2 text-center">Pedidos Pagos</th>
                    <th className="py-2 text-right">Taxa de Conversão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {conversionMetrics.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-3 font-medium">{m.provider_name}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.plan_type === 'plus' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {m.plan_type === 'plus' ? 'Premium' : 'Básico'}
                        </span>
                      </td>
                      <td className="py-3 text-center">{m.total_leads}</td>
                      <td className="py-3 text-center">{m.total_orders_paid}</td>
                      <td className="py-3 text-right font-bold text-primary">{m.conversion_rate}%</td>
                    </tr>
                  ))}
                  {conversionMetrics.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400 italic">Nenhum dado de conversão disponível ainda.</td></tr>
                  )}
                </tbody>
             </table>
          </div>
        </section>

      </div>
    );
}
