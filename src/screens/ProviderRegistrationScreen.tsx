import React, { useState, useRef } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { CityAutocomplete } from '../components/CityAutocomplete';

export default function ProviderRegistrationScreen({ onNavigate }: NavigationProps) {
  const { user, refreshProfile } = useAuth();
  const { showToast } = useNotifications();
  
  const [formData, setFormData] = useState({
    name: '',
    document: '',
    category: '',
    bio: '',
    city: '',
    latitude: null as number | null,
    longitude: null as number | null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [activeCities, setActiveCities] = useState<string[]>([]);

  React.useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('service_categories').select('*').order('name');
      if (data) setDbCategories(data);
    };
    fetchCategories();

    const fetchActiveCities = async () => {
      const { data } = await supabase.from('profiles').select('city').not('city', 'is', null).eq('role', 'provider');
      if (data) {
        const uniqueCities = Array.from(new Set(data.map(p => p.city))).filter(Boolean) as string[];
        setActiveCities(uniqueCities);
      }
    };
    fetchActiveCities();
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      showToast("Ops!", "Geolocalização não é suportada pelo seu navegador.", "error");
      return;
    }
    
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          // You could potentially reverse geocode here, but let's allow manual city entry for now
        }));
        setGeoLoading(false);
      },
      (error) => {
        console.error("Erro GPS:", error);
        showToast("Atenção", "Não foi possível acessar a localização. Por favor, libere a permissão ou digite a cidade manualmente.", "warning");
        setGeoLoading(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("Ops!", "Usuário não autenticado", "error");
      return;
    }
    if (!formData.name || !formData.category || !formData.city) {
      showToast("Atenção", "Por favor, preencha pelo menos Nome, Categoria e Cidade.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update Profile
      const { error: profileError } = await supabase.from('profiles').update({
        full_name: formData.name,
        city: formData.city,
        latitude: formData.latitude,
        longitude: formData.longitude,
        categories: [formData.category], // Store name in JSONB for legacy support
        role: 'provider',
        status: 'pending'
      }).eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Link to Category in provider_services (For Judite Search)
      const selectedCat = dbCategories.find(c => c.name === formData.category);
      if (selectedCat) {
        // Clear previous services to avoid duplicates during re-registration
        await supabase.from('provider_services').delete().eq('provider_id', user.id);
        
        const { error: serviceError } = await supabase.from('provider_services').insert({
          provider_id: user.id,
          category_id: selectedCat.id,
          title: selectedCat.name,
          description: formData.bio || `Serviço de ${selectedCat.name}`
        });
        if (serviceError) throw serviceError;
      }
      
      await refreshProfile();
      onNavigate('plan');
    } catch (e: any) {
      console.error(e);
      showToast("Erro", "Erro ao salvar cadastro: " + e.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Header / Navigation */}
      <nav className="sticky top-0 z-10 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-4 flex items-center">
        <button 
          onClick={() => onNavigate('home')}
          className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="ml-2 text-lg font-semibold tracking-tight">Cadastro de Prestador</h1>
      </nav>

      {/* Main Content */}
      <main className="flex-grow px-6 py-8 max-w-3xl mx-auto w-full">
        {/* Welcome Header */}
        <header className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Seja bem-vindo!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Preencha suas informações profissionais para começar a receber solicitações.</p>
        </header>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Profile Photo Upload */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border-4 border-white dark:border-slate-700 shadow-sm">
                <img 
                  className="w-full h-full object-cover" 
                  alt="Default professional profile avatar placeholder" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwjaCpFDwnk_xuJ1s4cjK9FQ8HLdKZxeDgPO5zw2dd9bSh3wl-G0O2ZNFqKd_Ey6zkJLzgz4yFjh3AA25mnOdI2eLem-vsiprklKeEz_0SMVYkUH6OaYAZq_rLoco7UHbhHQjB6nrEad64IWmX412t5NzLc3H5dgtPbfEEwfzxuuJ2xShGkE3TPRBSz8_-clwCfOLxGuoHxpIwr5uYd0TxRmANgGBE-Uao0KotGyRhhbQdQ8Bt17QygQgkOmvGPI6orCDIpiBYBDc"
                />
              </div>
              <button className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg hover:bg-primary/90 transition-transform active:scale-95 flex items-center justify-center" type="button">
                <span className="material-symbols-outlined text-sm">photo_camera</span>
              </button>
            </div>
            <p className="mt-3 text-xs font-medium text-primary">Foto de Perfil Profissional</p>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="name">Nome Completo *</label>
            <input 
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
              id="name" 
              placeholder="Ex: João Silva" 
              type="text"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>

          {/* CPF/CNPJ */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="document">CPF ou CNPJ</label>
            <input 
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
              id="document" 
              placeholder="000.000.000-00" 
              type="text"
              value={formData.document}
              onChange={e => setFormData({...formData, document: e.target.value})}
            />
          </div>

          {/* Professional Category */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="category">Categoria Profissional *</label>
            <div className="relative">
              <select 
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none appearance-none" 
                id="category"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                required
              >
                <option disabled value="">Selecione uma categoria</option>
                {dbCategories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
            </div>
          </div>

          {/* Bio / Description */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="bio">Bio / Descrição Profissional</label>
            <textarea 
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none resize-none" 
              id="bio" 
              placeholder="Conte um pouco sobre sua experiência e diferenciais..." 
              rows={4}
              value={formData.bio}
              onChange={e => setFormData({...formData, bio: e.target.value})}
            />
            <p className="text-[10px] text-slate-400 text-right italic">Mínimo de 30 caracteres</p>
          </div>

          {/* Location Area */}
          <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Localização e Raio de Atendimento</h3>
            
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={geoLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-xl font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined">{geoLoading ? 'refresh' : 'my_location'}</span>
              {geoLoading ? 'Obtendo localização...' : 'Usar minha Localização Atual (GPS)'}
            </button>
            
            {formData.latitude && formData.longitude && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium flex items-center gap-2 border border-green-200 dark:border-green-800/50">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Coordenadas capturadas com sucesso!
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Cidade de Atuação *</label>
              <CityAutocomplete
                value={formData.city}
                onChange={val => setFormData({...formData, city: val})}
                activeCities={activeCities}
                placeholder="Ex: Rondonópolis/MT"
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              />
            </div>
          </div>

          {/* Footer Spacing */}
          <div className="h-12"></div>
        </form>
      </main>

      {/* Bottom Action Bar */}
      <footer className="sticky bottom-0 p-6 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light dark:via-background-dark to-transparent">
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center disabled:opacity-70"
        >
          <span>{isSubmitting ? 'Salvando...' : 'Finalizar Cadastro'}</span>
          {!isSubmitting && <span className="material-symbols-outlined ml-2 text-sm">check_circle</span>}
        </button>
      </footer>
    </div>
  );
}
