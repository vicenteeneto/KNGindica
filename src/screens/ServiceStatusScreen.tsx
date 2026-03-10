import React from 'react';
import { NavigationProps } from '../types';

export default function ServiceStatusScreen({ onNavigate }: NavigationProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col antialiased">
      {/* Floating Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-10 flex flex-col gap-3 max-w-4xl mx-auto">
        <button 
          onClick={() => onNavigate('checkout')}
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:translate-y-0 hover:-translate-y-0.5 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex justify-center items-center gap-2"
        >
          <span className="material-symbols-outlined">payments</span>
          Efetuar Pagamento
        </button>
        <div className="flex gap-3">
          <button className="flex-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 font-bold py-3.5 px-6 rounded-xl transition-all flex justify-center items-center gap-2">
            <span className="material-symbols-outlined">chat</span>
            Chat
          </button>
          <button className="flex-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 font-bold py-3.5 px-6 rounded-xl transition-all flex justify-center items-center gap-2">
            <span className="material-symbols-outlined">call</span>
            Ligar
          </button>
        </div>
      </div>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center p-4 justify-between max-w-4xl mx-auto w-full">
          <button 
            onClick={() => onNavigate('home')}
            className="text-slate-900 dark:text-slate-100 flex size-10 items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">Status do Serviço</h2>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full pb-24">
        {/* Success Animation/Icon Area */}
        <div className="flex flex-col px-4 py-8">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="size-24 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-5xl">check_circle</span>
              </div>
              <div className="absolute -bottom-1 -right-1 size-8 bg-green-500 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xs">priority_high</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Serviço Confirmado</h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-[280px]">O profissional aceitou sua solicitação e já está se preparando para o atendimento.</p>
            </div>
            
            <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-primary/50 transition-colors" onClick={() => onNavigate('profile', { professionalId: 'p1' })}>
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0">
                  <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZtE89SiSEg9xGbgHmE75NNg2HoZmR3gUhNBNCYEwoBeWmHSlXb5hbosTVApCHZQViJRxLT3QojR2tE9GelPQA8oiwPkKJUJNcFhkzvgufiFEd-IJioV3q5uBuEuPUmvdKxpr5fOtYo6iWyG7R6QDWg8I0xVEvmkDv9NJrO1n1PstMoxIPhXnT1JE6pNzI1ll2qYfmIobIU4QIxcj9bXKURTfOjoGaknFHQwm6yewuGR1EIEnH5IjB3vVDpuKtvPWh7PgD435FUA8" alt="Profile photo" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Ricardo Oliveira</h4>
                  <div className="flex items-center gap-1 text-amber-500">
                    <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="text-xs font-semibold">4.9 (128 avaliações)</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="size-10 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); alert('Calling...'); }}>
                    <span className="material-symbols-outlined">call</span>
                  </button>
                  <button className="size-10 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-colors" onClick={(e) => { e.stopPropagation(); onNavigate('chat'); }}>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Service Details */}
        <div className="px-4 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Detalhes do Agendamento</h3>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden shadow-sm">
            {/* Service Info */}
            <div className="flex items-center gap-4 p-4">
              <div className="size-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined">cleaning_services</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Serviço</p>
                <p className="text-slate-900 dark:text-slate-100 font-semibold">Limpeza Residencial Premium</p>
              </div>
            </div>
            
            {/* Date/Time */}
            <div className="flex items-center gap-4 p-4">
              <div className="size-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined">calendar_today</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Data e Horário</p>
                <p className="text-slate-900 dark:text-slate-100 font-semibold">15 de Outubro, 14:00</p>
              </div>
            </div>
            
            {/* Location */}
            <div className="flex items-center gap-4 p-4">
              <div className="size-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined">location_on</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Localização</p>
                <p className="text-slate-900 dark:text-slate-100 font-semibold line-clamp-1">Av. Paulista, 1000 - Bela Vista</p>
              </div>
            </div>
            
            {/* Payment */}
            <div className="flex items-center gap-4 p-4">
              <div className="size-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Valor Total</p>
                <p className="text-slate-900 dark:text-slate-100 font-bold">R$ 150,00</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded text-xs font-bold uppercase">
                Pago
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="pt-4 flex flex-col gap-3">
            <button className="w-full h-12 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
              Acompanhar Profissional
            </button>
            <button 
              onClick={() => onNavigate('home')}
              className="w-full h-12 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
            >
              Ver Meus Agendamentos
            </button>
            <button 
              onClick={() => onNavigate('helpCenter')}
              className="w-full h-12 bg-transparent text-slate-500 hover:text-red-500 font-bold rounded-xl transition-colors text-sm"
            >
              Tive um problema / Abrir Disputa
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 pb-6 pt-2 z-20">
        <div className="flex max-w-4xl mx-auto gap-2">
          <button onClick={() => onNavigate('home')} className="flex flex-1 flex-col items-center justify-end gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
            <span className="material-symbols-outlined">home</span>
            <p className="text-[10px] font-medium leading-normal tracking-[0.015em]">Início</p>
          </button>
          <button onClick={() => onNavigate('listing')} className="flex flex-1 flex-col items-center justify-end gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
            <span className="material-symbols-outlined">search</span>
            <p className="text-[10px] font-medium leading-normal tracking-[0.015em]">Busca</p>
          </button>
          <button className="flex flex-1 flex-col items-center justify-end gap-1 text-primary">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
            <p className="text-[10px] font-medium leading-normal tracking-[0.015em]">Agenda</p>
          </button>
          <button className="flex flex-1 flex-col items-center justify-end gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
            <span className="material-symbols-outlined">person</span>
            <p className="text-[10px] font-medium leading-normal tracking-[0.015em]">Perfil</p>
          </button>
        </div>
      </nav>
    </div>
  );
}
