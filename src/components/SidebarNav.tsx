import React from 'react';
import { NavigationProps, Screen } from '../types';
import { useNotifications } from '../NotificationContext';
import { useAuth } from '../AuthContext';

interface SidebarNavProps extends NavigationProps {
  currentScreen: Screen;
  role?: 'client' | 'provider' | 'admin' | null;
  adminTab?: string;
  setAdminTab?: (tab: any) => void;
  adminTabs?: { id: string, icon: string, label: string }[];
}

export default function SidebarNav({ onNavigate, currentScreen, role, adminTab, setAdminTab, adminTabs }: SidebarNavProps) {
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
    <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-white/10 flex-col items-center py-6 z-50 shadow-[8px_0_30px_rgb(0,0,0,0.04)]">
      {/* App Logo/Icon */}
      <div 
        className="mb-6 cursor-pointer group"
        onClick={() => onNavigate('home')}
      >
        <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-white text-2xl font-bold">bolt</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar py-2">
        {navItems.map((item) => {
          const isActive = currentScreen === item.screen;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.screen, item.params)}
              className={`flex flex-col items-center justify-center group relative p-2 rounded-xl transition-all ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={item.label}
            >
              <span 
                className={`material-symbols-outlined text-[22px] transition-transform group-hover:scale-110 ${isActive ? 'filled' : ''}`}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1 right-1 size-3.5 bg-red-500 text-white text-[7px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}

              <span className="text-[9px] font-bold uppercase tracking-tight opacity-0 group-hover:opacity-100 transition-opacity absolute -right-1 translate-x-full bg-slate-900 text-white px-2 py-1 rounded text-nowrap pointer-events-none z-50">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Separator if Admin and extra items provided */}
        {currentScreen === 'adminDashboard' && adminTabs && (
          <>
            <div className="h-px w-8 bg-slate-200 dark:bg-slate-800 mx-auto my-2" />
            {adminTabs.map((tab) => {
              const isActive = adminTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setAdminTab && setAdminTab(tab.id)}
                  className={`flex flex-col items-center justify-center group relative p-2 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-primary/20 text-primary border border-primary/20' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={tab.label}
                >
                  <span 
                    className={`material-symbols-outlined text-[20px] transition-transform group-hover:scale-110 ${isActive ? 'filled' : ''}`}
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {tab.icon}
                  </span>
                  
                  <span className="text-[9px] font-bold uppercase tracking-tight opacity-0 group-hover:opacity-100 transition-opacity absolute -right-1 translate-x-full bg-slate-900 text-white px-2 py-1 rounded text-nowrap pointer-events-none z-50">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Settings or Theme toggle at bottom */}
      <div className="mt-auto">
        <button
          onClick={() => onNavigate('userProfile')}
          className="size-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border-2 border-transparent hover:border-primary/20"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>
      </div>
    </nav>
  );
}
