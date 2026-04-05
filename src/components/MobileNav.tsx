import React from 'react';
import { NavigationProps, Screen } from '../types';
import { useNotifications } from '../NotificationContext';

interface MobileNavProps extends NavigationProps {
  currentScreen: Screen;
  role?: 'client' | 'provider' | null;
}

export default function MobileNav({ onNavigate, currentScreen, role, params }: MobileNavProps) {
  const { unreadNotifications, unreadMessages } = useNotifications();

  const navItems = role === 'provider' 
    ? [
        { id: 'dashboard', icon: 'pie_chart', label: 'Painel', screen: 'dashboard' as Screen },
        { id: 'openOrders', icon: 'gavel', label: 'Freelances', screen: 'openOrders' as Screen },
        { id: 'providerRequests', icon: 'assignment', label: 'Serviços', screen: 'providerRequests' as Screen, badge: unreadNotifications },
        { id: 'myRequests', icon: 'receipt_long', label: 'Pedidos', screen: 'myRequests' as Screen },
        { id: 'chatList', icon: 'chat', label: 'Chat', screen: 'chatList' as Screen, badge: unreadMessages }
      ]
    : [
        { id: 'home', icon: 'home', label: 'Início', screen: 'home' as Screen },
        { id: 'myFreelances', icon: 'work', label: 'Freelances', screen: 'myFreelances' as Screen },
        { id: 'myRequests', icon: 'receipt_long', label: 'Pedidos', screen: 'myRequests' as Screen },
        { id: 'chatList', icon: 'chat', label: 'Chat', screen: 'chatList' as Screen, badge: unreadMessages },
        { id: 'userProfile', icon: 'person', label: 'Perfil', screen: 'userProfile' as Screen }
      ];

  return (
    <nav className="lg:hidden w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-2 pt-2 pb-8 flex items-center justify-around z-10 shadow-[0_-8px_30px_rgb(0,0,0,0.08)]">
      {navItems.map((item) => {
        const isActive = currentScreen === item.screen;
        const badgeValue = item.badge || 0;
        
        return (
          <button 
            key={item.id}
            onClick={() => onNavigate(item.screen)} 
            className={`flex flex-1 flex-col items-center justify-end gap-1 group transition-colors relative ${isActive ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
          >
            <span className="material-symbols-outlined text-[26px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
            <span className={`text-[10px] font-medium leading-normal whitespace-nowrap mt-0.5 ${isActive ? 'text-primary' : 'text-slate-500'}`}>{item.label}</span>
            
            {badgeValue > 0 && (
              <span className="absolute top-0 right-1/4 size-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                {badgeValue > 9 ? '9+' : badgeValue}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
