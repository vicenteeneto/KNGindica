import React from 'react';
import { useAdminDashboard } from './AdminDashboardContext';

export function MaintenanceTab() {
  const {
    setActiveTab,
    clientsList,
    handleClearTestRequests,
    handleCreateMockReview,
    handleDeleteReview,
    handleDeleteUserRecords,
    maintenanceLoading,
    maintenanceSearchTerm,
    mockReviewForm,
    providerSearchTerm,
    providersList,
    recentUsersList,
    reviewerSearchTerm,
    reviewsList,
    setMaintenanceSearchTerm,
    setMockReviewForm,
    setProviderSearchTerm,
    setReviewerSearchTerm,
    setShowProviderResults,
    setShowReviewerResults,
    showProviderResults,
    showReviewerResults,
  } = useAdminDashboard();

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div>
        <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-2 font-medium">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar ao Dashboard
        </button>
        <h2 className="text-xl font-bold">Zeladoria e Manutenção</h2>
        <p className="text-sm text-slate-500">Ferramentas para limpeza de dados e gestão de experiência inicial</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Gestão de Contas de Teste */}
        <section className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-red-100 dark:bg-red-900/30 text-red-600 p-2 rounded-lg">
              <span className="material-symbols-outlined">person_remove</span>
            </div>
            <h3 className="text-lg font-bold">Reset de Contas de Teste</h3>
          </div>

          <p className="text-sm text-slate-500 mb-4">
            Pesquise um usuário para apagar todos os registros públicos dele (pedidos, chats, avaliações).
            Isso permite "limpar" a conta antes de excluí-la no Auth do Supabase.
          </p>

          <div className="space-y-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-xl pointer-events-none">search</span>
              <input
                type="text"
                placeholder="Nome ou e-mail do usuário..."
                value={maintenanceSearchTerm}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-red-500 transition-all"
                onChange={(e) => setMaintenanceSearchTerm(e.target.value)}
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-100 dark:border-slate-800 rounded-lg p-2">
              {recentUsersList
                .filter(u => {
                  if (!maintenanceSearchTerm || maintenanceSearchTerm.length < 2) return true;
                  const term = maintenanceSearchTerm.toLowerCase();
                  return (
                    u.full_name?.toLowerCase().includes(term) ||
                    u.email?.toLowerCase().includes(term) ||
                    u.id.toLowerCase().includes(term)
                  );
                })
                .slice(0, 5)
                .map(u => (
                <div key={u.id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img src={u.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-8 h-8 rounded-full bg-slate-100" />
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold truncate">{u.full_name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{u.email || u.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteUserRecords(u.id)}
                    disabled={maintenanceLoading}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                  </button>
                </div>
              ))}
              {maintenanceSearchTerm.length >= 2 && recentUsersList.filter(u => {
                const term = maintenanceSearchTerm.toLowerCase();
                return u.full_name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term);
              }).length === 0 && (
                <p className="text-[10px] text-center text-slate-500 py-4">Nenhum usuário encontrado.</p>
              )}
            </div>

            <button
              onClick={handleClearTestRequests}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 border-dashed"
            >
              <span className="material-symbols-outlined text-[18px]">cleaning_services</span>
              Limpar Pedidos "Orfãos" (Sem prestador)
            </button>
          </div>
        </section>

        {/* Criação de Avaliações Mock */}
        <section className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm overflow-visible">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 p-2 rounded-lg">
              <span className="material-symbols-outlined">reviews</span>
            </div>
            <h3 className="text-lg font-bold">Criar Avaliação Mock</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Pesquisa de Prestador */}
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Buscar Prestador</label>
                <div className="relative">
                  <input
                    type="text"
                    value={providerSearchTerm}
                    onChange={e => {
                      setProviderSearchTerm(e.target.value);
                      setShowProviderResults(true);
                      if (e.target.value === '') setMockReviewForm({...mockReviewForm, provider_id: ''});
                    }}
                    onFocus={() => setShowProviderResults(true)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-primary pr-10"
                    placeholder="Nome do prestador..."
                  />
                  {mockReviewForm.provider_id && (
                    <span className="material-symbols-outlined absolute right-2 top-2 text-emerald-500 text-lg">check_circle</span>
                  )}
                </div>

                {showProviderResults && providerSearchTerm.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                    {providersList
                      .filter(p => (p.full_name || '').toLowerCase().includes(providerSearchTerm.toLowerCase()))
                      .slice(0, 5)
                      .map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setMockReviewForm({...mockReviewForm, provider_id: p.id});
                            setProviderSearchTerm(p.full_name || p.id);
                            setShowProviderResults(false);
                          }}
                          className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 text-left"
                        >
                          <img src={p.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="size-6 rounded-full bg-slate-100" />
                          <div className="overflow-hidden">
                            <p className="text-[11px] font-bold truncate">{p.full_name}</p>
                            <p className="text-[9px] text-slate-500 truncate">{p.service_category || 'Prestador'}</p>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Pesquisa de Autor */}
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Buscar Autor (Cliente)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={reviewerSearchTerm}
                    onChange={e => {
                      setReviewerSearchTerm(e.target.value);
                      setShowReviewerResults(true);
                      // Se o usuário está digitando, limpamos o ID fixo para permitir nome customizado
                      setMockReviewForm({
                        ...mockReviewForm,
                        reviewer_id: '',
                        reviewer_name: e.target.value
                      });
                    }}
                    onFocus={() => setShowReviewerResults(true)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-primary pr-10"
                    placeholder="Nome do cliente (ou digite um novo)..."
                  />
                  {mockReviewForm.reviewer_id ? (
                    <span className="material-symbols-outlined absolute right-2 top-2 text-emerald-500 text-lg">verified</span>
                  ) : mockReviewForm.reviewer_name ? (
                    <span className="material-symbols-outlined absolute right-2 top-2 text-blue-500 text-lg">edit_note</span>
                  ) : null}
                </div>

                {showReviewerResults && reviewerSearchTerm.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                    {clientsList
                      .filter(c => (c.full_name || '').toLowerCase().includes(reviewerSearchTerm.toLowerCase()))
                      .slice(0, 5)
                      .map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setMockReviewForm({
                              ...mockReviewForm,
                              reviewer_id: c.id,
                              reviewer_name: c.full_name,
                              reviewer_avatar_url: c.avatar_url || ''
                            });
                            setReviewerSearchTerm(c.full_name || c.id);
                            setShowReviewerResults(false);
                          }}
                          className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 text-left"
                        >
                          <img src={c.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="size-6 rounded-full bg-slate-100" />
                          <div className="overflow-hidden">
                            <p className="text-[11px] font-bold truncate">{c.full_name}</p>
                            <p className="text-[9px] text-slate-500 truncate">{c.email || 'Cliente'}</p>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Novo Campo: Foto do Autor (Opcional) */}
            <div className="animate-in slide-in-from-top-2 duration-300">
              <label className="block text-[10px] font-bold text-slate-500 mb-1">URL da Foto do Autor (Opcional - Google Imports)</label>
              <input
                type="text"
                value={mockReviewForm.reviewer_avatar_url}
                onChange={e => setMockReviewForm({...mockReviewForm, reviewer_avatar_url: e.target.value})}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-primary"
                placeholder="https://... (deixe vazio para usar inicial)"
              />
            </div>

            {/* Novo Campo: Data da Avaliação (Opcional) */}
            <div className="animate-in slide-in-from-top-2 duration-300">
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Data da Avaliação</label>
              <input
                type="date"
                value={mockReviewForm.created_at}
                onChange={e => setMockReviewForm({...mockReviewForm, created_at: e.target.value})}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Nota (1-5)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setMockReviewForm({...mockReviewForm, rating: n})}
                    className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${mockReviewForm.rating === n ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                  >
                    {n} ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Comentário</label>
              <textarea
                value={mockReviewForm.comment}
                onChange={e => setMockReviewForm({...mockReviewForm, comment: e.target.value})}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-primary h-20 resize-none"
                placeholder="Escreva um comentário realista..."
              />
            </div>

            <button
              onClick={handleCreateMockReview}
              disabled={maintenanceLoading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add_task</span>
              Publicar Avaliação Mock
            </button>
          </div>
        </section>
      </div>

      {/* Lista de Avaliações Recentes (Para exclusão rápida) */}
      <section className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400">format_list_bulleted</span>
            Avaliações Recentes
          </h3>
          <span className="text-xs text-slate-500">{reviewsList.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-3 font-bold text-slate-500">Prestador</th>
                <th className="px-6 py-3 font-bold text-slate-500">Autor</th>
                <th className="px-6 py-3 font-bold text-slate-500">Nota</th>
                <th className="px-6 py-3 font-bold text-slate-500">Comentário</th>
                <th className="px-6 py-3 font-bold text-slate-500 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {reviewsList.slice(0, 10).map(r => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-6 py-3 font-medium">{r.provider?.full_name}</td>
                  <td className="px-6 py-3 text-slate-500">{r.reviewer_name || r.reviewer?.full_name || 'Usuário'}</td>
                  <td className="px-6 py-3">
                    <span className="flex items-center gap-1 font-bold text-orange-500">
                      {r.rating} <span className="material-symbols-outlined text-[14px]">star</span>
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500 max-w-xs truncate">{r.comment}</td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => handleDeleteReview(r.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
