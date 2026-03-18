import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';

export default function WhatsAppSearchScreen({ onNavigate, params }: NavigationProps) {
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  const searchId = params?.searchId;
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSearchDetails = async () => {
      if (!searchId) {
        setError('Link de busca inválido.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 1. Busca o registro da pesquisa do WhatsApp para pegar o category_id
        const { data: search, error: searchError } = await supabase
          .from('whatsapp_searches')
          .select('*, service_categories(id, name)')
          .eq('id', searchId)
          .single();

        if (searchError || !search) {
          setError('Pesquisa não encontrada ou expirada.');
          setLoading(false);
          return;
        }

        const categoryId = search.category_id;
        setCategoryName(search.service_categories?.name || 'Serviços');

        // 2. Busca prestadores pela tabela provider_services (mesma lógica do n8n)
        const { data: serviceLinks, error: serviceError } = await supabase
          .from('provider_services')
          .select('provider_id')
          .eq('category_id', categoryId);

        if (serviceError) throw serviceError;

        if (!serviceLinks || serviceLinks.length === 0) {
          setProviders([]);
          setLoading(false);
          return;
        }

        const providerIds = serviceLinks.map(s => s.provider_id);

        // 3. Busca os perfis dos prestadores encontrados
        const { data: providersData, error: providerError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', providerIds)
          .eq('role', 'provider');

        if (providerError) throw providerError;
        setProviders(providersData || []);

      } catch (err: any) {
        console.error('Erro ao carregar busca do WhatsApp:', err);
        setError('Ocorreu um erro ao carregar os profissionais.');
      } finally {
        setLoading(false);
      }
    };

    fetchSearchDetails();
  }, [searchId]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined animate-spin text-5xl text-primary">progress_activity</span>
          <p className="text-white font-bold animate-pulse text-center px-6">Judite está localizando os melhores profissionais...</p>
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

  return (
    <div className="min-h-screen bg-black text-white font-display overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-primary/20 via-primary/5 to-transparent pointer-events-none"></div>
      <div className="fixed -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>

      <main className="relative z-10 max-w-lg mx-auto px-4 py-12 flex flex-col min-h-screen">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20 mb-6">
            <span className="material-symbols-outlined text-sm filled">check_circle</span>
            <span className="text-[10px] font-black uppercase tracking-widest">Encontrado via WhatsApp</span>
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

        {/* Producers List (Teaser or Full) */}
        <div className="flex flex-col gap-4 mb-12">
          {providers.length > 0 ? (
            providers.map((p, idx) => (
              <div
                key={p.id}
                className={`group relative overflow-hidden bg-white/5 border border-white/10 rounded-3xl p-4 transition-all ${!isLogged && idx > 0 ? 'blur-md opacity-40 select-none pointer-events-none' : 'hover:border-primary/50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="size-16 md:size-20 rounded-2xl overflow-hidden border-2 border-white/10 shadow-xl flex-shrink-0">
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
                    <h3 className="font-bold text-lg leading-snug truncate">{p.full_name}</h3>
                    <p className="text-xs text-slate-400 font-medium">✨ {p.bio ? p.bio.substring(0, 50) + '...' : 'Especialista verificado iService'}</p>
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
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/20">
              <span className="material-symbols-outlined text-4xl text-slate-600 mb-4 block">search_off</span>
              <p className="text-slate-400 font-medium">Ainda não temos profissionais registrados nesta categoria.</p>
            </div>
          )}
        </div>

        {/* Final CTA (Log In Wall) */}
        {!isLogged && providers.length > 0 && (
          <div className="mt-auto bg-gradient-to-t from-black via-black/90 to-transparent pt-20 pb-10 sticky bottom-0">
            <div className="bg-primary p-6 rounded-[2rem] shadow-2xl shadow-primary/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-2xl"></div>

              <div className="relative z-10 text-center">
                <h2 className="text-xl font-black text-white mb-2 uppercase italic tracking-tighter">
                  Ver lista completa e contatos
                </h2>
                <p className="text-white/80 text-xs font-bold mb-6">
                  Cadastre-se com o Google e veja todos os {providers.length} profissional{providers.length !== 1 ? 'is' : ''} e seus contatos agora.
                </p>

                <button
                  onClick={async () => {
                    try {
                      await signInWithGoogle(window.location.href);
                    } catch (err) {
                      console.error('Erro no login:', err);
                    }
                  }}
                  className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continuar com Google
                </button>
                <p className="mt-4 text-[9px] text-white/50 uppercase font-bold tracking-widest">É rápido, seguro e gratuito</p>
              </div>
            </div>
          </div>
        )}

        {isLogged && (
          <div className="mt-8 text-center mb-20">
            <button
              onClick={() => onNavigate('home')}
              className="text-primary font-black text-sm uppercase tracking-widest hover:underline"
            >
              Ir para a Página Inicial →
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-12 px-4 text-center border-t border-white/5 opacity-50 relative z-10">
        <div className="flex justify-center gap-6 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest">Suporte</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">Privacidade</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">Termos</span>
        </div>
        <p className="text-[10px] text-slate-500">© 2026 iService Rondonópolis - Judite AI System</p>
      </footer>
    </div>
  );
}
