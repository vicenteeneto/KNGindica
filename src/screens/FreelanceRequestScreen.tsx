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
    expiresInHours: '24'
  });

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
          status: 'open',
          expires_at: expiresAt.toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      showToast(
        "Sucesso",
        "Ordem publicada com sucesso! Os prestadores profissionais serão notificados e em breve entrarão em contato.",
        "success"
      );
      onNavigate('home');
    } catch (err: any) {
      showToast("Erro ao publicar", err.message, "error");
    } finally {
      setSending(false);
    }
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

            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-slate-400">Cidade do Serviço</label>
              <CityAutocomplete
                value={formData.city}
                onChange={val => setFormData({...formData, city: val})}
                activeCities={activeCities}
                placeholder="Onde o serviço será realizado?"
                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 rounded-2xl px-5 py-4 transition-all outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-slate-400">Quanto deseja pagar? (R$)</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
                <input 
                  type="text" 
                  required
                  placeholder="0,00"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-primary/30 rounded-2xl pl-12 pr-5 py-4 transition-all outline-none font-black text-xl"
                  value={formData.budget}
                  onChange={e => {
                    const masked = maskCurrency(e.target.value);
                    setFormData({...formData, budget: masked});
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-slate-400">Duração do Leilão</label>
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

            <div>
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
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-widest"
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
