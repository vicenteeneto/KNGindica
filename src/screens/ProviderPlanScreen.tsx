import React from 'react';
import { NavigationProps } from '../types';

export default function ProviderPlanScreen({ onNavigate }: NavigationProps) {
  return (
    <div className="bg-background-light dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Header */}
      <nav className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 flex items-center shadow-sm">
        <button 
          onClick={() => onNavigate('registration')}
          className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="ml-2 text-base md:text-lg font-bold tracking-tight flex-1 flex justify-center text-center">Escolha seu Plano</h1>
        <button 
          onClick={() => onNavigate('home')}
          className="p-2 -mr-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
          title="Início"
        >
          <span className="material-symbols-outlined">home</span>
        </button>
      </nav>

      <main className="flex-grow px-4 py-6 max-w-5xl mx-auto w-full flex flex-col items-center">
        {/* Progress Tracker */}
        <div className="w-full mb-8">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Configuração da conta</span>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Passo 2 de 3</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
            <div className="h-full bg-primary w-2/3 rounded-full"></div>
            <div className="h-full bg-transparent w-1/3"></div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8 px-2">
          <h2 className="text-xl md:text-2xl font-bold leading-tight mb-3 text-slate-900 dark:text-white">Torne-se um prestador em Rondonópolis</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Selecione o plano ideal para o seu negócio crescer na região e conecte-se com milhares de clientes.
          </p>
        </div>

        {/* Plans Container */}
        <div className="w-full space-y-6">
          
          {/* Free Plan */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Prestador Free</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ideal para quem está começando</p>
              </div>
              <span className="material-symbols-outlined text-slate-400">person</span>
            </div>
            
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">R$ 0</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">/mês</span>
            </div>

            <ul className="space-y-4 mb-6">
              <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">check_circle</span>
                <span>10% de comissão por serviço</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">check_circle</span>
                <span>Perfil básico de exibição</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-400 dark:text-slate-500 opacity-60">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-base shrink-0 mt-0.5">block</span>
                <span className="line-through">Fotos ilimitadas no perfil</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-400 dark:text-slate-500 opacity-60">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-base shrink-0 mt-0.5">block</span>
                <span className="line-through">Destaque nas buscas</span>
              </li>
            </ul>

            <button 
              onClick={() => alert('Plano Free selecionado. Redirecionando para o painel...')}
              className="w-full py-3.5 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary/5 transition-colors active:scale-[0.98]"
            >
              Começar agora
            </button>
          </div>

          {/* Premium Plan (Recommended) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-primary shadow-lg shadow-primary/10 relative overflow-hidden flex flex-col">
            <div className="bg-primary py-1.5 text-center">
              <span className="text-[10px] font-bold text-white tracking-widest uppercase">Recomendado</span>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Prestador Afiliado</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Para quem quer escala total</p>
                </div>
                <span className="material-symbols-outlined text-primary">verified</span>
              </div>
              
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">R$ 49,90</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">/mês</span>
              </div>

              <ul className="space-y-4 mb-6">
                <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">check_circle</span>
                  <span className="font-semibold">0% de comissão por serviço</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">check_circle</span>
                  <span>Perfil completo com fotos</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">check_circle</span>
                  <span>Visibilidade prioritária (2x mais)</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">check_circle</span>
                  <span>Avaliações públicas em destaque</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">check_circle</span>
                  <span>Suporte prioritário 24/7</span>
                </li>
              </ul>

              <button 
                onClick={() => alert('Plano Afiliado selecionado. Redirecionando para pagamento...')}
                className="w-full py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors shadow-md shadow-primary/20 active:scale-[0.98]"
              >
                Começar agora
              </button>
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-400 mt-6 px-4 pb-4">
            Ao selecionar um plano, você concorda com nossos termos de serviço para prestadores em Rondonópolis.
          </p>
        </div>
      </main>
    </div>
  );
}
