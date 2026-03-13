import React, { useState } from 'react';
import { NavigationProps } from '../types';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';

type PlanType = 'basic' | 'plus';

const PLANS = [
  {
    id: 'basic' as PlanType,
    name: 'Prestador Free',
    subtitle: 'Ideal para quem está começando',
    price: 'R$ 0',
    period: '/mês',
    icon: 'person',
    color: 'slate',
    features: [
      { text: '10% de comissão por serviço', active: true },
      { text: 'Perfil básico de exibição', active: true },
      { text: 'Até 3 fotos no portfólio', active: true },
      { text: 'Destaque nas buscas', active: false },
      { text: 'Botão de WhatsApp direto', active: false },
      { text: 'Suporte prioritário', active: false },
    ],
    cta: 'Manter plano Free',
    recommended: false,
  },
  {
    id: 'plus' as PlanType,
    name: 'Prestador Plus',
    subtitle: 'Para quem quer escala total',
    price: 'R$ 49,90',
    period: '/mês',
    icon: 'verified',
    color: 'primary',
    features: [
      { text: '0% de comissão por serviço', active: true },
      { text: 'Perfil completo com fotos ilimitadas', active: true },
      { text: 'Visibilidade prioritária (2× mais visitas)', active: true },
      { text: 'Botão de WhatsApp direto no perfil', active: true },
      { text: 'Avaliações em destaque nos resultados', active: true },
      { text: 'Suporte prioritário 24h', active: true },
    ],
    cta: 'Assinar Plus',
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
          ? '🎉 Bem-vindo ao Plus! Agora você tem visibilidade máxima.'
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
            Plano atual: <span className="capitalize">{currentPlan === 'plus' ? 'Plus ✨' : 'Free'}</span>
          </div>
          <h2 className="text-2xl font-bold leading-tight">Cresça mais com o iService</h2>
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
                    <span className="text-[10px] font-bold text-white tracking-widest uppercase">⭐ Recomendado</span>
                  </div>
                )}
                {isActive && (
                  <div className="bg-emerald-500 py-1 text-center">
                    <span className="text-[10px] font-bold text-white tracking-widest uppercase">✓ Seu plano atual</span>
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

        <p className="text-center text-[10px] text-slate-400 mt-6 px-4 pb-8">
          Ao selecionar um plano, você concorda com nossos Termos de Serviço para prestadores.
        </p>
      </main>
    </div>
  );
}
