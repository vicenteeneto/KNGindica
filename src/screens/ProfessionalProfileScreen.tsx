import React, { useEffect, useState } from 'react';
import { NavigationProps } from '../types';
import VerifiedBadge from '../components/VerifiedBadge';
import StarRating from '../components/StarRating';

import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useSEO } from '../hooks/useSEO';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useNotifications } from '../NotificationContext';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { formatCurrency } from '../lib/formatters';
import { ProviderHeader } from '../components/ProviderHeader';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface ProfessionalProfileProps extends NavigationProps {
  params?: {
    professionalId: string;
    returnTo?: any;
    [key: string]: any;
  };
}

export default function ProfessionalProfileScreen({ onNavigate, params }: ProfessionalProfileProps) {
  const professionalId = params?.professionalId || params?.id || '1';
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
  const { user, role } = useAuth();
  const { showToast, showModal } = useNotifications();

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

  // Teclado para o viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex === null) return;
      if (e.key === 'ArrowRight') {
        setSelectedImageIndex((prev) => (prev! + 1) % portfolioImages.length);
      } else if (e.key === 'ArrowLeft') {
        setSelectedImageIndex((prev) => (prev! - 1 + portfolioImages.length) % portfolioImages.length);
      } else if (e.key === 'Escape') {
        setSelectedImageIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, portfolioImages.length]);

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
    if (user?.id === pId) return; // Não conta lead de si mesmo
    
    // Para cliques no WhatsApp ou Início de Chat, ainda é ideal estar logado ou ter um identificador, 
    // mas para 'profile_view' vamos permitir anônimo.
    if (type !== 'profile_view' && !user) return;

    try {
      await supabase.from('lead_events').insert({
        client_id: user?.id || null,
        provider_id: pId,
        type: type,
        metadata: { 
          source: 'profile_screen',
          is_anonymous: !user
        }
      });
    } catch (e) {
      console.error("Lead track error", e);
    }
  };

  useEffect(() => {
    if (professionalId && professionalId !== '1') {
      const fetchStats = async () => {
        const { data } = await supabase
          .from('reviews')
          .select('rating, comment, created_at, reviewer_name, reviewer_avatar_url, profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
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

    if (professionalId && professionalId.length > 10) {
      const fetchProfile = async () => {
        setLoadingProfile(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', professionalId)
          .single();
        if (data && !error) {
          setDbProfessional({
            id: data.id,
            name: data.company_name || data.full_name || 'Profissional',
            category: data.categories?.[0] || 'Serviços Gerais',
            rating: 5.0, 
            reviews: 0,
            price: data.price_value?.toString() || '0',
            priceUnit: data.pricing_model || 'hourly',
            show_price: data.show_price !== false,
            pricing_model: data.pricing_model || 'hourly',
            image: data.avatar_url || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a',
            cover_image: data.cover_image || null,
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
            latitude: data.latitude,
            longitude: data.longitude,
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
          try {
            const { data, error } = await supabase
              .from('user_favorites')
              .select('id')
              .eq('user_id', user.id)
              .eq('provider_id', professionalId)
              .maybeSingle();
            
            if (error && error.code !== 'PGRST116') {
              console.error("Erro ao buscar favorito:", error);
              return;
            }
            setIsFavorite(!!data);
          } catch (e) {
            console.error("Fav fetch error", e);
          }
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
      showToast("Acesso Restrito", "Faça login para favoritar profissionais.", "notification");
      return;
    }
    
    // Toggle otimista na UI
    const currentlyFavorite = isFavorite; // Guardar valor original para a lógica
    const nextState = !currentlyFavorite;
    setIsFavorite(nextState);

    try {
      if (currentlyFavorite) {
        // Remover
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('provider_id', professionalId);
        
        if (error) throw error;
      } else {
        // Adicionar
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: user.id, provider_id: professionalId });
        
        if (error) throw error;
      }
    } catch (e: any) {
      console.error("Fav toggle error", e);
      // Reverter se der erro
      setIsFavorite(currentlyFavorite);
      showToast("Erro ao favoritar", e.message || "Verifique sua conexão.", "error");
    }
  };

  const handleShare = async () => {
    const profileUrl = window.location.href;
    const title = `KNGindica - ${professional?.name || 'Perfil'}`;
    const text = `Confira o perfil de ${professional?.name || 'este profissional'} no KNGindica!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: profileUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error("Erro ao compartilhar", err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(profileUrl);
        showToast("Link Copiado", "URL do perfil copiada para a área de transferência.", "success");
      } catch (err) {
        console.error("Erro ao copiar link", err);
        showToast("Erro ao copiar", "Não foi possível copiar o link.", "error");
      }
    }
  };

  const professional = dbProfessional;

  const displayRating = (realAverage !== null ? realAverage : professional?.rating)?.toString().replace('.', ',');
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
        <button className="bg-primary text-white px-6 py-2 rounded-xl font-bold" onClick={() => onNavigate('back')}>Voltar</button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 min-h-screen shadow-xl flex flex-col font-display text-slate-900 dark:text-slate-100 antialiased">
      {/* Header */}
      {user?.id === professionalId && role === 'provider' ? (
        <div className="bg-white dark:bg-slate-900 sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800">
          <ProviderHeader 
            title="Perfil" 
            onBack={() => onNavigate('dashboard')} 
            onNavigate={onNavigate} 
            rightActions={
              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleFavorite}
                  className={`flex items-center justify-center rounded-lg h-10 w-10 bg-transparent p-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isFavorite ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}`}
                  title={isFavorite ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}>
                    favorite
                  </span>
                </button>
                <button 
                  onClick={handleShare}
                  className="flex items-center justify-center rounded-lg h-10 w-10 bg-transparent text-slate-900 dark:text-slate-100 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Compartilhar"
                >
                  <span className="material-symbols-outlined">share</span>
                </button>
              </div>
            }
          />
          <div className="bg-amber-500/10 border-t border-slate-100 dark:border-slate-800 py-2 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-sm">visibility</span>
              <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 leading-none">Modo de pré-visualização pública</p>
            </div>
            <button 
              onClick={() => onNavigate('userProfile')}
              className="text-[9px] font-black text-amber-600 underline"
            >
              Editar Perfil
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center p-4 pb-2 justify-between w-full transition-all duration-300">
            <button 
              onClick={() => onNavigate('back')} 
              className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0 z-[100]"
            >
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
              <button 
                onClick={handleShare}
                className="flex items-center justify-center rounded-lg h-10 w-10 bg-transparent text-slate-900 dark:text-slate-100 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Compartilhar"
              >
                <span className="material-symbols-outlined">share</span>
              </button>
              <button onClick={() => onNavigate('home')} className="flex items-center justify-center rounded-lg h-10 w-10 bg-transparent text-slate-900 dark:text-slate-100 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Início">
                <span className="material-symbols-outlined">home</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Profile Info Container */}
        <div className="w-full max-w-7xl mx-auto px-0 md:px-4 pt-0 pb-6 md:pt-0 md:pb-10 transition-all duration-300">
          <div className="lg:grid lg:grid-cols-3 lg:gap-10 items-start">
            
            {/* Left Column: Main Profile Content */}
            <div className="lg:col-span-2">
              {/* Hero Section / Gallery */}
              <div className="@container">
                <div className="md:px-0">
                  <div
                    className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden bg-slate-200 dark:bg-slate-800 rounded-none h-44 md:h-64 relative group shadow-2xl"
                    style={{
                      backgroundImage: `url("${professional.cover_image || professional.image}")`,
                    }}
                  >
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 md:rounded-3xl md:shadow-xl md:border md:border-slate-100 dark:md:border-white/5 relative z-10">
                {/* Overlapping Avatar Container - Fail-Safe Positioning */}
                <div className="px-6 flex flex-col md:flex-row md:items-end gap-2 md:gap-4 relative z-20 -top-12 md:-top-16">
                  <div
                    className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-24 w-24 md:h-32 md:w-32 border-[6px] border-white dark:border-slate-900 shadow-xl shrink-0"
                    style={{
                      backgroundImage: `url("${professional.image}")`,
                    }}
                  ></div>
                  
                  {/* Name and Location (LinkedIn Style - directly next to or below avatar) */}
                  <div className="flex-1 pb-1 md:pb-2 md:mt-10">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-slate-900 dark:text-slate-100 text-xl font-black leading-tight tracking-tight">
                        {professional.name}
                      </p>
                      {professional.isVerified && (
                        <VerifiedBadge className="scale-110" />
                      )}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold leading-normal flex items-center gap-1.5">
                      {professional.category} • {professional.city ? `${professional.city}` : 'Localização a combinar'}
                    </p>
                  </div>
                </div>

                {/* Stats Row - 2-Row Architecture (Mathematically Guaranteed Alignment) */}
                <div className="flex flex-col px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 -mt-10 md:-mt-16">
                  {/* Top Row: Values */}
                  <div className="flex items-end justify-between">
                    <div className="flex-1 flex justify-center border-r border-slate-100 dark:border-white/5 h-7 md:h-10 items-center">
                      <p className="text-slate-900 dark:text-slate-100 text-sm md:text-base font-black italic tracking-tight leading-none pb-0.5">{displayReviewsCount}</p>
                    </div>
                    <div className="flex-1 flex justify-center border-r border-slate-100 dark:border-white/5 h-7 md:h-10 items-center gap-1">
                      <p className="text-slate-900 dark:text-slate-100 text-sm md:text-base font-black italic tracking-tight leading-none pb-0.5">{displayRating}</p>
                      <StarRating rating={Number(displayRating?.replace(',', '.') || 0)} size={14} maxStars={1} />
                    </div>
                    <div className="flex-1 flex justify-center h-7 md:h-10 items-center">
                      {professional.show_price ? (
                        <p className="text-slate-900 dark:text-slate-100 text-sm md:text-base font-black italic tracking-tight whitespace-nowrap overflow-hidden text-ellipsis leading-none pb-0.5">
                          {professional.pricing_model === 'negotiable' ? (
                            'A COMBINAR'
                          ) : (
                            <>
                              {professional.pricing_model === 'starting_at' && <span className="text-[9px] mr-1 opacity-50 font-normal">A PARTIR</span>}
                              {formatCurrency(parseFloat(professional.price || '0'))}
                            </>
                          )}
                        </p>
                      ) : (
                        <p className="text-slate-900 dark:text-slate-100 text-sm md:text-base font-black italic tracking-tight whitespace-nowrap leading-none pb-0.5">Sob Consulta</p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: Labels (Total Horizontal Alignment) */}
                  <div className="flex justify-between mt-2">
                    <p className="flex-1 text-slate-500 text-[9px] font-black text-center leading-none">Serviços</p>
                    <p className="flex-1 text-slate-500 text-[9px] font-black text-center leading-none">Avaliação</p>
                    <p className="flex-1 text-slate-500 text-[9px] font-black text-center leading-none">
                      {professional.show_price ? (
                         professional.pricing_model === 'hourly' ? 'POR HORA' : 
                         professional.pricing_model === 'fixed' ? 'FIXO' : 
                         professional.pricing_model === 'starting_at' ? 'INICIAL' : 'NEGOCIAVEL'
                      ) : 'Valores'}
                    </p>
                  </div>
                </div>

                {/* Premium Badge */}
                {professional.plan_type === 'plus' && (
                  <div className="px-6 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full text-[10px] font-black border border-amber-500/20">
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                      MEMBRO PREMIUM KNG
                    </span>
                  </div>
                )}

                {/* Bio Section */}
                <div className="px-8 pt-6 pb-2 border-t border-slate-100 dark:border-white/5">
                  <h3 className="text-slate-900 dark:text-slate-100 text-[9px] font-black mb-1.5 flex items-center gap-2">
                    <span className="size-1 w-1 rounded-full bg-primary" />
                    Sobre o Profissional
                  </h3>
                  <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                    <p className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed font-semibold">
                      {professional.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Portfolio Gallery */}
              {portfolioImages.length > 0 && (
                <div className="bg-white dark:bg-slate-900 md:rounded-3xl md:shadow-xl md:border md:border-slate-100 dark:md:border-white/5 p-4 mt-3">
                  <h3 className="text-slate-900 dark:text-slate-100 text-[9px] font-black mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">photo_library</span>
                    Portfólio de Trabalhos
                  </h3>
                  <div className="flex gap-3 overflow-x-auto snap-x hide-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0">
                    {portfolioImages.map((img, idx) => (
                      <div 
                        key={img.id} 
                        onClick={() => setSelectedImageIndex(idx)}
                        className="w-[180px] md:w-[220px] shrink-0 snap-center aspect-[3/2] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 group cursor-pointer shadow-md active:scale-95 transition-all"
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

              {/* Reviews Section */}
              <div className="bg-white dark:bg-slate-900 md:rounded-3xl md:shadow-xl md:border md:border-slate-100 dark:md:border-white/5 p-4 mt-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-slate-900 dark:text-slate-100 text-[9px] font-black flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-base">reviews</span>
                    Avaliações dos Clientes
                  </h3>
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    <span className="text-sm font-bold">{displayRating}</span>
                    <StarRating rating={Number(displayRating?.replace(',', '.') || 0)} size={16} maxStars={1} />
                    <span className="text-[10px] text-slate-400 font-black">({displayReviewsCount})</span>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  {dbReviews.length > 0 ? (
                    dbReviews.map((review, i) => (
                      <div key={i} className="p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="size-12 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden text-slate-500 font-bold border-2 border-white dark:border-slate-700 shadow-sm">
                              {review.reviewer_avatar_url || review.profiles?.avatar_url ? (
                                 <img src={review.reviewer_avatar_url || review.profiles?.avatar_url} alt="Reviewer" className="w-full h-full object-cover" />
                              ) : (
                                 <div className="w-full h-full flex items-center justify-center text-lg">{(review.reviewer_name || review.profiles?.full_name || 'U')[0].toUpperCase()}</div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {review.reviewer_name || review.profiles?.full_name || 'Usuário'}
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold">{new Date(review.created_at).toLocaleDateString('pt-BR')}</p>
                            </div>
                          </div>
                          <div className="flex text-amber-400 gap-0.5">
                            <StarRating rating={review.rating} size={16} />
                          </div>
                        </div>
                        {review.comment && (
                          <div className="relative pl-4 border-l-2 border-primary/20">
                            <p className="text-slate-600 dark:text-slate-400 text-sm italic leading-relaxed">
                              "{review.comment}"
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="bg-slate-50 dark:bg-white/5 p-10 rounded-2xl border border-slate-100 dark:border-white/5 text-center flex flex-col items-center">
                       <span className="material-symbols-outlined text-5xl text-slate-400 mb-3">star_half</span>
                       <p className="text-slate-600 dark:text-slate-400 font-bold text-xs">Sem avaliações ainda</p>
                       <p className="text-slate-500 text-xs mt-1">Seja o primeiro a avaliar este profissional!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Sidebar Actions & Info */}
            <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-[90px] self-start z-10">
              
              {/* Action Buttons: Desktop Sidebar Integration */}
              <div className="hidden lg:flex flex-col gap-3 bg-white dark:bg-slate-950 p-6 rounded-3xl shadow-2xl border border-primary/10">
                <h3 className="text-sm font-black mb-2 text-primary italic">Contrate agora</h3>
                
                {professional.plan_type === 'plus' && professional.whatsapp && (
                  <a
                    href={`https://wa.me/55${professional.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackLead(professional.id, 'whatsapp_click')}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[24px]">chat</span>
                    Chamar no WhatsApp
                  </a>
                )}
                
                <button
                  onClick={async () => {
                    if (!user) {
                      showToast("Acesso Restrito", "Faça login para enviar mensagens.", "notification");
                      return;
                    }
                    trackLead(professional.id, 'chat_start');
                    onNavigate('chat', { 
                      opponentId: professional.id, 
                      opponentName: professional.name, 
                      opponentAvatar: professional.image 
                    });
                  }}
                  className="w-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[24px]">chat_bubble</span>
                  Conversar no Chat
                </button>
                
                <button
                  onClick={() => {
                    trackLead(professional.id, 'chat_start');
                    onNavigate('serviceRequestForm', { providerId: professional.id, providerName: professional.name });
                  }}
                  className="w-full bg-primary hover:bg-primary/95 text-white py-5 px-6 rounded-2xl font-black italic tracking-tighter flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 shadow-primary/30"
                >
                  <span className="material-symbols-outlined text-[24px]">bolt</span>
                  Solicitar Orçamento
                </button>
              </div>

              {/* Business Info Card */}
              <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-white/5 rounded-3xl p-6 space-y-6">
                <h3 className="text-slate-900 dark:text-slate-100 text-xs font-black flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">info</span>
                  Informações Comerciais
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-xl">location_on</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Endereço</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {professional.address || `${professional.city || 'Atendimento em domicílio'}, ${professional.state || ''}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="size-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-orange-500 text-xl">schedule</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Horário</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {professional.opening_hours || 'Seg à Sex: 08:00 - 18:00 (Consulte disponibilidade)'}
                      </p>
                    </div>
                  </div>

                  {professional.loyalty_enabled && (
                    <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/20">
                      <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-xl">loyalty</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-primary italic tracking-tighter">Programa Fidelidade</h4>
                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1">
                          {professional.loyalty_benefit_description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Map View Integration */}
                {(professional.latitude && professional.longitude) && (
                  <div className="pt-2">
                    <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md relative z-0">
                      <MapContainer 
                        center={[professional.latitude, professional.longitude]} 
                        zoom={15} 
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={false}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[professional.latitude, professional.longitude]}>
                          <Popup>
                            <div className="text-xs font-bold">{professional.name}</div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-3 font-medium text-center italic">
                      📍 Localização aproximada do prestador
                    </p>
                  </div>
                )}
              </div>

              {/* Share & Favorite Mini Card */}
              <div className="bg-white dark:bg-slate-900 shadow-md border border-slate-100 dark:border-white/5 rounded-2xl p-4 flex items-center justify-around">
                <button 
                  onClick={toggleFavorite}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className={`size-10 rounded-full flex items-center justify-center transition-all ${isFavorite ? 'bg-red-50 text-red-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-slate-600'}`}>
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">{isFavorite ? 'Favoritado' : 'Favoritar'}</span>
                </button>
                <button 
                  onClick={handleShare}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="size-10 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-slate-600 flex items-center justify-center transition-all">
                    <span className="material-symbols-outlined text-xl">share</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">Compartilhar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Footer Action: Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 p-3 pb-4 bg-white/90 dark:bg-black/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 flex items-center justify-center gap-2 z-[100] lg:hidden">
        {professional.plan_type === 'plus' && professional.whatsapp && (
          <a
            href={`https://wa.me/55${professional.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackLead(professional.id, 'whatsapp_click')}
            className="h-11 w-11 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 transition-transform active:scale-90 shrink-0"
            title="WhatsApp"
          >
            <span className="material-symbols-outlined text-[22px]">chat</span>
          </a>
        )}
        <div className="flex-1 flex gap-2 max-w-lg">
          <button
            onClick={async () => {
              if (!user) {
                showToast("Acesso Restrito", "Faça login para enviar mensagens.", "notification");
                return;
              }
              trackLead(professional.id, 'chat_start');
              onNavigate('chat', { 
                opponentId: professional.id, 
                opponentName: professional.name, 
                opponentAvatar: professional.image 
              });
            }}
            className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 h-11 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 min-w-0"
          >
            <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
            <span className="truncate">Mensagem</span>
          </button>
          <button
            onClick={() => {
              trackLead(professional.id, 'chat_start');
              onNavigate('serviceRequestForm', { providerId: professional.id, providerName: professional.name });
            }}
            className="flex-1 bg-primary text-white h-11 px-2 md:px-4 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20 transition-transform active:scale-95 min-w-0"
          >
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            <span className="truncate">Orçamento</span>
          </button>
        </div>
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
          {/* Close Button - More Desktop Friendly */}
          <button 
            className="absolute top-6 right-6 text-white size-14 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors z-[110] active:scale-95"
            onClick={() => setSelectedImageIndex(null)}
          >
            <span className="material-symbols-outlined text-4xl">close</span>
          </button>

          {/* Viewer Container */}
          <div className="relative w-full max-w-5xl max-h-[85vh] flex flex-col items-center justify-center">
            
            {/* Navigation Controls (Closer to image on Desktop) */}
            {portfolioImages.length > 1 && (
              <>
                <button 
                  className="absolute left-0 md:-left-20 top-1/2 -translate-y-1/2 text-white size-16 flex items-center justify-center hover:bg-white/10 rounded-full transition-all active:scale-90 z-[110]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((selectedImageIndex - 1 + portfolioImages.length) % portfolioImages.length);
                  }}
                >
                  <span className="material-symbols-outlined text-5xl md:text-6xl">chevron_left</span>
                </button>
                <button 
                  className="absolute right-0 md:-right-20 top-1/2 -translate-y-1/2 text-white size-16 flex items-center justify-center hover:bg-white/10 rounded-full transition-all active:scale-90 z-[110]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex((selectedImageIndex + 1) % portfolioImages.length);
                  }}
                >
                  <span className="material-symbols-outlined text-5xl md:text-6xl">chevron_right</span>
                </button>
              </>
            )}

            <img 
              src={portfolioImages[selectedImageIndex].image_url} 
              alt="Foto do Portfólio" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 ring-1 ring-white/10"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Info Section */}
            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="text-white font-bold tracking-widest text-xs bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                {selectedImageIndex + 1} / {portfolioImages.length}
              </p>
              <p className="text-white/40 text-[10px] font-black hidden md:block">
                ← Seta Esquerda • Seta Direita → • ESC para sair
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
