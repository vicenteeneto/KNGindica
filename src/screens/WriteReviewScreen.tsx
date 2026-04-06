import React, { useState } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';

interface WriteReviewScreenProps extends NavigationProps {
  params?: any;
}

export default function WriteReviewScreen({ onNavigate, params }: WriteReviewScreenProps) {
  const { user } = useAuth();
  const { showToast, showModal } = useNotifications();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const providerName = params?.providerName || 'Profissional';
  const providerAvatar = params?.providerAvatar || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png';
  const serviceTitle = params?.serviceTitle || 'Serviço';
  const requestId = params?.requestId;
  const isFreelance = params?.isFreelance;
  const providerId = params?.providerId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      showToast("Nota obrigatória", "Por favor, selecione uma nota de 1 a 5 estrelas.", "notification");
      return;
    }
    if (!user || !requestId || !providerId) {
      showToast("Erro de identificação", "Não foi possível identificar o pedido ou profissional.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          request_id: isFreelance ? null : requestId,
          freelance_order_id: isFreelance ? requestId : null,
          reviewer_id: user.id,
          provider_id: providerId,
          rating,
          comment: comment.trim() || null
        });

      if (error) throw error;
      showToast("Avaliação enviada", "Obrigado por seu feedback!", "success");
      onNavigate(isFreelance ? 'myFreelances' : 'myRequests');
    } catch (err) {
      console.error('Error submitting review:', err);
      showToast("Erro ao enviar", "Tente novamente mais tarde.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden">

      {/* Header */}
      <header className="flex items-center p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 max-w-none w-full lg:ml-16 pr-6 transition-all duration-300">
        <button
          onClick={() => onNavigate(params?.returnTo || (isFreelance ? 'myFreelances' : 'myRequests'))}
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">close</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight flex-1 text-center pr-10">Avaliar Serviço</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full p-4 md:p-12 flex flex-col justify-center items-center max-w-none w-full lg:ml-16 pr-6 transition-all duration-300">
        <div className="w-full max-w-xl mx-auto flex flex-col items-center sm:bg-white/80 sm:dark:bg-slate-900/80 sm:backdrop-blur-xl sm:border border-slate-200 dark:border-slate-800 sm:shadow-2xl rounded-3xl sm:p-10">

          {/* Provider Card Context */}
          <div className="flex flex-col items-center mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="size-20 rounded-full bg-slate-200 overflow-hidden mb-4 shadow-md border-4 border-white dark:border-slate-800">
              <img src={providerAvatar} alt={providerName} className="w-full h-full object-cover" />
            </div>
            <h2 className="text-xl font-bold">{providerName}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{serviceTitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-8 flex flex-col items-center">

            {/* Star Rating Interactive */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2">Sua Nota</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  >
                    <span
                      className={`material-symbols-outlined text-4xl sm:text-5xl transition-colors ${(hoveredRating || rating) >= star
                          ? 'text-amber-400'
                          : 'text-slate-300 dark:text-slate-700'
                        }`}
                      style={{ fontVariationSettings: (hoveredRating || rating) >= star ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      star
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-amber-500 h-4 mt-2 transition-opacity">
                {rating === 1 && "Péssimo"}
                {rating === 2 && "Ruim"}
                {rating === 3 && "Razoável"}
                {rating === 4 && "Muito Bom"}
                {rating === 5 && "Excelente!"}
              </p>
            </div>

            {/* Comment Field */}
            <div className="w-full space-y-2 animate-in fade-in slide-in-from-bottom-4 delay-100 fill-mode-both">
              <label htmlFor="comment" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Conte mais sobre a sua experiência (Opcional)
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Como foi o atendimento? O profissional foi pontual?"
                className="w-full h-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none shadow-sm"
              ></textarea>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={rating === 0 || isSubmitting}
              className={`w-full py-3 px-6 rounded-xl font-bold text-sm shadow-lg transition-all ${rating > 0 && !isSubmitting
                  ? 'bg-primary text-white hover:bg-primary/90 shadow-primary/30 hover:-translate-y-0.5'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                }`}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate(params?.returnTo || (isFreelance ? 'myFreelances' : 'myRequests'))}
              className="mt-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            >
              Pular por enquanto
            </button>
          </form>

        </div>
      </main>
    </div>
  );
}
