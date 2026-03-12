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

export default function HomeScreen({ onNavigate }: NavigationProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [mapCenter, setMapCenter] = useState<[number, number]>([-15.7801, -47.9292]); // Brasília como fallback neutro
  
  const [locationName, setLocationName] = useState('Brasil (Sem GPS)');
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);

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
  const [manualCityInput, setManualCityInput] = useState('');
  const isManualLocation = useRef(false);

  // Ask for location on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('iService_manualCity');
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
            .select('*')
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
            service: p.category || 'Serviços Gerais',
            rating: p.rating || (4.5 + Math.random() * 0.5).toFixed(1),
            price: (Math.random() * 100 + 50).toFixed(2),
            priceUnit: 'hora',
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

  const handleManualLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(manualCityInput.trim() !== '') {
      isManualLocation.current = true;
      const city = manualCityInput.trim();
      setLocationName(city);
      setUserCoords(null); // Clear GPS since we are using explicit city
      localStorage.setItem('iService_manualCity', city);
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

  return (
    <div className="w-full bg-slate-50 dark:bg-[#141414] min-h-screen flex flex-col font-display text-slate-900 dark:text-slate-100 pb-20 md:pb-0 overflow-x-hidden">
      {/* Floating Modern Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 pt-6 pb-4 md:py-4 ${isScrolled
        ? 'bg-white/90 dark:bg-[#000000]/90 backdrop-blur-md shadow-sm'
        : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent'
        }`}>
        <div className="flex items-center justify-between mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-white">
            <span className={`material-symbols-outlined text-2xl ${isScrolled ? 'text-primary' : 'text-white'}`}>
              location_on
            </span>
            <div>
              <p className={`text-[10px] uppercase tracking-wider font-bold ${isScrolled ? 'text-slate-500 dark:text-slate-400' : 'text-white/80'}`}>
                Localização
              </p>
              <h2 className={`text-base font-bold leading-tight ${isScrolled ? 'text-slate-900 dark:text-white' : 'text-white'} flex items-center gap-1 cursor-pointer`}
                  onClick={() => setShowLocationModal(true)}>
                {locationName}
                <span className="material-symbols-outlined text-[14px]">edit</span>
              </h2>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className={`hidden md:flex items-center gap-8 ${isScrolled ? 'text-slate-600 dark:text-slate-300' : 'text-white/90'}`}>
            <button onClick={() => onNavigate('home')} className="text-sm font-bold hover:text-primary transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">home</span> Início
            </button>
            <button onClick={() => onNavigate('categories')} className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">category</span> Categorias
            </button>
            <button onClick={() => onNavigate('myRequests')} className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">assignment</span> Pedidos
            </button>
            <button onClick={() => onNavigate('userProfile')} className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">person</span> Perfil
            </button>
            {(user?.email === 'offkngpublicidade@gmail.com' || user?.email === 'netu.araujo@gmail.com') && (
              <button onClick={() => onNavigate('adminDashboard')} className="text-sm font-medium text-red-400 hover:text-red-500 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span> Admin
              </button>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {/* Search Bar - Desktop */}
            <div className={`relative group hidden md:block w-64 transition-all duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400 text-xl">search</span>
              </div>
              <input
                className="block w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800/50 border-none rounded-full text-sm focus:ring-2 focus:ring-primary/50 placeholder:text-slate-500 transition-all outline-none"
                placeholder="Buscar serviços..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>

            <button onClick={() => onNavigate('chatList')} className={`relative p-2 rounded-full transition-colors ${isScrolled ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300' : 'hover:bg-white/20 text-white'}`} title="Mensagens">
              <span className="material-symbols-outlined">chat</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-transparent"></span>
            </button>
            <button onClick={() => onNavigate('notifications')} className={`relative p-2 rounded-full transition-colors ${isScrolled ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300' : 'hover:bg-white/20 text-white'}`} title="Notificações">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-transparent"></span>
            </button>
            <button 
              onClick={() => setViewMode(prev => prev === 'list' ? 'map' : 'list')} 
              className={`p-2 rounded-full transition-colors flex items-center justify-center ${isScrolled ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-white/20 text-white hover:bg-white/30'}`}
              title={viewMode === 'list' ? 'Ver no Mapa' : 'Ver em Lista'}
            >
              <span className="material-symbols-outlined">
                {viewMode === 'list' ? 'map' : 'view_list'}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full relative">
        {/* Netflix-Style Hero Banner */}
        <section className="relative w-full h-[60vh] md:h-[80vh] min-h-[500px] flex items-end pb-12 overflow-hidden bg-black">
          {/* Background Image */}
          <div className="absolute inset-0 w-full h-full">
            <img
              src="https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=2070&auto=format&fit=crop"
              alt="Hero Background"
              className="w-full h-full object-cover opacity-70 scale-105 transform hover:scale-100 transition-transform duration-[10000ms]"
            />
            {/* Gradient Overlay for Text Readability - Netflix style fade to body color */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/20 to-transparent dark:from-[#141414] dark:via-[#141414]/40 dark:to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
          </div>

          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 mt-20">
            <div className="max-w-2xl">
              {/* Top Badge */}
              <div className="flex items-center gap-2 mb-4 animate-fade-in-up">
                <span className="text-red-600 font-bold text-sm tracking-widest uppercase flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                  Em Alta
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-4 drop-shadow-lg">
                Renove sua <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary">Casa Hoje.</span>
              </h1>

              <p className="text-lg md:text-xl text-white/90 mb-8 max-w-xl font-medium drop-shadow-md line-clamp-3">
                Os melhores profissionais de Rondonópolis estão aqui. Aproveite <strong className="text-white">20% OFF</strong> em serviços de pintura por tempo limitado.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={() => onNavigate('listing', { category: 'Reformas' })}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-black px-8 py-3.5 rounded-lg font-bold text-lg hover:bg-white/90 transition-colors shadow-lg shadow-white/10"
                >
                  <span className="material-symbols-outlined fill-current">play_arrow</span>
                  Contratar Agora
                </button>
                <button
                  onClick={() => onNavigate('categories')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-500/50 backdrop-blur-md text-white px-8 py-3.5 rounded-lg font-bold text-lg hover:bg-gray-500/70 transition-colors"
                >
                  <span className="material-symbols-outlined">info</span>
                  Mais Informações
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Floating Search Bar for Mobile (Pushed down by Hero) */}
        <div className="md:hidden px-4 -mt-6 relative z-20 mb-8">
          <div className="relative group bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-black/5">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">
                search
              </span>
            </div>
            <input
              className="block w-full pl-12 pr-4 py-4 bg-transparent border-none text-base focus:ring-0 placeholder:text-slate-500 transition-all outline-none"
              placeholder="O que você precisa hoje?"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
        </div>

        <div className="w-full max-w-7xl mx-auto space-y-12 md:space-y-16 mt-8 md:mt-12 overflow-hidden pb-12">

          {/* Categories Carousel (Netflix style generic genre row) */}
          <section className="px-4 md:px-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Categorias Populares
              </h3>
              <button onClick={() => onNavigate('listing')} className="text-primary text-sm font-bold flex items-center hover:underline">
                Explorar todas <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>

            {/* Horizontal Scroll Area */}
            <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth">
              {[
                { name: 'Limpeza', icon: 'cleaning_services', color: 'from-blue-500 to-cyan-500' },
                { name: 'Reformas', icon: 'construction', color: 'from-orange-500 to-red-500' },
                { name: 'Elétrica', icon: 'bolt', color: 'from-yellow-400 to-orange-500' },
                { name: 'Jardim', icon: 'yard', color: 'from-green-500 to-emerald-600' },
                { name: 'Montagem', icon: 'handyman', color: 'from-indigo-500 to-purple-600' },
                { name: 'Encanador', icon: 'plumbing', color: 'from-cyan-600 to-blue-700' },
              ].map((cat, i) => (
                <div
                  key={cat.name}
                  onClick={() => onNavigate('listing', { category: cat.name })}
                  className="snap-start shrink-0 cursor-pointer group w-32 md:w-40"
                >
                  <div className={`w-full aspect-video rounded-xl bg-gradient-to-br ${cat.color} p-1 shadow-lg transform transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-1`}>
                    <div className="w-full h-full bg-black/10 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center text-white gap-2 border border-white/20 relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 opacity-20 transform group-hover:scale-150 transition-transform duration-500">
                        <span className="material-symbols-outlined text-6xl">{cat.icon}</span>
                      </div>
                      <span className="material-symbols-outlined text-3xl drop-shadow-md z-10">{cat.icon}</span>
                      <span className="text-sm font-bold tracking-wide z-10">{cat.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>



          {/* Featured Professionals (Netflix Style Row - "Em Alta na sua Região" / "Recomendados") */}
          <section className="px-4 md:px-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {viewMode === 'map' ? 'Mapa de Profissionais' : 'Profissionais em Alta'}
                </h3>
                {viewMode === 'list' && (
                  <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm hidden md:inline-block">
                    VIP
                  </span>
                )}
              </div>
              
              {/* Mobile View Toggle */}
              <button 
                onClick={() => setViewMode(prev => prev === 'list' ? 'map' : 'list')}
                className="md:hidden flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg"
              >
                <span className="material-symbols-outlined text-sm">{viewMode === 'list' ? 'map' : 'format_list_bulleted'}</span>
                {viewMode === 'list' ? 'Mapa' : 'Lista'}
              </button>
            </div>

            {viewMode === 'map' ? (
              <div className="w-full h-[500px] rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 relative z-0">
                <MapContainer 
                  center={mapCenter} 
                  zoom={userCoords ? 13 : 12} 
                  style={{ height: '100%', width: '100%' }}
                  className="z-0"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  {/* Sempre reage ao mapCenter */}
                  <MapUpdater center={mapCenter} />

                  {/* Marcador "Você está aqui" com GPS */}
                  {userCoords && (
                    <Marker position={[userCoords.lat, userCoords.lng]}>
                      <Popup>📍 Você está aqui</Popup>
                    </Marker>
                  )}
                  
                  {/* Pins dos prestadores com lat/lng reais */}
                  {providers.map(p => {
                    if (!p.latitude || !p.longitude) return null;
                    
                    return (
                      <Marker 
                        key={p.id} 
                        position={[p.latitude, p.longitude]} 
                        icon={createProviderIcon(p.image)}
                      >
                        <Popup className="provider-popup">
                          <div className="p-2 w-48 font-display">
                            <img src={p.image} className="w-full h-24 object-cover rounded-lg mb-2" alt={p.name} />
                            <h4 className="font-bold text-slate-900">{p.name}</h4>
                            <p className="text-xs text-primary font-bold mb-1">{p.service}</p>
                            {p.city && <p className="text-[10px] text-slate-500 mb-2 flex items-center gap-1">📍 {p.city}</p>}
                            <button 
                              onClick={() => onNavigate('profile', { professionalId: p.id })}
                              className="w-full bg-slate-900 text-white text-[10px] py-1.5 rounded font-bold"
                            >
                              Ver Perfil
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
                
                {/* Info Banner quando não há prestadores no mapa */}
                {providers.filter(p => p.latitude && p.longitude).length === 0 && (
                  <div className="absolute bottom-4 left-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl p-3 shadow-lg text-center z-[1000]">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      Nenhum prestador com localização definida por aqui
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Os prestadores precisam definir sua localização no perfil para aparecerem no mapa
                    </p>
                  </div>
                )}
              </div>

            ) : (
              /* Horizontal Scroll Area (Original List View) */
              <div className="flex gap-4 md:gap-6 overflow-x-auto pb-8 pt-4 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth">
                {loadingProviders ? (
                  <div className="py-10 text-slate-500 flex items-center gap-2">
                     <span className="material-symbols-outlined animate-spin">refresh</span>
                     Buscando os mais próximos...
                  </div>
                ) : (
                  providers.map((professional) => (
                    <div
                      key={professional.id}
                      onClick={() => onNavigate('profile', { professionalId: professional.id })}
                      className="snap-start shrink-0 w-[240px] md:w-[280px] group cursor-pointer"
                    >
                      <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden shadow-lg bg-slate-200 dark:bg-slate-800 mb-3">
                        <img
                          className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110"
                          src={professional.image}
                          alt={professional.name}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent opacity-80 transition-opacity duration-300"></div>

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
                          <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[10px] flex items-center gap-1 font-bold text-white shadow-sm w-max">
                            <span className="material-symbols-outlined text-[12px] text-yellow-500">star</span>
                            {professional.rating}
                          </div>
                        </div>
                        {/* MAIA verification badge */}
                        {professional.plan_type === 'plus' ? (
                          <div className="absolute top-3 right-3 bg-yellow-500 rounded-full px-2 py-0.5 flex items-center justify-center shadow-lg transform rotate-12 group-hover:rotate-0 transition-transform z-10 border border-white/20">
                            <span className="text-[10px] font-black text-black italic">PLUS</span>
                          </div>
                        ) : (
                          <div className="absolute top-3 right-3 bg-primary/90 backdrop-blur-md rounded-full w-8 h-8 flex items-center justify-center shadow-lg transform rotate-12 group-hover:rotate-0 transition-transform z-10">
                            <span className="material-symbols-outlined text-white text-[16px]">verified</span>
                          </div>
                        )}

                        {/* Bottom Info inside image */}
                        <div className="absolute bottom-4 left-4 right-4 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 z-10">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-lg md:text-xl leading-tight truncate drop-shadow-md">
                              {professional.name}
                            </h4>
                          </div>
                          <p className="text-xs text-white/80 drop-shadow-md text-primary font-semibold mb-2">
                            {professional.service}
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-white/20">
                            <span className="text-sm font-bold text-white">
                              A Combinar
                            </span>
                            <p className="text-[10px] text-white/70 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">location_on</span>
                              {professional.distance === 999999 ? 'Longe' : `${professional.distance} km`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <MobileNav onNavigate={onNavigate} currentScreen="home" />

       {/* Manual Location Modal */}
       {showLocationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_location</span>
                Alterar Localização
              </h3>
              <button onClick={() => setShowLocationModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleManualLocationSubmit} className="p-6">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Não conseguimos acessar seu GPS automaticamente. Digite sua cidade para encontrarmos os profissionais mais próximos de você.
              </p>
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Qual é a sua cidade?</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">location_city</span>
                  <input
                    type="text"
                    value={manualCityInput}
                    onChange={(e) => setManualCityInput(e.target.value)}
                    placeholder="Ex: Rondonópolis, São Paulo, etc."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowLocationModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={!manualCityInput.trim()} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
