import React, { useState, useEffect, useMemo } from 'react';
import StarRating from '../components/StarRating';

import { NavigationProps, Professional, Screen } from '../types';
import { professionals as mockProfessionals } from '../data/mockData';
import { requestNotificationPermission } from '../lib/OneSignalService';
import VerifiedBadge from '../components/VerifiedBadge';
import { supabase } from '../lib/supabase';
import { maskCurrency, parseCurrency, formatCurrency, normalizeText } from '../lib/formatters';
import { CityAutocomplete } from '../components/CityAutocomplete';

interface ServiceListingProps extends NavigationProps {
  initialParams?: {
    category?: string;
    searchQuery?: string;
    filters?: any;
  };
}

export default function ServiceListingScreen({ onNavigate, initialParams }: ServiceListingProps) {
  const [searchQuery, setSearchQuery] = useState(initialParams?.searchQuery || '');
  const [selectedCategory, setSelectedCategory] = useState(initialParams?.category || '');
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'distance' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [dbProfessionals, setDbProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState(initialParams?.filters?.city || '');

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'provider');

        if (error) throw error;

        if (data) {
          const mapped: Professional[] = data.map((p: any) => ({
            id: p.id,
            name: p.company_name || p.full_name || 'Profissional',
            service: p.categories?.[0] || 'Serviços',
            category: p.categories?.[0] || 'Serviços Gerais',
            rating: p.rating || 0,
            reviews: p.reviews_count || 0,
            price: p.price_value || 0,
            priceUnit: p.pricing_model || 'hourly',
            show_price: p.show_price !== false,
            pricing_model: p.pricing_model || 'hourly',
            image: p.cover_image || p.avatar_url || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a',
            isVerified: p.is_verified,
            distance: p.city ? 0 : 99, // Basic distance mock
            city: p.city,
            description: p.bio || 'Sem descrição.',
            isAffiliate: p.plan_type === 'plus',
            plan_type: p.plan_type || 'basic',
          }));
          setDbProfessionals(mapped);

        }
      } catch (err) {
        console.error("Erro ao carregar provedores:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  const dynamicCategories = useMemo(() => {
    return Array.from(new Set(dbProfessionals.map(p => p.category))).filter(c => c && c !== 'Serviços Gerais');
  }, [dbProfessionals]);

  const filteredProfessionals = useMemo(() => {
    let result = dbProfessionals.length > 0 ? dbProfessionals : [];
    const filters = initialParams?.filters;

    if (searchQuery) {
      const query = normalizeText(searchQuery);
      result = result.filter(
        (p) =>
          normalizeText(p.name).includes(query) ||
          normalizeText(p.service).includes(query) ||
          normalizeText(p.category).includes(query) ||
          (p.city && normalizeText(p.city).includes(query))
      );
    }

    const categoryToFilter = filters?.category || selectedCategory;
    if (categoryToFilter) {
      result = result.filter((p) => p.category === categoryToFilter);
    }

    if (filters) {
      if (filters.maxPrice) {
        result = result.filter(p => p.price <= filters.maxPrice);
      }
      if (filters.minRating) {
        result = result.filter(p => p.rating >= filters.minRating);
      }
      if (filters.maxDistance) {
        result = result.filter(p => p.distance <= filters.maxDistance);
      }
    }

    if (selectedCity) {
       const filter = normalizeText(selectedCity.split('/')[0]);
       result = result.filter(p => {
         const pCity = normalizeText((p.city || '').split('/')[0]);
         return pCity === filter;
       });
    }

    if (sortBy) {
      result = [...result].sort((a, b) => {
        if (sortBy === 'price') {
          return sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
        } else if (sortBy === 'rating') {
          return sortOrder === 'asc' ? a.rating - b.rating : b.rating - a.rating;
        } else if (sortBy === 'distance') {
          return sortOrder === 'asc' ? a.distance - b.distance : b.distance - a.distance;
        }
        return 0;
      });
    }

    // Sort by Premium Status (Plus first) - This is the primary sort
    result = [...result].sort((a, b) => {
      const aPlus = (a as any).plan_type === 'plus' ? 1 : 0;
      const bPlus = (b as any).plan_type === 'plus' ? 1 : 0;
      return bPlus - aPlus;
    });

    return result;
  }, [searchQuery, selectedCategory, sortBy, sortOrder, dbProfessionals, initialParams, selectedCity]);

  const handleSort = (type: 'price' | 'rating' | 'distance') => {
    if (sortBy === type) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortOrder(type === 'rating' ? 'desc' : 'asc'); // Default rating to desc, others to asc
    }
  };

  return (
    <div className="w-full bg-black min-h-screen shadow-xl flex flex-col font-display text-white antialiased">
      {/* Header / Navigation */}
      {/* Header / Navigation - Netflix Dark */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center p-4 justify-between w-full transition-all duration-300">
          <div className="flex items-center gap-3 w-full">
            <button onClick={() => onNavigate('home')} className="text-primary cursor-pointer hover:bg-white/10 p-1.5 rounded-full transition-colors shrink-0">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
            <div className="hidden md:flex flex-1 gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                <input
                  type="text"
                  placeholder="Profissional ou serviço..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold text-sm text-white transition-all hover:bg-white/10"
                />
              </div>
              <div className="relative w-72">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">location_on</span>
                <CityAutocomplete
                   value={selectedCity}
                   onChange={val => setSelectedCity(val)}
                   placeholder="Cidade..."
                   className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold text-sm text-white transition-all hover:bg-white/10"
                />
              </div>
            </div>
            {/* Mobile Title / Tiny Search Trigger */}
            <div className="md:hidden flex-1 flex flex-col overflow-hidden">
               <span className="text-[10px] font-black text-primary italic uppercase tracking-widest">{selectedCategory || 'Catálogo'}</span>
               <span className="text-sm font-bold truncate text-white">Explorar Resultados</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => onNavigate('filters', { filters: initialParams?.filters })} 
              className="p-2 text-white/70 hover:bg-white/10 rounded-full transition-colors relative"
            >
              <span className="material-symbols-outlined">tune</span>
              {initialParams?.filters && (
                <span className="absolute top-2 right-2 size-2 bg-primary rounded-full border-2 border-black"></span>
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Search Inputs */}
        <div className="md:hidden px-4 pb-4 flex flex-col gap-2">
          <div className="relative">
             <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
             <input
               type="text"
               placeholder="Busque serviço..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
             />
          </div>
          <div className="relative">
             <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">location_on</span>
             <CityAutocomplete
                value={selectedCity}
                onChange={val => setSelectedCity(val)}
                placeholder="Qual cidade?"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
             />
          </div>
        </div>
      </header>

      {/* Filter Section */}
      <section className="border-b border-white/5 bg-black/50">
        <div className="w-full max-w-7xl mx-auto px-4 py-3 overflow-x-auto hide-scrollbar transition-all duration-300">
          <div className="flex gap-2 whitespace-nowrap items-center">
            {/* Sort Buttons */}
            <div className="flex gap-2 pr-4 border-r border-white/10 mr-2 shrink-0">
              <button 
                onClick={() => handleSort('rating')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${sortBy === 'rating' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'}`}
              >
                Melhores
                {sortBy === 'rating' && <span className="material-symbols-outlined text-[14px]">{sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}
              </button>
              <button 
                onClick={() => handleSort('price')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${sortBy === 'price' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'}`}
              >
                Preço
                {sortBy === 'price' && <span className="material-symbols-outlined text-[14px]">{sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}
              </button>
            </div>

            {/* Category Buttons - Netflix Chips */}
            <button 
              onClick={() => { setSelectedCategory(''); setSearchQuery(''); }}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all ${!selectedCategory && !searchQuery ? 'bg-white text-black' : 'bg-white/5 text-gray-400 border border-white/10'}`}
            >
              TODOS
            </button>
            {dynamicCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest transition-all ${selectedCategory === cat ? 'bg-white text-black' : 'bg-white/5 text-gray-400 border border-white/10'}`}
              >
                {cat?.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content: Service Listing */}
      <main className="flex-1 p-4 pb-24 md:pb-8">
        {loading ? (
          <div className="w-full max-w-7xl mx-auto px-0 md:px-4 grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-6 transition-all duration-300">
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="w-full max-w-7xl mx-auto px-0 md:px-4 grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-6 transition-all duration-300">
            {filteredProfessionals.map((professional) => (
            <div 
              key={professional.id}
              onClick={() => onNavigate('profile', { professionalId: professional.id })} 
              className="group cursor-pointer"
            >
              <div className="relative aspect-[2/3] md:aspect-video rounded-md md:rounded-xl overflow-hidden shadow-2xl bg-white/5 transition-all duration-300 md:group-hover:scale-110 md:group-hover:z-50 ring-0 md:group-hover:ring-4 ring-primary/40">
                <img
                  alt={professional.name}
                  className="w-full h-full object-cover transition-transform duration-700"
                  src={professional.image}
                />
                
                {/* Badges Overlay */}
                <div className="absolute top-1 left-1 flex flex-col gap-1">
                   {professional.plan_type === 'plus' && (
                     <div className="bg-primary text-[6px] md:text-[8px] font-black text-white px-1.5 py-0.5 rounded shadow-lg italic">PREMIUM</div>
                   )}
                   <div className="bg-black/80 backdrop-blur-md px-1 py-0.5 rounded text-[8px] font-black flex items-center gap-1 border border-white/10 w-fit">
                      <span className="material-symbols-outlined text-[10px] text-yellow-500 filled">star</span>
                      <span className="text-white">{Number(professional.rating || 0).toFixed(1)}</span>
                   </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-1.5 md:p-3 bg-gradient-to-t from-black via-black/40 to-transparent">
                  <h4 className="text-[10px] md:text-sm font-black text-white leading-tight truncate drop-shadow-md">
                    {professional.name}
                  </h4>
                  <p className="text-[7px] md:text-[10px] font-bold text-primary italic uppercase tracking-tighter truncate drop-shadow-md">
                    {professional.service}
                  </p>
                </div>
              </div>
              
              {/* Desktop Details (Text below) */}
              <div className="mt-2 hidden md:block group-hover:opacity-0 transition-opacity">
                 <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{professional.city}</p>
              </div>
            </div>
          ))}
          
          {filteredProfessionals.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-500">
              <span className="material-symbols-outlined text-5xl mb-4 opacity-20">search_off</span>
              <p className="font-bold tracking-widest uppercase text-xs">Nenhum resultado encontrado</p>
            </div>
          )}
        </div>
        )}
      </main>

      {/* Bottom Navigation Bar (Mobile Only) */}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      <div className="aspect-[2/3] md:aspect-video rounded-md md:rounded-xl bg-white/5 shadow-2xl"></div>
      <div className="h-2 md:h-3 w-1/2 bg-white/5 rounded mx-auto md:mx-0"></div>
    </div>
  );
}
