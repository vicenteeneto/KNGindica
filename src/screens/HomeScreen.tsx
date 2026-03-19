import React, { useState, useEffect, useRef } from 'react';
import { NavigationProps, Screen } from '../types';
import { professionals as mockProfessionals } from '../data/mockData';
import MobileNav from '../components/MobileNav';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet Default Icon issue in React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Marker for Providers
const createProviderIcon = (imageUrl: string) => L.divIcon({
  className: 'custom-provider-marker',
  html: `<div class="size-10 rounded-full border-2 border-primary bg-white overflow-hidden shadow-lg transform -translate-x-1/2 -translate-y-1/2"><img src="${imageUrl}" class="w-full h-full object-cover" /></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// Helper component to update map view
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

// Helper for calculating distance in km (Haversine Formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
}

import { useNotifications } from '../NotificationContext';

export default function HomeScreen({ onNavigate }: NavigationProps) {
  const { user, profile, role } = useAuth();
  const { unreadNotifications, unreadMessages } = useNotifications();
  const isPremiumUser = profile?.plan_type === 'plus' || role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [mapCenter, setMapCenter] = useState<[number, number]>([-15.7801, -47.9292]); // Brasília como fallback neutro
  
  const [locationName, setLocationName] = useState('Brasil (Sem GPS)');
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [featuredProviders, setFeaturedProviders] = useState<any[]>([]);
  const [previousProviders, setPreviousProviders] = useState<any[]>([]);
  const [favoriteProviders, setFavoriteProviders] = useState<any[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<{ name: string, icon: string }[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [touchStartHero, setTouchStartHero] = useState<number | null>(null);
  const [touchEndHero, setTouchEndHero] = useState<number | null>(null);
  const [manualCityInput, setManualCityInput] = useState('');
  const isManualLocation = useRef(false);

  // Geocodifica uma string de cidade para [lat, lng]
  const geocodeCidade = async (cidade: string): Promise<[number, number] | null> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(cidade)}&country=Brazil&format=json&limit=1`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (e) {
      console.warn('Geocoding falhou:', e);
    }
    return null;
  };

  // Sistema de Rastreamento de Leads
  const trackLead = async (providerId: string, type: 'chat_start' | 'whatsapp_click') => {
    if (!user) return;
    try {
      await supabase.from('lead_events').insert({
        client_id: user.id,
        provider_id: providerId,
        type: type,
        metadata: { screen: 'home' }
      });
    } catch (e) {
      console.error("Erro ao registrar lead", e);
    }
  };

  // Ask for location on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('KNGindica_manualCity');
    if (savedLocation) {
      isManualLocation.current = true;
      setLocationName(savedLocation);
      setManualCityInput(savedLocation);
      // Geocodifica a cidade salva para centrar o mapa
      geocodeCidade(savedLocation).then(coords => {
        if (coords) setMapCenter(coords);
      });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isManualLocation.current) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setUserCoords({ lat, lng });
            setMapCenter([lat, lng]);
            setLocationName("Sua Localização Atual");
          }
        },
        (error) => {
          console.warn("GPS negado ou indisponível:", error);
          if (!isManualLocation.current) {
            setLocationName("Localização Indisponível (GPS Negado)");
          }
        }
      );
    }
  }, []);

  // Update user's location in BD when we get it
  useEffect(() => {
    const updateLocation = async () => {
      if (user && userCoords) {
        try {
          await supabase
            .from('profiles')
            .update({
              latitude: userCoords.lat,
              longitude: userCoords.lng
            })
            .eq('id', user.id);
        } catch (e) {
          console.error("Erro ao salvar loc", e);
        }
      }
    };
    updateLocation();
  }, [user, userCoords]);

  // Fetch providers from Supabase instead of only relying on mock data
  useEffect(() => {
    const fetchProviders = async () => {
      setLoadingProviders(true);
      try {
        let data, error;

        if (userCoords) {
          const res = await supabase.rpc('get_providers_within_radius', {
            user_lat: userCoords.lat,
            user_lon: userCoords.lng,
            radius_km: 150
          });
          data = res.data;
          error = res.error;
        } else {
          // Sem GPS: busca todos os providers, mas prioriza pela cidade digitada
          const res = await supabase
            .from('profiles')
            .select(`
              id,
              full_name,
              avatar_url,
              role,
              city,
              latitude,
              longitude,
              plan_type,
              status,
              created_at,
              service_category,
              categories,
              rating,
              price_value,
              pricing_model,
              show_price,
              phone,
              is_verified,
              bio,
              address
            `)
            .eq('role', 'provider');
          data = res.data;
          error = res.error;
        }

        if (error) throw error;


        // Map them to look like our UI components expect
        let mapped = (data || []).map(p => {
          let distanceStr = 'N/A';
          if (userCoords && p.latitude && p.longitude) {
            const dist = calculateDistance(userCoords.lat, userCoords.lng, p.latitude, p.longitude);
            distanceStr = dist.toFixed(1);
          } else if (p.city) {
             distanceStr = 'N/A (' + p.city + ')';
          }

          return {
            id: p.id,
            name: p.full_name || 'Profissional Sem Nome',
            service: (p.categories && p.categories.length > 0) ? p.categories[0] : 'Serviços Gerais',
            rating: p.rating || (4.5 + Math.random() * 0.5).toFixed(1),
            price: p.price_value || 0,
            priceUnit: p.pricing_model || 'hourly',
            show_price: p.show_price !== false,
            pricing_model: p.pricing_model || 'hourly',
            distance: distanceStr,
            city: p.city,
            latitude: p.latitude,
            longitude: p.longitude,
            image: p.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
            isAffiliate: p.plan_type === 'plus',
            isVerified: true,
            plan_type: p.plan_type || 'basic',
            rawDistance: distanceStr === 'N/A' || distanceStr.includes('N/A') ? 999999 : parseFloat(distanceStr)
          };
        });

        // Sort by distance if we have GPS
        // If not GPS, prioritize the matched city
        mapped.sort((a, b) => {
           if (userCoords) {
             return a.rawDistance - b.rawDistance;
           } else if (locationName && locationName !== 'Brasil (Sem GPS)' && locationName !== 'Localização Indisponível (GPS Negado)') {
             const aMatch = a.city?.toLowerCase().includes(locationName.toLowerCase()) ? -1 : 1;
             const bMatch = b.city?.toLowerCase().includes(locationName.toLowerCase()) ? -1 : 1;
             return aMatch - bMatch;
           }
           return 0;
        });
        
        // Blend in mock ones if we have none, just to avoid empty UI for the demo
        if (mapped.length === 0) {
          mapped = mockProfessionals.filter(mp => mp.isAffiliate).map(mp => ({
            ...mp, 
            price: String(mp.price), 
            distance: String(mp.distance),
            city: 'N/A', 
            isAffiliate: mp.isAffiliate ?? false,
            isVerified: mp.isVerified ?? false,
            rawDistance: 999999
          }));
        }

        setProviders(mapped);
      } catch (err) {
        console.error("Error fetching providers:", err);
      } finally {
        setLoadingProviders(false);
      }
    };
    fetchProviders();
  }, [userCoords, locationName]);

  // Fetch active service request for "Life Activity" tracking
  useEffect(() => {
    const fetchActiveRequest = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('service_requests')
          .select('*, profiles:provider_id(full_name, avatar_url)')
          .or('status.eq.paid,status.eq.in_service')
          .eq('client_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1);
        
        if (data && data.length > 0) {
          setActiveRequest(data[0]);
        }
      } catch (e) {
        console.error("Error fetching active request:", e);
      }
    };
    fetchActiveRequest();
  }, [user]);

  // Fetch previously hired providers ("Hire Again" section)
  useEffect(() => {
    const fetchPreviousProviders = async () => {
      if (!user) return;
      try {
        // 1. Get distinct provider IDs from completed requests
        const { data: requests, error: reqError } = await supabase
          .from('service_requests')
          .select('provider_id')
          .eq('client_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        if (reqError) throw reqError;
        if (!requests || requests.length === 0) return;

        const distinctIds = Array.from(new Set(requests.map(r => r.provider_id)));

        // 2. Fetch profiles for these IDs
        const { data: profilesData, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', distinctIds);

        if (profError) throw profError;

        if (profilesData) {
          const mapped = profilesData.map((p: any) => ({
            id: p.id,
            name: p.company_name || p.full_name || 'Profissional',
            service: p.categories?.[0] || 'Serviços Gerais',
            rating: p.rating || 5.0,
            distance: p.city ? 'Distância N/A' : '99+', // Basic mock for now
            image: p.avatar_url || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a'
          }));
          setPreviousProviders(mapped);
        }
      } catch (e) {
        console.error("Error fetching previous providers:", e);
      }
    };
    fetchPreviousProviders();
  }, [user]);

  // Fetch favorite providers
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) {
        setFavoriteProviders([]);
        return;
      }
      try {
        const { data: favs, error: favError } = await supabase
          .from('user_favorites')
          .select('provider_id, profiles!provider_id(*)')
          .eq('user_id', user.id);

        if (favError) throw favError;

        if (favs) {
          const mapped = favs.map((f: any) => {
            const p = f.profiles;
            if (!p) return null;
            return {
              id: p.id,
              name: p.company_name || p.full_name || 'Profissional',
              service: p.categories?.[0] || 'Serviços Gerais',
              rating: p.rating || 5.0,
              distance: p.city ? `Em ${p.city}` : 'N/A',
              image: p.avatar_url || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a',
              plan_type: p.plan_type || 'basic'
            };
          }).filter(Boolean);
          setFavoriteProviders(mapped);
        }
      } catch (e) {
        console.error("Error fetching favorites:", e);
      }
    };
    fetchFavorites();
  }, [user]);

  // Handle shuffling featured providers for the Hero spotlight
  useEffect(() => {
    if (providers.length > 0) {
      const plusOnes = providers.filter(p => p.plan_type === 'plus');
      // Fisher-Yates shuffle
      const shuffled = [...plusOnes];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setFeaturedProviders(shuffled);

      // Extract dynamic categories from actual providers
      const catsWithProviders = Array.from(new Set(providers.map(p => p.service))).filter(c => c !== 'Serviços Gerais');
      
      const categoryIconMap: Record<string, string> = {
        'Limpeza': 'cleaning_services',
        'Reformas': 'construction',
        'Elétrica': 'bolt',
        'Jardim': 'yard',
        'Montagem': 'handyman',
        'Encanador': 'plumbing',
        'Pintura': 'imagesearch_roller',
        'Eletricista': 'bolt'
      };

      let derivedCats = catsWithProviders.map((name: string) => ({
        name,
        icon: (categoryIconMap as Record<string, string>)[name] || 'handyman'
      }));

      // Shuffle derived categories (Fisher-Yates)
      for (let i = derivedCats.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [derivedCats[i], derivedCats[j]] = [derivedCats[j], derivedCats[i]];
      }

      setDynamicCategories([{ name: 'Todos', icon: 'apps' }, ...derivedCats]);
    }
  }, [providers]);

  const handleManualLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(manualCityInput.trim() !== '') {
      isManualLocation.current = true;
      const city = manualCityInput.trim();
      setLocationName(city);
      setUserCoords(null); // Clear GPS since we are using explicit city
      localStorage.setItem('KNGindica_manualCity', city);
      setShowLocationModal(false);
      
      // Geocodificar a cidade e centrar o mapa
      const coords = await geocodeCidade(city);
      if (coords) setMapCenter(coords);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onNavigate('listing', { searchQuery });
    }
  };

  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  // Group professionals for rows
  const plusProviders = providers.filter(p => p.plan_type === 'plus');
  const cleaningProviders = providers.filter(p => 
    p.service.toLowerCase().includes('limpeza') || 
    p.category?.toLowerCase().includes('limpeza')
  );
  const constructionProviders = providers.filter(p => 
    p.service.toLowerCase().includes('reforma') || 
    p.service.toLowerCase().includes('obra') ||
    p.category?.toLowerCase().includes('reforma')
  );
  const electricProviders = providers.filter(p => 
    p.service.toLowerCase().includes('eletri') || 
    p.category?.toLowerCase().includes('eletri')
  );
  
  // High-priority featured list for Hero
  const heroProviders = featuredProviders.length > 0 ? featuredProviders : providers.slice(0, 5);

  // Auto-scroll hero
  useEffect(() => {
    if (heroProviders.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex(prev => (prev + 1) % Math.min(heroProviders.length, 5));
    }, 8000);
    return () => clearInterval(interval);
  }, [heroProviders.length]);

  const minSwipeDistance = 50;

  const handleTouchStartHero = (e: React.TouchEvent) => {
    setTouchEndHero(null);
    setTouchStartHero(e.targetTouches[0].clientX);
  };

  const handleTouchMoveHero = (e: React.TouchEvent) => {
    setTouchEndHero(e.targetTouches[0].clientX);
  };

  const handleTouchEndHero = () => {
    if (!touchStartHero || !touchEndHero) return;
    const distance = touchStartHero - touchEndHero;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      setCurrentHeroIndex((prev) => (prev + 1) % Math.min(heroProviders.length, 5));
    } else if (isRightSwipe) {
      setCurrentHeroIndex((prev) => (prev === 0 ? Math.min(heroProviders.length, 5) - 1 : prev - 1));
    }
  };

  return (
    <div className="w-full bg-[#000000] min-h-screen flex flex-col font-display text-white pb-20 md:pb-0 overflow-x-hidden transition-colors duration-500">
      
      {/* Floating Header */}
      <header className={`fixed top-0 left-0 md:left-12 right-0 z-50 transition-all duration-500 px-4 pt-3 pb-1.5 ${isScrolled
        ? 'bg-black/95 backdrop-blur-md shadow-2xl border-b border-white/5'
        : 'bg-gradient-to-b from-black/90 via-black/30 to-transparent'
        }`}>
        <div className="flex items-center justify-between mx-auto max-w-7xl">
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center gap-1.5 cursor-pointer group"
              onClick={() => setShowLocationModal(true)}
            >
              <span className="material-symbols-outlined text-primary text-xl group-hover:scale-110 transition-transform">location_on</span>
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-[0.2em] font-black text-slate-400">Localização</span>
                <span className="text-sm font-bold flex items-center gap-1 group-hover:text-primary transition-colors">
                  {locationName}
                  <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">expand_more</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-5">
            {/* Desktop Navigation - Hidden since migrated to Sidebar */}
            <nav className="hidden items-center gap-6">
              {/* Opções migradas para SidebarNav */}
            </nav>

            <div className="flex items-center gap-1 md:gap-3">
              {/* Ocultar Chat e Notificações no topo se estiver em Desktop (já estão na Sidebar) */}
              <button onClick={() => onNavigate('chatList')} className="md:hidden p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors relative">
                <span className="material-symbols-outlined text-[26px]">chat</span>
                {unreadMessages > 0 && (
                  <span className="absolute top-2 right-2 size-2 bg-primary rounded-full border border-white dark:border-black animate-pulse"></span>
                )}
              </button>
              <button onClick={() => onNavigate('notifications')} className="md:hidden p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors relative">
                <span className="material-symbols-outlined text-[26px]">notifications</span>
                {unreadNotifications > 0 && (
                  <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border border-white dark:border-black animate-pulse"></span>
                )}
              </button>
              {user && (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex flex-col items-end mr-1">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest italic leading-none">Modo</span>
                    <span className="text-[10px] font-bold text-white uppercase tracking-tight leading-none">Cliente</span>
                  </div>
                  <button 
                    onClick={() => onNavigate('userProfile')} 
                    className={`size-9 rounded-full overflow-hidden border-2 transition-all shadow-lg ${
                      isPremiumUser 
                        ? 'border-primary animate-glow-incandescent scale-110 shadow-primary/20' 
                        : 'border-primary/50 hover:border-primary shadow-primary/10'
                    }`}
                  >
                    <img 
                      src={profile?.avatar_url || user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=random`} 
                      alt="Avatar" 
                      className="w-full h-full object-cover" 
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category Chips - Prime Style */}
        <div className="max-w-7xl mx-auto mt-4 overflow-x-auto hide-scrollbar flex items-center gap-2 pb-2">
          {dynamicCategories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => cat.name === 'Todos' ? onNavigate('listing', { searchQuery: '' }) : onNavigate('listing', { category: cat.name })}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-primary hover:text-white hover:border-primary text-slate-500 dark:text-gray-300"
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 w-full relative">
        {/* Prime-Style Hero Carousel */}
        <section 
          className="relative w-full h-[60vh] md:h-[75vh] overflow-hidden bg-background-light dark:bg-black touch-pan-y"
          onTouchStart={handleTouchStartHero}
          onTouchMove={handleTouchMoveHero}
          onTouchEnd={handleTouchEndHero}
        >
          {heroProviders.length > 0 ? (
            <div className="absolute inset-0 w-full h-full">
              {heroProviders.slice(0, 5).map((p, idx) => (
                <div 
                  key={p.id}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentHeroIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-full object-cover opacity-50 scale-105 transform hover:scale-100 transition-transform duration-[10000ms]"
                  />
                  {/* Gradients - Theme-aware Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background-light dark:from-background-dark via-transparent to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-background-light/40 dark:from-black/80 via-transparent to-transparent"></div>

                  {/* Content */}
                  <div className="absolute bottom-16 md:bottom-24 left-0 w-full px-4 md:px-12 max-w-7xl mx-auto left-1/2 -translate-x-1/2">
                    <div className="max-w-2xl animate-fade-in-up">
                      <div className="flex items-center gap-2 mb-3">
                        {p.plan_type === 'plus' ? (
                          <span className="bg-primary px-2 py-0.5 rounded text-[10px] font-black tracking-tighter italic text-white shadow-lg">PLUS</span>
                        ) : (
                          <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-black tracking-tighter italic text-gray-400 shadow-lg border border-white/5">DESTAQUE</span>
                        )}
                        <span className="text-sm font-bold text-orange-200/80">Verificado KNGindica</span>
                      </div>
                      <h1 className="text-3xl md:text-6xl font-black text-slate-900 dark:text-white leading-[0.9] mb-3 drop-shadow-2xl">
                        {p.name.split(' ')[0]} <br />
                        <span className="text-primary">{p.name.split(' ').slice(1).join(' ')}</span>
                      </h1>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center text-yellow-500 gap-1 bg-black/40 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                          <span className="material-symbols-outlined text-sm filled">star</span>
                          <span className="text-sm font-black">{p.rating}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-300 drop-shadow-md">• {p.service}</span>
                        <span className="text-sm font-bold text-slate-300 drop-shadow-md">• {p.city}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 md:gap-3">
                        <button
                          onClick={() => onNavigate('profile', { professionalId: p.id })}
                          className="flex items-center gap-1.5 bg-primary text-white px-3 md:px-8 py-2 md:py-3.5 rounded-lg font-black text-[10px] md:text-sm uppercase tracking-widest hover:bg-orange-600 transition-all active:scale-95 shadow-xl shadow-primary/20"
                        >
                          <span className="material-symbols-outlined text-[16px] md:text-[24px] filled">play_arrow</span>
                          Ver Perfil
                        </button>
                        <button
                          onClick={() => onNavigate('listing', { category: p.service })}
                          className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md text-white px-3 md:px-8 py-2 md:py-3.5 rounded-lg font-bold text-[10px] md:text-sm uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10"
                        >
                          <span className="material-symbols-outlined text-[16px] md:text-[24px]">info</span>
                          Detalhes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Carousel Indicators */}
              <div className="absolute bottom-8 right-8 z-30 flex gap-2">
                {heroProviders.slice(0, 5).map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentHeroIndex(idx)}
                    className={`h-1.5 transition-all rounded-full ${idx === currentHeroIndex ? 'w-8 bg-primary' : 'w-2 bg-white/30'}`}
                  ></button>
                ))}
              </div>
            </div>
          ) : (
             /* Fallback for empty plus providers */
             <div className="absolute inset-0 flex items-center justify-center">
                <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6958?q=80&w=2070&auto=format&fit=crop" className="opacity-30 object-cover w-full h-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f171e] to-transparent"></div>
                <div className="relative z-10 text-center">
                  <h2 className="text-5xl font-black mb-4">KNGindica Premium</h2>
                  <p className="text-xl text-slate-300 font-medium max-w-xl mx-auto mb-10 leading-relaxed">
                    Torne-se um parceiro KNGindica e multiplique seus serviços com exposição máxima e ferramentas exclusivas.
                  </p>
                </div>
             </div>
          )}
        </section>

        {/* Active Service Tracker (Live Activity Style) */}
        {activeRequest && (
          <div className="max-w-7xl mx-auto px-4 -mt-12 md:-mt-16 mb-8 relative z-30">
            <div 
              onClick={() => onNavigate('myRequests')}
              className="bg-primary/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform animate-pulse-subtle"
            >
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full overflow-hidden border-2 border-white/20 shadow-lg">
                  <img 
                    src={activeRequest.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${activeRequest.profiles?.full_name}&background=random`} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 bg-white rounded-full animate-ping"></span>
                    <span className="text-[10px] font-black text-white/80 uppercase tracking-widest italic">Serviço Ativo</span>
                  </div>
                  <h4 className="text-sm font-black text-white leading-tight">
                    {activeRequest.status === 'paid' ? 'Aguardando Início' : 'Trabalho em Andamento'}
                  </h4>
                  <p className="text-[10px] text-white/70 font-bold">{activeRequest.profiles?.full_name}</p>
                </div>
              </div>
              <button className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors">
                <span className="material-symbols-outlined text-white">chevron_right</span>
              </button>
            </div>
          </div>
        )}


        <section className="max-w-7xl mx-auto px-4 mb-10 relative z-30">
          <div className="bg-gradient-to-r from-emerald-600/90 to-emerald-800/95 rounded-xl p-4 md:p-6 shadow-xl relative overflow-hidden group border border-emerald-400/20">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 bg-black/10 backdrop-blur-sm px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase mb-3 text-emerald-200/80">
                  <span className="material-symbols-outlined text-[10px]">rocket_launch</span>
                  Destaque
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white leading-tight mb-2 tracking-tighter italic uppercase">
                  Você define o <span className="text-emerald-300">preço!</span>
                </h2>
                <p className="text-emerald-100/60 text-[10px] md:text-sm font-medium max-w-lg leading-snug">
                  Poste o que você precisa e os profissionais disputam sua ordem.
                </p>
              </div>
              <button 
                onClick={() => onNavigate('freelanceRequest')}
                className="bg-white text-emerald-900 px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shrink-0"
              >
                Solicitar Freelance
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>

        {/* Collection Rows */}
        <div className={`w-full max-w-7xl mx-auto relative z-20 pb-20 ${!activeRequest ? '-mt-8' : ''}`}>
          
          {/* Action Row - Search & View Toggle */}
          <div className="px-4 md:px-8 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative group max-w-lg w-full">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors">sparkles</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Pergunte algo ou busque serviços..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && onNavigate('listing', { searchQuery })}
                    className="w-full pl-10 pr-4 py-2 bg-slate-100/10 backdrop-blur-xl border border-white/10 rounded-full text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-gray-500"
                  />
            </div>
            
            <div className="flex items-center gap-4">
               <button 
                onClick={() => setViewMode(prev => prev === 'list' ? 'map' : 'list')}
                className="flex items-center gap-2 bg-slate-100 dark:bg-[#1a242f] text-slate-900 dark:text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tighter border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors shadow-lg"
              >
                <span className="material-symbols-outlined text-[18px]">{viewMode === 'list' ? 'map' : 'format_list_bulleted'}</span>
                {viewMode === 'list' ? 'Ver Mapa' : 'Ver Lista'}
              </button>
            </div>
          </div>

          {viewMode === 'map' ? (
             /* Map View Container */
             <div className="px-4 md:px-8">
               <div className="w-full h-[600px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative ring-1 ring-white/10">
                  <MapContainer 
                    center={mapCenter} 
                    zoom={userCoords ? 13 : 12} 
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      className="dark-map-filter"
                    />
                    <MapUpdater center={mapCenter} />
                    {userCoords && (
                      <Marker position={[userCoords.lat, userCoords.lng]}>
                        <Popup>📍 Você está aqui</Popup>
                      </Marker>
                    )}
                    {providers.map(p => {
                      if (!p.latitude || !p.longitude) return null;
                      return (
                        <Marker 
                          key={p.id} 
                          position={[p.latitude, p.longitude]} 
                          icon={createProviderIcon(p.image)}
                        >
                          <Popup className="provider-popup">
                            <div className="p-2 w-48 font-display bg-[#0f171e] text-white rounded-lg">
                              <img src={p.image} className="w-full h-24 object-cover rounded-md mb-2" alt={p.name} />
                              <h4 className="font-bold text-white">{p.name}</h4>
                              <p className="text-xs text-primary font-bold mb-1">{p.service}</p>
                              <button 
                                onClick={() => onNavigate('profile', { professionalId: p.id })}
                                className="w-full bg-primary text-white text-[10px] py-2 rounded font-black uppercase mt-2"
                              >
                                Ver Perfil
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
               </div>
             </div>
          ) : (
            <>
              {loadingProviders ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : (
                <>
                  {/* Row: Hire Again (Prioritizing loyal customers) */}
                  {previousProviders.length > 0 && (
                    <CollectionRow 
                      title="Contratar Novamente" 
                      subtitle="Profissionais que já prestaram serviços para você."
                      providers={previousProviders} 
                      onNavigate={onNavigate}
                    />
                  )}

                  {/* Row: Alvo Indica Recommendations */}
                  <CollectionRow 
                    title="Destaques KNGindica" 
                    subtitle="Os profissionais mais bem avaliados e recomendados."
                    providers={featuredProviders.length > 0 ? featuredProviders : plusProviders.slice(0, 10)} 
                    onNavigate={onNavigate}
                    highlight
                  />

                  {/* Row: Cleaning Services */}
                  <CollectionRow 
                    title="Mestres da Limpeza" 
                    subtitle="Deixe sua casa brilhando com especialistas."
                    providers={cleaningProviders} 
                    onNavigate={onNavigate}
                  />

                  {/* Row: Construction & Renovation */}
                  <CollectionRow 
                    title="Reformas e Manutenção" 
                    subtitle="Sua casa nova, do jeito que você sonhou."
                    providers={constructionProviders} 
                    onNavigate={onNavigate}
                  />

                  {/* Row: Electrical */}
                  <CollectionRow 
                    title="Eletricistas e Instalações" 
                    subtitle="Segurança e rapidez para resolver pane ou instalar aparelhos."
                    providers={electricProviders} 
                    onNavigate={onNavigate}
                  />

                  {/* Row: All Providers (Fallback/Discovery) */}
                  <CollectionRow 
                    title="KNGindica" 
                    subtitle="Explore todos os prestadores em Rondonópolis e região."
                    providers={providers} 
                    onNavigate={onNavigate}
                  />

                  {/* Row: My Favorites (At the bottom as requested) */}
                  {favoriteProviders.length > 0 && (
                    <CollectionRow 
                      title="Meus Favoritos" 
                      subtitle="Seus profissionais preferidos salvos para acesso rápido."
                      providers={favoriteProviders} 
                      onNavigate={onNavigate}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <MobileNav onNavigate={onNavigate} currentScreen="home" role={useAuth().role} />

       {/* Manual Location Modal */}
       {showLocationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/90 backdrop-blur-xl p-4">
          <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-xl text-slate-900 dark:text-white flex items-center gap-2 italic uppercase tracking-tighter">
                <span className="material-symbols-outlined text-primary">location_on</span>
                Sua Cidade
              </h3>
              <button onClick={() => setShowLocationModal(false)} className="text-slate-400 hover:text-white size-10 rounded-full hover:bg-white/5 flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleManualLocationSubmit} className="p-6">
              <p className="text-sm text-slate-400 mb-6 font-medium">
                Digite sua cidade para listarmos os melhores profissionais próximos a você.
              </p>
              <div className="mb-8">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">search</span>
                  <input
                    type="text"
                    value={manualCityInput}
                    onChange={(e) => setManualCityInput(e.target.value)}
                    placeholder="Ex: Rondonópolis, SP..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-2xl focus:border-primary outline-none transition-all text-slate-900 dark:text-white font-bold"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  type="submit" 
                  disabled={!manualCityInput.trim()} 
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50 shadow-xl shadow-primary/20"
                >
                  Confirmar Localização
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .filled { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 48; }
        .dark-map-filter { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(0.99); }
        }
        .animate-pulse-subtle { animation: pulse-subtle 4s infinite ease-in-out; }
      `}} />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="px-4 md:px-8 mb-12 animate-pulse">
      <div className="h-6 w-48 bg-slate-800 rounded-md mb-2"></div>
      <div className="h-4 w-64 bg-slate-800/50 rounded-md mb-5"></div>
      <div className="flex gap-4 overflow-x-hidden">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="shrink-0 w-[160px] md:w-[260px]">
            <div className="aspect-[16/9] md:aspect-video bg-slate-800 rounded-xl mb-2"></div>
            <div className="h-3 w-24 bg-slate-800/50 rounded-md mx-auto"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CollectionRowProps {
  title: string;
  subtitle: string;
  providers: any[];
  onNavigate: (screen: Screen, params?: any) => void;
  highlight?: boolean;
}

function CollectionRow({ title, subtitle, providers, onNavigate, highlight }: CollectionRowProps) {
  if (providers.length === 0) return null;

  return (
    <section className="px-4 md:px-8 mb-12">
      <div className="flex flex-col mb-5">
        <h3 className={`text-xl md:text-2xl font-black tracking-tighter uppercase italic flex items-center gap-2 ${highlight ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
          {title}
          <span className="material-symbols-outlined text-sm font-normal not-italic opacity-20">chevron_right</span>
        </h3>
        <p className="text-xs md:text-sm text-slate-500 dark:text-gray-400 font-medium">{subtitle}</p>
      </div>

      <div className="flex gap-4 md:gap-5 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory px-0 md:mx-0 md:px-0">
        {providers.map((p) => (
          <div
            key={p.id}
            onClick={() => onNavigate('profile', { professionalId: p.id })}
            className="snap-start shrink-0 w-[160px] md:w-[260px] group cursor-pointer"
          >
            <div className={`relative aspect-[16/9] md:aspect-video rounded-xl overflow-hidden shadow-2xl bg-white dark:bg-[#0a0a0a] transition-all duration-300 group-hover:scale-105 group-hover:ring-4 ${highlight ? 'group-hover:ring-primary/40' : 'group-hover:ring-slate-200 dark:group-hover:ring-white/5'}`}>
              <img
                className="w-full h-full object-cover transition-transform duration-700"
                src={p.image}
                alt={p.name}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
              
              {/* Rating Mini - Ultra micro version with forced 5px star */}
              <div className="absolute top-1 right-1 bg-black/60 backdrop-blur-md px-1 py-0 rounded text-[7px] font-black flex items-center gap-0.5">
                <span 
                  className="material-symbols-outlined text-yellow-500 filled"
                  style={{ fontSize: '5px', width: '5px', height: '5px', display: 'flex', itemsCenter: 'center', justifyContent: 'center', fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20" }}
                >
                  star
                </span>
                {p.rating}
              </div>

              {/* Info Overlay - Cleaner version with even smaller text */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
                <span className="text-[7px] font-black text-white px-1 py-0 bg-primary/20 backdrop-blur-md rounded border border-primary/30 uppercase tracking-tighter italic">
                  {p.service}
                </span>
                <span className="text-[7px] font-black text-white/40">{p.distance} km</span>
              </div>
            </div>
            
            {/* Name Below Card for cleaner look */}
            <div className="mt-2 text-center">
              <h4 className="font-bold text-[11px] md:text-xs truncate text-slate-500 dark:text-gray-400 group-hover:text-primary transition-colors uppercase tracking-tight">
                {p.name}
              </h4>
            </div>
          </div>
        ))}
        
        {/* View More Card */}
        <div className="snap-start shrink-0 w-[160px] md:w-[260px] cursor-pointer">
           <button 
            onClick={() => onNavigate('listing', { category: providers[0].service })}
            className="w-full aspect-[16/9] md:aspect-video rounded-xl border-2 border-slate-200/50 dark:border-white/5 bg-slate-100 dark:bg-white/2 hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex flex-col items-center justify-center gap-2 group shadow-sm dark:shadow-none"
          >
            <span className="size-10 rounded-full bg-slate-200 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10">
              <span className="material-symbols-outlined">add</span>
            </span>
            <span className="text-xs font-black uppercase tracking-widest">Ver Mais</span>
           </button>
           {/* Alignment placeholder */}
           <div className="mt-2 text-center h-[20px] md:h-[24px]"></div>
        </div>
      </div>
    </section>
  );
}
