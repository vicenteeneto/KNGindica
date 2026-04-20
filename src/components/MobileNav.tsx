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
    <nav className="lg:hidden w-full bg-black border-t border-white/5 px-2 pt-2 pb-6 flex items-center justify-around z-50">
      {navItems.map((item) => {
        const isActive = currentScreen === item.screen;
        const badgeValue = item.badge || 0;
        
        return (
          <button 
            key={item.id}
            onClick={() => onNavigate(item.screen)} 
            className={`flex flex-1 flex-col items-center justify-center gap-1 transition-all relative ${isActive ? 'text-white' : 'text-zinc-500 hover:text-gray-300'}`}
          >
            <span className="material-symbols-outlined text-[24px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
            <span className={`text-[9px] font-medium leading-normal whitespace-nowrap ${isActive ? 'text-white font-bold' : 'text-zinc-500'}`}>{item.label}</span>
            
            {badgeValue > 0 && (
              <span className="absolute top-0 right-[20%] size-3.5 bg-red-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-black">
                {badgeValue > 9 ? '9+' : badgeValue}
              </span>
            )}
            
            {/* Active Indicator (Optional - Netflix sometimes uses a dot or nothing) */}
            {isActive && (
              <span className="absolute -bottom-1 size-1 bg-primary rounded-full md:hidden"></span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
