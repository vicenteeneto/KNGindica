import React from 'react';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';

interface ProviderHeaderProps {
  title: string;
  onBack: () => void;
  onNavigate: (screen: string, params?: any) => void;
  rightActions?: React.ReactNode;
  showAvatar?: boolean;
}

export const ProviderHeader: React.FC<ProviderHeaderProps> = ({ 
  title, 
  onBack, 
  onNavigate, 
  rightActions,
  showAvatar = true 
}) => {
  const { user, profile } = useAuth();
  const { unreadMessages, unreadNotifications } = useNotifications();

  return (
    <header className="relative w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-slate-900 rounded-full transition-colors text-slate-400 hover:text-white shrink-0"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          
          {showAvatar && (
            <div 
              className="flex size-9 shrink-0 items-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer" 
              onClick={() => onNavigate('userProfile')}
            >
              <div 
                className="bg-center bg-no-repeat aspect-square bg-cover size-full" 
                style={{ backgroundImage: `url('${profile?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}')` }}
              ></div>
            </div>
          )}

          <div className="flex flex-col ml-1 flex-1 cursor-default">
            <h2 className="text-slate-900 dark:text-slate-100 text-base font-black leading-tight tracking-tight truncate max-w-[150px] sm:max-w-none">
              {title}
            </h2>
            <div className="flex items-center gap-1">
              <span className="size-1 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic leading-none">
                Prestador
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {rightActions}
          
          {/* Default provider actions if no specific ones provided */}
          {!rightActions && (
            <div className="flex items-center gap-1">
               <button 
                onClick={() => onNavigate('chatList')} 
                className="p-2 hover:bg-slate-900 rounded-full transition-colors text-slate-400 hover:text-white relative"
              >
                <span className="material-symbols-outlined text-[22px]">forum</span>
                {unreadMessages > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-2 bg-primary rounded-full border border-slate-950 animate-pulse"></span>
                )}
              </button>
              <button 
                onClick={() => onNavigate('notifications')} 
                className="p-2 hover:bg-slate-900 rounded-full transition-colors text-slate-400 hover:text-white relative"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full border border-slate-950 animate-pulse"></span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
