import React from 'react';
import { NavigationProps } from '../types';

export default function FilterServicesScreen({ onNavigate }: NavigationProps) {
  return (
    <div className="relative flex h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-hidden antialiased">
      {/* Top Bar */}
      <div className="flex items-center bg-white dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 justify-between sticky top-0 z-10">
        <div 
          onClick={() => onNavigate('listing')}
          className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </div>
        <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center">Filtrar Serviços</h2>
        <div className="flex items-center justify-end gap-3">
          <button className="text-primary text-sm font-bold leading-normal hover:opacity-80 transition-opacity">Limpar</button>
          <button onClick={() => onNavigate('home')} className="text-slate-700 dark:text-slate-300 hover:text-primary transition-colors flex items-center justify-center p-1" title="Início">
            <span className="material-symbols-outlined">home</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        {/* Search Bar */}
        <div className="px-4 py-4 bg-white dark:bg-slate-900 mb-2 shadow-sm">
          <label className="flex flex-col min-w-40 h-12 w-full">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-slate-100 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <div className="text-slate-500 dark:text-slate-400 flex items-center justify-center pl-4">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input 
                className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-0 border-none bg-transparent h-full placeholder:text-slate-500 px-4 pl-2 text-base font-normal leading-normal" 
                placeholder="Search for services (e.g. Plumbing)"
              />
            </div>
          </label>
        </div>

        <div className="px-4 space-y-8 py-4">
          {/* Categories Section */}
          <section>
            <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold mb-3">Categorias</h3>
            <div className="flex gap-2 flex-wrap">
              <div className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-primary text-white px-4 cursor-pointer hover:bg-primary/90 transition-colors">
                <span className="material-symbols-outlined text-lg">check</span>
                <p className="text-sm font-medium">Encanamento</p>
              </div>
              <div className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <p className="text-sm font-medium">Limpeza</p>
              </div>
              <div className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <p className="text-sm font-medium">Elétrica</p>
              </div>
              <div className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <p className="text-sm font-medium">Jardinagem</p>
              </div>
              <div className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <p className="text-sm font-medium">Pintura</p>
              </div>
              <div className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <p className="text-sm font-medium">Climatização</p>
              </div>
            </div>
          </section>

          {/* Price Range */}
          <section>
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold">Faixa de Preço</h3>
              <p className="text-primary font-semibold text-sm">R$20 - R$150</p>
            </div>
            <div className="relative w-full h-6 flex items-center">
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full">
                <div className="absolute left-1/4 right-1/4 h-1.5 bg-primary rounded-full"></div>
              </div>
              <div className="absolute left-1/4 top-1/2 -translate-y-1/2 size-5 bg-white border-2 border-primary rounded-full shadow-sm cursor-pointer hover:scale-110 transition-transform"></div>
              <div className="absolute right-1/4 top-1/2 -translate-y-1/2 size-5 bg-white border-2 border-primary rounded-full shadow-sm cursor-pointer hover:scale-110 transition-transform"></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500 font-medium">
              <span>R$0</span>
              <span>R$500+</span>
            </div>
          </section>

          {/* Rating Section */}
          <section>
            <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold mb-3">Avaliação</h3>
            <div className="flex flex-col gap-2">
              <label className="flex items-center justify-between p-3 rounded-xl border-2 border-primary bg-primary/5 cursor-pointer transition-colors group">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-yellow-500 fill-current">star</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">4.0 estrelas ou mais</span>
                </div>
                <input defaultChecked className="text-primary focus:ring-primary h-5 w-5 border-slate-300 rounded-full transition-shadow" name="rating" type="radio" />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-yellow-500">star</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">3.0 estrelas ou mais</span>
                </div>
                <input className="text-primary focus:ring-primary h-5 w-5 border-slate-300 rounded-full transition-shadow" name="rating" type="radio" />
              </label>
            </div>
          </section>

          {/* Distance Section */}
          <section>
            <div className="flex justify-between items-end mb-3">
              <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold">Distância de Rondonópolis</h3>
              <p className="text-primary font-semibold text-sm">Até 15 km</p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="w-full h-32 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden relative shadow-sm">
                <img 
                  className="w-full h-full object-cover" 
                  alt="Map view of Rondonópolis area" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgZ5jQO20fTuG70ZxabiAWbMNsElcOF4jB4wMGhkWJSqqDuSsVkSqwmKIgTqeae5bq_QF71jNEdnOUYov8KtrGtPHVHHvMon1OP8Qfz2Xbyp96tcgyLq5GWqKkZx0kexocgXXn2PU5aB5D9cXSB8gbj9Wk9H1qPxVO026dRLMAdeJpI6qeFvpQp85CL_drqCiLdesMJYJEDUFy1DtXP56aeuJoQvxzPfmHNyFp1uOXZno9U-jW0EMf940VPUvuwNSCjxX_7WssxUc"
                />
                <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                  <div className="size-24 bg-primary/20 border-2 border-primary rounded-full flex items-center justify-center">
                    <div className="size-4 bg-primary rounded-full shadow-lg border border-white"></div>
                  </div>
                </div>
              </div>
              <input 
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary" 
                max="50" 
                min="1" 
                type="range" 
                defaultValue="15" 
              />
            </div>
          </section>

          {/* Availability Section */}
          <section>
            <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold mb-3">Disponibilidade</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-primary bg-primary/5 text-primary font-semibold active:scale-95 transition-transform">
                <span className="material-symbols-outlined text-sm">bolt</span>
                Disponível Agora
              </button>
              <button className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all">
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                Esta Semana
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Action Button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-4 md:static">
        <button 
          onClick={() => {
            alert('Filtros Aplicados!');
            onNavigate('listing');
          }}
          className="flex-1 bg-primary text-white text-base font-bold py-4 rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/95 active:scale-[0.98] transition-all"
        >
          Aplicar Filtros
        </button>
      </div>
    </div>
  );
}
