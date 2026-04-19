import React, { useState, useEffect } from 'react';
import StarRating from '../components/StarRating';

import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import VerifiedBadge from '../components/VerifiedBadge';

interface FavoritesScreenProps extends NavigationProps {
  params?: {
    returnTo?: any;
    [key: string]: any;
  };
}

export default function FavoritesScreen({ onNavigate, params }: FavoritesScreenProps) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchFavorites = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_favorites')
          .select(`
            id,
            provider_id,
            profiles!user_favorites_provider_id_fkey (
              id,
              full_name,
              avatar_url,
              categories,
              plan_type,
              is_verified
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setFavorites(data || []);
      } catch (err) {
        console.error("Erro ao carregar favoritos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  const removeFavorite = async (id: string) => {
    try {
      const { error } = await supabase.from('user_favorites').delete().eq('id', id);
      if (error) throw error;
      setFavorites(favorites.filter(fav => fav.id !== id));
    } catch (err) {
      console.error("Erro ao remover favorito:", err);
    }
  };

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-950 min-h-screen flex flex-col font-display text-slate-900 dark:text-slate-100 antialiased overflow-x-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => onNavigate('back')} className="text-slate-600 dark:text-slate-400">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold">Meus Favoritos</h1>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
          </div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
            <span className="material-symbols-outlined text-6xl mb-4">favorite_border</span>
            <p className="text-lg font-medium">Você ainda não salvou nenhum profissional.</p>
            <p className="text-sm">Clique no coração no perfil de um profissional para salvá-lo aqui.</p>
            <button 
              onClick={() => onNavigate('home')}
              className="mt-6 bg-primary text-white px-6 py-2 rounded-xl font-bold"
            >
              Explorar Profissionais
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
            {favorites.map((fav) => {
              const provider = fav.profiles;
              return (
                <div 
                  key={fav.id}
                  onClick={() => onNavigate('profile', { professionalId: provider.id })}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex gap-4 cursor-pointer group hover:border-primary transition-colors"
                >
                  <div 
                    className="size-20 rounded-xl bg-cover bg-center shrink-0 border border-slate-100 dark:border-slate-800 shadow-inner"
                    style={{ backgroundImage: `url('${provider.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}')` }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                          {provider.full_name}
                        </h3>
                        {provider.is_verified && <VerifiedBadge />}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFavorite(fav.id);
                        }}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-full transition-colors"
                        title="Remover"
                      >
                        <span className="material-symbols-outlined fill-current">favorite</span>
                      </button>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                      {provider.categories?.[0] || 'Serviços'}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded text-amber-600 dark:text-amber-400">
                        <StarRating rating={provider.rating || 5.0} size={14} maxStars={1} />
                        <span className="text-xs font-bold">{(provider.rating || 5.0).toFixed(1).replace('.', ',')}</span>
                      </div>
                      <span className="text-xs font-bold text-primary group-hover:underline">Ver Perfil</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
}
