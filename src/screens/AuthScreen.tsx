import React, { useState } from 'react';
import { NavigationProps } from '../types';
import { useAuth, UserRole } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { supabase } from '../lib/supabase';
import { useEffect } from 'react';

export default function AuthScreen({ onNavigate }: NavigationProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [signUpRole, setSignUpRole] = useState<UserRole>('client');
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
      // Optional: Store it in localStorage to persist if they browse around then come back
      localStorage.setItem('kng_referral', ref);
    } else {
      const storedRef = localStorage.getItem('kng_referral');
      if (storedRef) setReferralCode(storedRef);
    }
  }, []);

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
              referred_by_code: referralCode,
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
    <div className="flex flex-col min-h-screen bg-black font-display text-white antialiased relative overflow-hidden">
      {/* Cinematic Background Layer */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 scale-110" 
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=2070&auto=format&fit=crop")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-black opacity-60" />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center px-4 py-12 z-10 w-full">
        <div className="w-full max-w-[450px] mx-auto bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl p-8 md:p-12 flex flex-col items-center">
          {/* Logo/Header */}
          <div className="flex flex-col items-center mb-10">
            <div className="size-20 bg-primary text-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-primary/40 rotate-3 transform-cpu">
              <span className="material-symbols-outlined text-5xl">handyman</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter mb-2 text-center leading-none uppercase">
              KNG<span className="text-primary italic">indica</span>
            </h1>
            <p className="text-gray-400 text-center text-[10px] font-black uppercase tracking-[0.25em] italic">
              {isLogin
                ? 'Conecte-se aos Melhores Profissionais'
                : 'Junte-se à Revolução dos Serviços'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">

            {!isLogin && (
              <>
                <div className="flex flex-col gap-2 mb-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tipo de Perfil</label>
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setSignUpRole('client')}
                      className={`flex-1 py-3 text-[10px] font-black uppercase italic tracking-widest rounded-lg transition-all ${signUpRole === 'client' ? 'bg-primary text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}
                    >
                      CLIENTE
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignUpRole('provider')}
                      className={`flex-1 py-3 text-[10px] font-black uppercase italic tracking-widest rounded-lg transition-all ${signUpRole === 'provider' ? 'bg-primary text-white shadow-xl' : 'text-gray-500 hover:text-white'}`}
                    >
                      PRESTADOR
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-gray-600">person</span>
                    <input
                      type="text"
                      required={!isLogin}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-white font-bold"
                      placeholder="Como você se chama?"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">E-mail</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-gray-600">mail</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-white font-bold"
                  placeholder="seu@exemplo.com"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Senha</label>
                {isLogin && (
                  <button type="button" onClick={() => onNavigate('forgotPassword')} className="text-[10px] font-black text-primary hover:underline italic uppercase tracking-widest">
                    Esqueceu?
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-gray-600">lock</span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-10 pr-12 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-white font-bold"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-gray-600 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 flex justify-center items-center w-full bg-primary text-white font-black italic uppercase tracking-[0.1em] py-4 text-sm rounded-xl shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : isLogin ? (
                'Entrar Agora'
              ) : (
                'Criar Minha Conta'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
            <span className="text-xs font-semibold text-slate-500">Ou continue com</span>
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                setIsLoading(true);
                await signInWithGoogle();
              } catch (err: any) {
                setErrorMsg(err.message || 'Erro ao entrar com Google');
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
            className="flex items-center justify-center gap-3 w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 py-3 text-sm rounded-xl font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-white/10 transition-all mb-8 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Entrar com Google
          </button>

          {/* Toggle Mode */}
          <div className="text-center">
            <p className="text-[10px] font-black italic uppercase tracking-widest text-gray-500">
              {isLogin ? "Novo por aqui?" : "Já é um membro?"}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-primary hover:underline py-2"
              >
                {isLogin ? "CRIAR CONTA" : "FAZER LOGIN"}
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
