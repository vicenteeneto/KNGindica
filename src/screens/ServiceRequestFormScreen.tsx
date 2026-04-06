import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { CityAutocomplete } from '../components/CityAutocomplete';
import { useNotifications } from '../NotificationContext';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix para ícones do Leaflet no Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onClick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

interface ServiceRequestFormScreenProps extends NavigationProps {
  params?: any;
}

export default function ServiceRequestFormScreen({ onNavigate, params }: ServiceRequestFormScreenProps) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [description, setDescription] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [cep, setCep] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [desiredTime, setDesiredTime] = useState('09:00');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  const [activeCities, setActiveCities] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Load draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('draft_service_request');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.street) setStreet(parsed.street);
        if (parsed.number) setNumber(parsed.number);
        if (parsed.neighborhood) setNeighborhood(parsed.neighborhood);
        if (parsed.city) setCity(parsed.city);
        if (parsed.state) setState(parsed.state);
        if (parsed.cep) setCep(parsed.cep);
        if (parsed.desiredDate) setDesiredDate(parsed.desiredDate);
        if (parsed.desiredTime) setDesiredTime(parsed.desiredTime);
        if (parsed.selectedCategoryId) setSelectedCategoryId(parsed.selectedCategoryId);
        if (parsed.photos) setAttachments(parsed.photos);
      }
    } catch (e) {
      console.error('Error loading draft', e);
    }
  }, []);

  // Save to draft every time a relevant field changes (with a small debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('draft_service_request', JSON.stringify({
        street, number, neighborhood, city, state, cep, desiredDate, desiredTime, selectedCategoryId, photos: attachments
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [street, number, neighborhood, city, state, cep, desiredDate, desiredTime, selectedCategoryId, attachments]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data: allCats, error } = await supabase.from('service_categories').select('id, name').order('name');
      let finalCats = allCats || [];
      
      if (params?.providerId) {
        const { data: profile } = await supabase.from('profiles').select('categories').eq('id', params.providerId).single();
        if (profile?.categories && Array.isArray(profile.categories) && profile.categories.length > 0) {
          finalCats = finalCats.filter(c => profile.categories.includes(c.name));
          if (finalCats.length === 1) setSelectedCategoryId(finalCats[0].id);
        }
      }
      setCategories(finalCats);
    };
    fetchCategories();
  }, [params?.providerId]);

  useEffect(() => {
    const fetchActiveCities = async () => {
      const { data } = await supabase.from('profiles').select('city').not('city', 'is', null).eq('role', 'provider');
      if (data) {
        const uniqueCities = Array.from(new Set(data.map(p => p.city))).filter(Boolean) as string[];
        setActiveCities(uniqueCities);
      }
    };
    fetchActiveCities();
  }, []);

  const handleSendRequest = async () => {
    if (!user) {
      showToast("Ops!", 'Você precisa estar logado para fazer um pedido.', "error");
      return;
    }
    if (!selectedCategoryId) {
      showToast("Atenção", 'Por favor, selecione uma categoria.', "warning");
      return;
    }
    if (!description || description.trim().length < 10) {
      showToast("Descrição curta", 'Por favor, descreva melhor seu serviço (mínimo 10 caracteres).', "warning");
      return;
    }
    if (!city || !street || !number || !neighborhood || !desiredDate) {
      showToast("Campos obrigatórios", 'Preencha o endereço completo e a data.', "warning");
      return;
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const selectedDate = new Date(desiredDate + 'T00:00:00');
    if (selectedDate < today) {
      showToast("Data no passado", "Não é possível agendar para uma data retroativa.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      // Find category name for title or use a generic one
      const categoryName = categories.find(c => c.id === selectedCategoryId)?.name || 'Serviço';
      const fullDescription = description;

      const combinedAddress = `${street}${number ? `, ${number}` : ''}${neighborhood ? ` - ${neighborhood}` : ''}${city ? `, ${city}` : ''}${state ? ` - ${state}` : ''}`;
      const [year, month, day] = desiredDate.split('-').map(Number);
      const [hour, min] = desiredTime.split(':').map(Number);
      const desiredDateObj = new Date(year, month - 1, day, hour, min);

      const { data: requestData, error } = await supabase
        .from('service_requests')
        .insert({
          client_id: user.id,
          category_id: selectedCategoryId,
          provider_id: params?.providerId || null,
          title: `Orçamento para ${categoryName}`,
          description: fullDescription,
          street,
          number,
          neighborhood,
          city,
          state,
          cep,
          address_complement: addressComplement,
          address: combinedAddress,
          desired_date: desiredDateObj.toISOString(),
          status: 'open',
          attachments: attachments,
          latitude,
          longitude
        })
        .select('id')
        .single();

      if (error) throw error;
      
      // Manual notification insertion removed - Backend trigger handles this
      
      // Clear draft on success
      localStorage.removeItem('draft_service_request');

      onNavigate('serviceConfirmation', {
        requestId: requestData.id,
        categoryName,
        providerName: params?.providerName || 'Aguardando Atribuição',
        date: desiredDate ? desiredDate.split('-').reverse().join('/') : 'Em breve'
      });
    } catch (err: any) {
      console.error('Error creating request:', err);
      showToast("Erro ao Enviar", "Não foi possível criar sua solicitação.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFetchAddressFromProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('profiles').select('street, number, neighborhood, city, state, cep, address_complement').eq('id', user.id).single();
      
      if (error) {
        showToast("Erro", "Não foi possível buscar seus dados", "error");
        return;
      }

      if (data && (data.street || data.city || data.cep || data.address_complement)) {
        if (data.street) setStreet(data.street);
        if (data.number) setNumber(data.number);
        if (data.neighborhood) setNeighborhood(data.neighborhood);
        if (data.city) setCity(data.city);
        if (data.state) setState(data.state);
        if (data.cep) setCep(data.cep);
        if (data.address_complement) setAddressComplement(data.address_complement);
        showToast("Dados Importados", "Informações preenchidas com sucesso!", "notification");
      } else {
         showToast("Perfil Incompleto", "Não há endereço salvo no seu perfil. Por favor, digite manualmente.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Erro", "Ocorreu um erro ao importar dados.", "error");
    }
  };

  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setCity(data.localidade);
        setState(data.uf);
        setStreet(data.logradouro);
        setNeighborhood(data.bairro);
      }
    } catch (e) {
      console.error("Erro ao buscar CEP", e);
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    if (attachments.length + files.length > 5) {
      showToast("Limite de Fotos", "Máximo de 5 fotos permitidas.", "notification");
      return;
    }

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `requests/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('portfolio')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('portfolio')
          .getPublicUrl(filePath);

        return publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      setAttachments(prev => [...prev, ...urls].slice(0, 5));
      showToast("Sucesso", "Fotos enviadas com sucesso!", "success");
    } catch (err: any) {
      console.error("Error uploading photos:", err);
      showToast("Erro no Upload", "Não foi possível enviar algumas fotos.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-white dark:bg-slate-900 shadow-xl overflow-x-hidden font-display text-slate-900 dark:text-slate-100 antialiased">
      {/* TopAppBar */}
      <div className="flex items-center bg-white dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <button
          onClick={() => onNavigate('back')}
          className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 ml-2">Solicitação de Serviço</h2>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
          
          {params?.providerName && (
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">person</span>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Solicitando orçamento direto para:</p>
                <p className="font-bold text-slate-900 dark:text-slate-100">{params.providerName}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
            
            {/* Left Column: Core Info */}
            <div className="space-y-4">
              {/* Section: Category */}
              <section className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                <h3 className="text-slate-900 dark:text-slate-100 text-base font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="size-2 bg-primary rounded-full"></span>
                  Categoria
                </h3>
                <div className="flex flex-wrap gap-2">
                  {categories.length === 0 && (
                     <p className="text-xs text-slate-500">Nenhuma categoria correspondente encontrada.</p>
                  )}
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${selectedCategoryId === cat.id
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary/50'
                        }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </section>

              {/* Section: Description */}
              <section className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                <h3 className="text-slate-900 dark:text-slate-100 text-base font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                   <span className="size-2 bg-primary rounded-full"></span>
                   Descrição do Pedido
                </h3>
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col w-full">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="form-input flex w-full resize-none overflow-hidden rounded-xl text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-primary min-h-[120px] md:min-h-[180px] placeholder:text-slate-400 p-4 font-normal leading-normal shadow-inner"
                      placeholder="Descreva o serviço em detalhes..."
                    ></textarea>
                  </label>
                </div>
              </section>
            </div>

            {/* Right Column: Time, Location, Media */}
            <div className="space-y-4">
              {/* Section: Schedule (Date Picker) */}
              <section className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                 <h3 className="text-slate-900 dark:text-slate-100 text-base font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                   <span className="size-2 bg-orange-500 rounded-full"></span>
                   Agendamento
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Desejada</label>
                    <input
                      type="date"
                      value={desiredDate}
                      onChange={(e) => setDesiredDate(e.target.value)}
                      className="form-input w-full p-3 flex items-center h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary text-slate-900 dark:text-slate-100 text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horário</label>
                    <input
                      type="time"
                      value={desiredTime}
                      onChange={(e) => setDesiredTime(e.target.value)}
                      className="form-input w-full p-3 flex items-center h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary text-slate-900 dark:text-slate-100 text-sm font-bold"
                    />
                  </div>
                </div>
              </section>

              {/* Section: Address */}
              <section className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-900 dark:text-slate-100 text-base font-black uppercase tracking-widest flex items-center gap-2">
                    <span className="size-2 bg-emerald-500 rounded-full"></span>
                    Localização
                  </h3>
                  <button 
                    onClick={handleFetchAddressFromProfile}
                    className="text-[10px] font-bold text-primary uppercase border border-primary/20 bg-primary/5 px-2 py-1 rounded-lg hover:bg-primary hover:text-white transition-all transition-colors"
                  >
                    Puxar meus dados
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CEP</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cep}
                        onChange={(e) => setCep(e.target.value)}
                        onBlur={handleCepBlur}
                        placeholder="00000-000"
                        className="form-input w-full p-3 h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary text-slate-900 dark:text-slate-100 text-sm font-bold"
                      />
                      {isFetchingCep && <span className="material-symbols-outlined animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-primary text-sm">progress_activity</span>}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cidade/UF</label>
                    <CityAutocomplete
                      value={city}
                      onChange={(val) => setCity(val)}
                      activeCities={activeCities}
                      placeholder="Cidade..."
                      className="w-full px-3 h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-bold focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rua / Logradouro</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">location_on</span>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Rua..."
                      className="form-input w-full pl-10 pr-4 py-3 h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-bold focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número</label>
                    <input
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="Ex: 123"
                      className="form-input w-full p-3 h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-bold focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="sm:col-span-7 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bairro</label>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Nome do bairro..."
                      className="form-input w-full p-3 h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-bold focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Est. (UF)</label>
                    <input
                      type="text"
                      value={state}
                      maxLength={2}
                      placeholder="UF"
                      className="form-input w-full p-3 h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-bold focus:ring-2 focus:ring-primary uppercase"
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Complemento</label>
                    <input
                      type="text"
                      value={addressComplement}
                      onChange={(e) => setAddressComplement(e.target.value)}
                      placeholder="Ap, Bloco..."
                      className="form-input w-full p-3 h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-bold focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Seletor de Localização Precisa (Pin) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Localização Precisa (Pin no Mapa)</label>
                    <button 
                      onClick={() => setShowMapPicker(!showMapPicker)}
                      className="text-[10px] font-bold text-primary uppercase flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">{showMapPicker ? 'expand_less' : 'map'}</span>
                      {showMapPicker ? 'Ocultar Mapa' : 'Marcar no Mapa'}
                    </button>
                  </div>
                  
                  {showMapPicker && (
                    <div className="h-64 w-full rounded-2xl overflow-hidden border-2 border-primary/20 bg-slate-100 dark:bg-slate-800 relative z-0">
                      <MapContainer 
                        center={latitude && longitude ? [latitude, longitude] : [-16.467, -54.633]} 
                        zoom={15} 
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <MapClickHandler onClick={(lat, lng) => {
                          setLatitude(lat);
                          setLongitude(lng);
                        }} />
                        {latitude && longitude && <Marker position={[latitude, longitude]} />}
                      </MapContainer>
                      <div className="absolute bottom-2 left-2 right-2 bg-white/90 dark:bg-slate-900/90 p-2 rounded-lg text-[9px] font-bold text-slate-500 shadow-lg pointer-events-none">
                        Clique no mapa para colocar o PIN exatamente onde é o serviço.
                      </div>
                    </div>
                  )}

                  {latitude && longitude && !showMapPicker && (
                    <div className="flex items-center gap-2 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                      <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Localização vinculada com sucesso!</span>
                    </div>
                  )}
                </div>
              </section>


              {/* Section: Photos */}
              <section className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                <h3 className="text-slate-900 dark:text-slate-100 text-base font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                   <span className="size-2 bg-amber-400 rounded-full"></span>
                   Fotos (Opcional)
                </h3>
                <div className="flex flex-wrap gap-3">
                  {attachments.length < 5 && (
                    <label className={`size-16 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors bg-white dark:bg-slate-900 ${isUploading ? 'border-primary animate-pulse' : 'border-slate-200 dark:border-slate-800 hover:border-primary cursor-pointer'}`}>
                      {isUploading ? (
                        <span className="material-symbols-outlined text-primary text-[20px] animate-spin">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-slate-400 text-[20px]">add_a_photo</span>
                      )}
                      <input type="file" accept="image/png, image/jpeg" className="hidden" multiple onChange={handlePhotoUpload} disabled={isUploading} />
                    </label>
                  )}

                  {attachments.map((photoUrl, idx) => (
                    <div key={idx} className="size-16 rounded-xl overflow-hidden relative group border border-slate-200 dark:border-slate-800">
                      <img className="w-full h-full object-cover" src={photoUrl} alt={`Photo ${idx + 1}`} />
                      <button 
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Action Button */}
      <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-auto z-10 w-full relative">
        <button
          onClick={handleSendRequest}
          disabled={isSubmitting}
          className="w-full max-w-7xl mx-auto bg-primary hover:bg-primary/90 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-70 disabled:hover:bg-primary"
        >
          {isSubmitting ? (
            <span className="material-symbols-outlined animate-spin text-xl text-white">progress_activity</span>
          ) : (
            <>
              <span>Enviar Solicitação</span>
              <span className="material-symbols-outlined text-xl text-white">send</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
