import React, { useState } from 'react';
import { NavigationProps } from '../types';

export default function ForgotPasswordScreen({ onNavigate }: NavigationProps) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 antialiased relative overflow-hidden">
      
      {/* Top Bar Navigation */}
      <header className="flex items-center p-4 border-b border-transparent z-10 w-full max-w-4xl mx-auto">
        <button 
          onClick={() => onNavigate('auth')} 
          className="flex items-center justify-center p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-6 z-10 w-full max-w-7xl mx-auto relative md:-top-12">
        <div className="w-full max-w-md mx-auto sm:bg-white/80 sm:dark:bg-slate-900/80 sm:backdrop-blur-xl sm:border border-slate-200 dark:border-slate-800 sm:shadow-2xl rounded-3xl sm:p-8 flex flex-col">
        {/* Header Content */}
        {!submitted ? (
          <>
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-200 dark:border-blue-800">
              <span className="material-symbols-outlined text-3xl">lock_reset</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-3">Redefinir senha</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
              Informe o e-mail associado à sua conta e enviaremos um link com instruções para redefinir sua senha.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">E-mail</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-slate-400">mail</span>
                  <input 
                    type="email" 
                    required
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all dark:text-white shadow-sm"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="mt-2 w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 transition-all focus:ring-4 focus:ring-primary/20"
              >
                Enviar link de recuperação
              </button>
            </form>
          </>
        ) : (
          /* Success State */
          <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6 shadow-sm border border-green-200 dark:border-green-800">
              <span className="material-symbols-outlined text-4xl">mark_email_read</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-3">E-mail enviado!</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed max-w-[280px]">
              Verifique sua caixa de entrada e siga as instruções para criar uma nova senha.
            </p>

            <button 
              type="button" 
              onClick={() => onNavigate('auth')} 
              className="w-full bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold py-3.5 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              Voltar para o Login
            </button>
            
            <p className="mt-6 text-sm text-slate-500 font-medium">
              Não recebeu? <button type="button" onClick={() => setSubmitted(false)} className="text-primary font-bold hover:underline">Tentar novamente</button>
            </p>
          </div>
        )}

        </div>
      </main>
    </div>
  );
}
