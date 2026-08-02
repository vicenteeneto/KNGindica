import React from 'react';
import { useAdminDashboard } from './AdminDashboardContext';

export function ReviewsTab() {
  const {
    setActiveTab,
    handleDeleteReview,
    loading,
    reviewsList,
  } = useAdminDashboard();

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-2 font-medium">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar ao Dashboard
          </button>
          <h2 className="text-xl font-bold">Moderação de Avaliações</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie o feedback da comunidade e modere comentários</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 md:flex-none">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-xl pointer-events-none">search</span>
            <input
              className="pl-10 pr-4 py-2 netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all w-full md:w-64"
              placeholder="Buscar por termo ofensivo ou nome..."
              type="text"
            />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <p className="text-xs text-slate-500 font-medium mb-1">Média da Plataforma</p>
          <div className="flex items-center gap-2 text-orange-400">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
              {reviewsList.length > 0 ? (reviewsList.reduce((acc, curr) => acc + (curr.rating || 0), 0) / reviewsList.length).toFixed(1) : '0.0'}
            </h3>
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
          </div>
        </div>
        <div className="netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <p className="text-xs text-slate-500 font-medium mb-1">Total de Avaliações</p>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{reviewsList.length}</h3>
        </div>
        <div className="netflix-main-bg text-white p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-red-500 cursor-pointer">
          <p className="text-xs text-slate-500 font-medium mb-1 text-red-600 dark:text-red-400">Denunciadas / Para Moderar</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">0</h3>
            <span className="material-symbols-outlined text-sm text-red-500">flag</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button className="px-4 py-1.5 rounded-full text-sm font-semibold bg-slate-800 text-white dark:bg-white dark:text-slate-900 transition-colors">Recentes</button>
        <button className="px-4 py-1.5 rounded-full text-sm font-semibold border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">flag</span> Denunciadas</button>
        <button className="px-4 py-1.5 rounded-full text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1">5 <span className="material-symbols-outlined text-[14px]">star</span></button>
        <button className="px-4 py-1.5 rounded-full text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1">1 <span className="material-symbols-outlined text-[14px]">star</span></button>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">

        {loading ? (
          <p className="text-center text-slate-500 p-6">Carregando avaliações...</p>
        ) : reviewsList.length === 0 ? (
          <p className="text-center text-slate-500 p-6">Nenhuma avaliação encontrada.</p>
        ) : (
          reviewsList.map(review => (
            <div key={review.id} className="netflix-main-bg text-white p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex text-orange-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className="material-symbols-outlined text-md" style={{ fontVariationSettings: `\'FILL\' ${review.rating >= star ? 1 : 0}` }}>
                          star
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">• {new Date(review.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 mb-3 text-[13px] italic">"{review.comment || 'Sem comentário'}"</p>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                    <div><span className="text-slate-500">Autor:</span> <span className="font-semibold dark:text-white">{review.reviewer?.full_name || 'Usuário'}</span></div>
                    <div><span className="text-slate-500">Destinatário:</span> <span className="font-semibold text-primary">{review.provider?.full_name || 'Prestador'}</span></div>
                    <div><span className="text-slate-500">Pedido:</span> <span className="font-semibold text-blue-500">{review.request_id?.display_id ? review.request_id.display_id : `#${review.request_id?.substring(0, 8) || '...'}`}</span></div>
                  </div>
                </div>
                <div className="flex flex-row md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-4 justify-center">
                  <button
                    onClick={() => handleDeleteReview(review.id)}
                    className="flex-1 md:flex-none flex justify-center items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 text-red-500 text-xs font-bold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span> Excluir
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

      </div>
      <div className="flex justify-center mt-6">
        <button className="px-6 py-2 netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          Carregar Mais
        </button>
      </div>
    </div>
  );
}
