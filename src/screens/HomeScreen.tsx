import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavigationProps, Screen } from '../types';
// import { professionals as mockProfessionals } from '../data/mockData';
import MobileNav from '../components/MobileNav';
import { useAuth } from '../AuthContext';
import { formatCurrency, normalizeText } from '../lib/formatters';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CityAutocomplete } from '../components/CityAutocomplete';
import VerifiedBadge from '../components/VerifiedBadge';
import StarRating from '../components/StarRating';


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
  
  const [locationName, setLocationName] = useState(() => localStorage.getItem('KNGindica_manualCity') || 'Brasil (Sem GPS)');
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [dbProviders, setDbProviders] = useState<any[]>([]);
  const [previousProviders, setPreviousProviders] = useState<any[]>([]);
  const [favoriteProviders, setFavoriteProviders] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [touchStartHero, setTouchStartHero] = useState<number | null>(null);
  const [touchEndHero, setTouchEndHero] = useState<number | null>(null);
  const [manualCityInput, setManualCityInput] = useState(() => localStorage.getItem('KNGindica_manualCity') || '');
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const isManualLocation = useRef(!!localStorage.getItem('KNGindica_manualCity'));

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

  // Reverse geocoding de lat,lng para cidade
  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      const data = await res.json();
      if (data && data.address) {
        return data.address.city || data.address.town || data.address.municipality || data.address.village || null;
      }
    } catch (e) {
      console.warn('Reverse Geocoding falhou:', e);
    }
    return null;
  };

  const handleCitySelect = async (city: string) => {
    setManualCityInput(city);
    isManualLocation.current = true;
    setLocationName(city);
    setUserCoords(null);
    localStorage.setItem('KNGindica_manualCity', city);
    setShowLocationDropdown(false);
    const coords = await geocodeCidade(city);
    if (coords) setMapCenter(coords);
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

  // Toggle favorite provider
  const toggleFavorite = async (providerId: string) => {
    if (!user) return;
    const isFavorited = favoriteProviders.some(f => f.id === providerId);
    try {
      if (isFavorited) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('provider_id', providerId);
        setFavoriteProviders(prev => prev.filter(f => f.id !== providerId));
      } else {
        await supabase
          .from('user_favorites')
          .insert({ user_id: user.id, provider_id: providerId });
        const provider = dbProviders.find(p => p.id === providerId);
        if (provider) setFavoriteProviders(prev => [...prev, provider]);
      }
    } catch (e) {
      console.error("Erro ao favoritar", e);
    }
  };

  // Ask for location on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('KNGindica_manualCity');
    if (savedLocation) {
      isManualLocation.current = true;
      // setLocationName e setManualCityInput já foram carregados no useState/initializer
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
            
            // Tenta obter o nome da cidade para exibi-la imediatamente
            setLocationName("Buscando cidade...");
            reverseGeocode(lat, lng).then(cidade => {
              if (cidade && !isManualLocation.current) {
                setLocationName(cidade);
              } else if (!isManualLocation.current) {
                setLocationName("Sua Localização Atual");
              }
            });
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

  // Fetch cities that have providers registered
  useEffect(() => {
    const fetchAvailableCities = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('city')
          .eq('role', 'provider')
          .not('city', 'is', null);
        
        if (error) throw error;
        
        if (data) {
          // Extrai cidades únicas, remove whitespace e garante unicidade real
          const uniqueCitiesSet = new Set<string>();
          data.forEach(d => {
            if (d.city) {
              const trimmed = d.city.trim();
              if (trimmed !== '') uniqueCitiesSet.add(trimmed);
            }
          });
          setAvailableCities(Array.from(uniqueCitiesSet).sort());
        }
      } catch (err) {
        console.error("Erro ao carregar cidades ativas:", err);
      }
    };
    fetchAvailableCities();
  }, []);

  // Fetch providers from Supabase
  useEffect(() => {
    const fetchProviders = async () => {
      setLoadingProviders(true);
      try {
        let data, error;

        if (userCoords && !isManualLocation.current) {
          const res = await supabase.rpc('get_providers_within_radius', {
            user_lat: userCoords.lat,
            user_lon: userCoords.lng,
            radius_km: 150
          });
          data = res.data;
          error = res.error;
        } else {
          const res = await supabase.from('profiles').select('*').eq('role', 'provider');
          data = res.data;
          error = res.error;
        }


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
            rating: p.rating || 0,
            reviews: p.reviews_count || 0,
            price: p.price_value || 0,
            priceUnit: p.pricing_model || 'hourly',
            show_price: p.show_price !== false,
            pricing_model: p.pricing_model || 'hourly',
            distance: distanceStr,
            city: p.city,
            latitude: p.latitude,
            longitude: p.longitude,
            image: p.cover_image || p.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
            isAffiliate: p.plan_type === 'plus',
            isVerified: p.is_verified,
            plan_type: p.plan_type || 'basic',
            rawDistance: distanceStr === 'N/A' || distanceStr.includes('N/A') ? 999999 : parseFloat(distanceStr)
          };
        });

        // Sort if still have GPS or need to prioritize something
        mapped.sort((a, b) => {
           if (userCoords) {
             return a.rawDistance - b.rawDistance;
           }
           return 0;
        });

        setDbProviders(mapped);
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
            image: p.cover_image || p.avatar_url || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a'
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
              image: p.cover_image || p.avatar_url || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a',
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
  // Derived filtered providers
  const providers = useMemo(() => {
    let list = dbProviders;
    const isStatusMessage = locationName.includes('Buscando') || 
                            locationName.includes('Indisponível') || 
                            locationName.includes('Brasil') || 
                            locationName.includes('Localização');

    if (locationName && !isStatusMessage) {
      const filter = normalizeText(locationName.split('/')[0]);
      list = list.filter(p => {
        const pCity = normalizeText((p.city || '').split('/')[0]);
        return pCity === filter;
      });
    }

    if (list.length === 0 && !loadingProviders) {
      return [];
    }

    return list;
  }, [dbProviders, locationName, loadingProviders]);

  const featuredProviders = useMemo(() => {
    const plusOnes = providers.filter(p => p.plan_type === 'plus');
    // We don't shuffle here to avoid re-renders, or we use a stable sort
    return plusOnes;
  }, [providers]);

  const dynamicCategories = useMemo(() => {
    const catsWithProviders = Array.from(new Set(providers.map(p => p.service))).filter(c => c !== 'Serviços Gerais');
    const categoryIconMap: Record<string, string> = {
      'Limpeza': 'cleaning_services', 'Reformas': 'construction', 'Elétrica': 'bolt',
      'Jardim': 'yard', 'Montagem': 'handyman', 'Encanador': 'plumbing',
      'Pintura': 'imagesearch_roller', 'Eletricista': 'bolt'
    };
    let derivedCats = catsWithProviders.map((name: string) => ({
      name, icon: (categoryIconMap as Record<string, string>)[name] || 'handyman'
    }));
    return [{ name: 'Todos', icon: 'apps' }, ...derivedCats];
  }, [providers]);

  const handleManualLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(manualCityInput.trim() !== '') {
      isManualLocation.current = true;
      const city = manualCityInput.trim();
      setLocationName(city);
      setUserCoords(null); // Clear GPS since we are using explicit city
      localStorage.setItem('KNGindica_manualCity', city);
      setShowLocationDropdown(false);
      
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

  // Dynamic category grouping for rows
  const plusProviders = providers.filter(p => p.plan_type === 'plus');
  const groupedByCategory = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    providers.forEach(p => {
      // Use the service name as the grouping key
      const category = p.service || 'Serviços Gerais';
      if (!groups[category]) groups[category] = [];
      groups[category].push(p);
    });
    
    // Convert to sorted array for consistent rendering
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, items]) => ({ name, items }));
  }, [providers]);
  
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
    // Only prevent default and handle swipe for horizontal moves
    const currentX = e.targetTouches[0].clientX;
    const diff = Math.abs(currentX - touchStartHero);
    
    // If the horizontal move is significant, we record it for the swipe
    if (diff > 5) {
      setTouchEndHero(currentX);
    }
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
    <div className="w-full netflix-main-bg min-h-screen flex flex-col font-display text-white md:pb-0 overflow-x-hidden transition-colors duration-500">
      
      {/* Netflix-Style Header */}
      <header className={`relative lg:fixed top-0 left-0 lg:left-16 right-0 lg:w-[calc(100%-4rem)] z-50 transition-all duration-500 pt-2 pb-2 ${isScrolled
        ? 'bg-black/95 backdrop-blur-md shadow-2xl border-b border-white/5'
        : 'bg-gradient-to-b from-[#000814]/80 via-[#000814]/20 to-transparent'
        }`}>
        <div className="netflix-gutter transition-all duration-300">
          <div className="flex items-center justify-between">
            {/* Left: Branding/Category Name */}
            <div className="flex items-center gap-4">
              <h1 className="text-xl md:text-2xl font-black tracking-tighter text-white">
                Início
              </h1>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
              <button onClick={() => onNavigate('listing', { searchQuery: '' })} className="p-1 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[28px] shrink-0">search</span>
              </button>
              
              <button onClick={() => onNavigate('notifications')} className="p-1 hover:text-primary transition-colors relative">
                <span className="material-symbols-outlined text-[28px] shrink-0">notifications</span>
                {unreadNotifications > 0 && (
                  <span className="absolute top-1 right-1 size-2 bg-red-500 rounded-full border border-black animate-pulse"></span>
                )}
              </button>

              <button 
                onClick={() => onNavigate('userProfile')} 
                className={`size-8 rounded-full overflow-hidden border transition-all ${
                  isPremiumUser ? 'border-primary' : 'border-white/20'
                }`}
              >
                <img 
                  src={profile?.avatar_url || user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.email}&background=random`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                />
              </button>
            </div>
          </div>

          {/* Category Chips - Overlay Style */}
          <div className="mt-3 overflow-x-auto hide-scrollbar flex items-center gap-3 pb-2 transition-all duration-300">
            {/* Quick Location Badge (Subtle) */}
            <button 
              onClick={() => setShowLocationDropdown(!showLocationDropdown)}
              className="h-8 flex-shrink-0 flex items-center gap-1 px-3 rounded-full border border-white/20 bg-white/5 text-[11px] font-bold text-white hover:bg-white/10 transition-all"
            >
              <span className="material-symbols-outlined text-[16px] text-primary leading-none">location_on</span>
              <span className="leading-none">{locationName.split('/')[0]}</span>
              <span className={`material-symbols-outlined text-[16px] leading-none transition-transform ${showLocationDropdown ? 'rotate-180 text-primary' : ''}`}>expand_more</span>
            </button>

            {dynamicCategories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => cat.name === 'Todos' ? onNavigate('listing', { searchQuery: '' }) : onNavigate('listing', { category: cat.name })}
                className="h-8 flex-shrink-0 px-4 rounded-full text-[11px] font-bold transition-all border border-white/20 bg-white/5 hover:border-white hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center"
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Dropdown de Localização (Netflix Overlay Style) */}
          {showLocationDropdown && (
            <div 
              className="absolute top-full left-4 mr-4 mt-2 w-[calc(100%-2rem)] md:w-80 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-5 animate-in fade-in slide-in-from-top-2 z-[60]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4">
                <p className="text-[10px] font-black text-primary mb-3 uppercase tracking-widest">Sua Região</p>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm z-10">search</span>
                  <CityAutocomplete
                    value={manualCityInput}
                    onChange={(val) => setManualCityInput(val)}
                    onSelect={(city) => handleCitySelect(city)}
                    activeCities={availableCities}
                    placeholder="Mudar cidade..."
                    className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:border-primary outline-none text-xs font-bold"
                  />
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/5">
                <button 
                   onClick={() => setShowLocationDropdown(false)}
                   className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black rounded-lg transition-colors uppercase"
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full relative">
        {/* Netflix-Style Cinematic Hero */}
        <section 
          className="relative w-full h-[540px] pt-4 pb-6 md:h-[85vh] overflow-hidden transition-all duration-700 bg-transparent"
          onTouchStart={handleTouchStartHero}
          onTouchMove={handleTouchMoveHero}
          onTouchEnd={handleTouchEndHero}
        >
          {heroProviders.length > 0 ? (
            <div className="px-4 md:px-0 h-full">
              <div className="relative h-full w-full lg:max-w-none mx-auto overflow-visible">
                {heroProviders.slice(0, 5).map((p, idx) => {
                  const isFavorited = favoriteProviders.some(f => f.id === p.id);
                  
                  return (
                    <div 
                      key={p.id}
                      className={`absolute inset-0 transition-all duration-1000 ease-in-out ${idx === currentHeroIndex ? 'opacity-100 z-10 translate-y-0 scale-100' : 'opacity-0 z-0 translate-y-4 scale-95'}`}
                    >
                      <div className="relative h-full w-full md:rounded-none rounded-2xl overflow-hidden bg-[#0A0A0A]">
                        {/* Background (Poster Style) */}
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Cinematic Gradients */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent"></div>
                        <div className="absolute inset-0 bg-black/5"></div>

                        {/* Content Section - Anchored at the bottom */}
                        <div className="absolute bottom-4 lg:bottom-20 left-0 right-0 netflix-gutter transition-all duration-500">
                          <div className="w-full flex flex-col items-center text-center lg:items-start lg:text-left">
                            {/* Professional Name - "Graphic Logo" Style */}
                            <h1 className="netflix-title-logo text-2xl md:text-6xl mb-0.5 max-w-[95%] break-words drop-shadow-2xl leading-none">
                              {p.name}
                            </h1>

                            {/* Tags */}
                            <div className="flex items-center justify-center gap-1.5 mb-2.5 flex-wrap opacity-90">
                              <span className="text-[8px] md:text-xs font-black text-gray-100 uppercase tracking-[0.2em]">{p.service} - {p.city}</span>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex flex-row items-center justify-center lg:justify-start gap-2 w-full">
                              <button
                                onClick={() => onNavigate('profile', { professionalId: p.id })}
                                className="flex-1 sm:flex-none px-4 flex items-center justify-center gap-1 bg-white text-black h-8 md:h-9 rounded-lg font-black text-[9px] md:text-sm hover:bg-white/90 transition-all active:scale-95 shadow-lg"
                              >
                                <span className="material-symbols-outlined filled text-[16px] md:text-[18px]">play_arrow</span>
                                Ver Perfil
                              </button>
                              
                              <button
                                onClick={() => toggleFavorite(p.id)}
                                className="flex-1 sm:flex-none px-4 flex items-center justify-center gap-1 bg-white/10 backdrop-blur-md text-white h-8 md:h-9 rounded-lg font-black text-[9px] md:text-sm hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                              >
                                <span className="material-symbols-outlined text-[14px] md:text-[16px]">{isFavorited ? 'check' : 'add'}</span>
                                Favoritos
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Indicators - Positioned left on desktop */}
              <div className="absolute bottom-2 lg:bottom-10 left-1/2 lg:left-[var(--gutter-desktop)] -translate-x-1/2 lg:translate-x-0 z-30 flex gap-2">
                {heroProviders.slice(0, 5).map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentHeroIndex(idx)}
                    className={`h-1 rounded-full transition-all duration-500 ${idx === currentHeroIndex ? 'w-6 bg-primary' : 'w-1.5 bg-white/20'}`}
                  ></button>
                ))}
              </div>
            </div>
          ) : (
             <div className="netflix-gutter h-full">
                <div className="h-full w-full rounded-[2.5rem] bg-zinc-900 flex items-center justify-center border border-white/5">
                  <div className="text-center opacity-50">
                    <h2 className="text-2xl font-black mb-1 netflix-title-logo text-primary">KNGindica</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Premium Discovery</p>
                  </div>
                </div>
             </div>
          )}
        </section>
        {/* Active Service Tracker (Live Activity Style) */}
        {activeRequest && (
          <div className="w-full netflix-gutter -mt-12 md:-mt-16 mb-8 relative z-30 transition-all duration-300">
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
                    <span className="text-[10px] font-black text-white/80 italic">Serviço Ativo</span>
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

        <section className="w-full netflix-gutter mb-10 relative z-30 transition-all duration-300">
          <div className="bg-gradient-to-r from-emerald-600/90 to-emerald-800/95 rounded-xl p-4 md:p-6 shadow-xl relative overflow-hidden group border border-emerald-400/20 lg:max-w-xl lg:mx-0">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 bg-black/10 backdrop-blur-sm px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider mb-3 text-emerald-200/80">
                  <span className="material-symbols-outlined text-[10px]">rocket_launch</span>
                  Destaque
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white leading-tight mb-2 tracking-tighter italic">
                  Você define o <span className="text-emerald-300">preço!</span>
                </h2>
                <p className="text-emerald-100/60 text-[10px] md:text-sm font-medium max-w-lg leading-snug">
                  Poste o que você precisa e os profissionais farão suas ofertas.
                </p>
              </div>
              <button 
                onClick={() => onNavigate('freelanceRequest')}
                className="bg-white text-emerald-900 px-5 py-2.5 rounded-lg font-black text-[10px] shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shrink-0"
              >
                Solicitar Freelance
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>

        {/* Collection Rows */}
        <div className={`w-full relative z-20 pb-10 ${!activeRequest ? '-mt-8' : ''}`}>
          
          {/* Action Row - Search & View Toggle */}
          <div className="netflix-gutter mb-8 flex flex-col md:flex-row gap-4 items-center justify-between lg:max-w-xl">
            <div className="relative group w-full flex-1">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors">sparkles</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Busque por serviço ou cidade..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && onNavigate('listing', { searchQuery })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-100/10 backdrop-blur-xl border border-white/10 rounded-full text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-gray-500 shadow-inner"
                  />
            </div>
            
            <div className="flex items-center gap-4">
               <button 
                onClick={() => setViewMode(prev => prev === 'list' ? 'map' : 'list')}
                className="flex items-center gap-2 bg-slate-100 dark:bg-[#1a242f] text-slate-900 dark:text-white px-5 py-2.5 rounded-full text-xs font-black border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors shadow-lg"
              >
                <span className="material-symbols-outlined text-[18px]">{viewMode === 'list' ? 'map' : 'format_list_bulleted'}</span>
                {viewMode === 'list' ? 'Ver Mapa' : 'Ver Lista'}
              </button>
            </div>
          </div>

          {viewMode === 'map' ? (
             /* Map View Container */
             <div className="w-full h-[600px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative ring-1 ring-white/10">
                <MapContainer 
                  center={mapCenter} 
                  zoom={userCoords ? 13 : 12} 
                  style={{ height: '100%', width: '100%' }}
                  className="z-0"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <MapUpdater center={mapCenter} />
                  {userCoords && (
                    <CircleMarker 
                      center={[userCoords.lat, userCoords.lng]}
                      radius={8}
                      pathOptions={{ 
                        fillColor: '#3b82f6', 
                        color: '#ffffff', 
                        weight: 3, 
                        fillOpacity: 1 
                      }}
                    >
                      <Popup>📍 Você está aqui</Popup>
                    </CircleMarker>
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
                              className="w-full bg-primary text-white text-[10px] py-2 rounded font-black mt-2"
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
                      onViewMore={() => onNavigate('myRequests')}
                    />
                  )}

                  {/* Row: Alvo Indica Recommendations */}
                    <CollectionRow 
                      title="Destaques KNGindica" 
                      subtitle="Os profissionais mais bem avaliados e recomendados."
                      providers={featuredProviders.length > 0 ? featuredProviders : plusProviders.slice(0, 10)} 
                      onNavigate={onNavigate}
                      highlight
                      onViewMore={() => onNavigate('listing', { featured: true })}
                    />

                  {/* Row: All Providers (Fallback/Discovery) */}
                    <CollectionRow 
                      title="KNGindica" 
                      subtitle="Explore todos os prestadores em sua região."
                      providers={providers} 
                      onNavigate={onNavigate}
                      onViewMore={() => onNavigate('listing', { searchQuery: '' })}
                    />

                  {/* Row: My Favorites (Now positioned before dynamic categories) */}
                  {favoriteProviders.length > 0 && (
                    <CollectionRow 
                      title="Meus Favoritos" 
                      subtitle="Seus profissionais preferidos salvos para acesso rápido."
                      providers={favoriteProviders} 
                      onNavigate={onNavigate}
                    />
                  )}

                  {/* Dynamic Category Rows (Auto-generated from available services) */}
                  {groupedByCategory.map(group => (
                    <CollectionRow 
                      key={group.name}
                      title={group.name} 
                      subtitle={`Confira os melhores profissionais de ${group.name.toLowerCase()}.`}
                      providers={group.items} 
                      onNavigate={onNavigate}
                      onViewMore={() => onNavigate('listing', { category: group.name })}
                    />
                  ))}

                </>
              )}
            </>
          )}
        </div>
      </main>



      {/* Custom Styles */}
      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .filled { font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 48; }
        
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(0.99); }
        }
        .animate-pulse-subtle { animation: pulse-subtle 4s infinite ease-in-out; }
        `
      }} />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="mb-2.5 md:mb-4 animate-pulse">
      <div className="h-[16px] w-24 bg-zinc-800 rounded mb-1.5 ml-4 lg:ml-[var(--gutter-desktop)]"></div>
      <div className="flex overflow-x-hidden no-scrollbar snap-x snap-mandatory">
        {/* Leading Spacer */}
        <div className="shrink-0 w-4 lg:w-[var(--gutter-desktop)] snap-start" />
        
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="shrink-0 w-[115px] md:w-[200px] lg:w-[280px]">
              <div className="aspect-[2/2.95] md:aspect-video bg-zinc-800 rounded-lg"></div>
            </div>
          ))}
        </div>
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
  onViewMore?: () => void;
}

function CollectionRow({ title, subtitle, providers, onNavigate, highlight, onViewMore }: CollectionRowProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth * 0.8 : scrollLeft + clientWidth * 0.8;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  if (providers.length === 0) return null;

  return (
    <section className="mb-2.5 md:mb-4">
      <div className="flex items-end justify-between mb-1.5 ml-4 lg:ml-[var(--gutter-desktop)] pr-4 lg:pr-[var(--gutter-desktop)]">
        <h3 
          onClick={onViewMore}
          className="text-[14px] md:text-xl font-bold text-gray-200 hover:text-white transition-colors cursor-pointer flex items-center group/title"
        >
          {title}
          <span className="material-symbols-outlined text-[14px] md:text-xl opacity-0 group-hover/title:opacity-100 transition-all translate-x-[-4px] group-hover/title:translate-x-1">chevron_right</span>
        </h3>
        {onViewMore && (
           <button onClick={onViewMore} className="text-[9px] md:text-sm font-bold text-primary hover:underline">Ver tudo</button>
        )}
      </div>

      <div className="relative group/row">
        {/* Scroll Buttons (Desktop Only) */}
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-2 w-[var(--gutter-desktop)] z-40 bg-black/40 hover:bg-black/60 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity text-white hidden lg:flex"
        >
          <span className="material-symbols-outlined text-4xl">chevron_left</span>
        </button>
        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-2 w-[var(--gutter-desktop)] z-40 bg-black/40 hover:bg-black/60 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity text-white hidden lg:flex"
        >
          <span className="material-symbols-outlined text-4xl">chevron_right</span>
        </button>

        <div 
          ref={scrollRef}
          className="flex overflow-x-auto pb-2 no-scrollbar snap-x snap-mandatory justify-start"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* THE DEFINITIVE FIX: snap-start on the Spacer */}
          <div className="shrink-0 w-4 lg:w-[var(--gutter-desktop)] snap-start" />

          <div className="flex gap-1.5 md:gap-2">
            {providers.filter(Boolean).map((p) => (
            <div
              key={p.id}
              onClick={() => onNavigate('profile', { professionalId: p.id })}
              className={`shrink-0 w-[115px] md:w-[200px] lg:w-[280px] cursor-pointer snap-start`}
            >
              <div className="relative aspect-[2/2.95] md:aspect-video rounded-lg overflow-hidden bg-zinc-900 shadow-lg border border-white/5">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target;
                    target.src = 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
                  }}
                />
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                
                {/* Badge Overlay (Optional: Affiliate/Verified) */}
                {(p.isAffiliate || p.isVerified) && (
                  <div className="absolute top-1.5 right-1.5">
                    <span className="material-symbols-outlined text-primary text-[10px] md:text-[14px] filled drop-shadow-lg">
                      {p.isVerified ? 'verified' : 'star'}
                    </span>
                  </div>
                )}
                
                {/* Provider Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-1 md:p-1.5 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                  <h4 className="text-[8px] md:text-xs font-black text-white truncate leading-tight drop-shadow-md uppercase tracking-tight">
                    {p.name}
                  </h4>
                </div>

                {/* Progress Bar Highlight */}
                {highlight && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                    <div className="h-full bg-primary w-2/3 shadow-[0_0_10px_#FF7A00]"></div>
                  </div>
                )}
              </div>
            </div>
          ))}

            {onViewMore && (
              <div className="snap-start shrink-0 w-[115px] md:w-[200px] lg:w-[280px] cursor-pointer">
                 <button 
                  onClick={onViewMore}
                  className="w-full aspect-[2/2.95] md:aspect-video rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  <span className="material-symbols-outlined text-2xl opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all transition-transform">add_circle</span>
                  <span className="text-[9px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Ver tudo</span>
                 </button>
              </div>
            )}
            
            {/* End Spacer */}
            <div className="shrink-0 w-4 lg:w-[var(--gutter-desktop)]" />
          </div>
        </div>
      </div>
    </section>
  );
}