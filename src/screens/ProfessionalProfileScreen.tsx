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
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const { user } = useAuth();

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && portfolioImages.length > 1) {
      setSelectedImageIndex((prev) => (prev! + 1) % portfolioImages.length);
    } else if (isRightSwipe && portfolioImages.length > 1) {
      setSelectedImageIndex((prev) => (prev! - 1 + portfolioImages.length) % portfolioImages.length);
    }
  };

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
            isVerified: data.is_verified,
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
          <h2 className="text-slate-900 dark:text-slate-100 text-base font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
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
              className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden bg-slate-200 dark:bg-slate-800 @[480px]:rounded-xl md:rounded-none min-h-32 md:min-h-[250px] relative group"
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

        {/* Profile Info Container */}
        <div className="flex flex-col items-center -mt-12 md:-mt-16 relative z-10 px-0 md:px-4">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 md:rounded-3xl md:shadow-xl md:border md:border-slate-100 dark:md:border-slate-800 overflow-hidden">
            
            {/* Instagram Style Profile Row */}
            <div className="flex px-4 pt-6 pb-2 items-center gap-4 md:gap-8">
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-20 w-20 md:min-h-28 md:w-28 border-4 border-white dark:border-slate-900 shadow-xl shrink-0"
                style={{
                  backgroundImage: `url("${professional.image}")`,
                }}
              ></div>
              <div className="flex-1 flex justify-around items-center gap-2">
                <div className="flex flex-col items-center">
                  <p className="text-slate-900 dark:text-slate-100 text-base font-black italic tracking-tight">{displayReviewsCount}</p>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-0.5">Serviços</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-0.5">
                    <p className="text-slate-900 dark:text-slate-100 text-base font-black italic tracking-tight">{displayRating}</p>
                    <span className="material-symbols-outlined text-amber-400 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  </div>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-0.5">Avaliação</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="text-slate-900 dark:text-slate-100 text-base font-black italic tracking-tight">R$ {parseInt(professional.price)}</p>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-0.5">{professional.priceUnit}</p>
                </div>
              </div>
            </div>

            <div className="px-5 pt-2 pb-4 flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-slate-900 dark:text-slate-100 text-lg font-black leading-none tracking-tight">
                  {professional.name}
                </p>
                {professional.isVerified && (
                  <VerifiedBadge className="scale-100" />
                )}
              </div>
              
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1.5">
                {professional.category} • {professional.isAffiliate ? 'Afiliado Verificado' : 'Profissional'}
              </p>

              <p className="text-slate-500 dark:text-slate-400 text-[11px] font-bold leading-normal flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">location_on</span>
                {professional.city ? `${professional.city}, ${professional.state || ''}` : 'Localização a combinar'}
              </p>
            </div>

          {/* Bio Section */}
          <div className="px-4 py-2">
            <h3 className="text-slate-900 dark:text-slate-100 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="size-1 w-1 rounded-full bg-primary/40" />
              Sobre
            </h3>
            <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
                {professional.description}
              </p>
            </div>
          </div>

          {/* Portfolio Gallery */}
          {portfolioImages.length > 0 && (
            <div className="px-4 py-4">
              <h3 className="text-slate-900 dark:text-slate-100 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">photo_library</span>
                Portfólio de Trabalhos
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {portfolioImages.map((img, idx) => (
                  <div 
                    key={img.id} 
                    onClick={() => setSelectedImageIndex(idx)}
                    className="aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 group cursor-pointer shadow-sm active:scale-95 transition-transform"
                  >
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
            <h3 className="text-slate-900 dark:text-slate-100 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">info</span>
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
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-slate-900 dark:text-slate-100 text-xs font-black uppercase tracking-widest">
                  Avaliações
                </h3>
              </div>
              <div className="flex flex-col gap-4">
                {dbReviews.length > 0 ? (
                  dbReviews.map((review, i) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
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
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(review.created_at).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        <div className="flex text-amber-400">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={`material-symbols-outlined text-[14px] ${star <= review.rating ? 'text-amber-400 filled' : 'text-slate-200 dark:text-slate-700'}`} style={{ fontVariationSettings: star <= review.rating ? "'FILL' 1" : "'FILL' 0" }}>
                              star
                            </span>
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-slate-600 dark:text-slate-400 text-sm italic pl-1">
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

      {/* Image Modal Lightbox with Navigation */}
      {selectedImageIndex !== null && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300 select-none touch-none"
          onClick={() => setSelectedImageIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close Button */}
          <button 
            className="absolute top-6 right-6 text-white size-12 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors z-[110]"
            onClick={() => setSelectedImageIndex(null)}
          >
            <span className="material-symbols-outlined text-4xl">close</span>
          </button>

          {/* Navigation Buttons */}
          {portfolioImages.length > 1 && (
            <>
              <button 
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white size-14 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors active:scale-90"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((selectedImageIndex - 1 + portfolioImages.length) % portfolioImages.length);
                }}
              >
                <span className="material-symbols-outlined text-5xl">chevron_left</span>
              </button>
              <button 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white size-14 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors active:scale-90"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((selectedImageIndex + 1) % portfolioImages.length);
                }}
              >
                <span className="material-symbols-outlined text-5xl">chevron_right</span>
              </button>
            </>
          )}
          
          <div className="relative max-w-full max-h-[80vh] flex flex-col items-center">
            <img 
              src={portfolioImages[selectedImageIndex].image_url} 
              alt="Foto do Portfólio" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            />
            
            <div className="absolute -bottom-10 left-0 right-0 text-center">
              <p className="text-white font-bold tracking-widest text-sm bg-black/40 px-4 py-1 rounded-full inline-block">
                {selectedImageIndex + 1} / {portfolioImages.length}
              </p>
            </div>
          </div>

          <div className="absolute bottom-8 left-0 right-0 text-center hidden md:block">
             <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Use setas ou clique fora para fechar</p>
          </div>
        </div>
      )}
    </div>
  );
}
