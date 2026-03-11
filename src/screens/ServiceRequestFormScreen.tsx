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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('service_categories').select('id, name').order('name');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  const handleSendRequest = async () => {
    if (!user) {
      alert('Você precisa estar logado para fazer um pedido.');
      return;
    }
    if (!selectedCategoryId) {
      alert('Por favor, selecione uma categoria.');
      return;
    }
    if (!description || !address) {
      alert('Por favor, preencha a descrição e o endereço.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find category name for title or use a generic one
      const categoryName = categories.find(c => c.id === selectedCategoryId)?.name || 'Serviço';

      const { error } = await supabase
        .from('service_requests')
        .insert({
          client_id: user.id,
          category_id: selectedCategoryId,
          provider_id: params?.providerId || null,
          title: `Orçamento para ${categoryName}`,
          description,
          address,
          status: 'open'
        });

      if (error) throw error;

      onNavigate('serviceConfirmation');
    } catch (err) {
      console.error(err);
      alert('Erro ao criar solicitação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 shadow-xl border-x border-slate-100 dark:border-slate-800 min-h-screen flex flex-col font-display text-slate-900 dark:text-slate-100 antialiased">
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

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-8">
          
          {params?.providerName && (
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">person</span>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Solicitando orçamento direto para:</p>
                <p className="font-bold text-slate-900 dark:text-slate-100">{params.providerName}</p>
              </div>
            </div>
          )}

          {/* Section: Category */}
          <section>
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight mb-4">Qual a categoria do serviço?</h3>
            <div className="flex flex-wrap gap-2">
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
                  className="form-input flex w-full resize-none overflow-hidden rounded-xl text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary min-h-[144px] placeholder:text-slate-400 p-4 font-normal leading-normal"
                  placeholder="Descreva o serviço em detalhes (ex: Preciso de um encanador para consertar uma torneira vazando na cozinha...)"
                ></textarea>
              </label>
            </div>
          </section>

          {/* Section: Schedule (Date Picker) */}
          <section>
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight mb-4">Data Desejada</h3>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <button className="text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-full transition-colors">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <p className="text-slate-900 dark:text-slate-100 font-bold">Outubro 2023</p>
                <button className="text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-full transition-colors">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
              <div className="grid grid-cols-7 text-center mb-2 gap-1">
                <p className="text-slate-400 text-xs font-bold uppercase py-2">D</p>
                <p className="text-slate-400 text-xs font-bold uppercase py-2">S</p>
                <p className="text-slate-400 text-xs font-bold uppercase py-2">T</p>
                <p className="text-slate-400 text-xs font-bold uppercase py-2">Q</p>
                <p className="text-slate-400 text-xs font-bold uppercase py-2">Q</p>
                <p className="text-slate-400 text-xs font-bold uppercase py-2">S</p>
                <p className="text-slate-400 text-xs font-bold uppercase py-2">S</p>

                {/* Calendar Grid Mockup */}
                <div className="h-10"></div><div className="h-10"></div><div className="h-10"></div>
                <button className="h-10 w-full flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium">1</button>
                <button className="h-10 w-full flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium">2</button>
                <button className="h-10 w-full flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium">3</button>
                <button className="h-10 w-full flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium">4</button>
                <button className="h-10 w-full flex items-center justify-center rounded-lg bg-primary text-white font-bold shadow-md shadow-primary/20">5</button>
                <button className="h-10 w-full flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium">6</button>
                <button className="h-10 w-full flex items-center justify-center rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium">7</button>
              </div>
            </div>
          </section>

          {/* Section: Time Picker */}
          <section>
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight mb-4">Horário Preferencial</h3>
            <div className="grid grid-cols-3 gap-3">
              <button className="py-3 px-4 rounded-xl border border-primary bg-primary/10 text-primary font-semibold text-sm transition-colors">Manhã</button>
              <button className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium text-sm hover:border-primary hover:text-primary transition-colors">Tarde</button>
              <button className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium text-sm hover:border-primary hover:text-primary transition-colors">Noite</button>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <label className="flex-1">
                <input
                  type="time"
                  defaultValue="09:00"
                  className="form-input w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-primary focus:border-primary"
                />
              </label>
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
                className="form-input w-full pl-12 pr-4 py-4 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="mt-4 h-40 w-full rounded-xl overflow-hidden relative bg-slate-200 dark:bg-slate-800">
              <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_a-iVa50Swnn6R8ohMQX5LmYtvZQo14-uYMvWtzX5HytfHkdTBA3lCzlB5m9Rnb9ZjlKrp1qOruZa0kEnrd4lYLKlN3Cp6mY4e8lOzP3H29I87EcKwwCV17acf3Th0F7nUFS0_R7BNjjv5Qoa59bxkayG0zKzcTqdntXJOZAnY02myOtsu2XerUM0nDm0rQSwm3wL3MScR7l6hWTTF6KeTMigiV4v_BGsUMM8B6eJacl6j7-ytwR-yVPdwEHHL5_7H9ZaUDahyks" alt="Map" />
              <div className="absolute inset-0 bg-primary/10 pointer-events-none"></div>
            </div>
          </section>

          {/* Section: Photos */}
          <section>
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight mb-4">Adicionar Fotos</h3>
            <div className="flex flex-wrap gap-4">
              <label className="size-24 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary dark:hover:border-primary cursor-pointer transition-colors group bg-slate-50 dark:bg-slate-800/50">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">add_a_photo</span>
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-primary mt-1 uppercase transition-colors">Enviar</span>
                <input type="file" className="hidden" multiple />
              </label>

              <div className="size-24 rounded-xl overflow-hidden relative group border border-slate-200 dark:border-slate-700">
                <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAs1mnwUwOI2JjFGxDmgMws8UE22_GeSZr59sbApFWrEkQgSkdmlB6Q500YA0zcVBqeS-f6Q5P2DFP35B-IPVeEu0CieApQ42MawYcACq574_Dtsg_r9hHRnqnznOZHGC066jxJq3Ie41ngW2gHDXDEkD07ZkBAoI81cAUS6vh9333kAILgETUCpLo824r4KMQZcGJYIDZl11yifXfubsGIcLbJEm6t_URU_nX5P-iA5cdkdGkcgL_LHt0WH3DCGDil4u9h_ihJxtc" alt="Photo 1" />
                <button className="absolute top-1 right-1 size-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            </div>
            <p className="text-slate-400 text-xs mt-2 font-medium">Máximo de 5 fotos. Formato JPG ou PNG.</p>
          </section>

        </div>
      </div>

      {/* Footer: Action Button */}
      <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
        <button
          onClick={handleSendRequest}
          disabled={isSubmitting}
          className="w-full max-w-4xl mx-auto bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-70 disabled:hover:bg-primary"
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
