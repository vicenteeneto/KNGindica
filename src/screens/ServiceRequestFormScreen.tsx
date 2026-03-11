import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';

interface ServiceRequestFormScreenProps extends NavigationProps {
  params?: any;
}

export default function ServiceRequestFormScreen({ onNavigate, params }: ServiceRequestFormScreenProps) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [desiredTime, setDesiredTime] = useState('09:00');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Load draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('draft_service_request');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.address) setAddress(parsed.address);
        if (parsed.desiredDate) setDesiredDate(parsed.desiredDate);
        if (parsed.desiredTime) setDesiredTime(parsed.desiredTime);
        if (parsed.selectedCategoryId) setSelectedCategoryId(parsed.selectedCategoryId);
        if (parsed.photos) setPhotos(parsed.photos);
      }
    } catch (e) {
      console.error('Error loading draft', e);
    }
  }, []);

  // Save to draft every time a relevant field changes (with a small debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('draft_service_request', JSON.stringify({
        description, address, desiredDate, desiredTime, selectedCategoryId, photos
      }));
    }, 500);
    return () => clearTimeout(timer);
  }, [description, address, desiredDate, desiredTime, selectedCategoryId, photos]);

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

  const handleSendRequest = async () => {
    if (!user) {
      alert('Você precisa estar logado para fazer um pedido.');
      return;
    }
    if (!selectedCategoryId) {
      alert('Por favor, selecione uma categoria.');
      return;
    }
    if (!description || !address || !desiredDate) {
      alert('Por favor, preencha a descrição, localização e a data desejada.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find category name for title or use a generic one
      const categoryName = categories.find(c => c.id === selectedCategoryId)?.name || 'Serviço';
      const fullDescription = `${description}\n\n📅 Preferência de Horário: ${desiredDate.split('-').reverse().join('/')} às ${desiredTime}`;

      const { error } = await supabase
        .from('service_requests')
        .insert({
          client_id: user.id,
          category_id: selectedCategoryId,
          provider_id: params?.providerId || null,
          title: `Orçamento para ${categoryName}`,
          description: fullDescription,
          address,
          status: 'open'
        });

      if (error) throw error;

      // Clear draft on success
      localStorage.removeItem('draft_service_request');

      onNavigate('serviceConfirmation', {
        categoryName,
        providerName: params?.providerName || 'Aguardando Atribuição',
        date: desiredDate ? desiredDate.split('-').reverse().join('/') : 'Em breve'
      });
    } catch (err) {
      console.error(err);
      alert('Erro ao criar solicitação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (photos.length + files.length > 5) {
      alert('Máximo de 5 fotos permitidas.');
      return;
    }

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
           setPhotos(prev => {
             const newPhotos = [...prev, ev.target!.result as string];
             return newPhotos.slice(0, 5); // Ensure max 5
           });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-white dark:bg-slate-900 shadow-xl overflow-x-hidden font-display text-slate-900 dark:text-slate-100 antialiased">
      {/* TopAppBar */}
      <div className="flex items-center bg-white dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <button
          onClick={() => onNavigate('home')}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            
            {/* Left Column: Core Info */}
            <div className="space-y-8">
              {/* Section: Category */}
              <section>
                <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight mb-4">Qual a categoria do serviço?</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.length === 0 && (
                     <p className="text-sm text-slate-500">Nenhuma categoria correspondente encontrada.</p>
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
              <section>
                <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight mb-4">Com o que você precisa de ajuda?</h3>
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col w-full">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="form-input flex w-full resize-none overflow-hidden rounded-xl text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary min-h-[160px] md:min-h-[224px] placeholder:text-slate-400 p-4 font-normal leading-normal"
                      placeholder="Descreva o serviço em detalhes (ex: Preciso de um encanador para consertar uma torneira vazando na cozinha...)"
                    ></textarea>
                  </label>
                </div>
              </section>
            </div>

            {/* Right Column: Time, Location, Media */}
            <div className="space-y-8">
              {/* Section: Schedule (Date Picker) */}
              <section className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight mb-4">Data Desejada</h3>
                  <div className="relative">
                    <input
                      type="date"
                      value={desiredDate}
                      onChange={(e) => setDesiredDate(e.target.value)}
                      className="form-input w-full p-4 flex items-center h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight mb-4">Horário Preferencial</h3>
                  <div className="relative">
                    <input
                      type="time"
                      value={desiredTime}
                      onChange={(e) => setDesiredTime(e.target.value)}
                      className="form-input w-full p-4 flex items-center h-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </section>

              {/* Section: Address */}
              <section>
                <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight mb-4">Localização</h3>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">location_on</span>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Informe o endereço do serviço"
                    className="form-input w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <p className="text-slate-400 text-xs mt-2 font-medium"><span className="material-symbols-outlined text-[14px] align-middle mr-1">info</span>O endereço exato só será visível ao prestador.</p>
              </section>

              {/* Section: Photos */}
              <section>
                <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight mb-4">Adicionar Fotos (Opcional)</h3>
                <div className="flex flex-wrap gap-4">
                  {photos.length < 5 && (
                    <label className="size-24 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary cursor-pointer transition-colors group bg-slate-50 dark:bg-slate-800/50">
                      <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">add_a_photo</span>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-primary mt-1 uppercase transition-colors">Enviar</span>
                      <input type="file" accept="image/png, image/jpeg" className="hidden" multiple onChange={handlePhotoUpload} />
                    </label>
                  )}

                  {photos.map((photoUrl, idx) => (
                    <div key={idx} className="size-24 rounded-xl overflow-hidden relative group border border-slate-200 dark:border-slate-700">
                      <img className="w-full h-full object-cover" src={photoUrl} alt={`Photo ${idx + 1}`} />
                      <button 
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 size-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-slate-400 text-xs mt-2 font-medium">Máximo de 5 fotos. Formato JPG ou PNG.</p>
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
          className="w-full max-w-7xl mx-auto bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-70 disabled:hover:bg-primary"
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
