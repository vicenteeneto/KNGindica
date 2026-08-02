import React from 'react';
import { useAdminDashboard } from './AdminDashboardContext';

export function ReferralsTab() {
  const {
    setActiveTab,
    handleRemoveReferralPoint,
    maintenanceLoading,
    referralsHistory,
  } = useAdminDashboard();

    const totalPoints = referralsHistory.reduce((acc, curr) => acc + (curr.points_given || 0), 0);
    
    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-2 font-medium">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar ao Dashboard
            </button>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Auditoria de Indicações</h2>
            <p className="text-sm text-slate-500 font-medium">Controle de quem indicou quem e gerenciamento de pontos.</p>
          </div>
          <div className="flex items-center gap-2">
             <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold tracking-widest">
               {referralsHistory.length} indicações totais
             </span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm border-t-4 border-t-primary">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary p-2 rounded-lg">
                <span className="material-symbols-outlined">share</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold">Total de Indicações</p>
                <h3 className="text-2xl font-black">{referralsHistory.length}</h3>
              </div>
            </div>
          </div>
          <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm border-t-4 border-t-green-500">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/30 text-green-600 p-2 rounded-lg">
                <span className="material-symbols-outlined">stars</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold">Pontos Distribuídos</p>
                <h3 className="text-2xl font-black">{totalPoints} pts</h3>
              </div>
            </div>
          </div>
        </div>

      <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-normal break-words">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Novo Usuário (Indicado)</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500">Indicador</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500 text-center">Pontos</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-slate-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {referralsHistory.length === 0 ? (
                <tr><td colSpan={4} className="p-12 text-center text-slate-500 italic">Nenhuma indicação registrada.</td></tr>
              ) : (
                referralsHistory.map((ref, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center font-bold text-xs">
                          {ref.full_name?.substring(0, 1).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{ref.full_name || 'Usuário Indicado'}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{ref.email}</p>
                          <p className="text-[9px] text-slate-400">Entrou em {new Date(ref.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center font-bold text-xs">
                          {ref.referrer?.full_name?.substring(0, 1).toUpperCase() || 'I'}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{ref.referrer?.full_name || 'Indicador'}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{ref.referrer?.email}</p>
                          <p className="text-[9px] text-primary font-bold">Saldo Atual: {ref.referrer?.reward_points || 0} pts</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-black rounded-lg">
                        +{ref.points_given}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                       <button
                         onClick={() => handleRemoveReferralPoint(ref.history_id, ref.referrer?.email)}
                         disabled={!ref.history_id || maintenanceLoading}
                         className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all title='Remover Pontos'"
                       >
                         <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
