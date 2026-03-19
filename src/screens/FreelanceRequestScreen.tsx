import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { parseCurrency, maskCurrency } from '../lib/formatters';

export default function FreelanceRequestScreen({ onNavigate }: NavigationProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    category_id: ''
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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert("Você precisa estar logado.");
    if (!formData.category_id) return alert("Por favor, selecione uma categoria.");

    setSending(true);
    try {
      const { data, error } = await supabase
        .from('freelance_orders')
        .insert([{
          client_id: user.id,
          title: formData.title,
          description: formData.description,
          budget: parseCurrency(formData.budget),
          category_id: formData.category_id,
          status: 'open'
        }])
        .select()
        .single();

      if (error) throw error;

      alert("Ordem publicada com sucesso! Os prestadores serão notificados.");
      onNavigate('home');
    } catch (err: any) {
      alert("Erro ao publicar: " + err.message);
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
