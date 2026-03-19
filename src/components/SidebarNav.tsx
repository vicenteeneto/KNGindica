import React from 'react';
import { NavigationProps, Screen } from '../types';
import { useNotifications } from '../NotificationContext';
import { useAuth } from '../AuthContext';

interface SidebarNavProps extends NavigationProps {
  currentScreen: Screen;
  role?: 'client' | 'provider' | 'admin' | null;
}

export default function SidebarNav({ onNavigate, currentScreen, role }: SidebarNavProps) {
  const { unreadNotifications, unreadMessages } = useNotifications();
  const { user } = useAuth();

  const navItems = [
    { id: 'home', icon: 'home', label: 'Início', screen: 'home' as Screen },
    ...(role === 'provider' ? [
      { id: 'dashboard', icon: 'pie_chart', label: 'Painel', screen: 'dashboard' as Screen },
      { id: 'providerRequests', icon: 'assignment', label: 'Serviços', screen: 'providerRequests' as Screen },
    ] : [
      { id: 'myRequests', icon: 'assignment', label: 'Pedidos', screen: 'myRequests' as Screen },
    ]),
    { id: 'chatList', icon: 'chat', label: 'Chat', screen: 'chatList' as Screen, badge: unreadMessages },
    { id: 'notifications', icon: 'notifications', label: 'Avisos', screen: 'notifications' as Screen, badge: unreadNotifications },
    { 
      id: 'profile', 
      icon: 'person', 
      label: 'Perfil', 
      screen: (role === 'provider' ? 'profile' : 'userProfile') as Screen,
      params: role === 'provider' ? { professionalId: user?.id } : undefined
    },
    ...(role === 'admin' ? [
      { id: 'adminDashboard', icon: 'admin_panel_settings', label: 'Admin', screen: 'adminDashboard' as Screen },
    ] : []),
  ];

  return (
    <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-white/10 flex-col items-center py-8 z-50 shadow-[8px_0_30px_rgb(0,0,0,0.04)]">
      {/* App Logo/Icon */}
      <div 
        className="mb-10 cursor-pointer group"
        onClick={() => onNavigate('home')}
      >
        <div className="size-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-white text-3xl font-bold">bolt</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        {navItems.map((item) => {
          const isActive = currentScreen === item.screen;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.screen, item.params)}
              className={`flex flex-col items-center justify-center gap-1 group relative p-3 rounded-2xl transition-all ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={item.label}
            >
              <span 
                className={`material-symbols-outlined text-[26px] transition-transform group-hover:scale-110 ${isActive ? 'filled' : ''}`}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-2 right-2 size-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}

              {/* Tooltip on hover if collapsed, but user asked for sidebar like the photo which is thin */}
              <span className="text-[9px] font-bold uppercase tracking-tight opacity-0 group-hover:opacity-100 transition-opacity absolute -right-1 translate-x-full bg-slate-900 text-white px-2 py-1 rounded text-nowrap pointer-events-none z-50">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Settings or Theme toggle at bottom */}
      <div className="mt-auto">
        <button
          onClick={() => onNavigate('userProfile')}
          className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border-2 border-transparent hover:border-primary/20"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </div>
    </nav>
  );
}
