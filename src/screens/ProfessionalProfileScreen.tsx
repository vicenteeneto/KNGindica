import React, { useEffect, useState } from 'react';
import { NavigationProps } from '../types';
import { professionals } from '../data/mockData';
import VerifiedBadge from '../components/VerifiedBadge';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useSEO } from '../hooks/useSEO';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useNotifications } from '../NotificationContext';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

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
            price: data.price_value?.toString() || '0',
            priceUnit: data.pricing_model || 'hourly',
            show_price: data.show_price !== false,
            pricing_model: data.pricing_model || 'hourly',
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

  const professional = dbProfessional || professionals.find(p => p.id === professionalId) || (loadingProfile ? null : professionals.find(p => p.category === dbProfessional?.category) || professionals[1]); // Evita cair no primeiro (Claudio/Ricardo) se possível

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
          <button 
            onClick={() => onNavigate('home')} 
            className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0"
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
            {user?.id === professionalId && (
              <button 
                onClick={() => onNavigate('userProfile')}
                className="flex items-center gap-2 bg-primary text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:brightness-110 active:scale-95 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                <span className="hidden sm:inline">Editar Perfil</span>
              </button>
            )}
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

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Hero Section / Gallery */}
        <div className="@container">
          <div className="@[480px]:px-4 @[480px]:py-3 md:px-0">
            <div
              className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden bg-slate-200 dark:bg-slate-800 @[480px]:rounded-xl md:rounded-none min-h-40 md:min-h-[320px] relative group"
              style={{
                backgroundImage: `url("${professional.image}")`,
              }}
            >
              {/* Enhanced fluid transition: Multi-layered gradients for zero "hard cutting" effect */}
              <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-black via-black/80 to-transparent"></div>
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
              <div className="absolute inset-x-0 -bottom-1 h-32 bg-black blur-xl opacity-50"></div>
            </div>
          </div>
        </div>

        {/* Profile Info Container */}
        <div className="flex flex-col items-center -mt-12 md:-mt-16 relative z-10 px-0 md:px-4">
          <div className="w-full max-w-3xl bg-white dark:bg-black md:rounded-3xl md:shadow-xl md:border md:border-slate-100 dark:md:border-white/5 overflow-hidden">
            
            {/* Instagram Style Profile Row */}
            <div className="flex px-4 pt-6 pb-2 items-center gap-4 md:gap-8">
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-20 w-20 md:min-h-28 md:w-28 border-4 border-white dark:border-black shadow-xl shrink-0"
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
                  {professional.show_price ? (
                    <>
                      <p className="text-slate-900 dark:text-slate-100 text-base font-black italic tracking-tight">
                        {professional.pricing_model === 'negotiable' ? (
                          'A combinar'
                        ) : (
                          <>
                            {professional.pricing_model === 'starting_at' && <span className="text-[9px] mr-1 opacity-50">A partir</span>}
                            R$ {parseFloat(professional.price || '0').toLocaleString('pt-BR')}
                          </>
                        )}
                      </p>
                      <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-0.5">
                        {professional.pricing_model === 'hourly' ? '/ hora' : 
                         professional.pricing_model === 'fixed' ? 'Preço Fixo' : 
                         professional.pricing_model === 'starting_at' ? 'Inicial' : 'Negociável'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-900 dark:text-slate-100 text-sm font-black italic tracking-tight uppercase">Sob Consulta</p>
                      <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mt-0.5">Valores</p>
                    </>
                  )}
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
              <span className="size-1 w-1 rounded-full bg-primary" />
              Sobre
            </h3>
            <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">
              <p className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed font-medium">
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
              <div className="flex overflow-x-auto gap-3 pb-4 snap-x snap-mandatory hide-scrollbar">
                {portfolioImages.map((img, idx) => (
                  <div 
                    key={img.id} 
                    onClick={() => setSelectedImageIndex(idx)}
                    className="flex-shrink-0 w-44 aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 group cursor-pointer shadow-sm active:scale-95 transition-transform snap-start"
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

              {/* Map View */}
              {(professional.latitude && professional.longitude) && (
                <div className="px-4 pb-4">
                  <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative z-0">
                    <MapContainer 
                      center={[professional.latitude, professional.longitude]} 
                      zoom={15} 
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[professional.latitude, professional.longitude]}>
                        <Popup>
                          <div className="text-xs font-bold">{professional.name}</div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium text-center italic">
                    📍 Localização aproximada do prestador
                  </p>
                </div>
              )}
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
                    <div key={i} className="bg-white/2 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden text-slate-500 font-bold border border-slate-200 dark:border-slate-700">
                            {review.reviewer_avatar_url || review.profiles?.avatar_url ? (
                               <img src={review.reviewer_avatar_url || review.profiles?.avatar_url} alt="Reviewer" className="w-full h-full object-cover" />
                            ) : (
                               <div className="w-full h-full flex items-center justify-center">{(review.reviewer_name || review.profiles?.full_name || 'U')[0].toUpperCase()}</div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {review.reviewer_name || review.profiles?.full_name || 'Usuário'}
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
                  <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-xl border border-slate-200 dark:border-white/5 text-center flex flex-col items-center">
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
      <div className="fixed bottom-0 left-0 md:left-12 right-0 p-4 bg-white/80 dark:bg-black/95 backdrop-blur-lg border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row justify-center gap-2 z-[60]">
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
          className="w-full max-w-2xl bg-primary hover:bg-primary/90 text-white py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-3 shadow-xl transition-transform active:scale-95 shadow-primary/20"
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
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest hidden md:block">
                ← Seta Esquerda • Seta Direita → • ESC para sair
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
