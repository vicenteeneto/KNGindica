import React from 'react';
import { NavigationProps, Screen } from '../types';

interface ProviderMobileNavProps extends NavigationProps {
  currentScreen: Screen;
}

export default function ProviderMobileNav({ onNavigate, currentScreen }: ProviderMobileNavProps) {
  const getButtonClass = (isActive: boolean) =>
    `flex flex-1 flex-col items-center justify-end gap-1 ${
      isActive
        ? 'text-primary'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
    }`;

  const getIconClass = (isActive: boolean) =>
    `material-symbols-outlined text-[22px] ${isActive ? '' : ''}`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 sm:px-4 pb-4 sm:pb-6 pt-3 z-50 transition-colors">
      <div className="flex max-w-7xl mx-auto items-center justify-around h-12">
        <button
          onClick={() => onNavigate('dashboard')}
          className={getButtonClass(currentScreen === 'dashboard')}
        >
          <span className={getIconClass(currentScreen === 'dashboard')} style={currentScreen === 'dashboard' ? { fontVariationSettings: "'FILL' 1" } : {}}>pie_chart</span>
          <span className="text-[10px] sm:text-xs font-semibold leading-normal tracking-[0.015em] shrink-0">
            Visão Geral
          </span>
        </button>

        <button
          onClick={() => onNavigate('providerRequests')}
          className={getButtonClass(currentScreen === 'providerRequests')}
        >
          <span className={getIconClass(currentScreen === 'providerRequests')} style={currentScreen === 'providerRequests' ? { fontVariationSettings: "'FILL' 1" } : {}}>assignment</span>
          <span className="text-[10px] sm:text-xs font-semibold leading-normal tracking-[0.015em] shrink-0">
            Serviços
          </span>
        </button>

        <button
          onClick={() => onNavigate('providerSchedule')}
          className={getButtonClass(currentScreen === 'providerSchedule')}
        >
          <span className={getIconClass(currentScreen === 'providerSchedule')} style={currentScreen === 'providerSchedule' ? { fontVariationSettings: "'FILL' 1" } : {}}>calendar_month</span>
          <span className="text-[10px] sm:text-xs font-semibold leading-normal tracking-[0.015em] shrink-0">
            Agenda
          </span>
        </button>

        <button
          onClick={() => onNavigate('providerWallet')}
          className={getButtonClass(currentScreen === 'providerWallet')}
        >
          <span className={getIconClass(currentScreen === 'providerWallet')} style={currentScreen === 'providerWallet' ? { fontVariationSettings: "'FILL' 1" } : {}}>account_balance_wallet</span>
          <span className="text-[10px] sm:text-xs font-semibold leading-normal tracking-[0.015em] shrink-0">
            Carteira
          </span>
        </button>
        
        <button
          onClick={() => onNavigate('profile')}
          className={getButtonClass(currentScreen === 'profile')}
        >
          <span className={getIconClass(currentScreen === 'profile')} style={currentScreen === 'profile' ? { fontVariationSettings: "'FILL' 1" } : {}}>widgets</span>
          <span className="text-[10px] sm:text-xs font-semibold leading-normal tracking-[0.015em] shrink-0">
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
}
