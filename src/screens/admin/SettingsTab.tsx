import React from 'react';
import { formatCurrency } from '../../lib/formatters';
import { useAdminDashboard } from './AdminDashboardContext';

export function SettingsTab() {
  const {
    setActiveTab,
    platformCommissionFixed,
    premiumSubscriptionPrice,
    setPlatformCommissionFixed,
    setPremiumSubscriptionPrice,
  } = useAdminDashboard();

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div>
        <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-2 font-medium">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar ao Dashboard
        </button>
        <h2 className="text-xl font-bold">Configurações Globais</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Ajuste taxas, categorias e parâmetros gerais de funcionamento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 overflow-hidden relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary/10 text-primary p-2 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <h3 className="text-lg font-bold">Taxas da Plataforma</h3>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Comissão por Serviço Concluído (Fixo R$)</label>
              <div className="flex items-center gap-4 border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/50">
                <span className="text-lg font-bold text-slate-400">R$</span>
                <input 
                  type="number" 
                  value={platformCommissionFixed} 
                  onChange={(e) => setPlatformCommissionFixed(Number(e.target.value))}
                  className="w-full bg-transparent outline-none font-bold text-lg" 
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Valor fixo retido pela plataforma por cada serviço finalizado.</p>
            </div>

            <hr className="border-slate-200 dark:border-slate-800" />

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Mensalidade Assinatura Premium</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={formatCurrency(premiumSubscriptionPrice)} 
                  onChange={(e) => setPremiumSubscriptionPrice(Number(e.target.value.replace(/\D/g, '')) / 100)}
                  className="w-full px-2 py-1.5 netflix-main-bg text-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold" 
                />
              </div>
            </div>

            <button className="w-full py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
              Salvar Taxas
            </button>
          </div>
        </section>

        <section className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 overflow-hidden relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary/10 text-primary p-2 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">help</span>
            </div>
            <h3 className="text-lg font-bold">Suporte e Ajuda</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">Ajuste os links de suporte e contatos do WhatsApp de atendimento.</p>
          <button className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors">
            Configurar Canais
          </button>
        </section>

      </div>
    </div>
  );
}
