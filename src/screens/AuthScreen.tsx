import React, { useState } from 'react';
import { NavigationProps } from '../types';
import { useAuth, UserRole } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
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

  const { setDevRole, signInWithGoogle } = useAuth();
  const { showModal } = useNotifications();

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
        const { data, error } = await supabase.auth.signUp({
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

        // Se o Supabase estiver configurado para exigir confirmação de e-mail, 
        // a sessão (data.session) virá nula.
        if (data.user && !data.session) {
          showModal({
            title: "Verifique seu E-mail",
            message: `Enviamos um link de confirmação para ${email}. Por favor, verifique sua caixa de entrada (e spam) para ativar sua conta.`,
            type: "success"
          });
          setIsLogin(true); // Volta para o login para ele entrar após confirmar
        }
      }
    } catch (err: any) {
      let msg = err.message || 'Ocorreu um erro.';
      if (msg === 'Invalid login credentials') {
        msg = 'E-mail ou senha incorretos. Se você se cadastrou pelo Google, continue usando o botão do Google ou use "Esqueci minha senha" para criar uma senha.';
      }
      setErrorMsg(msg);
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
    <div className="flex flex-col min-h-screen bg-white dark:bg-black font-display text-slate-900 dark:text-slate-100 antialiased relative overflow-hidden">

      {/* Background Decor - Minimalist Dark Mode */}
      <div className="absolute top-0 right-0 w-full h-[40vh] bg-primary/2 dark:bg-primary/5 -skew-y-6 origin-top-right z-0"></div>
      <div className="absolute top-[-10vh] left-[-10vw] w-[40vw] h-[40vw] rounded-full bg-primary/5 dark:bg-primary/2 blur-3xl z-0"></div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center px-4 py-8 md:py-12 z-10 w-full max-w-7xl mx-auto">
        <div className="w-full max-w-md mx-auto sm:bg-white/80 sm:dark:bg-black/60 sm:backdrop-blur-xl sm:border border-slate-200 dark:border-white/5 sm:shadow-2xl rounded-3xl sm:p-8 flex flex-col">
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
                  <label className="text-sm font-semibold text-slate-700 dark:text-gray-400 ml-1">Quero me cadastrar como</label>
                  <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setSignUpRole('client')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${signUpRole === 'client' ? 'bg-white dark:bg-primary shadow text-primary dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-gray-300'}`}
                    >
                      Cliente
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignUpRole('provider')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${signUpRole === 'provider' ? 'bg-white dark:bg-primary shadow text-primary dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-gray-300'}`}
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
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all dark:text-white"
                      placeholder="Seu nome"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-300 ml-1">E-mail</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-gray-500">mail</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all text-white shadow-sm"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold text-gray-300">Senha</label>
                {isLogin && (
                  <button type="button" onClick={() => onNavigate('forgotPassword')} className="text-xs font-bold text-orange-500 hover:underline">
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-gray-500">lock</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all text-white shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 flex justify-center items-center w-full bg-orange-500 text-black font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/30 hover:bg-orange-600 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
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



        </div>
      </main>

      {/* Footer minimalista */}
      <footer className="w-full text-center py-6 text-xs text-slate-400 opacity-80 mt-auto z-10 relative">
        Ao continuar, você concorda com nossos <a href="#" className="underline">Termos de Serviço</a> e <a href="#" className="underline">Política de Privacidade</a>.
      </footer>
    </div>
  );
}
