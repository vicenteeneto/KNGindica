import React from 'react';
import { NavigationProps } from '../types';

export default function CategoriesScreen({ onNavigate }: NavigationProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      onNavigate('listing', { searchQuery });
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex min-h-screen w-full flex-col max-w-5xl mx-auto bg-white dark:bg-slate-900 shadow-xl overflow-x-hidden transition-all duration-300">
        
        <header className="flex items-center bg-white dark:bg-slate-900 p-4 pb-2 justify-between sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800 transition-colors">
          <button onClick={() => onNavigate('home')} className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center lg:text-left">Categorias</h2>
          <div className="flex size-10 items-center justify-end">
            <button className="flex items-center justify-center rounded-full size-10 bg-transparent text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-[24px]">more_vert</span>
            </button>
          </div>
        </header>

        <main className="flex-1 pb-24">
          <div className="px-4 py-8 max-w-none lg:mx-0 lg:ml-4 transition-all duration-300">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2 text-center lg:text-left">Encontre o profissional ideal</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base mb-6 text-center lg:text-left">Selecione uma categoria para ver os especialistas disponíveis na sua região.</p>
            
            <label className="flex flex-col w-full">
              <div className="flex w-full items-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all px-4 h-14 shadow-inner">
                <span className="material-symbols-outlined text-slate-400 mr-2 text-[24px]">search</span>
                <input 
                  className="w-full border-none bg-transparent focus:ring-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-base md:text-lg outline-none" 
                  placeholder="O que você precisa hoje?" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                />
              </div>
            </label>
          </div>

          <div className="px-4 py-8 max-w-none lg:mx-0 lg:ml-4 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100">Principais Serviços</h2>
              <button onClick={() => onNavigate('listing')} className="text-primary text-sm font-semibold cursor-pointer hover:underline">Ver todos</button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { icon: 'cleaning_services', title: 'Limpeza', desc: 'Residencial e pós-obra' },
                { icon: 'bolt', title: 'Elétrica', desc: 'Reparos e instalações' },
                { icon: 'water_drop', title: 'Hidráulica', desc: 'Vazamentos e canos' },
                { icon: 'format_paint', title: 'Pintura', desc: 'Paredes e acabamento' },
                { icon: 'handyman', title: 'Montagem', desc: 'Móveis e reparos' },
                { icon: 'computer', title: 'Tecnologia', desc: 'PC e Celulares' },
                { icon: 'content_cut', title: 'Beleza', desc: 'Cabelo e Estética' },
                { icon: 'local_shipping', title: 'Fretes', desc: 'Mudanças e carreto' },
              ].map((cat, idx) => (
                <div onClick={() => onNavigate('listing')} key={idx} className="group flex flex-col gap-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 p-5 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer">
                  <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-3xl">{cat.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-slate-900 dark:text-slate-100 font-bold text-base">{cat.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{cat.desc}</p>
                  </div>
                </div>
              ))}

              <div onClick={() => onNavigate('listing')} className="group flex flex-col md:flex-row md:items-center gap-3 md:gap-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 p-5 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer col-span-2">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-3xl">construction</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-slate-900 dark:text-slate-100 font-bold text-base">Reformas</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Obras em geral e acabamento</p>
                </div>
                <div className="ml-auto text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors hidden sm:block">
                  <span className="material-symbols-outlined text-[32px]">chevron_right</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-8 mt-4 max-w-none lg:mx-0 lg:ml-4 transition-all duration-300">
            <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-primary to-blue-600 p-6 md:p-10 text-white relative shadow-xl shadow-primary/20">
              <div className="relative z-10 md:max-w-md">
                <h3 className="text-xl md:text-2xl font-bold mb-2">Precisa de algo mais específico?</h3>
                <p className="text-white/80 text-sm md:text-base mb-6 leading-relaxed">Fale com nosso suporte para encontrar um profissional especializado para a sua necessidade.</p>
                <button onClick={() => onNavigate('helpCenter')} className="bg-white text-primary font-bold px-8 py-3 rounded-xl text-sm hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto shadow-sm">
                  Solicitar ajuda
                </button>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-20 hidden md:block group-hover:scale-110 transition-transform duration-700">
                <span className="material-symbols-outlined text-[200px] leading-none">support_agent</span>
              </div>
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}
