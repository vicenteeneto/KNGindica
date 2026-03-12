import React from 'react';
import { NavigationProps, Screen } from '../types';
import { useNotifications } from '../NotificationContext';

interface ProviderMobileNavProps extends NavigationProps {
  currentScreen: Screen;
}

export default function ProviderMobileNav({ onNavigate, currentScreen }: ProviderMobileNavProps) {
  const { unreadNotifications, unreadMessages } = useNotifications();

  const getButtonClass = (isActive: boolean) =>
    `flex flex-1 flex-col items-center justify-end gap-1 relative ${
      isActive
        ? 'text-primary'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
    }`;

  const getIconClass = (isActive: boolean) =>
    `material-symbols-outlined text-[20px] ${isActive ? '' : ''}`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 pb-4 pt-3 z-50 transition-colors">
      <div className="flex max-w-7xl mx-auto items-center justify-around h-12">
        <button
          onClick={() => onNavigate('dashboard')}
          className={getButtonClass(currentScreen === 'dashboard')}
        >
          <span className={getIconClass(currentScreen === 'dashboard')} style={currentScreen === 'dashboard' ? { fontVariationSettings: "'FILL' 1" } : {}}>pie_chart</span>
          <span className="text-[9px] font-semibold tracking-tight">Painel</span>
        </button>

        <button
          onClick={() => onNavigate('providerRequests')}
          className={getButtonClass(currentScreen === 'providerRequests')}
        >
          <span className={getIconClass(currentScreen === 'providerRequests')} style={currentScreen === 'providerRequests' ? { fontVariationSettings: "'FILL' 1" } : {}}>assignment</span>
          <span className="text-[9px] font-semibold tracking-tight">Serviços</span>
        </button>

        <button
          onClick={() => onNavigate('chatList')}
          className={getButtonClass(currentScreen === 'chatList')}
        >
          <span className={getIconClass(currentScreen === 'chatList')} style={currentScreen === 'chatList' ? { fontVariationSettings: "'FILL' 1" } : {}}>chat</span>
          {unreadMessages > 0 && (
            <span className="absolute top-[-5px] right-2 size-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </span>
          )}
          <span className="text-[9px] font-semibold tracking-tight">Chat</span>
        </button>

        <button
          onClick={() => onNavigate('notifications')}
          className={getButtonClass(currentScreen === 'notifications')}
        >
          <span className={getIconClass(currentScreen === 'notifications')} style={currentScreen === 'notifications' ? { fontVariationSettings: "'FILL' 1" } : {}}>notifications</span>
          {unreadNotifications > 0 && (
            <span className="absolute top-[-5px] right-2 size-4 bg-primary text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
          <span className="text-[9px] font-semibold tracking-tight">Avisos</span>
        </button>
        
        <button
          onClick={() => onNavigate('profile')}
          className={getButtonClass(currentScreen === 'profile')}
        >
          <span className={getIconClass(currentScreen === 'profile')} style={currentScreen === 'profile' ? { fontVariationSettings: "'FILL' 1" } : {}}>person</span>
          <span className="text-[9px] font-semibold tracking-tight">Perfil</span>
        </button>
      </div>
    </nav>
  );
}
