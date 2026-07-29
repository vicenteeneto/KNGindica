import React from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { formatCurrency, maskCurrency } from '../lib/formatters';
import { calculateServiceFees } from '../lib/billing';
import { CityAutocomplete } from '../components/CityAutocomplete';
import { useAdminDashboardData } from './admin/useAdminDashboardData';
import { AdminDashboardProvider } from './admin/AdminDashboardContext';
import { DashboardTab } from './admin/DashboardTab';
import { ProvidersTab } from './admin/ProvidersTab';
import { ClientsTab } from './admin/ClientsTab';
import { OrdersTab } from './admin/OrdersTab';
import { ReviewsTab } from './admin/ReviewsTab';
import { SettingsTab } from './admin/SettingsTab';
import { MaintenanceTab } from './admin/MaintenanceTab';
import { VerificationsTab } from './admin/VerificationsTab';
import { TicketsTab } from './admin/TicketsTab';
import { FinanceTab } from './admin/FinanceTab';
import { CategoriesTab } from './admin/CategoriesTab';
import { ReferralsTab } from './admin/ReferralsTab';
import { ChatAuditTab } from './admin/ChatAuditTab';

interface AdminProps extends NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function AdminDashboardScreen({ onNavigate, activeTab, setActiveTab }: AdminProps) {
  const admin = useAdminDashboardData({ onNavigate, activeTab, setActiveTab });
  const {
    AVAILABLE_ICONS,
    activeCities,
    adminResponseText,
    categoryForm,
    chatMessages,
    chatRoomsList,
    editingCategory,
    editingUser,
    formatPhone,
    handleCepChange,
    handleLogout,
    handleResolveDispute,
    handleResolveTicket,
    handleSaveCategory,
    handleSendAdminResponse,
    handleSendAuditMessage,
    handleStartAdminChat,
    handleUpdateTicketStatus,
    handleUpdateUserProfile,
    handleUpdateUserStatus,
    isCategoryModalOpen,
    isEditModalOpen,
    isFetchingCep,
    isPremiumUser,
    logout,
    maintenanceLoading,
    newAuditMessage,
    ordersList,
    pendingVerifications,
    profile,
    role,
    selectedChatRoom,
    selectedDispute,
    selectedOrderDetail,
    selectedProviderForKYC,
    selectedTicket,
    setAdminResponseText,
    setCategoryForm,
    setIsCategoryModalOpen,
    setIsEditModalOpen,
    setNewAuditMessage,
    setSelectedChatRoom,
    setSelectedDispute,
    setSelectedOrderDetail,
    setSelectedProviderForKYC,
    setSelectedTicket,
    setUserForm,
    showToast,
    statusMap,
    supportTickets,
    ticketCategoryLabels,
    user,
    userForm,
  } = admin;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab />;
      case 'providers': return <ProvidersTab />;
      case 'clients': return <ClientsTab />;
      case 'orders': return <OrdersTab />;
      case 'reviews': return <ReviewsTab />;
      case 'categories': return <CategoriesTab />;
      case 'chat_audit': return <ChatAuditTab />;
      case 'tickets': return <TicketsTab />;
      case 'verifications': return <VerificationsTab />;
      case 'finance': return <FinanceTab />;
      case 'settings': return <SettingsTab />;
      case 'referrals': return <ReferralsTab />;
      case 'maintenance': return <MaintenanceTab />;
      default: return <DashboardTab />;
    }
  };

  const adminTabs = [
    { id: 'dashboard', icon: 'grid_view', label: 'Dashboard' },
    { id: 'providers', icon: 'engineering', label: 'Prestadores' },
    { id: 'clients', icon: 'group', label: 'Clientes' },
    { id: 'orders', icon: 'receipt', label: 'Pedidos' },
    { id: 'reviews', icon: 'reviews', label: 'Reviews' },
    { id: 'categories', icon: 'category', label: 'Categorias' },
    { id: 'referrals', icon: 'share', label: 'Auditoria de Indicações' },
    { id: 'tickets', icon: 'support_agent', label: 'Resoluções', badge: supportTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length },
    { id: 'verifications', icon: 'verified_user', label: 'Verificações', badge: pendingVerifications.length },
    { id: 'finance', icon: 'payments', label: 'Financeiro' },
    { id: 'settings', icon: 'settings', label: 'Configurações' },
    { id: 'maintenance', icon: 'construction', label: 'Manutenção' },
  ];

  return (
    <AdminDashboardProvider value={admin}>
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#020617] font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden">
      <div className="flex-1 flex flex-col min-h-screen w-full">
        {/* Header Section */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-30 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary p-2 rounded-lg text-white flex items-center justify-center">
                <span className="material-symbols-outlined">dashboard</span>
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight">Admin Dashboard</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Visão Geral da Plataforma</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span className="sm:inline">Sair</span>
              </button>
              <div className={`h-10 w-10 rounded-full overflow-hidden border-2 flex items-center justify-center transition-all ${
                isPremiumUser 
                  ? 'border-primary animate-glow-incandescent scale-110' 
                  : 'border-primary/30 bg-primary/20 text-primary font-bold'
              }`}>
                {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                  <img 
                    src={profile?.avatar_url || user?.user_metadata?.avatar_url} 
                    alt="Avatar" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="font-bold">
                    {profile?.full_name?.substring(0, 2).toUpperCase() || 'AD'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-8 md:mt-4 mb-20">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'providers' && <ProvidersTab />}
          {activeTab === 'clients' && <ClientsTab />}
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'reviews' && <ReviewsTab />}
          {activeTab === 'categories' && <CategoriesTab />}
          {activeTab === 'chat_audit' && <ChatAuditTab />}
          {activeTab === 'referrals' && <ReferralsTab />}
          {activeTab === 'tickets' && <TicketsTab />}
          {activeTab === 'verifications' && <VerificationsTab />}
          {activeTab === 'finance' && <FinanceTab />}
          {activeTab === 'settings' && <SettingsTab />}
          {activeTab === 'maintenance' && <MaintenanceTab />}
        </main>

        {/* Bottom Navigation Bar - Mobile ONLY */}
        <nav className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 fixed bottom-0 left-0 right-0 z-50 md:hidden h-14 flex items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-0.5 overflow-x-auto hide-scrollbar px-2 w-full touch-pan-x" style={{ overscrollBehaviorX: 'contain' }}>
            {adminTabs.map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)} 
                className={`flex flex-col items-center justify-center px-4 h-12 rounded-xl transition-all shrink-0 ${
                  activeTab === tab.id 
                    ? 'text-primary bg-primary/10 scale-105' 
                    : 'text-slate-400 active:scale-95'
                }`}
              >
                <span 
                  className="material-symbols-outlined text-[20px]" 
                  style={activeTab === tab.id ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {tab.icon}
                </span>
                <span className="text-[10px] font-black mt-0.5 opacity-90 whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </nav>

        {/* Modals sibling to main content */}
        {selectedProviderForKYC && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="netflix-main-bg text-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 netflix-main-bg text-white z-10">
                <h3 className="text-xl font-bold">Análise de Prestador (KYC)</h3>
                <button onClick={() => setSelectedProviderForKYC(null)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <img src={selectedProviderForKYC.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} alt="Avatar" className="w-20 h-20 rounded-full object-cover bg-slate-200" />
                  <div>
                    <h4 className="text-2xl font-bold">{selectedProviderForKYC.full_name || 'Sem Nome'}</h4>
                    <p className="text-slate-500">{selectedProviderForKYC.email || selectedProviderForKYC.id}</p>
                    <p className="text-sm font-medium mt-1 inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{selectedProviderForKYC.service_category || 'Categoria não definida'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 font-bold mb-1">Documento de Identidade (Frente)</p>
                    <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 overflow-hidden relative group">
                      {selectedProviderForKYC.document_front_url ? (
                        <img src={selectedProviderForKYC.document_front_url} alt="Documento Frente" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      ) : (
                        <span className="material-symbols-outlined text-4xl">id_card</span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 font-bold mb-1">Selfie com Documento</p>
                    <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 overflow-hidden relative group">
                      {selectedProviderForKYC.selfie_url ? (
                        <img src={selectedProviderForKYC.selfie_url} alt="Selfie" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      ) : (
                        <span className="material-symbols-outlined text-4xl">face</span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-bold mb-2">Detalhes Adicionais</p>
                  <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                       <span className="font-medium">Status Atual:</span>
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                         selectedProviderForKYC.status === 'active' ? 'bg-green-100 text-green-700' : 
                         selectedProviderForKYC.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                         'bg-red-100 text-red-700'
                       }`}>{selectedProviderForKYC.status || 'Pendente'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                       <span className="font-medium">Telefone:</span>
                       <span>{selectedProviderForKYC.phone || 'Não informado'}</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="font-medium">Membro desde:</span>
                       <span>{new Date(selectedProviderForKYC.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-end bg-slate-50 dark:bg-slate-800/30">
                <button 
                  onClick={() => handleUpdateUserStatus(selectedProviderForKYC.id, 'blocked')}
                  className="px-6 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-xl font-bold transition-colors"
                >
                  Recusar / Bloquear
                </button>
                <button
                  onClick={() => handleUpdateUserStatus(selectedProviderForKYC.id, 'active')} 
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span> Aprovar Perfil
                </button>
              </div>
            </div>
          </div>
        )}

        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="netflix-main-bg text-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/30">
                <h3 className="text-xl font-bold">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>
                <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Nome da Categoria</label>
                  <input 
                    type="text" 
                    value={categoryForm.name} 
                    onChange={e => setCategoryForm({...categoryForm, name: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="Ex: Eletricista"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Descrição</label>
                  <textarea 
                    value={categoryForm.description} 
                    onChange={e => setCategoryForm({...categoryForm, description: e.target.value})}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none h-24"
                    placeholder="Descreva o que este serviço contempla."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center justify-between">
                    Escolha um Ícone para a Categoria
                  </label>
                  <div className="grid grid-cols-6 gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-xl h-32 overflow-y-auto bg-slate-50 dark:bg-slate-800/20">
                    {AVAILABLE_ICONS.map(icon => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setCategoryForm({...categoryForm, icon_name:icon})}
                        className={`p-2 rounded-lg flex items-center justify-center transition-all ${categoryForm.icon_name === icon ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/30">
                <button onClick={() => setIsCategoryModalOpen(false)} className="px-5 py-2.5 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleSaveCategory} disabled={!categoryForm.name} className="px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold rounded-xl transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">save</span> {editingCategory ? 'Salvar Edição' : 'Criar Categoria'}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedDispute && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="netflix-main-bg text-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b border-red-200 dark:border-red-900/50 flex items-center justify-between sticky top-0 bg-red-50 dark:bg-red-900/20 z-10">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-500 text-3xl">gavel</span>
                  <div>
                    <h3 className="text-xl font-bold text-red-700 dark:text-red-400">Resolução de Disputa</h3>
                    <p className="text-sm text-red-600 dark:text-red-500 font-medium">Pedido #{selectedDispute.id.split('-')[0].toUpperCase()}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedDispute(null)} className="p-2 text-red-400 hover:text-red-700 dark:hover:text-red-200 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                 <div className="flex flex-col md:flex-row gap-6">
                   <div className="flex-1 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                     <p className="text-xs font-bold text-slate-500 mb-3">Cliente</p>
                     <div className="flex items-center gap-3">
                        <img src={selectedDispute.client?.avatar_url || ""} alt="" className="w-10 h-10 rounded-full bg-slate-200" />
                        <div>
                          <p className="font-bold">{selectedDispute.client?.full_name || 'Usuário'}</p>
                          <p className="text-xs text-slate-500">Solicitante</p>
                        </div>
                     </div>
                   </div>
                   <div className="flex-1 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                     <p className="text-xs font-bold text-slate-500 mb-3">Prestador</p>
                     <div className="flex items-center gap-3">
                        <img src={selectedDispute.provider?.avatar_url || ""} alt="" className="w-10 h-10 rounded-full bg-slate-200" />
                        <div>
                          <p className="font-bold">{selectedDispute.provider?.full_name || 'Profissional'}</p>
                          <p className="text-xs text-slate-500">Prestador</p>
                        </div>
                     </div>
                   </div>
                 </div>

                 <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-900/50">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-bold text-amber-800 dark:text-amber-500">Valor em Disputa</p>
                      <p className="text-2xl font-black text-amber-600">{formatCurrency(selectedDispute.price || 0)}</p>
                    </div>
                 </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 bg-slate-50 dark:bg-slate-800/30 justify-end">
                <button onClick={() => handleResolveDispute(selectedDispute.id, 'refund_client')} className="px-6 py-3 bg-white dark:bg-slate-800 border-2 border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-all">Estornar Cliente</button>
                <button onClick={() => handleResolveDispute(selectedDispute.id, 'pay_provider')} className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all shadow-lg">Pagar Prestador</button>
              </div>
            </div>
          </div>
        )}

        {selectedTicket && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="netflix-main-bg text-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 netflix-main-bg text-white z-10">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-3xl">local_activity</span>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Detalhes do Ticket</h3>
                    <p className="text-sm text-slate-500 font-medium">{ticketCategoryLabels[selectedTicket.category] || 'Suporte Geral'}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="flex gap-4 items-center bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                   <img src={selectedTicket.user?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} alt="" className="w-12 h-12 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-200" />
                   <div>
                     <p className="font-bold text-lg">{selectedTicket.user?.full_name || 'Usuário Sem Nome'}</p>
                     <p className="text-sm text-slate-500">{selectedTicket.user?.email || 'Sem email associado'}</p>
                   </div>
                </div>

                <div>
                   <h4 className="text-lg font-bold mb-2 break-words">{selectedTicket.subject}</h4>
                   <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm border border-slate-100 dark:border-slate-700 leading-relaxed font-medium">
                     {selectedTicket.description}
                   </div>

                   {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-[10px] font-black text-slate-400 mb-3 ml-1">Anexos do Usuário</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedTicket.attachments.map((url: string, idx: number) => (
                            <a href={url} target="_blank" rel="noreferrer" key={idx} className="size-24 rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all shadow-sm">
                              <img src={url} className="w-full h-full object-cover" alt="" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                       <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Enviar Resposta Oficial</h4>
                       <textarea 
                         value={adminResponseText}
                         onChange={(e) => setAdminResponseText(e.target.value)}
                         placeholder="Escreva aqui a resposta que o usuário verá na Central de Ajuda..."
                         className="w-full h-32 p-4 rounded-2xl netflix-main-bg text-white border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none shadow-inner"
                       />
                     <div className="flex justify-between items-center mt-3">
                         {selectedTicket.status !== 'resolved' && (
                           <button 
                             onClick={() => handleResolveTicket(selectedTicket.id)}
                             className="px-2 py-1.5 border-2 border-green-200 text-green-600 font-bold rounded-xl hover:bg-green-50 transition-all text-xs flex items-center gap-2"
                           >
                             <span className="material-symbols-outlined text-[18px]">check_circle</span>
                             Marcar como Resolvido
                           </button>
                         )}
                         <button 
                           onClick={handleSendAdminResponse}
                           disabled={!adminResponseText.trim()}
                           className="px-6 py-2.5 bg-primary text-white font-black rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                         >
                           <span className="material-symbols-outlined text-[20px]">send</span>
                           Responder via Sistema
                         </button>
                       </div>
                    </div>
                </div>

                {selectedTicket.related_order_id && (
                  <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                     <div>
                       <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">Link com Pedido</p>
                       <p className="font-semibold text-slate-800 dark:text-slate-200">ID: {selectedTicket.related_order_id.split('-')[0].toUpperCase()}</p>
                     </div>
                     <button 
                       onClick={() => {
                         const order = ordersList.find(o => o.id === selectedTicket.related_order_id);
                         if (order) {
                           setSelectedTicket(null);
                           setSelectedDispute(order);
                         } else {
                           showToast("Erro", "Detalhes do pedido não encontrados.", "error");
                         }
                       }}
                       className="px-2 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold rounded-lg text-sm hover:bg-blue-200 transition-colors"
                     >
                       Ver Pedido
                     </button>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 bg-slate-50 dark:bg-slate-800/30 justify-between items-center">
                 <div className="flex items-center gap-3 w-full sm:w-auto">
                   <p className="text-sm font-semibold text-slate-500 hidden sm:block">Status:</p>
                   <select 
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value as any)}
                      className="netflix-main-bg text-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-auto"
                   >
                     <option value="open">Aberto</option>
                     <option value="in_review">Em Análise</option>
                     <option value="answered">Respondido</option>
                     <option value="resolved">Resolvido</option>
                     <option value="closed">Fechado</option>
                   </select>
                 </div>
                 <button onClick={() => {
                    handleStartAdminChat(selectedTicket);
                 }} className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                   <span className="material-symbols-outlined text-[18px]">chat</span>
                   Iniciar Chat
                 </button>
              </div>
            </div>
          </div>
        )}

        {selectedOrderDetail && (
          <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="netflix-main-bg text-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">receipt_long</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Detalhes do Pedido</h3>
                    <p className="text-xs text-slate-500 font-bold">{selectedOrderDetail.display_id || `#${selectedOrderDetail.id.split('-')[0].toUpperCase()}`}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedOrderDetail(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-8 space-y-8">
                {/* Status and Price Banner */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800">
                   <div className="flex items-center gap-3">
                     <span className={`px-4 py-1.5 rounded-full text-xs font-black ${
                       ['completed', 'paid'].includes(selectedOrderDetail.status) ? 'bg-green-100 text-green-700' : 
                       ['cancelled', 'disputed'].includes(selectedOrderDetail.status) ? 'bg-red-100 text-red-700' : 
                       'bg-primary/10 text-primary'
                     }`}>
                       {statusMap[selectedOrderDetail.status] || selectedOrderDetail.status}
                     </span>
                     <span className="text-xs text-slate-400 font-bold">•</span>
                     <p className="text-xs text-slate-500 font-bold">{new Date(selectedOrderDetail.created_at).toLocaleString('pt-BR')}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] font-black text-slate-400 mb-1">Valor Total</p>
                     <p className="text-2xl font-black text-slate-900 dark:text-white">
                       {selectedOrderDetail.price ? formatCurrency(selectedOrderDetail.price) : 'Em negociação'}
                     </p>
                   </div>
                </div>

                {/* Service Category */}
                <div>
                   <h4 className="text-[10px] font-black text-slate-400 mb-3 ml-1">Serviço Solicitado</h4>
                   <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center">
                         <span className="material-symbols-outlined">category</span>
                      </div>
                      <span className="text-lg font-bold">{selectedOrderDetail.category?.name || 'Serviço Personalizado'}</span>
                   </div>
                </div>

                {/* Description if any */}
                {selectedOrderDetail.description && (
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 mb-3 ml-1">Descrição do Cliente</h4>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm leading-relaxed text-slate-700 dark:text-slate-300 italic font-medium">
                      "{selectedOrderDetail.description}"
                    </div>
                  </div>
                )}

                {/* Participants */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Client */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 ml-1">Cliente</h4>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                       <img src={selectedOrderDetail.client?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="size-12 rounded-full object-cover bg-slate-100" />
                       <div className="overflow-hidden">
                         <p className="font-bold text-sm truncate">{selectedOrderDetail.client?.full_name || 'Usuário'}</p>
                         <p className="text-[10px] text-slate-500 truncate">{selectedOrderDetail.client?.email || 'N/I'}</p>
                       </div>
                    </div>
                  </div>

                  {/* Provider */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 ml-1">Prestador</h4>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                       <img src={selectedOrderDetail.provider?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="size-12 rounded-full object-cover bg-slate-100" />
                       <div className="overflow-hidden">
                         <p className="font-bold text-sm truncate">{selectedOrderDetail.provider?.full_name || 'Profissional'}</p>
                         <p className="text-[10px] text-slate-500 truncate">{selectedOrderDetail.provider?.email || 'N/I'}</p>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Extra Details / Audit */}
                <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/20 space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">analytics</span>
                    Contexto para Auditoria
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-[11px]">
                     <div>
                       <p className="text-slate-400 font-bold mb-0.5">ID Interno</p>
                       <p className="text-slate-600 dark:text-slate-300 font-mono font-bold truncate" title={selectedOrderDetail.id}>{selectedOrderDetail.id}</p>
                     </div>
                     <div>
                       <p className="text-slate-400 font-bold mb-0.5">Taxa Plataforma (15%)</p>
                       <p className="text-blue-600 dark:text-blue-400 font-black">
                         {selectedOrderDetail.price ? formatCurrency(selectedOrderDetail.price * 0.15) : '---'}
                       </p>
                     </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 bg-slate-50/50 dark:bg-slate-800/50">
                <button 
                  onClick={() => {
                    const room = chatRoomsList.find(r => r.request_id === selectedOrderDetail.id);
                    if (room) {
                      setSelectedChatRoom(room);
                      setSelectedOrderDetail(null);
                      setActiveTab('chat_audit');
                    } else {
                      showToast("Info", "Nenhuma conversa de chat iniciada para este pedido.", "notification");
                    }
                  }}
                  className="flex-1 px-6 py-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined">chat_bubble</span>
                  Auditar Chat
                </button>
                <button 
                  onClick={() => {
                    if (selectedOrderDetail.status === 'disputed') {
                       setSelectedDispute(selectedOrderDetail);
                       setSelectedOrderDetail(null);
                       setActiveTab('tickets');
                    } else {
                       showToast("Info", "Disputas só podem ser resolvidas se o status for 'Em Disputa'.", "notification");
                    }
                  }}
                  className="flex-1 px-6 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">gavel</span>
                  Resolver Disputa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Auditoria de Chat - Posicionado Globalmente */}
        {selectedChatRoom && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="netflix-main-bg text-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Auditoria de Chat</h3>
                  <p className="text-[10px] text-slate-500">{selectedChatRoom.client?.full_name} vs {selectedChatRoom.provider?.full_name}</p>
                </div>
                <button onClick={() => setSelectedChatRoom(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:netflix-main-bg/20">
                {chatMessages.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-10">Nenhuma mensagem trocada ainda.</p>
                ) : (
                  chatMessages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender_id === selectedChatRoom.client_id ? 'items-start' : 'items-end'}`}>
                      <span className="text-[9px] font-bold text-slate-400 mb-0.5">
                        {msg.sender_id === selectedChatRoom.client_id ? 'Cliente' : 'Prestador'}
                      </span>
                      <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.sender_id === selectedChatRoom.client_id ? 'bg-white dark:bg-slate-800' : 'bg-primary text-white'} shadow-sm border border-slate-100 dark:border-slate-700/50`}>
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5">{new Date(msg.created_at).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 netflix-main-bg text-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enviar mensagem como admin..."
                    value={newAuditMessage}
                    onChange={(e) => setNewAuditMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendAuditMessage()}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  />
                  <button
                    onClick={handleSendAuditMessage}
                    disabled={!newAuditMessage.trim()}
                    className="size-10 bg-primary text-white rounded-xl flex items-center justify-center hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                  >
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 italic text-center mt-2 font-black tracking-widest">Aviso: Sua mensagem será visível para ambos os participantes</p>
              </div>
            </div>
          </div>
        )}
      </div>
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="netflix-main-bg text-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">person_edit</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Editar Perfil</h3>
                  <p className="text-xs text-slate-500 font-medium tracking-tight">ID: {editingUser?.id.split('-')[0].toUpperCase()} • {editingUser?.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
              {/* Seção Dados Básicos */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 mb-4 ml-1">Dados Básicos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 ml-1">Nome Completo</label>
                    <input 
                      type="text" 
                      value={userForm.full_name}
                      onChange={(e) => setUserForm({...userForm, full_name: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 ml-1">Telefone / WhatsApp</label>
                    <input 
                      type="text" 
                      value={userForm.phone}
                      onChange={(e) => setUserForm({...userForm, phone: formatPhone(e.target.value)})}
                      placeholder="(00) 00000-0000"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 ml-1">Tipo de Perfil</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
                    >
                      <option value="client">Cliente</option>
                      <option value="provider">Prestador</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção Endereço */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 mb-4 ml-1">Endereço de Cadastro</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 ml-1">CEP</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={userForm.cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        placeholder="00000-000"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
                      />
                      {isFetchingCep && (
                        <div className="absolute right-3 top-2.5">
                          <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 ml-1">Rua / Logradouro</label>
                    <input 
                      type="text" 
                      value={userForm.street}
                      onChange={(e) => setUserForm({...userForm, street: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 ml-1">Bairro</label>
                    <input 
                      type="text" 
                      value={userForm.neighborhood}
                      onChange={(e) => setUserForm({...userForm, neighborhood: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 ml-1">Número</label>
                    <input 
                      type="text" 
                      value={userForm.number}
                      onChange={(e) => setUserForm({...userForm, number: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 ml-1">Complemento</label>
                    <input 
                      type="text" 
                      value={userForm.address_complement}
                      onChange={(e) => setUserForm({...userForm, address_complement: e.target.value})}
                      placeholder="Opcional"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 ml-1">Cidade</label>
                    <CityAutocomplete
                      value={userForm.city}
                      onChange={(val) => setUserForm({...userForm, city: val})}
                      activeCities={activeCities}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 ml-1">Estado (UF)</label>
                    <input 
                      type="text" 
                      value={userForm.state}
                      onChange={(e) => setUserForm({...userForm, state: e.target.value})}
                      maxLength={2}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Seção Profissional (se for prestador) */}
              {(editingUser?.user_type === 'provider' || editingUser?.service_category) && (
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 mb-4 ml-1">Dados Profissionais</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 ml-1">Categoria de Serviço</label>
                      <input 
                        type="text" 
                        value={userForm.service_category}
                        onChange={(e) => setUserForm({...userForm, service_category: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 ml-1">Bio / Descrição</label>
                      <textarea 
                        value={userForm.description}
                        onChange={(e) => setUserForm({...userForm, description: e.target.value})}
                        className="w-full h-24 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-white dark:hover:bg-slate-800 transition-all text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdateUserProfile}
                disabled={maintenanceLoading}
                className="flex-[2] px-6 py-3 bg-primary text-white font-black rounded-2xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {maintenanceLoading ? (
                   <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">save</span>
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AdminDashboardProvider>
  );
}


