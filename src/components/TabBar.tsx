import React from 'react';

export interface TabItem<T extends string = string> {
  key: T;
  label: string;
  badge?: number;
}

interface TabBarProps<T extends string = string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
  /** 'dark'  → telas de dashboard (fundo preto/slate-900)
   *  'light' → telas de conteúdo (fundo branco/slate-50) */
  variant?: 'dark' | 'light';
  className?: string;
}

/**
 * TabBar — componente unificado de abas para todo o sistema KNGindica.
 *
 * Regras de design:
 * - Mobile  : h-8 (32px), text-[11px], px-3 — scroll horizontal oculto (arraste com o dedo)
 * - Desktop : h-7 (28px), text-[10px], px-2 — sem scrollbar, todos os tabs cabem na tela
 * - Formato pill (rounded-full)
 * - Ativo: bg-primary text-white
 * - Inativo: fundo sutil + texto cinza
 */
export function TabBar<T extends string = string>({
  tabs,
  active,
  onChange,
  variant = 'dark',
  className = '',
}: TabBarProps<T>) {
  const containerBase =
    variant === 'dark'
      ? 'bg-slate-900/80 backdrop-blur-md border-b border-white/5'
      : 'bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-white/5';

  const inactiveClass =
    variant === 'dark'
      ? 'bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'
      : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-200';

  return (
    <div className={`${containerBase} px-2 py-1 ${className}`}>
      {/*
        Mobile  : scroll horizontal por toque (sem barra visível)
        Desktop : overflow-x-hidden — os botões menores (lg:) cabem sem precisar rolar
        style touch-action: pan-x → garante que o arraste horizontal funciona no iOS/Android
      */}
      <div
        className="flex gap-1 overflow-x-auto lg:overflow-x-hidden no-scrollbar"
        style={{ touchAction: 'pan-x', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`
                h-8 lg:h-7
                shrink-0 lg:flex-1
                flex items-center justify-center gap-1
                px-3 lg:px-2
                rounded-full
                text-[11px] lg:text-[10px]
                font-semibold
                transition-all duration-150
                whitespace-nowrap
                ${isActive
                  ? 'bg-primary text-white shadow-sm shadow-primary/30'
                  : inactiveClass
                }
              `}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`
                    inline-flex items-center justify-center
                    min-w-[14px] h-3.5 px-1 rounded-full text-[8px] font-black
                    ${isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-primary/20 text-primary'
                    }
                  `}
                >
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TabBar;
