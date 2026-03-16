import React from 'react';
import { NavigationProps, Screen } from '../types';
import { useNotifications } from '../NotificationContext';

interface MobileNavProps extends NavigationProps {
  currentScreen: Screen;
  role?: 'client' | 'provider' | null;
}

export default function MobileNav({ onNavigate, currentScreen, role }: MobileNavProps) {
  const { unreadNotifications, unreadMessages } = useNotifications();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-4 pt-2 pb-[env(safe-area-inset-bottom,16px)] flex items-center justify-around z-50 shadow-[0_-8px_30px_rgb(0,0,0,0.08)]">
      <button 
        onClick={() => onNavigate('home')} 
        className={`flex flex-1 flex-col items-center justify-end gap-1 group transition-colors ${currentScreen === 'home' ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
      >
        <span className="material-symbols-outlined text-[24px]">home</span>
        <span className="text-[10px] font-medium leading-normal">Início</span>
      </button>

      {role === 'provider' && (
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-1 flex-col items-center justify-end gap-1 group transition-colors ${currentScreen === 'dashboard' ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
        >
          <span className="material-symbols-outlined text-[24px]">pie_chart</span>
          <span className="text-[10px] font-medium leading-normal">Painel</span>
        </button>
      )}
      
      <button
        onClick={() => onNavigate('chatList')}
        className={`flex flex-1 flex-col items-center justify-end gap-1 group transition-colors ${currentScreen === 'chatList' ? 'text-primary' : 'text-slate-400 hover:text-primary'} relative`}
      >
        <span className="material-symbols-outlined text-[24px]" style={currentScreen === 'chatList' ? { fontVariationSettings: "'FILL' 1" } : {}}>chat</span>
        {unreadMessages > 0 && (
          <span className="absolute top-0 right-1/4 size-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
            {unreadMessages > 9 ? '9+' : unreadMessages}
          </span>
        )}
        <span className="text-[10px] font-medium leading-normal">Chat</span>
      </button>
      
      <button
        onClick={() => onNavigate('myRequests')}
        className={`flex flex-1 flex-col items-center justify-end gap-1 group transition-colors ${currentScreen === 'myRequests' ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
      >
        <span className="material-symbols-outlined text-[24px]" style={currentScreen === 'myRequests' ? { fontVariationSettings: "'FILL' 1" } : {}}>assignment</span>
        <span className="text-[10px] font-medium leading-normal">Pedidos</span>
      </button>

      
      
      {/* Profile for final user */}
      <button
        onClick={() => onNavigate('userProfile')}
        className={`flex flex-1 flex-col items-center justify-end gap-1 group transition-colors ${(currentScreen === 'profile' || currentScreen === 'userProfile') ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
      >
        <span className="material-symbols-outlined text-[24px]">person</span>
        <span className="text-[10px] font-medium leading-normal">Perfil</span>
      </button>
    </nav>
  );
}
