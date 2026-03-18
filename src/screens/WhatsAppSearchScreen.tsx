import React, { useState, useEffect } from 'react';
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
  }, [searchId]);

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
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <span className="material-symbols-outlined animate-spin text-5xl text-primary">progress_activity</span>
          <p className="text-white font-bold animate-pulse">Judite está localizando os melhores profissionais...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
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
    <div className="min-h-screen bg-black text-white font-display overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-primary/20 via-primary/5 to-transparent pointer-events-none" />
      <div className="fixed -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <main className="relative z-10 max-w-lg mx-auto px-4 py-12 flex flex-col min-h-screen">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20 mb-6">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366]">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest">Consulta realizada via WhatsApp</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
            Olá! Encontramos{' '}
            <span className="text-primary">{providers.length}</span>{' '}
            especialista{providers.length !== 1 ? 's' : ''} em{' '}
            <span className="text-primary">{categoryName}</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            Selecionamos os profissionais mais bem avaliados em Rondonópolis para o seu pedido.
          </p>
        </div>

        {/* Provider Cards */}
        <div className="flex flex-col gap-4 mb-6">
          {visibleProviders.length > 0 ? (
            visibleProviders.map((p, idx) => {
              const isBlurred = !isLogged; // todos ficam com nome/info ocultos quando não logado
              return (
                <div
                  key={p.id}
                  className={`relative overflow-hidden bg-white/5 border rounded-3xl p-4 transition-all ${
                    isLogged ? 'border-white/10 hover:border-primary/50' : 'border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar — sempre com dados reais, blur via CSS */}
                    <div className={`size-16 md:size-20 rounded-2xl overflow-hidden border-2 border-white/10 shadow-xl flex-shrink-0 ${isBlurred ? 'blur-sm' : ''}`}>
                      <img
                        src={p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name || 'P')}&background=random&color=fff`}
                        className="w-full h-full object-cover"
                        alt={p.full_name}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="bg-primary/20 text-primary text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter italic">Top Pro</span>
                        <div className="flex items-center text-yellow-500 gap-0.5 ml-auto">
                          <span className="material-symbols-outlined text-xs filled">star</span>
                          <span className="text-xs font-black">{p.stats?.rating?.toFixed(1) || '5.0'}</span>
                        </div>
                      </div>

                      {/* Nome e bio — dados reais com blur */}
                      <div className={`transition-all ${isBlurred ? 'blur-[5px] select-none' : ''}`}>
                        <h3 className="font-bold text-lg leading-snug">{p.full_name}</h3>
                        <p className="text-xs text-slate-400 font-medium">
                          ✨ {p.bio ? p.bio.substring(0, 50) + '...' : 'Especialista verificado'}
                        </p>
                      </div>

                      {/* Cidade — sempre visível */}
                      {p.city && (
                        <p className="text-xs text-emerald-400 font-bold mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">location_on</span>
                          {p.city}
                        </p>
                      )}
                    </div>
                  </div>

                  {isLogged && (
                    <button
                      onClick={() => onNavigate('profile', { professionalId: p.id })}
                      className="mt-4 w-full bg-white/10 hover:bg-white/20 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Ver Perfil Completo →
                    </button>
                  )}

                  {/* Lock overlay nos cards bloqueados */}
                  {isBlurred && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-3xl">
                      <div className="bg-black/50 backdrop-blur-[2px] rounded-2xl px-3 py-1.5 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-white/60">lock</span>
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-wider">Faça login para ver</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/20">
              <span className="material-symbols-outlined text-4xl text-slate-600 mb-4 block">search_off</span>
              <p className="text-slate-400 font-medium">Ainda não temos profissionais nesta categoria.</p>
            </div>
          )}

          {/* Indicador de "mais resultados" para não logados */}
          {!isLogged && providers.length > TEASER_COUNT && (
            <div className="text-center py-3 text-slate-500 text-xs font-bold">
              + {providers.length - TEASER_COUNT} profissional{providers.length - TEASER_COUNT !== 1 ? 'is' : ''} disponível{providers.length - TEASER_COUNT !== 1 ? 'is' : ''} • Faça login para ver todos
            </div>
          )}
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
                  <h2 className="text-xl font-black text-white mb-1 uppercase italic tracking-tighter">
                    Veja os contatos completos
                  </h2>
                  <p className="text-slate-400 text-xs font-medium mb-5">
                    Cadastre-se grátis para ver o perfil e contato de todos os {providers.length} profissional{providers.length !== 1 ? 'is' : ''}.
                  </p>

                  {/* Google Button */}
                  <button
                    onClick={async () => {
                      try { await signInWithGoogle(window.location.href); } catch (err) { console.error(err); }
                    }}
                    className="w-full bg-white text-black py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gray-100 active:scale-95 transition-all shadow-lg mb-3"
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
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ou</span>
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

                  <p className="mt-4 text-[9px] text-slate-600 uppercase font-bold tracking-widest">É rápido, seguro e gratuito</p>
                </div>
              </div>
            ) : (
              /* Email Registration Form */
              <div className="bg-[#1a1a1a] border border-white/10 p-6 rounded-[2rem] shadow-2xl">
                <button onClick={() => setShowEmailForm(false)} className="text-slate-400 text-xs flex items-center gap-1 mb-4 hover:text-white">
                  <span className="material-symbols-outlined text-sm">arrow_back</span> Voltar
                </button>
                <h2 className="text-lg font-black text-white mb-4 uppercase tracking-tighter">Crie sua conta</h2>
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
                    className="w-full bg-primary text-white py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-60 active:scale-95 transition-all mt-1"
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
            <button onClick={() => onNavigate('home')} className="text-primary font-black text-sm uppercase tracking-widest hover:underline">
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
