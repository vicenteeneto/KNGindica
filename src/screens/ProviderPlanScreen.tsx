import React, { useState } from 'react';
import { NavigationProps } from '../types';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';

type PlanType = 'basic' | 'plus';

const PLANS = [
  {
    id: 'basic' as PlanType,
    name: 'Prestador FREE',
    subtitle: 'Plano gratuito para começar',
    price: 'Grátis',
    period: '',
    icon: 'person',
    color: 'slate',
    features: [
      { text: 'Cadastro e perfil profissional', active: true },
      { text: 'Fotos e descrição dos serviços', active: true },
      { text: 'Recebimento de solicitações', active: true },
      { text: 'Pagamento Seguro (Garantia KNG)', active: true },
      { text: 'Taxa de 5% por serviço com garantia', active: true },
      { text: 'Destaque nas listagens', active: false },
      { text: 'Prioridade no recebimento', active: false },
      { text: 'Selo Premium no perfil', active: false },
    ],
    cta: 'Plano Atual',
    recommended: false,
  },
  {
    id: 'plus' as PlanType,
    name: 'Prestador PREMIUM',
    subtitle: 'Mais visibilidade e resultados',
    price: 'R$ 39,90',
    period: '/mês',
    icon: 'verified',
    color: 'primary',
    features: [
      { text: 'ISENÇÃO TOTAL de taxas por serviço', active: true },
      { text: 'Destaque máximo nas listagens', active: true },
      { text: 'Selo Premium no perfil', active: true },
      { text: 'Liberação de avaliações de clientes', active: true },
      { text: 'Prioridade total em solicitações', active: true },
      { text: 'Notificação antecipada de serviços', active: true },
      { text: 'Maior exposição na plataforma', active: true },
      { text: 'Suporte prioritário', active: true },
    ],
    cta: 'Assinar Premium',
    recommended: true,
  },
];

export default function ProviderPlanScreen({ onNavigate }: NavigationProps) {
  const { user, profile, refreshProfile } = useAuth();
  const currentPlan = (profile as any)?.plan_type || 'basic';
  const [loading, setLoading] = useState<PlanType | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSelectPlan = async (planId: PlanType) => {
    if (!user) return;
    if (planId === currentPlan) { onNavigate('dashboard'); return; }
    setLoading(planId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ plan_type: planId })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      showToast(
        planId === 'plus'
          ? '🎉 Bem-vindo ao Premium! Agora você tem visibilidade máxima.'
          : 'Plano atualizado para Free.',
        'success'
      );
      setTimeout(() => onNavigate('dashboard'), 2000);
    } catch (err: any) {
      showToast('Erro ao atualizar plano: ' + err.message, 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-background-light dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[500] flex items-start gap-3 w-[90vw] max-w-sm px-4 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md
          animate-[slideInDown_0.35s_ease-out]
          ${toast.type === 'success'
            ? 'bg-gradient-to-br from-emerald-500/90 to-emerald-700/90 border-emerald-400/30 text-white'
            : 'bg-gradient-to-br from-red-500/90 to-red-700/90 border-red-400/30 text-white'
          }`}
        >
          <span className="material-symbols-outlined text-2xl mt-0.5 shrink-0">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <p className="text-sm flex-1">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <nav className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 flex items-center shadow-sm">
        <button onClick={() => onNavigate('dashboard')} className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="ml-2 text-base font-bold tracking-tight flex-1 text-center">Escolha seu Plano</h1>
        <div className="w-8" />
      </nav>

      <main className="flex-grow px-4 py-6 max-w-lg mx-auto w-full">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full mb-3">
            <span className="material-symbols-outlined text-[14px]">bolt</span>
            Plano atual: <span className="capitalize">{currentPlan === 'plus' ? 'Premium ✨' : 'Free'}</span>
          </div>
          <h2 className="text-2xl font-bold leading-tight">Cresça mais com o Alvo</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Escolha o plano que melhor se encaixa no seu negócio.</p>
        </div>

        {/* Cards */}
        <div className="space-y-4">
          {PLANS.map(plan => {
            const isActive = currentPlan === plan.id;
            const isLoading = loading === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl overflow-hidden border-2 transition-all
                  ${plan.recommended
                    ? 'border-primary shadow-lg shadow-primary/15'
                    : 'border-slate-200 dark:border-slate-700 shadow-sm'
                  }
                  ${isActive ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}
                  bg-white dark:bg-slate-800
                `}
              >
                {/* Badge topo */}
                {plan.recommended && (
                  <div className="bg-gradient-to-r from-primary to-blue-500 py-1.5 text-center">
                    <span className="text-[10px] font-bold text-white tracking-widest">⭐ Recomendado</span>
                  </div>
                )}
                {isActive && (
                  <div className="bg-emerald-500 py-1 text-center">
                    <span className="text-[10px] font-bold text-white tracking-widest">✓ Seu plano atual</span>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{plan.subtitle}</p>
                    </div>
                    <span className={`material-symbols-outlined text-2xl ${plan.recommended ? 'text-primary' : 'text-slate-400'}`}>
                      {plan.icon}
                    </span>
                  </div>

                  <div className="mb-5 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900 dark:text-white">{plan.price}</span>
                    <span className="text-sm text-slate-400">{plan.period}</span>
                  </div>

                  <ul className="space-y-2.5 mb-5">
                    {plan.features.map((f, i) => (
                      <li key={i} className={`flex items-start gap-2.5 text-sm ${f.active ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600'}`}>
                        <span className={`material-symbols-outlined text-[16px] shrink-0 mt-0.5 ${f.active ? 'text-primary' : 'text-slate-300 dark:text-slate-600'}`}
                          style={f.active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                          {f.active ? 'check_circle' : 'cancel'}
                        </span>
                        <span className={!f.active ? 'line-through opacity-60' : ''}>{f.text}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={!!loading}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2
                      ${plan.recommended
                        ? 'bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20'
                        : 'border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }
                      ${isActive ? 'opacity-70 cursor-default' : ''}
                    `}
                  >
                    {isLoading
                      ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                      : isActive ? '✓ Plano ativo' : plan.cta
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Como funciona */}
        <div className="mt-12 mb-8 bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">info</span>
            Como funciona a KNGindica
          </h3>
          
          <div className="space-y-6 text-sm">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500 text-sm">link</span>
                1. Conexão livre (gratuita)
              </h4>
              <p className="text-slate-600 dark:text-slate-400">
                Cliente e prestador podem conversar livremente e combinar o pagamento por fora. 
                <span className="block mt-1 font-medium text-amber-600 dark:text-amber-400 italic">
                  * Não há garantia da plataforma nesse formato.
                </span>
              </p>
            </div>

            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">beenhere</span>
                2. Serviço com garantia (recomendado)
              </h4>
              <p className="text-slate-600 dark:text-slate-400">
                O pagamento é feito pela plataforma. O valor fica retido e só é liberado ao prestador após a conclusão. 
                Oferece segurança total e intermediação em caso de imprevistos.
              </p>
              
              <div className="mt-4 pt-4 border-t border-primary/10 grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold mb-1">Taxa Cliente</span>
                  <span className="font-bold text-slate-900 dark:text-white">R$ 9,90</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold mb-1">Taxa Prestador</span>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-white">5% (Free)</span>
                    <span className="text-emerald-500 font-bold">Grátis (Premium)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-6 px-4 pb-8">
          Ao selecionar um plano, você concorda com nossos Termos de Serviço para prestadores.
        </p>
      </main>
    </div>
  );
}
