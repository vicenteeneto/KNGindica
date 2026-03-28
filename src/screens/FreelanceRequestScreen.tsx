import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { parseCurrency, maskCurrency } from '../lib/formatters';
import { CityAutocomplete } from '../components/CityAutocomplete';

export default function FreelanceRequestScreen({ onNavigate }: NavigationProps) {
  const { user } = useAuth();
  const { showToast, showModal } = useNotifications();
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCities, setActiveCities] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    category_id: '',
    city: '',
    street: '',
    number: '',
    neighborhood: '',
    state: 'MT',
    cep: '',
    expiresInHours: '24',
    attachments: [] as string[]
  });
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleCepBlur = async () => {
    const cleanCep = formData.cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    setIsFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData({
          ...formData,
          street: data.logradouro || formData.street,
          neighborhood: data.bairro || formData.neighborhood,
          city: data.localidade || formData.city,
          state: data.uf || formData.state
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingCep(false);
    }
  };
  const handleFetchAddressFromProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('profiles').select('street, number, neighborhood, city, state, cep').eq('id', user.id).single();
      
      if (error) {
        showToast("Erro", "Não foi possível buscar seus dados", "error");
        return;
      }

      if (data && (data.street || data.city || data.cep)) {
        setFormData(prev => ({
          ...prev,
          street: data.street || prev.street,
          number: data.number || prev.number,
          neighborhood: data.neighborhood || prev.neighborhood,
          city: data.city || prev.city,
          state: data.state || prev.state,
          cep: data.cep || prev.cep
        }));
        showToast("Dados Importados", "Informações preenchidas com sucesso!", "notification");
      } else {
         showToast("Perfil Incompleto", "Não há endereço salvo no seu perfil. Por favor, digite manualmente.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Erro", "Ocorreu um erro ao importar dados.", "error");
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('name');
      if (!error) setCategories(data || []);
      setLoading(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return showToast("Acesso Negado", "Você precisa estar logado para publicar uma ordem.", "error");
    if (!formData.category_id) return showToast("Atenção", "Por favor, selecione uma categoria.", "warning");
    if (!formData.city) return showToast("Atenção", "Por favor, selecione a cidade do serviço.", "warning");

    setSending(true);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(formData.expiresInHours));

      const { data, error } = await supabase
        .from('freelance_orders')
        .insert([{
          client_id: user.id,
          title: formData.title,
          description: formData.description,
          budget: parseCurrency(formData.budget),
          category_id: formData.category_id,
          city: formData.city,
          street: formData.street,
          number: formData.number,
          neighborhood: formData.neighborhood,
          state: formData.state,
          cep: formData.cep,
          status: 'open',
          expires_at: expiresAt.toISOString(),
          attachments: formData.attachments
        }])
        .select()
        .single();

      if (error) throw error;

      showToast(
        "Sucesso",
        "Ordem publicada com sucesso! Os prestadores profissionais serão notificados e em breve entrarão em contato.",
        "success"
      );
      onNavigate('myFreelances');
    } catch (err: any) {
      showToast("Erro ao publicar", err.message, "error");
    } finally {
      setSending(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    if (formData.attachments.length + files.length > 5) {
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
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...urls].slice(0, 5)
      }));
      showToast("Sucesso", "Fotos enviadas com sucesso!", "success");
    } catch (err: any) {
      console.error("Error uploading photos:", err);
      showToast("Erro no Upload", "Não foi possível enviar algumas fotos.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col antialiased pb-10">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center p-4 justify-between max-w-4xl mx-auto w-full">
          <button 
            onClick={() => onNavigate('home')}
            className="text-slate-900 dark:text-slate-100 flex size-10 items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-xl font-black tracking-tighter italic uppercase">Solicitar Freelance</h2>
          <div className="size-10"></div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 lg:p-8">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800">
          <div className="mb-8">
            <h1 className="text-2xl font-black tracking-tight mb-2">Defina seu Preço</h1>
            <p className="text-slate-500 text-sm">Descreva o que você precisa e os prestadores virão até você.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-slate-400">Título do Serviço</label>
              <input 
                type="text" 
                required
                placeholder="Ex: Cortar grama de jardim pequeno"
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 rounded-2xl px-5 py-4 transition-all outline-none font-medium"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-slate-400">Categoria</label>
              <select 
                required
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 rounded-2xl px-5 py-4 transition-all outline-none font-medium appearance-none"
                value={formData.category_id}
                onChange={e => setFormData({...formData, category_id: e.target.value})}
              >
                <option value="">Selecione uma categoria...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold uppercase tracking-widest text-slate-400">CEP</label>
                  <button 
                    type="button"
                    onClick={handleFetchAddressFromProfile}
                    className="text-[10px] font-bold text-primary uppercase border border-primary/20 bg-primary/5 px-2 py-1 rounded-lg hover:bg-primary hover:text-white transition-all"
                  >
                    Puxar meus dados
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="00000-000"
                    className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 rounded-2xl px-5 py-4 transition-all outline-none font-medium"
                    value={formData.cep}
                    onChange={e => setFormData({...formData, cep: e.target.value})}
                    onBlur={handleCepBlur}
                  />
                  {isFetchingCep && <span className="material-symbols-outlined animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-primary text-sm">progress_activity</span>}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-slate-400">Cidade</label>
                <CityAutocomplete
                  value={formData.city}
                  onChange={val => setFormData({...formData, city: val})}
                  activeCities={activeCities}
                  placeholder="Onde o serviço será realizado?"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 rounded-2xl px-5 py-4 transition-all outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-slate-400">Rua / Logradouro</label>
              <input 
                type="text" 
                placeholder="Nome da rua..."
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 rounded-2xl px-5 py-4 transition-all outline-none font-medium"
                value={formData.street}
                onChange={e => setFormData({...formData, street: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-1 space-y-1.5">
                <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-slate-400">Número</label>
                <input 
                  type="text" 
                  placeholder="123"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 rounded-2xl px-5 py-4 transition-all outline-none font-medium"
                  value={formData.number}
                  onChange={e => setFormData({...formData, number: e.target.value})}
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-slate-400">Bairro</label>
                <input 
                  type="text" 
                  placeholder="Bairro..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 rounded-2xl px-5 py-4 transition-all outline-none font-medium"
                  value={formData.neighborhood}
                  onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                />
              </div>
              <div className="sm:col-span-1 space-y-1.5">
                <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-slate-400">Estado (UF)</label>
                <input 
                  type="text" 
                  maxLength={2}
                  placeholder="MT"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 rounded-2xl px-5 py-4 transition-all outline-none font-medium uppercase"
                  value={formData.state}
                  onChange={e => setFormData({...formData, state: e.target.value.toUpperCase()})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-slate-400">Quanto deseja pagar? (R$)</label>
              <div className="relative">

                <input 
                  type="text" 
                  required
                  placeholder="0,00"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 rounded-2xl px-5 py-4 transition-all outline-none font-black text-xl"
                  value={formData.budget}
                  onChange={e => {
                    const masked = maskCurrency(e.target.value);
                    setFormData({...formData, budget: masked});
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-slate-400">Duração do Freelance</label>
              <select 
                required
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 rounded-2xl px-5 py-4 transition-all outline-none font-medium appearance-none"
                value={formData.expiresInHours}
                onChange={e => setFormData({...formData, expiresInHours: e.target.value})}
              >
                <option value="6">Expira em 6 Horas</option>
                <option value="12">Expira em 12 Horas</option>
                <option value="24">Expira em 24 Horas (1 dia)</option>
                <option value="48">Expira em 48 Horas (2 dias)</option>
                <option value="168">Expira em 7 Dias</option>
              </select>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              <label className="block text-sm font-bold mb-4 uppercase tracking-widest text-slate-400">Fotos do Serviço (Opcional)</label>
              <div className="flex flex-wrap gap-3">
                {formData.attachments.length < 5 && (
                  <label className={`size-20 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-colors bg-white dark:bg-slate-900 ${isUploading ? 'border-primary animate-pulse' : 'border-slate-200 dark:border-slate-800 hover:border-primary cursor-pointer'}`}>
                    {isUploading ? (
                      <span className="material-symbols-outlined text-primary text-[24px] animate-spin">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-slate-400 text-[24px]">add_a_photo</span>
                    )}
                    <input type="file" accept="image/png, image/jpeg" className="hidden" multiple onChange={handlePhotoUpload} disabled={isUploading} />
                  </label>
                )}

                {formData.attachments.map((photoUrl, idx) => (
                  <div key={idx} className="size-20 rounded-2xl overflow-hidden relative group border border-slate-200 dark:border-slate-800">
                    <img className="w-full h-full object-cover" src={photoUrl} alt={`Photo ${idx + 1}`} />
                    <button 
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-10 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2 italic font-medium uppercase tracking-widest">Máximo de 5 fotos (JPG ou PNG)</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-slate-400">Detalhes extras</label>
              <textarea 
                required
                rows={4}
                placeholder="Dê mais detalhes para os profissionais entenderem melhor o serviço..."
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 rounded-2xl px-5 py-4 transition-all outline-none font-medium resize-none"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <button 
              type="submit"
              disabled={sending}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-black py-2.5 rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-widest"
            >
              {sending ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Publicando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">rocket_launch</span>
                  Publicar Ordem
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/30">
          <div className="flex gap-4">
            <span className="material-symbols-outlined text-amber-500">privacy_tip</span>
            <div>
              <h4 className="font-bold text-amber-900 dark:text-amber-500 mb-1">Dica de Privacidade</h4>
              <p className="text-sm text-amber-800/70 dark:text-amber-500/70">Não se preocupe, seu telefone e dados pessoais não serão expostos. Todo o contato será feito pelo chat do KNGindica.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
