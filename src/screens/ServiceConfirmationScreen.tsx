import React from 'react';
import { NavigationProps } from '../types';

interface ServiceConfirmationScreenProps extends NavigationProps {
  params?: any;
}

export default function ServiceConfirmationScreen({ onNavigate, params }: ServiceConfirmationScreenProps) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 antialiased">
      {/* Header */}
      <div className="flex items-center bg-white dark:bg-slate-900 p-4 border-b border-slate-100 dark:border-slate-800 justify-between sticky top-0 z-10">
        <button 
          onClick={() => onNavigate('home')} 
          className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">Confirmação</h2>
      </div>

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Success Content */}
        <div className="flex flex-col px-6 py-10 items-center text-center">
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-[1.5] opacity-20"></div>
            <div className="bg-primary text-white rounded-full p-6 flex items-center justify-center relative shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined !text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mb-8">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100">Solicitação Enviada!</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed max-w-[280px] mx-auto">
              Sua solicitação de serviço foi recebida com sucesso. O profissional será notificado imediatamente.
            </p>
          </div>

          <div className="flex flex-col w-full max-w-sm mx-auto gap-3">
            <button 
              onClick={() => onNavigate('myRequests')}
              className="w-full flex h-12 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-primary text-white text-sm font-bold leading-normal tracking-wide transition-all hover:bg-primary/90 active:scale-95 shadow-sm"
            >
              <span className="truncate">Ver Serviços</span>
            </button>
            <button 
              onClick={() => onNavigate('home')}
              className="w-full flex h-12 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold leading-normal tracking-wide transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <span className="truncate">Voltar para o Início</span>
            </button>
          </div>
        </div>

        {/* Request Summary Card */}
        <div className="px-6 mb-8 max-w-2xl mx-auto w-full">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight mb-6">Resumo da Solicitação</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">cleaning_services</span>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Serviço</p>
                </div>
                <p className="text-slate-900 dark:text-slate-100 font-bold">{params?.categoryName || 'Serviço sob Medida'}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">person</span>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Profissional</p>
                </div>
                <p className="text-slate-900 dark:text-slate-100 font-bold text-right">{params?.providerName || 'Aguardando Atribuição'}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-xl">calendar_today</span>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Data</p>
                </div>
                <p className="text-slate-900 dark:text-slate-100 font-bold text-right">{params?.date || 'Não específicada'}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Status do Valor</p>
                  <p className="text-emerald-600 dark:text-emerald-400 text-base font-bold">A Combinar (Orçamento)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-4 pb-4 pt-2 flex justify-between items-center z-20">
        <button onClick={() => onNavigate('home')} className="flex flex-1 flex-col items-center gap-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
          <span className="material-symbols-outlined text-2xl">home</span>
          <p className="text-[10px] font-medium">Início</p>
        </button>
        <button onClick={() => onNavigate('myRequests')} className="flex flex-1 flex-col items-center gap-1 text-primary">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
          <p className="text-[10px] font-medium">Serviços</p>
        </button>
        <button onClick={() => onNavigate('chatList')} className="flex flex-1 flex-col items-center gap-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
          <span className="material-symbols-outlined text-2xl">chat_bubble</span>
          <p className="text-[10px] font-medium">Chat</p>
        </button>
        <button onClick={() => onNavigate('userProfile')} className="flex flex-1 flex-col items-center gap-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
          <span className="material-symbols-outlined text-2xl">person</span>
          <p className="text-[10px] font-medium">Perfil</p>
        </button>
      </div>
    </div>
  );
}
