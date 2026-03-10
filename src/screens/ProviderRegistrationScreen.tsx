import React from 'react';
import { NavigationProps } from '../types';

export default function ProviderRegistrationScreen({ onNavigate }: NavigationProps) {
  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Header / Navigation */}
      <nav className="sticky top-0 z-10 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-4 flex items-center">
        <button 
          onClick={() => onNavigate('home')}
          className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="ml-2 text-lg font-semibold tracking-tight">Cadastro de Prestador</h1>
      </nav>

      {/* Main Content */}
      <main className="flex-grow px-6 py-8 max-w-3xl mx-auto w-full">
        {/* Welcome Header */}
        <header className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Seja bem-vindo!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Preencha suas informações profissionais para começar a receber solicitações.</p>
        </header>

        <form className="space-y-6">
          {/* Profile Photo Upload */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border-4 border-white dark:border-slate-700 shadow-sm">
                <img 
                  className="w-full h-full object-cover" 
                  alt="Default professional profile avatar placeholder" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwjaCpFDwnk_xuJ1s4cjK9FQ8HLdKZxeDgPO5zw2dd9bSh3wl-G0O2ZNFqKd_Ey6zkJLzgz4yFjh3AA25mnOdI2eLem-vsiprklKeEz_0SMVYkUH6OaYAZq_rLoco7UHbhHQjB6nrEad64IWmX412t5NzLc3H5dgtPbfEEwfzxuuJ2xShGkE3TPRBSz8_-clwCfOLvGuoHxpIwr5uYd0TxRmANgGBE-Uao0KotGyRhhbQdQ8Bt17QygQgkOmvGPI6orCDIpiBYBDc"
                />
              </div>
              <button className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:bg-primary/90 transition-transform active:scale-95 flex items-center justify-center" type="button">
                <span className="material-symbols-outlined text-sm">photo_camera</span>
              </button>
            </div>
            <p className="mt-3 text-xs font-medium text-primary">Foto de Perfil Profissional</p>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="name">Nome Completo</label>
            <input className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" id="name" placeholder="Ex: João Silva" type="text"/>
          </div>

          {/* CPF/CNPJ */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="document">CPF ou CNPJ</label>
            <input className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" id="document" placeholder="000.000.000-00" type="text"/>
          </div>

          {/* Professional Category */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="category">Categoria Profissional</label>
            <div className="relative">
              <select defaultValue="" className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none appearance-none" id="category">
                <option disabled value="">Selecione uma categoria</option>
                <option value="electrician">Eletricista</option>
                <option value="plumber">Encanador</option>
                <option value="painter">Pintor</option>
                <option value="carpenter">Marceneiro</option>
                <option value="cleaner">Limpeza e Faxina</option>
                <option value="it">Suporte Técnico de TI</option>
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
            </div>
          </div>

          {/* Bio / Description */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="bio">Bio / Descrição Profissional</label>
            <textarea className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none resize-none" id="bio" placeholder="Conte um pouco sobre sua experiência e diferenciais..." rows={4}></textarea>
            <p className="text-[10px] text-slate-400 text-right italic">Mínimo de 30 caracteres</p>
          </div>

          {/* City (Fixed) */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Cidade de Atuação</label>
            <div className="flex items-center w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl cursor-not-allowed">
              <span className="material-symbols-outlined text-primary text-sm mr-2">location_on</span>
              <span className="text-slate-600 dark:text-slate-300">Rondonópolis - MT</span>
              <span className="ml-auto material-symbols-outlined text-slate-400 text-sm">lock</span>
            </div>
            <p className="text-[10px] text-slate-400">Atualmente disponível apenas para Rondonópolis.</p>
          </div>

          {/* Footer Spacing */}
          <div className="h-12"></div>
        </form>
      </main>

      {/* Bottom Action Bar */}
      <footer className="sticky bottom-0 p-6 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light dark:via-background-dark to-transparent">
        <button 
          onClick={() => onNavigate('plan')}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center"
        >
          <span>Finalizar Cadastro</span>
          <span className="material-symbols-outlined ml-2 text-sm">check_circle</span>
        </button>
      </footer>
    </div>
  );
}
