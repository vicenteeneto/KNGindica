import React, { useState } from 'react';
import { NavigationProps } from '../types';
import { useAuth, UserRole } from '../AuthContext';
import { supabase } from '../lib/supabase';

export default function AuthScreen({ onNavigate }: NavigationProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [signUpRole, setSignUpRole] = useState<UserRole>('client');

  const { setDevRole } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: signUpRole,
            }
          }
        });
        if (error) throw error;

        // Se precisar de confirmação de email, o supabase não loga automaticamente.
        // Alertar o usuário aqui se necessário, dependendo da config do seu Supabase.
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevLoginSimulation = (role: UserRole) => {
    setDevRole(role);
    if (role === 'admin') onNavigate('adminDashboard');
    else if (role === 'provider') onNavigate('dashboard');
    else onNavigate('home');
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 antialiased relative overflow-hidden">

      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-full h-[40vh] bg-primary/5 dark:bg-primary/10 -skew-y-6 origin-top-right z-0"></div>
      <div className="absolute top-[-10vh] left-[-10vw] w-[40vw] h-[40vw] rounded-full bg-primary/10 dark:bg-primary/5 blur-3xl z-0"></div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center px-4 py-8 md:py-12 z-10 w-full max-w-7xl mx-auto">
        <div className="w-full max-w-md mx-auto sm:bg-white/80 sm:dark:bg-slate-900/80 sm:backdrop-blur-xl sm:border border-slate-200 dark:border-slate-800 sm:shadow-2xl rounded-3xl sm:p-8 flex flex-col">
          {/* Logo/Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined text-4xl">handyman</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-center">
              {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm">
              {isLogin
                ? 'Faça login para encontrar os melhores profissionais.'
                : 'Junte-se à maior comunidade de serviços de Rondonópolis.'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">

            {!isLogin && (
              <>
                <div className="flex flex-col gap-1.5 cursor-pointer">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Quero me cadastrar como</label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSignUpRole('client')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${signUpRole === 'client' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      Cliente
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignUpRole('provider')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${signUpRole === 'provider' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      Prestador
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Nome completo</label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-slate-400">person</span>
                    <input
                      type="text"
                      required={!isLogin}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all dark:text-white"
                      placeholder="Seu nome"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">E-mail</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-slate-400">mail</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all dark:text-white shadow-sm"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Senha</label>
                {isLogin && (
                  <button type="button" onClick={() => onNavigate('forgotPassword')} className="text-xs font-bold text-primary hover:underline">
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-slate-400">lock</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all dark:text-white shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 flex justify-center items-center w-full bg-primary text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : isLogin ? (
                'Entrar'
              ) : (
                'Criar Conta'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Ou continue com</span>
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
          </div>

          {/* Toggle Mode */}
          <div className="text-center">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {isLogin ? "Ainda não tem uma conta?" : "Já possui uma conta?"}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-primary font-bold hover:underline py-2"
              >
                {isLogin ? "Cadastre-se" : "Faça Login"}
              </button>
            </p>
          </div>

          {/* Developer Sandbox Logins (For Testing Purposes) */}
          <div className="mt-8 p-5 bg-orange-50 dark:bg-orange-900/10 border-2 border-dashed border-orange-200 dark:border-orange-800/50 rounded-2xl flex flex-col items-center hidden">
            <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-4">Modo Desenvolvedor</p>
            <div className="grid grid-cols-3 gap-2 w-full">
              <button
                onClick={() => handleDevLoginSimulation('client')}
                className="px-2 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-lg mb-1 block">person</span>
                Cliente
              </button>
              <button
                onClick={() => handleDevLoginSimulation('provider')}
                className="px-2 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-lg mb-1 block">handyman</span>
                Prestador
              </button>
              <button
                onClick={() => handleDevLoginSimulation('admin')}
                className="px-2 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-lg mb-1 block">admin_panel_settings</span>
                Dono
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer minimalista */}
      <footer className="w-full text-center py-6 text-xs text-slate-400 opacity-80 mt-auto z-10 relative">
        Ao continuar, você concorda com nossos <a href="#" className="underline">Termos de Serviço</a> e <a href="#" className="underline">Política de Privacidade</a>.
      </footer>
    </div>
  );
}
