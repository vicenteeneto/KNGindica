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
    <div className="w-full bg-black min-h-screen flex flex-col font-display text-white antialiased overflow-x-hidden">
      {/* Header - Premium Dark */}
      <header className="bg-black/90 backdrop-blur-md border-b border-white/5 p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <button onClick={() => onNavigate('back')} className="text-primary hover:bg-white/10 p-1 rounded-full transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-black italic uppercase tracking-tighter">Minha Lista</h1>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24">
        {loading ? (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-6 max-w-7xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="size-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
               <span className="material-symbols-outlined text-4xl text-gray-700">favorite_border</span>
            </div>
            <h3 className="text-lg font-black uppercase tracking-widest italic mb-2">Sua lista está vazia</h3>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-10">Comece a salvar seus profissionais favoritos <br/>para encontrá-los aqui rapidamente.</p>
            <button 
              onClick={() => onNavigate('home')}
              className="bg-primary text-white px-10 py-4 rounded-xl font-black italic tracking-tighter shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm"
            >
              EXPLORAR CATÁLOGO
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-6 max-w-7xl mx-auto">
            {favorites.map((fav) => {
              const provider = fav.profiles;
              return (
                <div 
                  key={fav.id}
                  onClick={() => onNavigate('profile', { professionalId: provider.id })}
                  className="group relative cursor-pointer"
                >
                  <div className="aspect-[2/3] lg:aspect-video rounded-md lg:rounded-2xl overflow-hidden bg-white/5 border border-white/5 transition-all duration-300 lg:group-hover:scale-110 lg:group-hover:z-50 lg:group-hover:ring-4 ring-primary/40 shadow-2xl">
                    <img 
                      src={provider.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      alt={provider.full_name}
                    />
                    
                    {/* Dark Gradient Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-1.5 md:p-3 bg-gradient-to-t from-black via-black/40 to-transparent">
                      <h4 className="text-[9px] md:text-sm font-black text-white leading-tight truncate">
                         {provider.full_name?.toUpperCase()}
                      </h4>
                      <p className="text-[7px] md:text-[10px] font-bold text-primary italic uppercase tracking-tighter truncate">
                         {provider.categories?.[0] || 'Profissional'}
                      </p>
                    </div>

                    {/* Unfav Button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(fav.id);
                      }}
                      className="absolute top-1 right-1 md:top-2 md:right-2 size-6 md:size-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-red-500 border border-white/10 hover:bg-red-500 hover:text-white transition-all shadow-xl"
                      title="Remover"
                    >
                      <span className="material-symbols-outlined !text-sm md:!text-lg filled">favorite</span>
                    </button>
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
