import React, { useState, useEffect } from 'react';
import { NavigationProps, Professional, Screen } from '../types';
import { professionals as mockProfessionals } from '../data/mockData';
import { requestNotificationPermission } from '../lib/OneSignalService';
import VerifiedBadge from '../components/VerifiedBadge';
import { supabase } from '../lib/supabase';
import { maskCurrency, parseCurrency, formatCurrency } from '../lib/formatters';
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
  const [filteredProfessionals, setFilteredProfessionals] = useState<Professional[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
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
            rating: p.rating !== null ? Number(p.rating).toFixed(1) : "0.0",
            reviews: p.reviews_count || 0,
            price: p.price_value || 0,
            priceUnit: p.pricing_model || 'hourly',
            show_price: p.show_price !== false,
            pricing_model: p.pricing_model || 'hourly',
            image: p.avatar_url || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a',
            isVerified: p.is_verified,
            distance: p.city ? 0 : 99, // Basic distance mock
            city: p.city,
            description: p.bio || 'Sem descrição.',
            isAffiliate: p.plan_type === 'plus',
          }));
          setDbProfessionals(mapped);

          // Extract dynamic categories
          const cats = Array.from(new Set(mapped.map(p => p.category))).filter(c => c && c !== 'Serviços Gerais');
          setDynamicCategories(cats);
        }
      } catch (err) {
        console.error("Erro ao carregar provedores:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  useEffect(() => {
    let result = dbProfessionals.length > 0 ? dbProfessionals : [];
    const filters = initialParams?.filters;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.service.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
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
       const filter = selectedCity.split('/')[0].normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
       result = result.filter(p => {
         const pCity = (p.city || '').split('/')[0].normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
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

    setFilteredProfessionals(result);
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
    <div className="w-full bg-[#0f171e] min-h-screen shadow-xl flex flex-col font-display text-slate-900 dark:text-slate-100 antialiased">
      {/* Header / Navigation */}
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center p-4 justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button onClick={() => onNavigate('home')} className="text-primary cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-full transition-colors">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                  type="text"
                  placeholder="O que você está procurando?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold text-sm"
                />
              </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">location_on</span>
                <CityAutocomplete
                   value={selectedCity}
                   onChange={val => setSelectedCity(val)}
                   placeholder="Filtrar por cidade..."
                   className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-bold text-sm"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center relative gap-2">
            <button
              onClick={() => {
                const input = document.getElementById('searchInputMobile');
                if (input) input.focus();
              }}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors md:hidden"
            >
              <span className="material-symbols-outlined">search</span>
            </button>
            <button 
              onClick={() => onNavigate('filters', { filters: initialParams?.filters })} 
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative"
            >
              <span className="material-symbols-outlined">tune</span>
              {initialParams?.filters && (
                <span className="absolute top-2 right-2 size-2 bg-primary rounded-full border-2 border-white dark:border-slate-900"></span>
              )}
            </button>
          </div>
        </div>

        {/* Filters Summary / Clear Button */}
        {initialParams?.filters && (
          <div className="px-4 pb-2 flex items-center justify-between">
            <div className="flex gap-2 items-center overflow-x-auto hide-scrollbar">
              <span className="text-[10px] font-bold uppercase text-slate-400 whitespace-nowrap">Filtros Ativos:</span>
              {initialParams.filters.category && (
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-medium">{initialParams.filters.category}</span>
              )}
              {initialParams.filters.maxPrice < 500 && (
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-medium">Até R${initialParams.filters.maxPrice}</span>
              )}
              {initialParams.filters.minRating > 0 && (
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-medium">{initialParams.filters.minRating}+ ⭐</span>
              )}
            </div>
            <button 
              onClick={() => onNavigate('listing', { ...initialParams, filters: null })}
              className="text-[10px] font-bold text-primary hover:underline ml-2"
            >
              Limpar
            </button>
          </div>
        )}
        
        {/* Mobile Search Input (Visible always on mobile below the header) */}
        <div className="md:hidden px-4 pb-3">
          <input
            id="searchInputMobile"
            type="text"
            placeholder="Buscar profissionais ou serviços..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </header>

      {/* Filter Section */}
      <section className="border-b border-slate-100 dark:border-slate-800">
        <div className="px-4 py-3 overflow-x-auto max-w-7xl mx-auto w-full custom-scrollbar">
          <div className="flex gap-2 whitespace-nowrap items-center">
            {/* Sort Buttons */}
            <div className="flex gap-2 pr-4 border-r border-slate-200 dark:border-slate-700 mr-2">
              <button 
                onClick={() => handleSort('price')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${sortBy === 'price' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                Preço
                {sortBy === 'price' && <span className="material-symbols-outlined text-sm">{sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}
              </button>
              <button 
                onClick={() => handleSort('rating')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${sortBy === 'rating' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                Avaliação
                {sortBy === 'rating' && <span className="material-symbols-outlined text-sm">{sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}
              </button>
            </div>

            {/* Category Buttons */}
            <button 
              onClick={() => { 
                setSelectedCategory(''); 
                setSearchQuery('');
                // Reset initialParams via state if needed, but clearing these is enough for the effect
              }}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!selectedCategory && !searchQuery ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              Todos
            </button>
            {dynamicCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content: Service Listing */}
      <main className="flex-1 p-4 pb-24 md:pb-8">
        {loading ? (
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProfessionals.map((professional) => (
            <div 
              key={professional.id}
              onClick={() => onNavigate('profile', { professionalId: professional.id })} 
              className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex gap-4 transition-all hover:shadow-md cursor-pointer group"
            >
            <div className="w-24 h-24 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0 overflow-hidden">
              <img
                alt={professional.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                src={professional.image}
              />
            </div>
            <div className="flex flex-col justify-between flex-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  {professional.isAffiliate ? (
                    <span className="bg-primary/10 text-primary text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                      Afiliado
                    </span>
                  ) : (
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                      Profissional
                    </span>
                  )}
                  <div className="flex items-center gap-0.5 text-amber-500">
                    <span className="material-symbols-outlined text-sm fill-current">
                      star
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {Number(professional.rating).toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-1 relative z-20 pointer-events-auto">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); onNavigate('profile', { professionalId: professional.id }); }}>
                    {professional.name}
                  </h3>
                  {professional.isVerified && <VerifiedBadge />}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {professional.service}
                </p>

                {/* Pricing Info */}
                <div className="mt-2 text-xs font-bold">
                  {(professional as any).show_price ? (
                    <div className="flex items-center gap-1 text-slate-900 dark:text-white">
                      {(professional as any).pricing_model === 'negotiable' ? (
                        <span className="text-primary italic">A combinar</span>
                      ) : (
                        <>
                          {(professional as any).pricing_model === 'starting_at' && <span className="text-[10px] text-slate-500 font-normal">A partir de</span>}
                          <span>{formatCurrency((professional as any).price || 0)}</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {(professional as any).pricing_model === 'hourly' ? '/ h' : 
                             (professional as any).pricing_model === 'fixed' ? '(Fixo)' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic font-normal">Preço sob consulta</span>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); onNavigate('profile', { professionalId: professional.id }); }} 
                  className="w-full py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-semibold rounded-lg hover:bg-primary hover:text-white transition-colors"
                >
                  Ver Perfil
                </button>
              </div>
            </div>
          </div>
          ))}
          
          {filteredProfessionals.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
              <p>Nenhum profissional encontrado.</p>
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
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex gap-4 animate-pulse">
      <div className="w-24 h-24 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0"></div>
      <div className="flex-1 space-y-3">
        <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded-lg mt-2"></div>
      </div>
    </div>
  );
}
