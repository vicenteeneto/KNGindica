import React, { useState, useRef } from 'react';
import { NavigationProps } from '../types';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import ImageCropper from '../components/ImageCropper';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { requestNotificationPermission } from '../lib/OneSignalService';
import VerifiedBadge from '../components/VerifiedBadge';
import { supabase } from '../lib/supabase';
import { maskCurrency, parseCurrency, formatCurrency } from '../lib/formatters';
import { CityAutocomplete } from '../components/CityAutocomplete';
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
  const { showToast, showModal } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [selectedCoverSrc, setSelectedCoverSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
    street: (profile as any)?.street || '',
    neighborhood: (profile as any)?.neighborhood || '',
    number: (profile as any)?.number || '',
    address_complement: (profile as any)?.address_complement || '',
    city: (profile as any)?.city || '',
    state: (profile as any)?.state || '',
    bio: (profile as any)?.bio || '',
    categories: (profile as any)?.categories || [],
    whatsapp_number: (profile as any)?.whatsapp_number || '',
    plan_type: (profile as any)?.plan_type || 'basic',
    pricing_model: (profile as any)?.pricing_model || 'hourly',
    price_value: (profile as any)?.price_value ? formatCurrency((profile as any).price_value) : '',
    show_price: (profile as any).show_price !== false,
    is_negotiable: (profile as any)?.pricing_model === 'negotiable',
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
  const [categorySearch, setCategorySearch] = useState('');
  const [activeCities, setActiveCities] = useState<string[]>([]);
  const [showSuggestionInput, setShowSuggestionInput] = useState(false);
  const [newCategorySuggestion, setNewCategorySuggestion] = useState('');
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [docUrls, setDocUrls] = useState<{ front_id?: string; selfie?: string }>({});
  const [uploadingDoc, setUploadingDoc] = useState<'front_id' | 'selfie' | null>(null);
  const [isSyncingVerif, setIsSyncingVerif] = useState(true);

  // Keep form data synced when profile loads
  React.useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: formatPhone((profile as any).phone || ''),
        cpf: formatCPF_CNPJ((profile as any).cpf || ''),
        cep: formatCEP((profile as any).cep || ''),
        street: (profile as any).street || '',
        neighborhood: (profile as any).neighborhood || '',
        number: (profile as any).number || '',
        address_complement: (profile as any).address_complement || '',
        city: (profile as any).city || '',
        state: (profile as any).state || '',
        bio: (profile as any).bio || '',
        categories: (profile as any).categories || [],
        whatsapp_number: formatPhone((profile as any).whatsapp_number || ''),
        plan_type: (profile as any).plan_type || 'basic',
        pricing_model: (profile as any).pricing_model || 'hourly',
        price_value: (profile as any).price_value ? formatCurrency((profile as any).price_value) : '',
        show_price: (profile as any).show_price !== false,
        is_negotiable: (profile as any)?.pricing_model === 'negotiable',
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

    const fetchActiveCities = async () => {
      const { data } = await supabase.from('profiles').select('city').not('city', 'is', null).eq('role', 'provider');
      if (data) {
        const uniqueCities = Array.from(new Set(data.map(p => p.city))).filter(Boolean) as string[];
        setActiveCities(uniqueCities);
      }
    };
    fetchActiveCities();

    const fetchVerificationStatus = async () => {
      if (!user) return;
      setIsSyncingVerif(true);
      try {
        const { data } = await supabase
          .from('provider_verifications')
          .select('status, document_front_path, selfie_path')
          .eq('provider_id', user.id)
          .maybeSingle();
        
        if (data) {
          setVerificationStatus(data.status as any);
          setDocUrls({ 
            front_id: data.document_front_path || undefined, 
            selfie: data.selfie_path || undefined 
          });
        }
      } catch (err) {
        console.error("Error fetching verification status:", err);
      } finally {
        setIsSyncingVerif(false);
      }
    };
    if (role === 'provider') fetchVerificationStatus();
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
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      } finally {
        setIsFetchingCep(false);
      }
    }
  };

  const handleDocUpload = async (file: File, type: 'front_id' | 'selfie') => {
    if (!user) return;
    setUploadingDoc(type);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${type}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('verifications')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Update local state
      setDocUrls(prev => ({ ...prev, [type]: filePath }));

      // Update provider_verifications table
      const updateData: any = { 
        provider_id: user.id, 
        status: 'pending',
        updated_at: new Date().toISOString()
      };
      if (type === 'front_id') updateData.document_front_path = filePath;
      if (type === 'selfie') updateData.selfie_path = filePath;

      const { error: dbError } = await supabase
        .from('provider_verifications')
        .upsert(updateData, { onConflict: 'provider_id' });

      if (dbError) throw dbError;
      
      setVerificationStatus('pending');
      showToast("Enviado!", "Seu documento foi enviado para análise.", "success");
    } catch (err: any) {
      showToast("Erro", "Erro ao enviar documento: " + err.message, "error");
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleSavePersonalData = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Atualizar Perfil Público (Nome, Telefone, Endereço)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone.replace(/\D/g, ''),
          cep: formData.cep.replace(/\D/g, ''),
          street: formData.street,
          neighborhood: formData.neighborhood,
          number: formData.number,
          address_complement: formData.address_complement,
          city: formData.city,
          state: formData.state,
          whatsapp_number: formData.whatsapp_number.replace(/\D/g, '')
        })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // 2. Atualizar CPF (Tabela Privada)
      if (user?.id) {
        const { error: privateError } = await supabase
          .from('profiles_private')
          .upsert({
            id: user.id,
            cpf: formData.cpf
          }, { onConflict: 'id' });
        
        if (privateError) throw privateError;
      }

      await refreshProfile();
      setShowProfileModal(false);
      showToast("Tudo pronto!", "Seus dados e endereço foram salvos.", "success");
    } catch (err: any) {
      showToast("Erro ao salvar", err.message, "error");
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
      showToast('Localização salva!', 'Suas coordenadas foram atualizadas no mapa.', 'success');
    } catch (err: any) {
      showToast('Erro ao salvar localização: ' + err.message, 'error');
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleSaveProfessionalData = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Atualizar Perfil no Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          bio: formData.bio,
          categories: formData.categories,
          whatsapp_number: formData.whatsapp_number,
          pricing_model: formData.is_negotiable ? 'negotiable' : formData.pricing_model,
          price_value: (formData.is_negotiable || !formData.price_value) ? null : parseCurrency(formData.price_value),
          show_price: formData.show_price,
          opening_hours: businessInfo.opening_hours,
          loyalty_enabled: businessInfo.loyalty_enabled,
          loyalty_required_services: businessInfo.loyalty_required_services,
          loyalty_benefit_description: businessInfo.loyalty_benefit_description
        })
        .eq('id', user?.id);

      if (error) throw error;

      // 2. Sincronizar Categorias para Busca
      if (user && formData.categories.length > 0) {
        await supabase.from('provider_services').delete().eq('provider_id', user.id);
        const servicesToInsert = formData.categories.map((catName: string) => {
          const dbCat = dbCategories.find(c => c.name === catName);
          return dbCat ? {
            provider_id: user.id,
            category_id: dbCat.id,
            title: catName,
            description: formData.bio || `Serviço de ${catName}`
          } : null;
        }).filter(Boolean);

        if (servicesToInsert.length > 0) {
          await supabase.from('provider_services').insert(servicesToInsert);
        }
      }

      await refreshProfile();
      setShowProviderModal(false);
      showToast("Perfil Atualizado!", "Suas informações profissionais e do negócio foram salvas.", "success");
    } catch (err: any) {
      showToast("Erro ao salvar", err.message, "error");
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
      showToast('Sugestão enviada!', 'Analisaremos sua sugestão em breve.', 'success');
      setNewCategorySuggestion('');
      setShowSuggestionInput(false);
    } catch (err: any) {
      showToast('Erro na sugestão', err.message, 'error');
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
          storage_path: filePath
        });

      if (dbError) throw dbError;

      const { data } = await supabase
        .from('provider_portfolio')
        .select('*')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });
      setPortfolio(data || []);
      showToast('Foto adicionada ao portfólio!', 'success');
    } catch (err: any) {
      showToast('Erro no upload', err.message, 'error');
    } finally {
      setIsAddingImage(false);
    }
  };

  const handleDeletePortfolioImage = async (id: string, url: string) => {
    if (!user) return;
    
    showModal({
      title: "Excluir Imagem?",
      message: "Tem certeza que deseja remover esta foto do seu portfólio? Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      type: "warning",
      onConfirm: async () => {
        try {
          const { error: dbError } = await supabase
            .from('provider_portfolio')
            .delete()
            .eq('id', id);

          if (dbError) throw dbError;

          // Tenta remover do storage também (opcional)
          try {
            const path = url.split('/').pop();
            if (path) {
              await supabase.storage.from('portfolio').remove([`portfolio/${path}`]);
            }
          } catch {}

          setPortfolio(prev => prev.filter(img => img.id !== id));
          showToast('Imagem removida', 'A foto foi excluída do seu portfólio.', 'success');
        } catch (err: any) {
          showToast('Erro ao remover', err.message, 'error');
        }
      }
    });
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
      showToast("Erro", error.message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedCoverSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverCropSave = async (croppedFile: File) => {
    if (!user) return;
    try {
      setIsUploadingCover(true);
      setSelectedCoverSrc(null); // Close cropper
      
      const fileExt = croppedFile.name.split('.').pop() || 'jpeg';
      const fileName = `${user.id}-cover-${Math.random()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cover_image: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      showToast("Capa atualizada!", "Sua foto de capa foi salva.", "success");
      await refreshProfile();
    } catch (error: any) {
      showToast("Erro ao alterar capa", error.message, "error");
    } finally {
      setIsUploadingCover(false);
    }
  };

  // User presentation data
  const displayUser = {
    name: profile?.full_name || "Usuário",
    email: user?.email || "",
    avatar: profile?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png",
    cover: (profile as any)?.cover_image || null,
    joinDate: `Membro desde ${new Date(user?.created_at || Date.now()).getFullYear()}`,
    points: profile?.reward_points || 0
  };

  return (
    <div className="flex flex-col min-h-screen netflix-main-bg font-display text-slate-100 antialiased overflow-hidden">

      {/* Header Profile Area */}
      <div 
        className={`pt-12 pb-6 px-4 shrink-0 shadow-sm border-b border-white/20 dark:border-slate-800/50 relative bg-cover bg-center ${!displayUser.cover ? 'bg-gradient-to-b from-primary/20 to-transparent dark:from-primary/10' : ''}`}
        style={displayUser.cover ? { backgroundImage: `url("${displayUser.cover}")` } : undefined}
      >
        {displayUser.cover && (
          <div className="absolute inset-0 bg-black/50" />
        )}
        
        {role === 'provider' && (
          <div className="absolute top-6 right-4 md:right-24 z-[100]">
            <input
              type="file"
              ref={coverInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleCoverChange}
            />
            <div className="flex flex-col items-end gap-2">
              <span className="text-[10px] font-black text-white/60 bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                Ideal: 1090 x 1980 px
              </span>
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/40 transition-all text-xs font-bold gap-2 shadow-sm border border-white/30 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
                {isUploadingCover ? 'Enviando...' : 'Alterar Capa'}
              </button>
            </div>
          </div>
        )}
        {/* Back Button */}
        <button 
          onClick={() => onNavigate(role === 'admin' ? 'adminDashboard' : 'home')}
          className="absolute top-6 left-4 md:left-24 size-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-slate-700 dark:text-white hover:bg-white/40 transition-all z-[100]"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

<div className="max-w-4xl lg:mx-0 lg:ml-12 flex flex-col items-center lg:items-start transition-all duration-300">
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

          <div className="flex flex-col items-center lg:items-start gap-3 relative z-10">
            <h1 className="text-2xl font-bold tracking-tight text-center lg:text-left text-slate-900 dark:text-white" style={displayUser.cover ? { color: 'white' } : undefined}>{displayUser.name}</h1>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black italic shadow-sm ${role === 'provider' ? 'bg-emerald-500 text-white' : 'bg-primary text-white'}`}>
              {role === 'provider' ? 'PRESTADOR DE SERVIÇO' : 'CLIENTE'}
            </span>
          </div>
          <p className="text-sm mt-3 mb-1 text-center lg:text-left relative z-10 text-slate-500 dark:text-slate-400" style={displayUser.cover ? { color: '#cbd5e1' } : undefined}>{displayUser.email}</p>
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1 mt-2 relative z-10">
            <span className="bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full text-[9px] font-black text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-white/5 shadow-sm">
              {displayUser.joinDate}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border shadow-sm ${
              formData.plan_type === 'plus' 
                ? 'bg-orange-500 text-black border-orange-400' 
                : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-white/5'
            }`}>
              {formData.plan_type === 'plus' ? 'PREMIUM' : 'BÁSICO'}
            </span>
            <span className="bg-amber-500 text-black px-2 py-0.5 rounded-full text-[9px] font-black border border-amber-400 shadow-sm">
              {displayUser.points} PTS
            </span>
          </div>
        </div>
      </div>

      {/* Main Options */}
      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl lg:mx-0 lg:ml-12 w-full pb-32 transition-all duration-300">
        

        {/* Seção de Alerta de Perfil Incompleto (Apenas para Prestadores) */}
        {role === 'provider' && (() => {
          const missing = [];
          if (!formData.full_name?.trim()) missing.push("Nome");
          if (!profile?.avatar_url) missing.push("Foto");
          if (!formData.bio?.trim() || formData.bio.trim().length < 30) missing.push("Bio");
          if (!formData.categories || formData.categories.length === 0) missing.push("Serviços");
          if (!(profile as any)?.latitude) missing.push("Localização");
          if (!formData.is_negotiable && !formData.price_value) missing.push("Preço");
          if (portfolio.length === 0) missing.push("Portfólio");
           if (!isSyncingVerif && verificationStatus !== 'approved' && verificationStatus !== 'pending') missing.push("Documentos");

          if (missing.length === 0) return null;

          return (
            <div className="mb-6 animate-pulse-subtle">
              <div className="bg-red-500 text-white rounded-2xl p-4 shadow-lg shadow-red-500/30 flex flex-col gap-3 border-2 border-red-400">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl">warning</span>
                  <div>
                    <p className="font-black text-sm italic">Perfil Incompleto!</p>
                    <p className="text-[10px] font-medium opacity-90">Complete os itens abaixo para atrair clientes</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {missing.map((item, idx) => (
                    <span key={idx} className="bg-white/20 text-[9px] font-black px-2 py-0.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* === GRUPOS DE MENUS ESTILO WHATSAPP === */}
        <div className="space-y-4 mb-6">
          
          {/* Grupo 1: Conta & Configurações */}
          <div className="bg-[#000814]/40 backdrop-blur-md rounded-xl shadow-sm border border-white/10 overflow-hidden">
            {/* Editar Dados */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="w-full flex items-center justify-between px-4 py-2 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 transition-colors active:bg-slate-100 dark:active:bg-white/10 border-b border-slate-100 dark:border-white/5 last:border-0"
            >
              <div className="flex items-center gap-3.5">
                <div className="size-7 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">person_pin_circle</span>
                </div>
                <div className="text-left">
                  <p className="text-[14px] text-slate-900 dark:text-white">Editar Meus Dados</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[20px] text-slate-300 dark:text-slate-600">chevron_right</span>
            </button>

            {/* Perfil Profissional (Apenas para Prestadores) */}
            {role === 'provider' && (
              <button
                onClick={() => setShowProviderModal(true)}
                className="w-full flex items-center justify-between px-4 py-2 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 transition-colors active:bg-slate-100 dark:active:bg-white/10 border-b border-slate-100 dark:border-white/5 last:border-0"
              >
                <div className="flex items-center gap-3.5">
                  <div className="size-7 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">construction</span>
                  </div>
                  <div className="text-left">
                    <p className="text-[14px] text-slate-900 dark:text-white">Perfis de Trabalho</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[20px] text-slate-300 dark:text-slate-600">chevron_right</span>
              </button>
            )}

            {/* Meus Cartões & Pix */}
            <button
              onClick={() => onNavigate('providerWallet' as any)}
              className="w-full flex items-center justify-between px-4 py-2 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 transition-colors active:bg-slate-100 dark:active:bg-white/10 border-b border-slate-100 dark:border-white/5 last:border-0"
            >
              <div className="flex items-center gap-3.5">
                <div className="size-7 rounded-lg bg-purple-500 text-white flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">finance</span>
                </div>
                <div className="text-left">
                  <p className="text-[14px] text-slate-900 dark:text-white">Meus Cartões & Pix</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[20px] text-slate-300 dark:text-slate-600">chevron_right</span>
            </button>

            {/* Indique e Ganhe */}
            <button
              onClick={() => onNavigate('rewards')}
              className="w-full flex items-center justify-between px-4 py-2 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 transition-colors active:bg-slate-100 dark:active:bg-white/10 border-b border-slate-100 dark:border-white/5 last:border-0"
            >
              <div className="flex items-center gap-3.5">
                <div className="size-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
                </div>
                <div className="text-left">
                  <p className="text-[14px] text-slate-900 dark:text-white">Indique e Ganhe</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[20px] text-slate-300 dark:text-slate-600">chevron_right</span>
            </button>

            {/* Minhas Avaliações (Apenas para Prestadores) */}
            {role === 'provider' && (
              <button
                onClick={() => onNavigate('reviews', { professionalId: user?.id, returnTo: 'userProfile' })}
                className="w-full flex items-center justify-between px-4 py-2 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 transition-colors active:bg-slate-100 dark:active:bg-white/10 border-b border-slate-100 dark:border-white/5 last:border-0"
              >
                <div className="flex items-center gap-3.5">
                  <div className="size-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">star</span>
                  </div>
                  <div className="text-left">
                    <p className="text-[14px] text-slate-900 dark:text-white">Minhas Avaliações</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[20px] text-slate-300 dark:text-slate-600">chevron_right</span>
              </button>
            )}
          </div>

          {/* Grupo 2: Sistema */}
          <div className="bg-white dark:bg-[#1C1C1E] rounded-xl shadow-sm border border-slate-200/60 dark:border-white/10 overflow-hidden">
            {/* Notificações Push */}
            <button
              onClick={() => {
                requestNotificationPermission();
                showToast("Solicitando permissão", "Siga as instruções do navegador para ativar as notificações push.", "notification");
              }}
              className="w-full flex items-center justify-between px-4 py-2 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 transition-colors active:bg-slate-100 dark:active:bg-white/10 border-b border-slate-100 dark:border-white/5 last:border-0"
            >
              <div className="flex items-center gap-3.5">
                <div className="size-7 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">notifications</span>
                </div>
                <div className="text-left flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] text-slate-900 dark:text-white">Notificações Push</p>
                    {(profile as any)?.onesignal_id && (
                      <span className="bg-emerald-500 size-1.5 rounded-full animate-pulse"></span>
                    )}
                  </div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[20px] text-slate-300 dark:text-slate-600">
                {(profile as any)?.onesignal_id ? 'check' : 'chevron_right'}
              </span>
            </button>

            {/* Central de Ajuda */}
            <button
              onClick={() => onNavigate('helpCenter' as any)}
              className="w-full flex items-center justify-between px-4 py-2 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 transition-colors active:bg-slate-100 dark:active:bg-white/10 border-b border-slate-100 dark:border-white/5 last:border-0"
            >
              <div className="flex items-center gap-3.5">
                <div className="size-7 rounded-lg bg-slate-500 text-white flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">help_center</span>
                </div>
                <div className="text-left">
                  <p className="text-[14px] text-slate-900 dark:text-white">Central de Ajuda</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[20px] text-slate-300 dark:text-slate-600">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Profile Switcher (Only for clients to upgrade) */}
        {role !== 'provider' && (
          <section className="mb-6">
            <div className="bg-gradient-to-tr from-slate-900 to-black text-white rounded-2xl p-5 shadow-lg shadow-black/20 border border-slate-800 relative overflow-hidden flex flex-col items-start gap-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-bl-full flex items-start justify-end p-4 blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                    <span className="material-symbols-outlined text-2xl">handyman</span>
                  </div>
                  <div>
                    <h3 className="font-black text-base tracking-tight italic">
                      Seja um prestador
                    </h3>
                    <p className="text-[10px] text-slate-400 font-black leading-none mt-0.5">Ganhe dinheiro com seus serviços</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-1">
                  Alterne para a visualização exclusiva de prestador de serviços e comece a receber pedidos agora mesmo.
                </p>
              </div>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="relative z-10 bg-primary hover:bg-primary/90 text-white font-black px-6 py-3.5 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all w-full flex justify-center items-center gap-2 text-xs"
              >
                <span className="material-symbols-outlined text-sm">switch_account</span>
                Mudar para prestador
              </button>
            </div>
          </section>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-3 text-red-500 font-bold bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors active:scale-[0.98]"
        >
          <span className="material-symbols-outlined">logout</span>
          Sair da Conta
        </button>
        <p className="text-center text-xs text-slate-400 mt-6">Versão 1.0.0 (Build 42)</p>

      </main>



      {selectedImageSrc && (
        <ImageCropper 
          imageSrc={selectedImageSrc}
          onCropSave={uploadCroppedAvatar}
          onCropCancel={() => setSelectedImageSrc(null)}
          title="Ajustar Foto de Perfil"
        />
      )}

      {selectedCoverSrc && (
        <ImageCropper 
          imageSrc={selectedCoverSrc}
          onCropSave={handleCoverCropSave}
          onCropCancel={() => setSelectedCoverSrc(null)}
          aspect={16 / 9}
          cropShape="rect"
          title="Ajustar Foto de Capa"
        />
      )}

      {/* Master Modal: Dados Pessoais & Endereço */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg my-auto animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <span className="material-symbols-outlined text-2xl">person_pin_circle</span>
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-white">Editar Meus Dados</h3>
                  <p className="text-[13px] text-slate-500 mt-0.5">Pessoais e Localização</p>
                </div>
              </div>
              <button disabled={isSaving} onClick={() => setShowProfileModal(false)} className="size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSavePersonalData} className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <div className="space-y-4">
                {/* Seção: Identificação */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-[10px] font-black text-blue-500">01. Identificação</span>
                    <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800"></div>
                  </div>
                  
                  <div>
                    <label className="block text-[13px] font-medium text-slate-500 mb-1.5 ml-1">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      placeholder="Seu nome completo"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-slate-500 mb-1.5 ml-1">CPF / CNPJ</label>
                      <input
                        type="text"
                        required
                        maxLength={18}
                        value={formData.cpf}
                        onChange={(e) => setFormData({...formData, cpf: formatCPF_CNPJ(e.target.value)})}
                        placeholder="000.000.000-00"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-500 mb-1.5 ml-1">Telefone Celular</label>
                      <input
                        type="tel"
                        required
                        maxLength={15}
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: formatPhone(e.target.value)})}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção: Endereço */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-[10px] font-black text-emerald-500">02. Localização</span>
                    <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800"></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                      <label className="block text-[13px] font-medium text-slate-500 mb-1.5 ml-1">CEP</label>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={9}
                          value={formData.cep}
                          onChange={(e) => handleCepChange(e.target.value)}
                          placeholder="00000-000"
                          className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all pr-10 font-medium text-slate-900 dark:text-white"
                        />
                        {isFetchingCep && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                            <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[13px] font-medium text-slate-500 mb-1.5 ml-1">Rua / Logradouro</label>
                      <input
                        type="text"
                        required
                        value={formData.street}
                        onChange={(e) => setFormData({...formData, street: e.target.value})}
                        placeholder="Ex: Rua das Flores"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1">
                      <label className="block text-[13px] font-medium text-slate-500 mb-1.5 ml-1">Bairro</label>
                      <input
                        type="text"
                        required
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                        placeholder="Ex: Centro"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-[13px] font-medium text-slate-500 mb-1.5 ml-1">Número</label>
                      <input
                        type="text"
                        required
                        value={formData.number}
                        onChange={(e) => setFormData({...formData, number: e.target.value})}
                        placeholder="Ex: 123"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-[13px] font-medium text-slate-500 mb-1.5 ml-1">Complemento</label>
                      <input
                        type="text"
                        value={formData.address_complement}
                        onChange={(e) => setFormData({...formData, address_complement: e.target.value})}
                        placeholder="Apto, Sala, etc."
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[13px] font-medium text-slate-500 mb-1.5 ml-1">Cidade</label>
                      <CityAutocomplete
                        value={formData.city}
                        onChange={(val) => setFormData({...formData, city: val})}
                        activeCities={activeCities}
                        placeholder="Ex: Itajaí"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-[13px] font-medium text-slate-500 mb-1.5 ml-1">Estado (UF)</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={formData.state}
                        onChange={(e) => setFormData({...formData, state: e.target.value.toUpperCase()})}
                        placeholder="Ex: SC"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {role === 'provider' && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileModal(false);
                        setShowLocationPickerModal(true);
                      }}
                      className="w-full h-11 flex items-center justify-center gap-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs shadow-xl hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                      <span className="material-symbols-outlined">pin_drop</span>
                      {(profile as any)?.latitude ? 'Ajustar localização no mapa' : 'Marcar meu local no mapa'}
                    </button>
                  )}
                {/* Seção 03: Verificação de Identidade (Apenas para Prestadores) */}
                {role === 'provider' && (
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="text-[10px] font-black text-amber-500 tracking-[1px]">03. Verificação de identidade</span>
                      <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800"></div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl flex gap-3 items-start">
                      <span className="material-symbols-outlined text-amber-500 mt-0.5 text-sm">info</span>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold leading-relaxed">
                        Envie fotos nítidas para ganhar o selo de verificado. A análise leva até 48h.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Frente do Documento */}
                      <div className="relative group">
                         <label className="block text-[13px] font-medium text-slate-500 mb-1.5 ml-1">Frente do Documento</label>
                         <button
                           type="button"
                           disabled={!!uploadingDoc || verificationStatus === 'approved'}
                           onClick={() => {
                             const input = document.createElement('input');
                             input.type = 'file';
                             input.accept = 'image/*';
                             input.onchange = (e) => {
                               const file = (e.target as HTMLInputElement).files?.[0];
                               if (file) handleDocUpload(file, 'front_id');
                             };
                             input.click();
                           }}
                           className={`w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all overflow-hidden relative ${
                             docUrls.front_id ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                           } ${verificationStatus === 'approved' ? 'opacity-80' : 'hover:border-blue-500 active:scale-[0.98]'}`}
                         >
                           {uploadingDoc === 'front_id' ? (
                             <div className="flex flex-col items-center gap-2">
                               <span className="material-symbols-outlined animate-spin text-blue-500">progress_activity</span>
                               <span className="text-[10px] font-black text-blue-500">Enviando...</span>
                             </div>
                           ) : docUrls.front_id ? (
                             <>
                               <img 
                                 src={supabase.storage.from('verifications').getPublicUrl(docUrls.front_id).data.publicUrl} 
                                 className="absolute inset-0 w-full h-full object-cover opacity-20"
                                 alt="Frente" 
                               />
                               <span className="material-symbols-outlined text-emerald-500 text-3xl">check_circle</span>
                               <span className="text-[10px] font-black text-emerald-600 italic">Documento enviado</span>
                             </>
                           ) : (
                             <>
                               <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                                 <span className="material-symbols-outlined text-2xl">badge</span>
                               </div>
                               <span className="text-[10px] font-black text-slate-400">Selecionar Foto</span>
                             </>
                           )}
                         </button>
                      </div>

                      {/* Selfie com Documento */}
                      <div className="relative group">
                         <label className="block text-[13px] font-medium text-slate-500 mb-1.5 ml-1">Selfie com Documento</label>
                         <button
                           type="button"
                           disabled={!!uploadingDoc || verificationStatus === 'approved'}
                           onClick={() => {
                             const input = document.createElement('input');
                             input.type = 'file';
                             input.accept = 'image/*';
                             input.onchange = (e) => {
                               const file = (e.target as HTMLInputElement).files?.[0];
                               if (file) handleDocUpload(file, 'selfie');
                             };
                             input.click();
                           }}
                           className={`w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all overflow-hidden relative ${
                             docUrls.selfie ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                           } ${verificationStatus === 'approved' ? 'opacity-80' : 'hover:border-blue-500 active:scale-[0.98]'}`}
                         >
                           {uploadingDoc === 'selfie' ? (
                             <div className="flex flex-col items-center gap-2">
                               <span className="material-symbols-outlined animate-spin text-blue-500">progress_activity</span>
                               <span className="text-[10px] font-black text-blue-500">Enviando...</span>
                             </div>
                           ) : docUrls.selfie ? (
                             <>
                               <img 
                                 src={supabase.storage.from('verifications').getPublicUrl(docUrls.selfie).data.publicUrl} 
                                 className="absolute inset-0 w-full h-full object-cover opacity-20"
                                 alt="Selfie" 
                               />
                               <span className="material-symbols-outlined text-emerald-500 text-3xl">check_circle</span>
                               <span className="text-[10px] font-black text-emerald-600 italic">Selfie Enviada</span>
                             </>
                           ) : (
                             <>
                               <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                                 <span className="material-symbols-outlined text-2xl">face</span>
                               </div>
                               <span className="text-[10px] font-black text-slate-400">Tirar Selfie</span>
                             </>
                           )}
                         </button>
                      </div>
                    </div>

                    {verificationStatus !== 'approved' && verificationStatus !== 'none' && (
                      <div className="flex items-center gap-2 mt-2 px-1">
                        <div className={`size-2 rounded-full ${verificationStatus === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-[9px] font-black text-slate-500 italic">
                          {verificationStatus === 'pending' ? 'DOCUMENTOS EM ANÁLISE PELA EQUIPE' : 'VERIFICAÇÃO RECUSADA - ENVIE NOVAS FOTOS'}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </form>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex gap-3 shrink-0">
              <button 
                type="button" 
                disabled={isSaving} 
                onClick={() => setShowProfileModal(false)}
                className="flex-1 py-2.5 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-[10px]"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isSaving} 
                onClick={(e) => handleSavePersonalData(e as any)}
                className="flex-2 py-2.5 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all disabled:opacity-50 flex justify-center items-center gap-2 text-xs shadow-lg shadow-blue-500/30"
              >
                {isSaving ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Salvar TUDO
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master Modal: Perfil Profissional & Negócio */}
      {showProviderModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl my-auto animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <span className="material-symbols-outlined text-2xl">construction</span>
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-white">Perfil Profissional</h3>
                  <p className="text-[13px] text-slate-500 mt-0.5">Serviços, Bio e Configurações</p>
                </div>
              </div>
              <button disabled={isSaving} onClick={() => setShowProviderModal(false)} className="size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <div className="space-y-8">
                
                {/* 01. Sobre Você */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-[10px] font-black text-orange-500">01. Sobre Você (Bio)</span>
                    <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800"></div>
                  </div>
                  <textarea
                    required
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    placeholder="Conte sobre sua experiência, especialidades e como você trabalha. Isso ajuda clientes a confiarem no seu serviço!"
                    rows={4}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none transition-all font-medium text-slate-900 dark:text-white resize-none"
                  />
                  <p className="text-[10px] text-slate-400 font-medium px-1 text-right">Mínimo 30 caracteres recomendado</p>
                </div>

                {/* 02. Serviços e Preços */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-[10px] font-black text-blue-500">02. Serviços & Preços</span>
                    <div className="flex-1 h-[1px] bg-slate-100 dark:bg-slate-800"></div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-2 ml-1">Categorias que Atua</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.categories.map(cat => (
                        <span key={cat} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-[10px] font-black rounded-full border border-primary/20">
                          {cat}
                          <button type="button" onClick={() => setFormData({...formData, categories: formData.categories.filter(c => c !== cat)})} className="material-symbols-outlined text-[14px]">cancel</button>
                        </span>
                      ))}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        placeholder="+ Buscar ou sugerir serviço"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-900 dark:text-white text-xs"
                      />
                      {categorySearch.trim().length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 max-h-48 overflow-y-auto">
                          {dbCategories
                            .filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase()) && !formData.categories.includes(cat.name))
                            .map(cat => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  setFormData({...formData, categories: [...formData.categories, cat.name]});
                                  setCategorySearch('');
                                }}
                                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 text-[10px] font-black text-slate-700 dark:text-slate-300 border-b border-slate-50 dark:border-slate-700 last:border-0"
                              >
                                {cat.name}
                              </button>
                            ))}
                          {dbCategories.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase()) && !formData.categories.includes(cat.name)).length === 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setNewCategorySuggestion(categorySearch);
                                handleSuggestCategory();
                                setCategorySearch('');
                              }}
                              className="w-full px-4 py-4 text-center hover:bg-primary/5 text-primary text-[10px] font-black"
                            >
                              <span className="material-symbols-outlined block text-2xl mb-1">add_circle</span>
                              Sugerir "{categorySearch}"
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50/50 dark:bg-blue-900/5 p-4 rounded-2xl border border-blue-100/50 dark:border-blue-800/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <span className="material-symbols-outlined text-[20px]">payments</span>
                        <span className="text-[10px] font-black italic">Preço à combinar</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, is_negotiable: !formData.is_negotiable})}
                        className={`w-10 h-5 rounded-full transition-colors relative ${formData.is_negotiable ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 size-3 bg-white rounded-full transition-all ${formData.is_negotiable ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>

                  <div className={`grid grid-cols-2 gap-4 transition-all duration-300 ${formData.is_negotiable ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-500 mb-1.5 ml-1">Preço Inicial (R$)</label>
                      <input
                        type="text"
                        value={formData.price_value}
                        onChange={(e) => setFormData({...formData, price_value: maskCurrency(e.target.value)})}
                        placeholder="0,00"
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-slate-500 mb-1.5 ml-1">Unidade</label>
                      <select
                        value={formData.pricing_model}
                        onChange={(e) => setFormData({...formData, pricing_model: e.target.value})}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-900 dark:text-white text-xs"
                      >
                        <option value="visit">Por Visita</option>
                        <option value="hour">Por Hora</option>
                        <option value="service">Por Serviço</option>
                        <option value="quote">Sob Orçamento</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 03. Portfólio de Imagens */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 mb-2 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-purple-500">03. Portfólio (Fotos)</span>
                      <div className="h-[1px] w-8 bg-slate-100 dark:bg-slate-800"></div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                      Formatos aceitos: JPG, PNG
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {portfolio.map((img) => (
                      <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-100 dark:border-slate-800 bg-slate-100">
                        <img src={img.image_url} alt="" className="size-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleDeletePortfolioImage(img.id, img.image_url)}
                          className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    ))}
                    {portfolio.length < 8 && (
                      <button
                        type="button"
                        onClick={() => document.getElementById('master-portfolio-upload')?.click()}
                        disabled={isAddingImage}
                        className="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-primary/50 hover:bg-primary/5 transition-all"
                      >
                        {isAddingImage ? (
                          <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[24px]">add_a_photo</span>
                            <span className="text-[8px] font-black mt-1">Add</span>
                          </>
                        )}
                      </button>
                    )}
                    <input id="master-portfolio-upload" type="file" accept="image/*" className="hidden" onChange={handleAddPortfolioImage} />
                  </div>
                </div>

                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex gap-3 shrink-0">
                <button 
                  type="button" 
                  disabled={isSaving} 
                  onClick={() => setShowProviderModal(false)}
                  className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-[10px]"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  disabled={isSaving} 
                  onClick={(e) => handleSaveProfessionalData(e as any)}
                  className="flex-2 py-4 bg-orange-600 text-white rounded-2xl font-black hover:bg-orange-700 transition-all disabled:opacity-50 flex justify-center items-center gap-2 text-xs shadow-lg shadow-orange-500/30"
                >
                  {isSaving ? (
                    <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      Atualizar Perfil Profissional
                    </>
                  )}
                </button>
              </div>
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
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter italic">
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
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
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
