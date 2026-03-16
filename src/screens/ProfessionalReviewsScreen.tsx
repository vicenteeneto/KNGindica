import React, { useEffect, useState } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';

interface ProfessionalReviewsProps extends NavigationProps {
  params?: any;
}

export default function ProfessionalReviewsScreen({ onNavigate, params }: ProfessionalReviewsProps) {
  const professionalId = params?.professionalId || '1';
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState({
    average: 4.9,
    total: 128,
    distribution: { 5: 115, 4: 8, 3: 3, 2: 1, 1: 1 }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (professionalId.includes('-')) {
      const fetchReviews = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('reviews')
          .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
          .eq('provider_id', professionalId)
          .order('created_at', { ascending: false });

        if (data && !error && data.length > 0) {
          setReviews(data);
          const sum = data.reduce((acc, r) => acc + r.rating, 0);
          const avg = sum / data.length;
          const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
          data.forEach(r => {
            if (dist[r.rating as keyof typeof dist] !== undefined) {
              dist[r.rating as keyof typeof dist]++;
            }
          });
          setStats({
            average: Number(avg.toFixed(1)),
            total: data.length,
            distribution: dist as any
          });
        } else if (data && data.length === 0) {
          setReviews([]);
          setStats({ average: 0, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
        }
        setLoading(false);
      };
      fetchReviews();
    }
  }, [professionalId]);

  return (
    <div className="w-full bg-white dark:bg-slate-900 min-h-screen shadow-xl flex flex-col font-display text-slate-900 dark:text-slate-100 antialiased">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center p-4 gap-4 max-w-7xl mx-auto w-full">
          <button
            onClick={() => onNavigate('profile', { professionalId })}
            className="flex items-center justify-center size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight">Avaliações</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto w-full">

          {/* General Stats Section */}
          <section className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col md:flex-row gap-8 items-start max-w-2xl mx-auto lg:mx-0">
              {/* Note / Average */}
              <div className="flex flex-col items-center justify-center min-w-[100px] md:w-1/3">
                <p className="text-6xl font-black text-slate-900 dark:text-white leading-none">{stats.average > 0 ? stats.average.toFixed(1) : '0'}</p>
                <div className="flex gap-0.5 my-2 text-primary">
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} className="material-symbols-outlined" style={{ fontVariationSettings: `\'FILL\' ${stats.average >= star - 0.5 ? 1 : 0}` }}>
                      {stats.average >= star ? 'star' : stats.average >= star - 0.5 ? 'star_half' : 'star'}
                    </span>
                  ))}
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{stats.total} avaliações</p>
              </div>

              {/* Progress Bars */}
              <div className="flex-1 w-full space-y-3">
                {[5, 4, 3, 2, 1].map((star) => {
                  const percent = stats.total > 0 ? Math.round((stats.distribution[star as keyof typeof stats.distribution] / stats.total) * 100) : 0;
                  return (
                    <div key={star} className="grid grid-cols-[20px_1fr_40px] items-center gap-x-3">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{star}</span>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                      </div>
                      <span className="text-xs font-medium text-slate-500 text-right">{percent}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Comments List Section */}
          <section className="p-4 space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold">Comentários recentes</h3>
              <button
                onClick={() => alert('Abrir modal de filtro de avaliações (por classificação, data, etc)')}
                className="text-primary text-sm font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                Filtrar <span className="material-symbols-outlined text-sm">tune</span>
              </button>
            </div>

            <div className="space-y-8">

              {loading ? (
                <div className="flex justify-center p-8 border-t border-slate-100 dark:border-slate-800">
                  <span className="material-symbols-outlined animate-spin text-4xl text-slate-300">progress_activity</span>
                </div>
              ) : reviews.length > 0 ? (
                reviews.map((review, index) => (
                  <div key={review.id} className={`flex flex-col gap-3 group bg-white dark:bg-slate-900 ${index > 0 ? 'border-t border-slate-100 dark:border-slate-800 pt-8' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          className="size-12 rounded-full object-cover border-2 border-primary/10"
                          alt={`Foto de perfil de ${review.reviewer?.full_name}`}
                          src={review.reviewer?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{review.reviewer?.full_name || 'Usuário'}</p>
                          <p className="text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString()} • Avaliação validada</p>
                        </div>
                      </div>
                      <div className="flex text-primary">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className="material-symbols-outlined text-lg" style={{ fontVariationSettings: `\'FILL\' ${review.rating >= star ? 1 : 0}` }}>
                            star
                          </span>
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{review.comment}</p>
                    )}
                    <div className="flex gap-6 mt-2">
                      <button
                        onClick={() => { }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm">thumb_up</span> Útil (0)
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                professionalId.includes('-') && (
                  <div className="text-center py-10 text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">reviews</span>
                    <p>Nenhuma avaliação recebida ainda.</p>
                  </div>
                )
              )}

              {/* Fallback Mock Comments for UI testing without UUID */}
              {!professionalId.includes('-') && (
                <>
                  {/* Commment 1 Mock */}
                  <div className="flex flex-col gap-3 group bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          className="size-12 rounded-full object-cover border-2 border-primary/10"
                          alt="Foto de perfil de Ana Silva"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAH_suqoQIXTbTnDeNMJAsx9OiBaLpt35pUG7W4TUvy3kP-Emni_whF9MFdTH-HTsMwrNBdOTlOcq3fugwZOAvoyJUlpC1g6sQJGec5z48pk4JEfn0pxhl1jvg6kXub7OF4mxLknXqnKi9erFbthRv20EzgI4nZ3uTfdULv0mYUwcg6ZQGGXEffOWhVtHdsTOrXNu9KfKA5fLcE-7DW4zrvMrNguZi2ZtF4oTnwH_wkTdEX51FEYvcMwCOeB-GFCdBw1zqs2ZjzXMI"
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">Ana Silva</p>
                          <p className="text-xs text-slate-500">2 dias atrás • Pintura Residencial</p>
                        </div>
                      </div>
                      <div className="flex text-primary">
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      </div>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">Trabalho excelente, muito pontual! Recomendo fortemente para quem busca qualidade e capricho nos detalhes.</p>
                    <div className="flex gap-6 mt-2">
                      <button className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors active:scale-95">
                        <span className="material-symbols-outlined text-sm">thumb_up</span> Útil (12)
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {stats.total > 0 && (
              <button
                onClick={() => { }}
                className="w-full py-4 mt-8 border-2 border-primary/20 bg-primary/5 text-primary font-bold rounded-xl hover:bg-primary/10 active:scale-[0.98] transition-all"
              >
                Ver listagem completa
              </button>
            )}
          </section>
        </div>
      </main>

    </div>
  );
}
