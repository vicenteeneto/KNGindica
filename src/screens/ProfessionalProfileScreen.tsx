import React, { useEffect, useState } from 'react';
import { NavigationProps } from '../types';
import { professionals } from '../data/mockData';
import VerifiedBadge from '../components/VerifiedBadge';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useSEO } from '../hooks/useSEO';

interface ProfessionalProfileProps extends NavigationProps {
  professionalId?: string;
}

export default function ProfessionalProfileScreen({ onNavigate, professionalId }: ProfessionalProfileProps) {
  const [realReviewsCount, setRealReviewsCount] = useState<number | null>(null);
  const [realAverage, setRealAverage] = useState<number | null>(null);
  const [dbReviews, setDbReviews] = useState<any[]>([]);
  const [dbProfessional, setDbProfessional] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [portfolioImages, setPortfolioImages] = useState<any[]>([]);
  const { user } = useAuth();

  // SEO dinâmico baseado nos dados do profissional
  const seoTitle = dbProfessional
    ? `${dbProfessional.name} — ${dbProfessional.category} em ${dbProfessional.city || 'Sua Região'}`
    : undefined;
  const seoDescription = dbProfessional?.description
    ? dbProfessional.description.slice(0, 160)
    : undefined;
  useSEO({
    title: seoTitle,
    description: seoDescription,
    image: dbProfessional?.image,
    type: 'profile',
  });

  // Tracking de Leads
  const trackLead = async (pId: string, type: 'whatsapp_click' | 'profile_view' | 'chat_start') => {
    if (!user || user.id === pId) return; // Não conta lead de si mesmo
    try {
      await supabase.from('lead_events').insert({
        client_id: user.id,
        provider_id: pId,
        type: type,
        metadata: { source: 'profile_screen' }
      });
    } catch (e) {
      console.error("Lead track error", e);
    }
  };

  useEffect(() => {
    if (professionalId?.includes('-')) {
      const fetchStats = async () => {
        const { data } = await supabase
          .from('reviews')
          .select('rating, comment, created_at, profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
          .eq('provider_id', professionalId)
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          setRealReviewsCount(data.length);
          const sum = data.reduce((acc, r) => acc + r.rating, 0);
          setRealAverage(Number((sum / data.length).toFixed(1)));
          setDbReviews(data);
        } else {
          setRealReviewsCount(0);
          setRealAverage(0);
          setDbReviews([]);
        }
      };
      fetchStats();
    }

    if (professionalId && professionalId.length > 20) {
      const fetchProfile = async () => {
        setLoadingProfile(true);
        const { data, error } = await supabase.from('profiles').select('*').eq('id', professionalId).single();
        if (data && !error) {
          setDbProfessional({
            id: data.id,
            name: data.company_name || data.full_name || 'Profissional',
            category: data.categories?.[0] || 'Serviços Gerais',
            rating: 5.0, 
            reviews: 0,
            price: '50.00',
            priceUnit: '/hora',
            image: data.avatar_url || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a',
            isVerified: true,
            distance: 'A Combinar',
            description: data.bio || 'Sem descrição.',
            isAffiliate: data.plan_type === 'plus',
            plan_type: data.plan_type || 'basic',
            whatsapp: data.whatsapp_number,
            service: data.categories?.[0] || 'Serviços',
            city: data.city,
            state: data.state,
            address: data.address,
            opening_hours: data.opening_hours,
            loyalty_enabled: data.loyalty_enabled,
            loyalty_required_services: data.loyalty_required_services,
            loyalty_benefit_description: data.loyalty_benefit_description,
          });
          
          // Registrar Lead de Visualização de Perfil
          trackLead(data.id, 'profile_view');
        }
        setLoadingProfile(false);
      };
      fetchProfile();

      // Buscar status de favorito
      if (user) {
        const fetchFav = async () => {
          const { data } = await supabase
            .from('user_favorites')
            .select('id')
            .eq('user_id', user.id)
            .eq('provider_id', professionalId)
            .single();
          setIsFavorite(!!data);
        };
        fetchFav();
      }

      // Buscar portfólio
      const fetchPortfolio = async () => {
        const { data } = await supabase
          .from('provider_portfolio')
          .select('*')
          .eq('provider_id', professionalId)
          .order('created_at', { ascending: false });
        setPortfolioImages(data || []);
      };
      fetchPortfolio();
    }
  }, [professionalId, user]);

  const toggleFavorite = async () => {
    if (!user) {
      alert("Faça login para favoritar profissionais.");
      return;
    }
    try {
      if (isFavorite) {
        await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('provider_id', professionalId);
        setIsFavorite(false);
      } else {
        await supabase.from('user_favorites').insert({ user_id: user.id, provider_id: professionalId });
        setIsFavorite(true);
      }
    } catch (e) {
      console.error("Fav toggle error", e);
    }
  };

  const professional = dbProfessional || professionals.find(p => p.id === professionalId) || professionals[0];

  const displayRating = realAverage !== null ? realAverage : professional?.rating;
  const displayReviewsCount = realReviewsCount !== null ? realReviewsCount : professional?.reviews;

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-slate-900">
        <p className="text-slate-500 mb-4">Profissional não encontrado.</p>
        <button className="bg-primary text-white px-6 py-2 rounded-xl font-bold" onClick={() => onNavigate('home')}>Voltar</button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 min-h-screen shadow-xl flex flex-col font-display text-slate-900 dark:text-slate-100 antialiased">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center p-4 pb-2 justify-between max-w-7xl mx-auto w-full">
          <button onClick={() => onNavigate('listing')} className="text-slate-900 dark:text-slate-100 flex size-12 shrink-0 items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full justify-center transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
            Perfil do Profissional
          </h2>
          <div className="flex items-center justify-end gap-2">
            <button 
              onClick={toggleFavorite}
              className={`flex items-center justify-center rounded-lg h-10 w-10 bg-transparent p-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isFavorite ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}`}
              title={isFavorite ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}>
                favorite
              </span>
            </button>
            {user?.id === professionalId && (
              <button 
                onClick={() => onNavigate('userProfile')}
                className="flex items-center gap-2 bg-primary text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:brightness-110 active:scale-95 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                <span className="hidden sm:inline">Editar Perfil</span>
              </button>
            )}
            <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-transparent text-slate-900 dark:text-slate-100 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined">share</span>
            </button>
            <button onClick={() => onNavigate('home')} className="flex items-center justify-center rounded-lg h-10 w-10 bg-transparent text-slate-900 dark:text-slate-100 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Início">
              <span className="material-symbols-outlined">home</span>
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Hero Section / Gallery */}
        <div className="@container">
          <div className="@[480px]:px-4 @[480px]:py-3 md:px-0">
            <div
              className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden bg-slate-200 dark:bg-slate-800 @[480px]:rounded-xl md:rounded-none min-h-64 md:min-h-[400px] relative group"
              style={{
                backgroundImage: `url("${professional.image}")`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              {portfolioImages.length > 0 && (
                <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">
                    photo_library
                  </span>
                  1/{portfolioImages.length + 1} Fotos
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex p-4 @container -mt-16 relative z-10 justify-center">
          <div className="flex w-full max-w-3xl flex-col gap-4 items-center">
            <div className="flex gap-4 flex-col items-center">
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-32 w-32 border-4 border-white dark:border-slate-900 shadow-xl"
                style={{
                  backgroundImage: `url("${professional.image}")`,
                }}
              ></div>
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-2">
                  <p className="text-slate-900 dark:text-slate-100 text-2xl font-bold leading-tight tracking-[-0.015em] text-center">
                    {professional.name}
                  </p>
                  {professional.isVerified && (
                    <VerifiedBadge className="scale-125 ml-1" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {professional.isAffiliate && (
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                      Afiliado Verificado
                    </span>
                  )}
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-base font-normal leading-normal text-center mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">
                    location_on
                  </span>
                  {professional.city ? `${professional.city}, ${professional.state || ''}` : 'Localização a combinar'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto w-full">
          {/* Stats */}
          <div className="flex flex-wrap gap-3 p-4">
            <div className="flex min-w-[100px] flex-1 flex-col gap-1 rounded-xl p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm text-center">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
                Serviços
              </p>
              <p className="text-slate-900 dark:text-slate-100 tracking-tight text-xl font-bold">
                {displayReviewsCount}
              </p>
            </div>
            <div className="flex min-w-[100px] flex-1 flex-col gap-1 rounded-xl p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm text-center">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
                Avaliação
              </p>
              <div className="flex items-center justify-center gap-1">
                <p className="text-slate-900 dark:text-slate-100 tracking-tight text-xl font-bold">
                  {displayRating}
                </p>
                <span className="material-symbols-outlined text-amber-400 text-sm">
                  star
                </span>
              </div>
            </div>
            <div className="flex min-w-[100px] flex-1 flex-col gap-1 rounded-xl p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm text-center">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
                Preço
              </p>
              <p className="text-slate-900 dark:text-slate-100 tracking-tight text-xl font-bold">
                R$ {professional.price}
                <span className="text-sm font-normal text-slate-500">{professional.priceUnit}</span>
              </p>
            </div>
          </div>

          {/* Bio Section */}
          <div className="px-4 py-4">
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] mb-3">
              Sobre
            </h3>
            <div className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed">
                {professional.description}
              </p>
            </div>
          </div>

          {/* Portfolio Gallery */}
          {portfolioImages.length > 0 && (
            <div className="px-4 py-4">
              <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">photo_library</span>
                Portfólio de Trabalhos
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {portfolioImages.map((img, idx) => (
                  <div key={img.id} className="aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 group cursor-pointer shadow-sm">
                    <img 
                      src={img.image_url} 
                      alt={`Trabalho ${idx + 1}`} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Business Data - Google Style Info */}
          <div className="px-4 py-4">
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">info</span>
              Informações do Prestador
            </h3>
            <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-4 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary">location_on</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Endereço de Atendimento</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {professional.address || `${professional.city || 'Atendimento em domicílio'}, ${professional.state || ''}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-orange-500">schedule</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Horário de Funcionamento</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {professional.opening_hours || 'Seg à Sex: 08:00 - 18:00 (Consulte disponibilidade)'}
                    </p>
                  </div>
                </div>

                {professional.loyalty_enabled && (
                  <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                    <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
                      <span className="material-symbols-outlined">loyalty</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-primary uppercase italic tracking-tighter">Programa de Fidelidade</h4>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {professional.loyalty_benefit_description}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="px-4 py-4 mb-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em]">
                Avaliações
              </h3>
              <button
                // onClick={() => onNavigate('reviews')} 
                className="text-primary text-sm font-bold hover:underline"
              >
                Ver Todas
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {dbReviews.length > 0 ? (
                dbReviews.map((review, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden text-slate-500 font-bold border border-slate-200 dark:border-slate-700">
                          {review.profiles?.avatar_url ? (
                             <img src={review.profiles.avatar_url} alt="Reviewer" className="w-full h-full object-cover" />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center">{(review.profiles?.full_name || 'U')[0].toUpperCase()}</div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {review.profiles?.full_name || 'Usuário'}
                          </p>
                          <p className="text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex text-amber-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className={`material-symbols-outlined text-sm ${star <= review.rating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'}`} style={{ fontVariationSettings: star <= review.rating ? "'FILL' 1" : "'FILL' 0" }}>
                            star
                          </span>
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-slate-700 dark:text-slate-300 text-sm italic">
                        "{review.comment}"
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-slate-50 dark:bg-slate-900/30 p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center">
                   <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">star_half</span>
                   <p className="text-slate-500 text-sm">Nenhuma avaliação recebida ainda.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Footer Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-center gap-2 z-[60]">
        {professional.plan_type === 'plus' && professional.whatsapp && (
          <a
            href={`https://wa.me/55${professional.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackLead(professional.id, 'whatsapp_click')}
            className="w-full max-w-2xl bg-emerald-500 hover:bg-emerald-600 text-white py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-[24px]">chat</span>
            Conversar no WhatsApp
          </a>
        )}
        <button
          onClick={() => {
             trackLead(professional.id, 'chat_start');
             onNavigate('serviceRequestForm', { providerId: professional.id, providerName: professional.name });
          }}
          className="w-full max-w-2xl bg-primary hover:bg-primary/90 text-white py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined text-[24px]">design_services</span>
          Solicitar Orçamento
        </button>
      </div>
    </div>
  );
}
