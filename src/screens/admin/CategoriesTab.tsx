import React from 'react';
import { useAdminDashboard } from './AdminDashboardContext';

export function CategoriesTab() {
  const {
    setActiveTab,
    categoriesList,
    categoryRequests,
    handleApproveCategoryRequest,
    handleDeleteCategory,
    handleUpdateCategoryStatus,
    loading,
    openCategoryModal,
  } = useAdminDashboard();

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-2 font-medium">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar ao Dashboard
            </button>
            <h2 className="text-xl font-bold">Categorias de Serviço</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie os tipos de serviços oferecidos na plataforma</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-bold border border-purple-200 dark:border-purple-800">
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              {categoriesList.filter(c => c.active !== false).length} Visíveis
            </div>
            <button onClick={() => openCategoryModal()} className="px-2 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[20px]">add</span>
              Nova Categoria
            </button>
          </div>
        </div>

      <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Ícone</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Nome</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Descrição</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={4} className="p-6 text-center text-slate-500">Carregando categorias...</td></tr>
              ) : categoriesList.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-slate-500">Nenhuma categoria cadastrada.</td></tr>
              ) : (
                categoriesList.map(cat => (
                  <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-3 w-16 text-center">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined">{cat.icon || 'handyman'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-900 dark:text-white">
                      {cat.name}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-500 max-w-xs truncate" title={cat.description}>
                      {cat.description || '-'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openCategoryModal(cat)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Editar">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Excluir">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Requests Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Gestão de Categorias (Moved from Settings) */}
        <section className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-2 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined">category</span>
                </div>
                <h3 className="text-lg font-bold">Gerenciar Exibição</h3>
              </div>
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-xl pointer-events-none">search</span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-primary transition-all"
                placeholder="Buscar categoria..."
                type="text"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[350px] p-2">
            <ul className="space-y-1">
              {categoriesList.map((cat, idx) => (
                <li key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400 text-[18px]">{cat.icon || 'handyman'}</span>
                    <span className={`text-sm font-medium ${cat.active === false ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleUpdateCategoryStatus(cat.id, cat.active !== false ? false : true)}
                      className={`relative w-10 h-5 rounded-full outline-none transition-colors ${cat.active !== false ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${cat.active !== false ? 'translate-x-5' : 'translate-x-0'}`}></span>
                    </button>
                    <button onClick={() => openCategoryModal(cat)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Requests Summary Card */}
        <section className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <span className="material-symbols-outlined text-primary">pending_actions</span>
              Novas Sugestões
            </h3>
            <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-black">
              {categoryRequests.filter(r => r.status === 'pending').length} Pendentes
            </span>
          </div>
          <div className="space-y-3">
            {categoryRequests.filter(r => r.status === 'pending').slice(0, 3).map(req => (
              <div key={req.id} className="netflix-main-bg text-white p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-sm font-bold text-primary italic">{req.category_name}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Por: {req.provider?.full_name?.split(' ')[0]}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleApproveCategoryRequest(req)} className="size-8 bg-green-500 text-white rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  </button>
                </div>
              </div>
            ))}
            {categoryRequests.filter(r => r.status === 'pending').length === 0 && (
              <p className="text-center text-slate-400 text-xs py-10 italic">Nenhuma sugestão pendente.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
