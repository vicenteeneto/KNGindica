import React, { useState, useEffect } from 'react';
import StarRating from '../components/StarRating';

import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';

const TEASER_COUNT = 5; // Quantos cards mostrar antes do "blur wall"

export default function WhatsAppSearchScreen({ onNavigate, params }: NavigationProps) {
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  const searchId = params?.searchId;
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState('');

  // Email register state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!searchId) { setError('Link inválido.'); setLoading(false); return; }
      try {
        setLoading(true);
        const { data: search, error: searchError } = await supabase
          .from('whatsapp_searches')
          .select('*, service_categories(id, name)')
          .eq('id', searchId)
          .single();

        if (searchError || !search) { setError('Pesquisa não encontrada ou expirada.'); setLoading(false); return; }

        setCategoryName(search.service_categories?.name || 'Serviços');
        const categoryId = search.category_id;

        const { data: serviceLinks } = await supabase
          .from('provider_services')
          .select('provider_id')
          .eq('category_id', categoryId);

        if (!serviceLinks || serviceLinks.length === 0) { setProviders([]); setLoading(false); return; }

        const providerIds = serviceLinks.map(s => s.provider_id);
        const { data: providersData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', providerIds)
          .eq('role', 'provider');

        setProviders(providersData || []);
      } catch (err: any) {
        setError('Erro ao carregar profissionais.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    if (user && searchId) {
       localStorage.removeItem('pendingSearchId');
    } else if (!user && searchId) {
       // Persiste para garantir volta após login por qualquer via
       localStorage.setItem('pendingSearchId', searchId);
    }
  }, [searchId, user]);

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setIsRegistering(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
      });
      if (signUpError) throw signUpError;
      
      // Garante que o searchId esteja no storage para a restauração no App.tsx
      if (searchId) localStorage.setItem('pendingSearchId', searchId);
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen netflix-main-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <span className="material-symbols-outlined animate-spin text-5xl text-primary">progress_activity</span>
          <p className="text-white font-bold animate-pulse">maia está localizando os melhores profissionais...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen netflix-main-bg flex items-center justify-center p-6">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-red-400 mb-4 block">error</span>
          <p className="text-white font-bold text-lg">{error}</p>
          <button onClick={() => onNavigate('home')} className="mt-6 bg-primary text-white px-6 py-3 rounded-xl font-bold">
            Ir para o Início
          </button>
        </div>
      </div>
    );
  }

  const isLogged = !!user;
  // Para não logados: mostrar até TEASER_COUNT cards, porém com nome/dados ocultos
  const visibleProviders = isLogged ? providers : providers.slice(0, TEASER_COUNT);

  return (
    <div className="relative flex min-h-screen w-full flex-col netflix-main-bg shadow-2xl overflow-x-hidden transition-all duration-300">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-primary/20 via-primary/5 to-transparent pointer-events-none" />
      <div className="fixed -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <main className="relative z-10 max-w-lg mx-auto px-4 py-12 flex flex-col min-h-screen">

        {/* Header - KNGflix Cinematic */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full border border-primary/20 mb-8 animate-fade-in">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Oportunidade Local</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black mb-6 leading-[0.9] italic tracking-tighter drop-shadow-2xl">
            ENCONTRAMOS <br />
            <span className="text-primary">{providers.length}</span>{' '}
            EXPECIALISTA{providers.length !== 1 ? 'S' : ''} EM{' '}
            <span className="text-primary">{categoryName.toUpperCase()}</span>
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest opacity-60">
            Mais bem avaliados em Rondonópolis
          </p>
            {/* Provider Grid - Netflix Style Posters */}
          <div className="w-full max-w-none px-4 lg:px-12 grid grid-cols-2 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 transition-all duration-300">
          {visibleProviders.length > 0 ? (
            visibleProviders.map((p) => {
              const isBlurred = !isLogged;
              return (
                <div
                  key={p.id}
                  onClick={() => isLogged && onNavigate('profile', { professionalId: p.id })}
                  className={`group relative aspect-[2/3] lg:aspect-video rounded-2xl overflow-hidden bg-white/5 border border-white/5 transition-all active:scale-95 cursor-pointer ${
                    isLogged ? 'hover:border-primary/50 hover:shadow-2xl' : ''
                  }`}
                >
                  {/* Photo with Blur Filter */}
                  <img
                    src={p.avatar_url || p.cover_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || 'P')}&background=random&color=fff`}
                    className={`w-full h-full object-cover transition-all duration-700 ${isBlurred ? 'blur-md opacity-40' : 'group-hover:scale-110'}`}
                    alt={p.full_name}
                  />
                  
                  {/* Cinematic Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                     <div className="bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-black flex items-center gap-1 border border-white/10 w-fit">
                        <span className="material-symbols-outlined text-[10px] text-yellow-500 filled">star</span>
                        <span className="text-white">{(p.stats?.rating || 5.0).toFixed(1).replace('.', ',')}</span>
                     </div>
                  </div>

                  {/* Info Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                     <div className={`${isBlurred ? 'blur-[4px] select-none' : ''}`}>
                        <h3 className="text-sm font-black text-white leading-tight truncate">{p.full_name?.toUpperCase()}</h3>
                        <p className="text-[8px] font-bold text-primary italic uppercase tracking-tighter truncate">
                           {p.service || categoryName}
                        </p>
                     </div>
                  </div>

                  {/* Lock UI for non-logged users */}
                  {isBlurred && (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <div className="bg-black/40 backdrop-blur-md size-10 rounded-full flex items-center justify-center border border-white/10 shadow-2xl">
                        <span className="material-symbols-outlined text-white text-lg">lock</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-2 text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/20">
              <span className="material-symbols-outlined text-4xl text-slate-600 mb-4 block">search_off</span>
              <p className="text-slate-400 font-medium">Nenhum profissional encontrado.</p>
            </div>
          )}
        </div>
      </div>

        {/* CTA Wall — só para não logados com resultados */}
        {!isLogged && providers.length > 0 && (
          <div className="mt-auto sticky bottom-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-16 pb-8">
            {!showEmailForm ? (
              <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 text-center">
                  <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-primary text-2xl">lock_open</span>
                  </div>
                  <h2 className="text-xl font-black text-white mb-1 italic tracking-tighter">
                    Veja os contatos completos
                  </h2>
                  <p className="text-slate-400 text-xs font-medium mb-5">
                    Cadastre-se grátis para ver o perfil e contato {providers.length === 1 ? 'do profissional' : `de todos os ${providers.length} profissionais`}.
                  </p>

                  {/* Google Button */}
                  <button
                    onClick={async () => {
                      try {
                        // Salva o searchId para restaurar após o login OAuth (como fallback)
                        if (searchId) localStorage.setItem('pendingSearchId', searchId);
                        await signInWithGoogle(window.location.href);
                      } catch (err) { console.error(err); }
                    }}
                    className="w-full bg-white text-black py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-gray-100 active:scale-95 transition-all shadow-lg mb-3"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Entrar com Google
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-[10px] text-slate-500 font-bold">ou</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  {/* Email Register Button */}
                  <button
                    onClick={() => setShowEmailForm(true)}
                    className="w-full bg-white/5 border border-white/20 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-base">email</span>
                    Cadastrar com E-mail
                  </button>

                  <p className="mt-4 text-[9px] text-slate-600 font-bold tracking-widest">É rápido, seguro e gratuito</p>
                </div>
              </div>
            ) : (
              /* Email Registration Form */
              <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-[2rem] shadow-2xl">
                <button onClick={() => setShowEmailForm(false)} className="text-slate-400 text-xs flex items-center gap-1 mb-4 hover:text-white">
                  <span className="material-symbols-outlined text-sm">arrow_back</span> Voltar
                </button>
                <h2 className="text-lg font-black text-white mb-4">Crie sua conta</h2>
                <form onSubmit={handleEmailRegister} className="flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm outline-none focus:border-primary"
                  />
                  <input
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm outline-none focus:border-primary"
                  />
                  <input
                    type="password"
                    placeholder="Senha (mín. 6 dígitos)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm outline-none focus:border-primary"
                  />
                  {regError && <p className="text-red-400 text-xs">{regError}</p>}
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="w-full bg-primary text-white py-3.5 rounded-2xl font-black text-sm disabled:opacity-60 active:scale-95 transition-all mt-1"
                  >
                    {isRegistering ? 'Cadastrando...' : 'Criar Conta e Ver Lista'}
                  </button>
                </form>
                <button
                  onClick={async () => {
                    try { await signInWithGoogle(window.location.href); } catch (err) { console.error(err); }
                  }}
                  className="w-full mt-3 bg-white/5 border border-white/10 text-white py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Usar Google em vez disso
                </button>
              </div>
            )}
          </div>
        )}

        {/* Logged-in footer action */}
        {isLogged && (
          <div className="mt-8 text-center mb-24">
            <button onClick={() => onNavigate('home')} className="text-primary font-black text-sm hover:underline">
              Ir para a Página Inicial →
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-10 px-4 text-center border-t border-white/5 relative z-10">
        <div className="flex justify-center items-center gap-2 mb-2">
          <span className="text-[10px] font-black tracking-widest text-primary/60">KNGindica</span>
        </div>
        <p className="text-[9px] text-slate-700 tracking-widest">Powered by KNGapps · {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
