import React, { useState, useRef } from 'react';
import { NavigationProps } from '../types';
import MobileNav from '../components/MobileNav';
import ProviderMobileNav from '../components/ProviderMobileNav';
import { supabase } from '../lib/supabase';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';
import ImageCropper from '../components/ImageCropper';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.prototype.options.iconUrl = markerIcon;
L.Icon.Default.prototype.options.shadowUrl = markerShadow;
L.Icon.Default.imagePath = '';

// Click handler inside the map
function LocationPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); }
  });
  return null;
}

// Força o mapa a voar para o centro correto quando ele mudar
function MapMover({ center }: { center: [number, number] }) {
  const map = useMap();
  React.useEffect(() => {
    map.flyTo(center, map.getZoom(), { duration: 0.8 });
  }, [center[0], center[1]]);
  return null;
}

const formatCPF_CNPJ = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length <= 11) {
    return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14);
  } else {
    return v.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})/, '$1-$2').slice(0, 18);
  }
};

const formatPhone = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length <= 10) {
    return v.replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 14);
  }
  return v.replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
};

const formatCEP = (value: string) => {
  return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
};

export default function UserProfileScreen({ onNavigate }: NavigationProps) {
  const { user, profile, role, setDevRole, upgradeToProvider, logout, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // States for Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showLocationPickerModal, setShowLocationPickerModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<{lat: number, lng: number} | null>(
    (profile as any)?.latitude && (profile as any)?.longitude 
      ? { lat: (profile as any).latitude, lng: (profile as any).longitude } 
      : null
  );
  // Ref para o centro do mapa — atualiza sincronicamente (sem batching do React)
  const mapCenterRef = useRef<[number, number]>(
    (profile as any)?.latitude && (profile as any)?.longitude
      ? [(profile as any).latitude, (profile as any).longitude]
      : [-15.7801, -47.9292]
  );
  // State derivado apenas para forçar re-render quando o centro muda
  const [mapCenterKey, setMapCenterKey] = useState(0);

  const updateMapCenter = (lat: number, lng: number) => {
    mapCenterRef.current = [lat, lng];
    setMapCenterKey(k => k + 1); // força re-render para que o MapContainer use o novo center
  };

  // Form States
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: (profile as any)?.phone || '',
    cpf: (profile as any)?.cpf || '',
    cep: (profile as any)?.cep || '',
    city: (profile as any)?.city || '',
    address: (profile as any)?.address || '',
    bio: (profile as any)?.bio || '',
    categories: (profile as any)?.categories || [],
    whatsapp_number: (profile as any)?.whatsapp_number || '',
    plan_type: (profile as any)?.plan_type || 'basic',
  });

  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [businessInfo, setBusinessInfo] = useState({
    opening_hours: (profile as any)?.opening_hours || 'Seg à Sex: 08:00 - 18:00',
    loyalty_enabled: (profile as any)?.loyalty_enabled || false,
    loyalty_benefit_description: (profile as any)?.loyalty_benefit_description || '11º serviço com 50% de desconto',
    loyalty_required_services: (profile as any)?.loyalty_required_services || 10
  });

  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [showSuggestionInput, setShowSuggestionInput] = useState(false);
  const [newCategorySuggestion, setNewCategorySuggestion] = useState('');
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);

  // Keep form data synced when profile loads
  React.useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: formatPhone((profile as any).phone || ''),
        cpf: formatCPF_CNPJ((profile as any).cpf || ''),
        cep: formatCEP((profile as any).cep || ''),
        city: (profile as any).city || '',
        address: (profile as any).address || '',
        bio: (profile as any).bio || '',
        categories: (profile as any).categories || [],
        whatsapp_number: formatPhone((profile as any).whatsapp_number || ''),
        plan_type: (profile as any).plan_type || 'basic',
      });
      // Sincroniza coords/cidade ao carregar o perfil
      if ((profile as any).latitude && (profile as any).longitude) {
        updateMapCenter((profile as any).latitude, (profile as any).longitude);
        setPickedLocation({ lat: (profile as any).latitude, lng: (profile as any).longitude });
      } else if ((profile as any).city) {
        // Pré-geocodifica em background para ter o centro pronto
        const city = (profile as any).city;
        fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)},Brazil&format=json&limit=1`,
          { headers: { 'Accept-Language': 'pt-BR' } }
        )
          .then(r => r.json())
          .then(data => {
            if (data && data.length > 0) {
              updateMapCenter(parseFloat(data[0].lat), parseFloat(data[0].lon));
            }
          })
          .catch(() => {});
      }
    }
  }, [profile]);

  // Fetch global categories and portfolio
  React.useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('service_categories').select('*').order('name');
      if (data) setDbCategories(data);
    };
    fetchCategories();

    const fetchPortfolio = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('provider_portfolio')
        .select('*')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });
      setPortfolio(data || []);
    };
    if (role === 'provider') fetchPortfolio();
  }, [user, role]);

  const handleCepChange = async (cepValue: string) => {
    // Remove non-numeric characters and format
    const formattedCep = formatCEP(cepValue);
    const digits = formattedCep.replace(/\D/g, '');
    setFormData({ ...formData, cep: formattedCep });

    if (digits.length === 8) {
      setIsFetchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            city: data.localidade || prev.city,
            address: `${data.logradouro}${data.bairro ? ` - ${data.bairro}` : ''}`
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      } finally {
        setIsFetchingCep(false);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          cpf: formData.cpf,
        })
        .eq('id', user?.id);

      if (error) throw error;
      await refreshProfile();
      setShowProfileModal(false);
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message + "\n\nSe o erro persistir, verifique se as colunas phone e cpf existem no banco de dados.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Geocodifica a cidade para salvar lat/lng automaticamente
      let lat: number | null = null;
      let lng: number | null = null;
      const cityToGeocode = formData.city.trim();
      if (cityToGeocode) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityToGeocode)}&country=Brazil&format=json&limit=1`,
            { headers: { 'Accept-Language': 'pt-BR' } }
          );
          const geoData = await res.json();
          if (geoData.length > 0) {
            lat = parseFloat(geoData[0].lat);
            lng = parseFloat(geoData[0].lon);
            updateMapCenter(lat, lng);
          }
        } catch {}
      }

      const updatePayload: any = {
        cep: formData.cep,
        city: formData.city,
        address: formData.address,
      };
      // Só salva coords do geocoding se o prestador não tiver uma localização manual mais precisa
      if (lat && lng && !(pickedLocation)) {
        updatePayload.latitude = lat;
        updatePayload.longitude = lng;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user?.id);

      if (error) throw error;
      await refreshProfile();
      setShowAddressModal(false);
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePickedLocation = async () => {
    if (!pickedLocation || !user) return;
    setIsSavingLocation(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ latitude: pickedLocation.lat, longitude: pickedLocation.lng })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setShowLocationPickerModal(false);
      showToast('Localização salva! Você já aparece no mapa dos clientes.', 'success');
    } catch (err: any) {
      showToast('Erro ao salvar localização: ' + err.message, 'error');
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleSaveProviderProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bio: formData.bio,
          categories: formData.categories,
          whatsapp_number: formData.whatsapp_number,
        })
        .eq('id', user?.id);

      if (error) throw error;
      await refreshProfile();
      setShowProviderModal(false);
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message + "\n\nSe o erro persistir, verifique se as colunas bio e categories existem no banco de dados.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuggestCategory = async () => {
    if (!newCategorySuggestion.trim() || !user) return;
    setIsSubmittingSuggestion(true);
    try {
      const { error } = await supabase.from('category_requests').insert({
        provider_id: user.id,
        category_name: newCategorySuggestion.trim(),
        status: 'pending'
      });

      if (error) throw error;
      showToast('Sugestão enviada com sucesso! Analisaremos em breve.', 'success');
      setNewCategorySuggestion('');
      setShowSuggestionInput(false);
    } catch (err: any) {
      showToast('Erro ao enviar sugestão: ' + err.message, 'error');
    } finally {
      setIsSubmittingSuggestion(false);
    }
  };

  const handleAddPortfolioImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    setIsAddingImage(true);
    try {
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `portfolio/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('provider_portfolio')
        .insert({
          provider_id: user.id,
          image_url: publicUrl,
          title: 'Trabalho realizado',
          description: ''
        });

      if (dbError) throw dbError;

      // Update local state
      const { data } = await supabase
        .from('provider_portfolio')
        .select('*')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });
      setPortfolio(data || []);
      showToast('Imagem adicionada ao seu portfólio!', 'success');
    } catch (err: any) {
      showToast('Erro ao enviar imagem: ' + err.message, 'error');
    } finally {
      setIsAddingImage(false);
    }
  };

  const handleDeletePortfolioImage = async (id: string, url: string) => {
    if (!user) return;
    if (!confirm('Deseja realmente excluir esta imagem do seu portfólio?')) return;

    try {
      const { error: dbError } = await supabase
        .from('provider_portfolio')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Tenta remover do storage também (opcional, pode falhar se não tiver permissão)
      try {
        const path = url.split('/').pop();
        if (path) {
          await supabase.storage.from('portfolio').remove([`portfolio/${path}`]);
        }
      } catch (storageErr) {
        console.warn('Erro ao remover do storage:', storageErr);
      }

      setPortfolio(prev => prev.filter(img => img.id !== id));
      showToast('Imagem removida!', 'success');
    } catch (err: any) {
      showToast('Erro ao remover: ' + err.message, 'error');
    }
  };

  const handleSaveBusinessSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          opening_hours: businessInfo.opening_hours,
          loyalty_enabled: businessInfo.loyalty_enabled,
          loyalty_benefit_description: businessInfo.loyalty_benefit_description,
          loyalty_required_services: businessInfo.loyalty_required_services
        })
        .eq('id', user?.id);

      if (error) throw error;
      await refreshProfile();
      setShowSettingsModal(false);
      showToast('Configurações salvas com sucesso!', 'success');
    } catch (err: any) {
      showToast('Erro ao salvar: ' + err.message, 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleLogout = () => {
    logout();
    onNavigate('auth');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setSelectedImageSrc(reader.result?.toString() || null));
      reader.readAsDataURL(file);
    }
  };

  const uploadCroppedAvatar = async (croppedImage: File) => {
    try {
      setSelectedImageSrc(null); // Hide cropper
      setIsUploading(true);

      const fileExt = croppedImage.name.split('.').pop() || 'jpeg';
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedImage);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) {
        throw updateError;
      }

      // Refresh to get new avatar URL
      await refreshProfile();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // User presentation data
  const displayUser = {
    name: profile?.full_name || "Usuário",
    email: user?.email || "",
    avatar: profile?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png",
    joinDate: `Membro desde ${new Date(user?.created_at || Date.now()).getFullYear()}`,
    points: 0
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden">

      {/* Header Profile Area (Gradient bg) */}
      <div className="bg-gradient-to-b from-primary/20 to-transparent dark:from-primary/10 pt-12 pb-6 px-4 shrink-0 shadow-sm border-b border-white/20 dark:border-slate-800/50 relative">
        {/* Back Button */}
        <button 
          onClick={() => onNavigate('home')}
          className="absolute top-6 left-4 size-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-slate-700 dark:text-white hover:bg-white/40 transition-all z-10"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="relative mb-4">
            <div
              className={`size-24 rounded-full bg-cover bg-center border-4 border-white dark:border-slate-900 shadow-xl ${isUploading ? 'opacity-50' : ''}`}
              style={{ backgroundImage: `url('${displayUser.avatar}')` }}
            >
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined animate-spin text-white drop-shadow-md">progress_activity</span>
                </div>
              )}
            </div>
            <button
              onClick={handleAvatarClick}
              disabled={isUploading}
              className="absolute bottom-0 right-0 size-8 bg-primary text-white rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm hover:scale-105 transition-transform disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              value="" // Reset value so onChange fires even for same file
              onChange={handleFileChange}
            />
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-center">{displayUser.name}</h1>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest italic shadow-sm ${role === 'provider' ? 'bg-emerald-500 text-white' : 'bg-primary text-white'}`}>
              MODO {role === 'provider' ? 'PRESTADOR' : 'CLIENTE'}
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">{displayUser.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="bg-white/50 dark:bg-slate-800/50 px-3 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {displayUser.joinDate}
            </span>
            {formData.plan_type === 'plus' ? (
              <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-yellow-200 dark:border-yellow-800/50 shadow-sm animate-pulse">
                <span className="material-symbols-outlined text-[14px]">workspace_premium</span>
                ASSINANTE PLUS
              </span>
            ) : (
              <span className="bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700">
                PLANO BÁSICO
              </span>
            )}
            <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-amber-200 dark:border-amber-800/50">
              <span className="material-symbols-outlined text-[14px]">stars</span>
              {displayUser.points} pts
            </span>
          </div>
        </div>
      </div>

      {/* Main Options */}
      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full pb-32">
        
        {role === 'provider' && (
          <section className="mb-4">
            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center">
                  <span className="material-symbols-outlined">analytics</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Painel do Prestador</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Acesse suas métricas e ganhos</p>
                </div>
              </div>
              <button 
                onClick={() => onNavigate('dashboard')}
                className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
              >
                Ver Dashboard
              </button>
            </div>
          </section>
        )}

        {/* Account Info Section */}
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 px-2">Minha Conta</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <button
              onClick={() => setShowProfileModal(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors active:bg-slate-100 dark:active:bg-slate-800 group"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900 dark:text-white">Dados Pessoais</p>
                  <p className="text-xs text-slate-500">Nome, CPF, Telefone</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>

            <button
              onClick={() => setShowAddressModal(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors active:bg-slate-100 dark:active:bg-slate-800 group"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-colors">
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900 dark:text-white">Meus Endereços</p>
                  <p className="text-xs text-slate-500">Casa, Trabalho e Localização</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>

            {role === 'provider' && (
              <>
                <button
                  onClick={() => setShowProviderModal(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors active:bg-slate-100 dark:active:bg-slate-800 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-500 flex items-center justify-center group-hover:bg-orange-100 dark:group-hover:bg-orange-900/40 transition-colors">
                      <span className="material-symbols-outlined">work</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-900 dark:text-white">Perfil Profissional</p>
                      <p className="text-xs text-slate-500">Sobre, Serviços e WhatsApp</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                </button>

                <button
                  onClick={() => setShowPortfolioModal(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors active:bg-slate-100 dark:active:bg-slate-800 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
                      <span className="material-symbols-outlined">photo_library</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-900 dark:text-white">Meus Trabalhos</p>
                      <p className="text-xs text-slate-500">Gerenciar fotos do portfólio</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                </button>

                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors active:bg-slate-100 dark:active:bg-slate-800 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 transition-colors">
                      <span className="material-symbols-outlined">settings_heart</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-900 dark:text-white">Configurações do Negócio</p>
                      <p className="text-xs text-slate-500">Fidelidade e horários</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                </button>
              </>
            )}

            <button
              onClick={() => alert('Gerenciar métodos de pagamento')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors active:bg-slate-100 dark:active:bg-slate-800 group"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-500 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 transition-colors">
                  <span className="material-symbols-outlined">credit_card</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900 dark:text-white">Pagamentos</p>
                  <p className="text-xs text-slate-500">Cartões salvos, Pix</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
          </div>
        </section>

        {/* Configs Section */}
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 px-2">Configurações</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            <button
              onClick={() => onNavigate('notifications')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors active:bg-slate-100 dark:active:bg-slate-800 group"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40 transition-colors">
                  <span className="material-symbols-outlined">notifications</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900 dark:text-white">Notificações</p>
                  <p className="text-xs text-slate-500">Push, E-mail, SMS</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>

            {/* In-app theme toggle replaces the floating button */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors active:bg-slate-100 dark:active:bg-slate-800 group"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                  <span className="material-symbols-outlined">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900 dark:text-white">Aparência do App</p>
                  <p className="text-xs text-slate-500">
                    {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                  </p>
                </div>
              </div>
              <div className="w-10 h-6 bg-slate-200 dark:bg-primary rounded-full relative transition-colors shadow-inner flex items-center shrinks-0">
                <div className={`absolute top-1 bg-white w-4 h-4 rounded-full shadow transition-all ${theme === 'dark' ? 'left-5' : 'left-1'}`}></div>
              </div>
            </button>

            <button
              onClick={() => alert('Abrir central de ajuda')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors active:bg-slate-100 dark:active:bg-slate-800 group"
            >
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                  <span className="material-symbols-outlined">help</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-900 dark:text-white">Central de Ajuda</p>
                  <p className="text-xs text-slate-500">Dúvidas e suporte</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
          </div>
        </section>

        {/* Profile Switcher */}
        <section className="mb-8">
          <div className="bg-gradient-to-tr from-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-lg shadow-black/10 relative overflow-hidden flex flex-col items-start gap-4 border border-slate-700">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full flex items-start justify-end p-4">
              <span className="material-symbols-outlined text-4xl text-white/20">swap_horiz</span>
            </div>
            <div className="relative z-10 w-3/4">
              <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">
                  {role === 'provider' ? 'person' : 'handyman'}
                </span>
                {role === 'provider' ? 'Modo Cliente' : 'Modo Prestador'}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {role === 'provider'
                  ? 'Alternar para a visualização de busca e contratação de serviços.'
                  : 'Alternar para a visualização exclusiva de prestador de serviços.'}
              </p>
            </div>
            <button
              onClick={() => {
                if (role === 'provider') {
                  setDevRole('client');
                  onNavigate('home');
                } else {
                  // Se for cliente, mostra o modal de "Tornar-se Prestador" em vez de apenas mudar visualmente
                  setShowUpgradeModal(true);
                }
              }}
              className="relative z-10 bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-xl shadow-sm hover:scale-105 active:scale-95 transition-all w-full flex justify-center items-center gap-2"
            >
              <span className="material-symbols-outlined">switch_account</span>
              {role === 'provider' ? 'Mudar para Cliente' : 'Mudar para Prestador'}
            </button>
          </div>
        </section>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 text-red-500 font-bold bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors active:scale-[0.98]"
        >
          <span className="material-symbols-outlined">logout</span>
          Sair da Conta
        </button>
        <p className="text-center text-xs text-slate-400 mt-6">Versão 1.0.0 (Build 42)</p>

      </main>

      {/* Using the standard MobileNav */}
      {role === 'provider' ? (
        <ProviderMobileNav onNavigate={onNavigate} currentScreen="profile" />
      ) : (
        <MobileNav onNavigate={onNavigate} currentScreen="profile" />
      )}

      {/* Modal: Portfólio de Trabalhos */}
      {showPortfolioModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">photo_library</span>
                Meus Trabalhos
              </h3>
              <button onClick={() => setShowPortfolioModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <button
                  onClick={() => document.getElementById('portfolio-upload')?.click()}
                  disabled={isAddingImage}
                  className="w-full py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                >
                  {isAddingImage ? (
                    <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                  ) : (
                    <>
                      <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-2xl">add_a_photo</span>
                      </div>
                      <p className="font-bold text-slate-700 dark:text-slate-300">Adicionar nova foto</p>
                      <p className="text-xs text-slate-500">JPG, PNG ou WEBP até 5MB</p>
                    </>
                  )}
                </button>
                <input
                  id="portfolio-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAddPortfolioImage}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {portfolio.map((img) => (
                  <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-100 dark:border-slate-800">
                    <img src={img.image_url} alt="" className="size-full object-cover" />
                    <button
                      onClick={() => handleDeletePortfolioImage(img.id, img.image_url)}
                      className="absolute top-2 right-2 size-8 bg-red-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
                {portfolio.length === 0 && !isAddingImage && (
                  <div className="col-span-full py-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-20">image_not_supported</span>
                    <p className="text-sm">Nenhuma foto adicionada ao seu portfólio.</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-850 shrink-0 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowPortfolioModal(false)}
                className="w-full py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold hover:opacity-90 transition-all"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Configurações do Negócio */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-500">settings_heart</span>
                Configurações do Negócio
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveBusinessSettings} className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6">
                {/* Horários */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Horário de Atendimento</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">schedule</span>
                    <input
                      type="text"
                      value={businessInfo.opening_hours}
                      onChange={(e) => setBusinessInfo({...businessInfo, opening_hours: e.target.value})}
                      placeholder="Ex: Seg à Sex: 08:00 - 18:00"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Programa de Fidelidade */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Programa de Fidelidade</h4>
                      <p className="text-xs text-slate-500 leading-snug">Incentive clientes a voltarem mais vezes.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBusinessInfo({...businessInfo, loyalty_enabled: !businessInfo.loyalty_enabled})}
                      className={`w-12 h-6 rounded-full transition-colors relative ${businessInfo.loyalty_enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 size-4 bg-white rounded-full transition-all ${businessInfo.loyalty_enabled ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  {businessInfo.loyalty_enabled && (
                    <div className="space-y-4 animate-fade-in">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Serviços Necessários</label>
                        <input
                          type="number"
                          value={businessInfo.loyalty_required_services}
                          onChange={(e) => setBusinessInfo({...businessInfo, loyalty_required_services: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Recompensa</label>
                        <input
                          type="text"
                          value={businessInfo.loyalty_benefit_description}
                          onChange={(e) => setBusinessInfo({...businessInfo, loyalty_benefit_description: e.target.value})}
                          placeholder="Ex: 50% de desconto no próximo"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-primary/30"
                >
                  {isSavingSettings ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedImageSrc && (
        <ImageCropper
          imageSrc={selectedImageSrc}
          onCropSave={uploadCroppedAvatar}
          onCropCancel={() => setSelectedImageSrc(null)}
        />
      )}
      {/* ── Toast de Notificação ─────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-[500] flex items-start gap-3 w-[90vw] max-w-sm px-4 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md
            animate-[slideInDown_0.35s_ease-out]
            ${toast.type === 'success'
              ? 'bg-gradient-to-br from-emerald-500/90 to-emerald-700/90 border-emerald-400/30 text-white'
              : 'bg-gradient-to-br from-red-500/90 to-red-700/90 border-red-400/30 text-white'
            }
          `}
        >
          <span className="material-symbols-outlined text-2xl mt-0.5 shrink-0">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">
              {toast.type === 'success' ? 'Sucesso!' : 'Algo deu errado'}
            </p>
            <p className="text-xs text-white/85 mt-0.5 leading-snug">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-white/70 hover:text-white shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
          {/* Barra de progresso */}
          <div className="absolute bottom-0 left-0 h-1 rounded-b-2xl bg-white/30 w-full">
            <div className="h-full rounded-b-2xl bg-white/70 animate-[shrinkWidth_4s_linear_forwards]" />
          </div>
        </div>
      )}

      {/* Modals for Editing Data */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                Dados Pessoais
              </h3>
              <button disabled={isSaving} onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="p-6">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    placeholder="Seu nome"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">CPF / CNPJ</label>
                  <input
                    type="text"
                    required
                    maxLength={18}
                    value={formData.cpf}
                    onChange={(e) => setFormData({...formData, cpf: formatCPF_CNPJ(e.target.value)})}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Telefone</label>
                  <input
                    type="tel"
                    required
                    maxLength={15}
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: formatPhone(e.target.value)})}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" disabled={isSaving} onClick={() => setShowProfileModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                  {isSaving ? <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span> : 'Salvar Dados'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddressModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500">location_on</span>
                Meus Endereços
              </h3>
              <button disabled={isSaving} onClick={() => setShowAddressModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveAddress} className="p-6">
              <div className="space-y-4 mb-6">
                 <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">CEP</label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={9}
                      value={formData.cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      placeholder="00000-000"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all pr-12"
                    />
                    {isFetchingCep && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary">
                        <span className="material-symbols-outlined animate-spin">refresh</span>
                      </div>
                    )}
                  </div>
                 </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Cidade</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    placeholder="Ex: Rondonópolis"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Endereço Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Rua, Número, Bairro"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                </div>
                {role === 'provider' && (
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddressModal(false);
                        setShowLocationPickerModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-2xl bg-gradient-to-r from-primary to-blue-600 text-white font-bold text-base shadow-lg shadow-primary/30 hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                      <span className="material-symbols-outlined text-2xl">pin_drop</span>
                      <div className="text-left">
                        <p className="font-bold text-base leading-tight">Marcar Meu Local no Mapa</p>
                        <p className="text-xs text-white/80 font-normal">
                          {(profile as any)?.latitude ? '✅ Localização já definida — clique para ajustar' : 'Aparecer para clientes perto de você'}
                        </p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button type="button" disabled={isSaving} onClick={() => setShowAddressModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                  {isSaving ? <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span> : 'Salvar Endereço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provider Profile Modal */}
      {showProviderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-500">work</span>
                Perfil Profissional
              </h3>
              <button disabled={isSaving} onClick={() => setShowProviderModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveProviderProfile} className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sobre a Empresa / Profissional</label>
                  <textarea
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    placeholder="Conte um pouco sobre sua experiência, diferenciais e forma de trabalhar..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">WhatsApp para contato direto (Exclusivo PLUS)</label>
                  <input
                    type="tel"
                    maxLength={15}
                    disabled={formData.plan_type !== 'plus'}
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({...formData, whatsapp_number: formatPhone(e.target.value)})}
                    placeholder="(00) 00000-0000"
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all ${formData.plan_type === 'plus' ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-slate-100 dark:bg-slate-850 border-transparent opacity-60 cursor-not-allowed'}`}
                  />
                  {formData.plan_type !== 'plus' && (
                    <p className="text-[10px] text-amber-600 mt-1 font-medium italic">Disponível apenas para assinantes Plus.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Serviços Prestados (Selecione um ou mais)</label>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {dbCategories.length > 0 ? (
                      dbCategories.map(cat => (
                        <label key={cat.id || cat.name} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.categories?.includes(cat.name) ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={formData.categories?.includes(cat.name)}
                            onChange={(e) => {
                              const current = formData.categories || [];
                              if (e.target.checked) {
                                setFormData({...formData, categories: [...current, cat.name]});
                              } else {
                                setFormData({...formData, categories: current.filter((c: string) => c !== cat.name)});
                              }
                            }}
                          />
                          <span className="text-sm font-semibold">{cat.name}</span>
                        </label>
                      ))
                    ) : (
                      [
                        'Limpeza Residencial', 'Limpeza Pós-Obra', 'Diarista', 'Passadeira',
                        'Pedreiro', 'Pintor', 'Eletricista', 'Encanador', 'Marceneiro', 'Montador de Móveis',
                        'Técnico de Informática', 'Conserto de Celular', 'Ar-condicionado',
                        'Cabeleireiro', 'Barbeiro', 'Manicure', 'Maquiadora', 'Massagista',
                        'Babá', 'Cuidador de Idosos', 'Passeador de Cães', 'Adestrador',
                        'Fotógrafo', 'Cinegrafista', 'DJ', 'Segurança', 'Garçom',
                        'Frete e Carreto', 'Mudanças', 'Guincho',
                        'Professor Particular', 'Personal Trainer'
                      ].map(cat => (
                        <label key={cat} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formData.categories?.includes(cat) ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={formData.categories?.includes(cat)}
                            onChange={(e) => {
                              const current = formData.categories || [];
                              if (e.target.checked) {
                                setFormData({...formData, categories: [...current, cat]});
                              } else {
                                setFormData({...formData, categories: current.filter((c: string) => c !== cat)});
                              }
                            }}
                          />
                          <span className="text-sm font-semibold">{cat}</span>
                        </label>
                      ))
                    )}
                  </div>

                  {/* Sugestão de Categoria */}
                  {role !== 'admin' && (
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                      {!showSuggestionInput ? (
                        <button
                          type="button"
                          onClick={() => setShowSuggestionInput(true)}
                          className="flex items-center gap-2 text-primary font-bold text-xs hover:underline"
                        >
                          <span className="material-symbols-outlined text-[16px]">add_circle</span>
                          Sugerir nova categoria
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={newCategorySuggestion}
                            onChange={(e) => setNewCategorySuggestion(e.target.value)}
                            placeholder="Ex: Passeador de Cães"
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleSuggestCategory}
                              disabled={isSubmittingSuggestion || !newCategorySuggestion.trim()}
                              className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/90 disabled:opacity-50"
                            >
                              {isSubmittingSuggestion ? 'Enviando...' : 'Enviar Sugestão'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowSuggestionInput(false);
                                setNewCategorySuggestion('');
                              }}
                              className="text-slate-500 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-4 shrink-0">
                <button type="button" disabled={isSaving} onClick={() => setShowProviderModal(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                  {isSaving ? <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span> : 'Salvar Perfil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Marcar Localização no Mapa (popup compacto) */}
      {showLocationPickerModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <span className="material-symbols-outlined text-primary text-[18px]">pin_drop</span>
                Marcar minha localização
              </h3>
              <button onClick={() => setShowLocationPickerModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Instrução */}
            <p className="text-xs text-slate-500 dark:text-slate-400 px-4 pt-2 pb-1">
              {pickedLocation
                ? `📍 ${pickedLocation.lat.toFixed(5)}, ${pickedLocation.lng.toFixed(5)} — clique para reposicionar`
                : '👆 Toque no mapa para marcar seu ponto exato'}
            </p>

            {/* Mapa — key força remontagem quando o centro muda, garantindo posição correta */}
            <div className="w-full h-[280px] relative z-0">
              <MapContainer
                key={`map-${mapCenterKey}-${mapCenterRef.current[0].toFixed(4)}`}
                center={mapCenterRef.current}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <LocationPicker onPick={(lat, lng) => setPickedLocation({ lat, lng })} />
                {pickedLocation && (
                  <Marker position={[pickedLocation.lat, pickedLocation.lng]} />
                )}
              </MapContainer>
            </div>

            {/* Botões */}
            <div className="p-3 flex gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowLocationPickerModal(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePickedLocation}
                disabled={!pickedLocation || isSavingLocation}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex justify-center items-center gap-1.5"
              >
                {isSavingLocation
                  ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                  : <><span className="material-symbols-outlined text-[16px]">check</span> Confirmar</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

       {/* Modal: Tornar-se Prestador (Upgrade) */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up">
            <div className="p-8 text-center">
              <div className="size-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-4xl">handyman</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter uppercase italic">
                Seja um <span className="text-primary">Prestador!</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
                Você está prestes a transformar seu perfil. Como prestador, você poderá oferecer seus serviços, receber pedidos e aumentar sua renda.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    setIsSaving(true);
                    const success = await upgradeToProvider();
                    setIsSaving(false);
                    if (success) {
                      setShowUpgradeModal(false);
                      setShowProviderModal(true); // Abre o form profissional automaticamente
                      showToast("Perfil atualizado! Agora complete seus dados.", "success");
                    } else {
                      showToast("Erro ao atualizar perfil.", "error");
                    }
                  }}
                  disabled={isSaving}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">rocket_launch</span>
                      COMEÇAR AGORA
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  disabled={isSaving}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Talvez mais tarde
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
