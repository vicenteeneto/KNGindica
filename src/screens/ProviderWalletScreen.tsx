import React from 'react';
import { NavigationProps } from '../types';
import ProviderMobileNav from '../components/ProviderMobileNav';

export default function ProviderWalletScreen({ onNavigate }: NavigationProps) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden">
      
      {/* Header */}
      <header className="flex items-center p-4 bg-primary text-white sticky top-0 z-10">
        <button 
          onClick={() => onNavigate('dashboard')} 
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight flex-1 text-center">Minha Carteira</h1>
        <div className="w-10 flex justify-end">
          <button className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors" title="Ajuda">
            <span className="material-symbols-outlined">help</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full pb-24">
        
        {/* Balance Card Section */}
        <div className="bg-primary pt-2 pb-12 px-4 rounded-b-[40px] shadow-sm relative">
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            <p className="text-white/80 text-sm font-medium mb-1 uppercase tracking-wider">Saldo Disponível</p>
            <div className="flex items-start gap-1">
              <span className="text-white/80 font-bold text-xl mt-1">R$</span>
              <h2 className="text-5xl font-black text-white tracking-tighter">1.450,00</h2>
            </div>
            
            <div className="flex gap-4 mt-6 w-full max-w-sm">
              <button 
                onClick={() => alert('Abrir fluxo de saque (Transferência/Pix)')}
                className="flex-1 bg-white text-primary font-bold py-3.5 px-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined">account_balance</span>
                Sacar
              </button>
              <button className="flex-1 bg-primary-600 text-white font-bold py-3.5 px-4 rounded-2xl border border-white/20 flex items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all">
                <span className="material-symbols-outlined">receipt_long</span>
                Extrato
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full px-4 -mt-6 relative z-10 space-y-6">
          
          {/* Quick Metrics */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex divide-x divide-slate-100 dark:divide-slate-700">
            <div className="flex-1 flex flex-col items-center justify-center py-2 px-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 text-center">A Receber</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">R$ 380,00</p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center py-2 px-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 text-center">Total (Mês)</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">R$ 2.150,00</p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center py-2 px-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 text-center">Comissão</p>
              <p className="text-lg font-bold text-rose-500 dark:text-rose-400">10%</p>
            </div>
          </div>

          {/* Transactions List */}
          <section>
            <div className="flex justify-between items-center mb-4 px-2">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Recentes</h3>
              <button className="text-primary text-sm font-semibold hover:underline">Ver tudo</button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
              
              {/* Transaction 1 */}
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Serviço Concluído</p>
                    <p className="text-xs text-slate-500">Reparo de Ar Condicionado • Hoje</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">+ R$ 225,00</p>
                  <p className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded ml-auto mt-1 w-max">Líquido</p>
                </div>
              </div>

              {/* Transaction 2 */}
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
                    <span className="material-symbols-outlined">electric_bolt</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Serviço Concluído</p>
                    <p className="text-xs text-slate-500">Instalação Elétrica • Ontem</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">+ R$ 180,00</p>
                  <p className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded ml-auto mt-1 w-max">Líquido</p>
                </div>
              </div>

              {/* Transaction 3: Withdrawal */}
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center">
                    <span className="material-symbols-outlined">account_balance</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Saque Solicitado</p>
                    <p className="text-xs text-slate-500">Itaú Unibanco • 02 Mar</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-rose-600 dark:text-rose-400">- R$ 500,00</p>
                  <p className="text-[10px] text-amber-500 border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded ml-auto mt-1 w-max">Processando</p>
                </div>
              </div>

              {/* Transaction 4 */}
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Serviço Concluído</p>
                    <p className="text-xs text-slate-500">Limpeza Pós-Obra • 28 Fev</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">+ R$ 350,00</p>
                  <p className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded ml-auto mt-1 w-max">Líquido</p>
                </div>
              </div>

            </div>
          </section>

          {/* Banner Help */}
          <section className="bg-slate-800 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px] flex items-start justify-end p-4 pointer-events-none">
              <span className="material-symbols-outlined text-5xl text-white/10">verified_user</span>
            </div>
            
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">shield</span>
                Garantia KNGflow
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm">
                Seu dinheiro está seguro. Todos os pagamentos são retidos até a conclusão e aprovação mútua do serviço.
              </p>
            </div>
            <button className="relative z-10 px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold transition-colors whitespace-nowrap">
              Saiba Mais
            </button>
          </section>

        </div>
      </main>
      
      <ProviderMobileNav onNavigate={onNavigate} currentScreen="providerWallet" />
    </div>
  );
}
