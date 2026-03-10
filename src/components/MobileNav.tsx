import React from 'react';
import { NavigationProps, Screen } from '../types';

interface MobileNavProps extends NavigationProps {
  currentScreen: Screen;
}

export default function MobileNav({ onNavigate, currentScreen }: MobileNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 px-4 py-2 flex items-center justify-around z-50">
      <button 
        onClick={() => onNavigate('home')} 
        className={`flex flex-1 flex-col items-center justify-end gap-1 group transition-colors ${currentScreen === 'home' ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
      >
        <span className="material-symbols-outlined text-[24px]">home</span>
        <span className="text-[10px] font-medium leading-normal">Início</span>
      </button>
      
      <button
        onClick={() => onNavigate('categories')}
        className={`flex flex-1 flex-col items-center justify-end gap-1 group transition-colors ${currentScreen === 'categories' ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}
      >
        <span className="material-symbols-outlined text-[24px]" style={currentScreen === 'categories' ? { fontVariationSettings: "'FILL' 1" } : {}}>category</span>
        <span className="text-[10px] font-medium leading-normal">Categorias</span>
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
