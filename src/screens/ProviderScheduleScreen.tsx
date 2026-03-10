import React from 'react';
import { NavigationProps } from '../types';
import ProviderMobileNav from '../components/ProviderMobileNav';

export default function ProviderScheduleScreen({ onNavigate }: NavigationProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col antialiased">
      <div className="relative flex min-h-screen w-full flex-col max-w-7xl mx-auto bg-white dark:bg-slate-900 shadow-xl overflow-x-hidden">
        
        {/* Header */}
        <header className="flex items-center p-4 bg-primary text-white sticky top-0 z-10">
          <button 
            onClick={() => onNavigate('dashboard')} 
            className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold tracking-tight flex-1 text-center">Agenda de Serviços</h1>
          <div className="w-10"></div>
        </header>

        {/* Main content placeholder */}
        <main className="flex-1 p-6 flex flex-col items-center justify-center text-center">
          <div className="bg-primary/10 text-primary p-6 rounded-full inline-block mb-4 shadow-sm border border-primary/20">
            <span className="material-symbols-outlined text-5xl">event_available</span>
          </div>
          <h2 className="text-2xl mt-4 font-bold text-slate-900 dark:text-slate-100">Gerencie seu Tempo</h2>
          <p className="text-slate-500 mt-2 max-w-sm">Determine seus dias de trabalho, horários de expediente e bloqueie os dias que estiver indisponível.</p>
          
          <button className="mt-8 relative px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 group overflow-hidden">
            <span className="relative z-10 flex items-center gap-2">Configurar Disponibilidade <span className="material-symbols-outlined text-sm">arrow_forward</span></span>
            <div className="absolute inset-0 h-full w-full scale-0 rounded-2xl transition-all duration-300 group-hover:scale-100 group-hover:bg-white/10"></div>
          </button>
        </main>

        <ProviderMobileNav onNavigate={onNavigate} currentScreen="providerSchedule" />
      </div>
    </div>
  );
}
