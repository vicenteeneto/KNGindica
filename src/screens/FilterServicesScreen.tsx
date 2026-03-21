import React, { useState } from 'react';
import { NavigationProps } from '../types';
import { CityAutocomplete } from '../components/CityAutocomplete';

export default function FilterServicesScreen({ onNavigate, params }: NavigationProps) {
  const initialFilters = params?.filters || {};
  
  const [tempCategory, setTempCategory] = useState<string>(initialFilters.category || '');
  const [tempMinPrice, setTempMinPrice] = useState<number>(initialFilters.minPrice || 0);
  const [tempMaxPrice, setTempMaxPrice] = useState<number>(initialFilters.maxPrice || 500);
  const [tempRating, setTempRating] = useState<number>(initialFilters.minRating || 0);
  const [tempDistance, setTempDistance] = useState<number>(initialFilters.maxDistance || 50);
  const [tempAvailability, setTempAvailability] = useState<string | null>(initialFilters.availability || null);
  const [tempCity, setTempCity] = useState<string>(initialFilters.city || '');

  const categories = ['Limpeza', 'Reformas', 'Elétrica', 'Jardim', 'Pintura', 'Montagem', 'Encanador', 'Frete'];

  const handleApply = () => {
    onNavigate('listing', { 
      filters: {
        category: tempCategory,
        minPrice: tempMinPrice,
        maxPrice: tempMaxPrice,
        minRating: tempRating,
        maxDistance: tempDistance,
        availability: tempAvailability,
        city: tempCity
      }
    });
  };

  const handleClear = () => {
    setTempCategory('');
    setTempMinPrice(0);
    setTempMaxPrice(500);
    setTempRating(0);
    setTempDistance(50);
    setTempAvailability(null);
    setTempCity('');
  };

  return (
    <div className="relative flex h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 overflow-hidden antialiased">
      {/* Top Bar */}
      <div className="flex items-center bg-white dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 justify-between sticky top-0 z-10">
        <div 
          onClick={() => onNavigate('listing')}
          className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </div>
        <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center">Filtrar Serviços</h2>
        <div className="flex items-center justify-end gap-3">
          <button onClick={handleClear} className="text-primary text-sm font-bold leading-normal hover:opacity-80 transition-opacity">Limpar</button>
          <button onClick={() => onNavigate('home')} className="text-slate-700 dark:text-slate-300 hover:text-primary transition-colors flex items-center justify-center p-1" title="Início">
            <span className="material-symbols-outlined">home</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="px-4 space-y-8 py-6">
          {/* City Section */}
          <section>
            <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold mb-3">Cidade</h3>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">location_on</span>
              <CityAutocomplete
                value={tempCity}
                onChange={val => setTempCity(val)}
                placeholder="Ex: Rondonópolis/MT"
                className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium transition-all"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">Filtre por uma cidade específica para ver prestadores locais.</p>
          </section>

          {/* Categories Section */}
          <section>
            <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold mb-3">Categorias</h3>
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <div 
                  key={cat}
                  onClick={() => setTempCategory(tempCategory === cat ? '' : cat)}
                  className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 cursor-pointer transition-all border ${tempCategory === cat ? 'bg-primary border-primary text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  {tempCategory === cat && <span className="material-symbols-outlined text-lg">check</span>}
                  <p className="text-sm font-medium">{cat}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Price Range */}
          <section>
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold">Faixa de Preço (Base)</h3>
              <p className="text-primary font-semibold text-sm">R${tempMinPrice} - R${tempMaxPrice === 500 ? '500+' : tempMaxPrice}</p>
            </div>
            <div className="px-2">
              <input 
                type="range" 
                min="0" 
                max="500" 
                step="10"
                value={tempMaxPrice}
                onChange={(e) => setTempMaxPrice(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between mt-2 text-xs text-slate-500 font-medium">
                <span>R$0</span>
                <span>R$500+</span>
              </div>
            </div>
          </section>

          {/* Rating Section */}
          <section>
            <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold mb-3">Avaliação Mínima</h3>
            <div className="flex flex-col gap-2">
              {[4, 3, 0].map(rating => (
                <label 
                  key={rating}
                  onClick={() => setTempRating(rating)}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${tempRating === rating ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-yellow-500 ${tempRating === rating ? 'fill-current' : ''}`}>star</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {rating === 0 ? 'Qualquer avaliação' : `${rating}.0 estrelas ou mais`}
                    </span>
                  </div>
                  <input 
                    name="rating" 
                    type="radio" 
                    checked={tempRating === rating}
                    onChange={() => {}} // Controlled via parent label
                    className="text-primary focus:ring-primary h-5 w-5 border-slate-300 rounded-full" 
                  />
                </label>
              ))}
            </div>
          </section>

          {/* Distance Section */}
          <section>
            <div className="flex justify-between items-end mb-3">
              <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold">Distância Máxima</h3>
              <p className="text-primary font-semibold text-sm">Até {tempDistance} km</p>
            </div>
            <div className="flex flex-col gap-4">
              <input 
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary" 
                max="100" 
                min="5" 
                step="5"
                type="range" 
                value={tempDistance}
                onChange={(e) => setTempDistance(Number(e.target.value))}
              />
              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>5 km</span>
                <span>100 km+</span>
              </div>
            </div>
          </section>

          {/* Availability Section */}
          <section>
            <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold mb-3">Disponibilidade</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setTempAvailability(tempAvailability === 'now' ? null : 'now')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all active:scale-95 ${tempAvailability === 'now' ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium'}`}
              >
                <span className="material-symbols-outlined text-sm">bolt</span>
                Disponível Agora
              </button>
              <button 
                onClick={() => setTempAvailability(tempAvailability === 'thisWeek' ? null : 'thisWeek')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all active:scale-95 ${tempAvailability === 'thisWeek' ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium'}`}
              >
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                Esta Semana
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Bottom Action Button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg md:static">
        <button 
          onClick={handleApply}
          className="w-full bg-primary text-white text-base font-bold py-4 rounded-xl shadow-lg shadow-primary/25 hover:bg-primary/95 active:scale-[0.98] transition-all"
        >
          Aplicar Filtros
        </button>
      </div>
    </div>
  );
}
