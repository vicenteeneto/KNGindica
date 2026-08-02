import React from 'react';
import { supabase } from '../../lib/supabase';
import { useAdminDashboard } from './AdminDashboardContext';

export function VerificationsTab() {
  const {
    setActiveTab,
    handleApproveVerification,
    handleRejectVerification,
    pendingVerifications,
  } = useAdminDashboard();

    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-2 font-medium">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar ao Dashboard
            </button>
            <h2 className="text-xl font-bold">Verificações de Identidade</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Analise os documentos enviados pelos prestadores para o selo de verificado</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm text-center">
            <span className="material-symbols-outlined text-4xl text-amber-500 mb-2">pending_actions</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{pendingVerifications.length}</h3>
            <p className="text-sm text-slate-500">Aguardando Análise</p>
          </div>
        </div>

        <div className="netflix-main-bg text-white border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
            <h3 className="font-bold">Solicitações Pendentes ({pendingVerifications.length})</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {pendingVerifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">verified</span>
                <p>Nenhuma verificação pendente no momento.</p>
              </div>
            ) : (
              pendingVerifications.map(verif => (
                <div key={verif.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex gap-4 items-start flex-1">
                      <img 
                        src={verif.provider?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} 
                        className="size-16 rounded-xl object-cover bg-slate-100" 
                        alt="Avatar"
                      />
                      <div>
                        <h4 className="font-black text-lg text-slate-900 dark:text-white tracking-tight">{verif.provider?.full_name}</h4>
                        <p className="text-sm text-slate-500 mb-1">{verif.provider?.email}</p>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-primary/10 text-primary rounded border border-primary/20">
                          {verif.provider?.service_category || 'Prestador'}
                        </span>
                        <p className="text-xs text-slate-400 mt-2">Enviado em: {new Date(verif.updated_at).toLocaleDateString('pt-BR')} às {new Date(verif.updated_at).toLocaleTimeString('pt-BR')}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400">Frente do Documento</p>
                        <div className="size-32 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 relative group cursor-pointer" onClick={() => window.open(supabase.storage.from('verifications').getPublicUrl(verif.document_front_path).data.publicUrl, '_blank')}>
                          {verif.document_front_path ? (
                            <img 
                              src={supabase.storage.from('verifications').getPublicUrl(verif.document_front_path).data.publicUrl} 
                              className="size-full object-cover group-hover:scale-110 transition-transform" 
                              alt="Frente" 
                            />
                          ) : (
                            <div className="size-full flex items-center justify-center text-slate-300">
                              <span className="material-symbols-outlined text-3xl">image_not_supported</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400">Selfie com Documento</p>
                        <div className="size-32 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 relative group cursor-pointer" onClick={() => window.open(supabase.storage.from('verifications').getPublicUrl(verif.selfie_path).data.publicUrl, '_blank')}>
                          {verif.selfie_path ? (
                            <img 
                              src={supabase.storage.from('verifications').getPublicUrl(verif.selfie_path).data.publicUrl} 
                              className="size-full object-cover group-hover:scale-110 transition-transform" 
                              alt="Selfie" 
                            />
                          ) : (
                            <div className="size-full flex items-center justify-center text-slate-300">
                              <span className="material-symbols-outlined text-3xl">image_not_supported</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 min-w-[150px]">
                        <button
                          onClick={() => handleApproveVerification(verif)}
                          className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-lg transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Aprovar
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt("Motivo da rejeição:");
                            if (reason) handleRejectVerification(verif, reason);
                          }}
                          className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all text-xs font-black rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">cancel</span>
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
}
