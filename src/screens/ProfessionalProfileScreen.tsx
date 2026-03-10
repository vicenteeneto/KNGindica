import React, { useEffect, useState } from 'react';
import { NavigationProps } from '../types';
import { professionals } from '../data/mockData';
import VerifiedBadge from '../components/VerifiedBadge';
import { supabase } from '../lib/supabase';

interface ProfessionalProfileProps extends NavigationProps {
  professionalId?: string;
}

export default function ProfessionalProfileScreen({ onNavigate, professionalId }: ProfessionalProfileProps) {
  const [realReviewsCount, setRealReviewsCount] = useState<number | null>(null);
  const [realAverage, setRealAverage] = useState<number | null>(null);

  useEffect(() => {
    if (professionalId?.includes('-')) {
      const fetchStats = async () => {
        const { data } = await supabase.from('reviews').select('rating').eq('provider_id', professionalId);
        if (data && data.length > 0) {
          setRealReviewsCount(data.length);
          const sum = data.reduce((acc, r) => acc + r.rating, 0);
          setRealAverage(Number((sum / data.length).toFixed(1)));
        } else {
          setRealReviewsCount(0);
          setRealAverage(0);
        }
      };
      fetchStats();
    }
  }, [professionalId]);

  const professional = professionals.find(p => p.id === professionalId) || professionals[0];

  const displayRating = realAverage !== null ? realAverage : professional?.rating;
  const displayReviewsCount = realReviewsCount !== null ? realReviewsCount : professional?.reviews;

  if (!professional) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Profissional não encontrado.</p>
        <button onClick={() => onNavigate('home')}>Voltar</button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 min-h-screen shadow-xl flex flex-col font-display text-slate-900 dark:text-slate-100 antialiased">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center p-4 pb-2 justify-between max-w-7xl mx-auto w-full">
          <button onClick={() => onNavigate('listing')} className="text-slate-900 dark:text-slate-100 flex size-12 shrink-0 items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full justify-center transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
            Perfil do Profissional
          </h2>
          <div className="flex items-center justify-end gap-2">
            <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-transparent text-slate-900 dark:text-slate-100 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined">share</span>
            </button>
            <button onClick={() => onNavigate('home')} className="flex items-center justify-center rounded-lg h-10 w-10 bg-transparent text-slate-900 dark:text-slate-100 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Início">
              <span className="material-symbols-outlined">home</span>
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Hero Section / Gallery */}
        <div className="@container">
          <div className="@[480px]:px-4 @[480px]:py-3 md:px-0">
            <div
              className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden bg-slate-200 dark:bg-slate-800 @[480px]:rounded-xl md:rounded-none min-h-64 md:min-h-[400px] relative group"
              style={{
                backgroundImage: `url("${professional.image}")`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">
                  photo_library
                </span>
                1/4 Fotos
              </div>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex p-4 @container -mt-16 relative z-10 justify-center">
          <div className="flex w-full max-w-3xl flex-col gap-4 items-center">
            <div className="flex gap-4 flex-col items-center">
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-32 w-32 border-4 border-white dark:border-slate-900 shadow-xl"
                style={{
                  backgroundImage: `url("${professional.image}")`,
                }}
              ></div>
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-2">
                  <p className="text-slate-900 dark:text-slate-100 text-2xl font-bold leading-tight tracking-[-0.015em] text-center">
                    {professional.name}
                  </p>
                  {professional.isVerified && (
                    <VerifiedBadge className="scale-125 ml-1" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {professional.isAffiliate && (
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                      Afiliado Verificado
                    </span>
                  )}
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-base font-normal leading-normal text-center mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">
                    location_on
                  </span>
                  Rondonópolis, MT
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto w-full">
          {/* Stats */}
          <div className="flex flex-wrap gap-3 p-4">
            <div className="flex min-w-[100px] flex-1 flex-col gap-1 rounded-xl p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm text-center">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
                Serviços
              </p>
              <p className="text-slate-900 dark:text-slate-100 tracking-tight text-xl font-bold">
                {displayReviewsCount}
              </p>
            </div>
            <div className="flex min-w-[100px] flex-1 flex-col gap-1 rounded-xl p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm text-center">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
                Avaliação
              </p>
              <div className="flex items-center justify-center gap-1">
                <p className="text-slate-900 dark:text-slate-100 tracking-tight text-xl font-bold">
                  {displayRating}
                </p>
                <span className="material-symbols-outlined text-amber-400 text-sm">
                  star
                </span>
              </div>
            </div>
            <div className="flex min-w-[100px] flex-1 flex-col gap-1 rounded-xl p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm text-center">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
                Preço
              </p>
              <p className="text-slate-900 dark:text-slate-100 tracking-tight text-xl font-bold">
                R$ {professional.price}
                <span className="text-sm font-normal text-slate-500">{professional.priceUnit}</span>
              </p>
            </div>
          </div>

          {/* Bio Section */}
          <div className="px-4 py-4">
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] mb-3">
              Sobre
            </h3>
            <div className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed">
                {professional.description}
              </p>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="px-4 py-4 mb-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em]">
                Avaliações
              </h3>
              <button
                onClick={() => onNavigate('reviews')}
                className="text-primary text-sm font-bold hover:underline"
              >
                Ver Todas
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {/* Review 1 */}
              <div className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold">
                      JM
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Juliana M.
                      </p>
                      <p className="text-xs text-slate-500">2 dias atrás</p>
                    </div>
                  </div>
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className="material-symbols-outlined text-sm">
                        star
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-sm italic">
                  "Excelente profissional! Entregou exatamente o que foi prometido e com muita qualidade."
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Footer Action */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 flex justify-center z-[60]">
        <button
          onClick={() => window.open(`https://wa.me/?text=Olá ${professional.name}, vi seu perfil no app e gostaria de um orçamento.`, '_blank')}
          className="w-full max-w-2xl bg-[#25D366] hover:bg-[#20ba59] text-white py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg transition-transform active:scale-95"
        >
          <svg
            className="w-6 h-6"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"></path>
          </svg>
          Contratar via WhatsApp
        </button>
      </div>
    </div>
  );
}
