import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';

export default function AdminDashboardScreen({ onNavigate }: NavigationProps) {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    providers: 0,
    clients: 0,
    completedServices: 0,
    platformRevenue: 0,
  });
  const [providersList, setProvidersList] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProviderForKYC, setSelectedProviderForKYC] = useState<any>(null);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);

  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', icon_name: '', base_price: '' });

  const AVAILABLE_ICONS = [
    'handyman', 'bolt', 'plumbing', 'cleaning_services', 'yard', 'local_shipping', 'ac_unit', 'format_paint', 
    'carpenter', 'pest_control', 'iron', 'local_laundry_service', 'computer', 'tv', 'directions_car', 
    'content_cut', 'imagesearch_roller', 'construction', 'engineering', 'architecture', 'pets', 'camera_alt',
    'fitness_center', 'school', 'spa', 'local_florist', 'local_dining', 'local_pizza', 'child_care', 'sports_esports'
  ];

  const handleUpdateProviderStatus = async (providerId: string, status: string) => {
    try {
      const { error } = await supabase.from('profiles').update({ status }).eq('id', providerId);
      if (error) throw error;
      setProvidersList(prev => prev.map(p => p.id === providerId ? { ...p, status } : p));
      setSelectedProviderForKYC(null);
    } catch (e) {
      console.error("Erro ao atualizar status do prestador", e);
      alert("Erro ao atualizar status");
    }
  };

  const handleResolveDispute = async (requestId: string, resolution: 'refund_client' | 'pay_provider' | 'resolved') => {
    try {
      const { error } = await supabase.from('service_requests').update({ status: resolution }).eq('id', requestId);
      if (error) throw error;
      setOrdersList(prev => prev.map(o => o.id === requestId ? { ...o, status: resolution } : o));
      setSelectedDispute(null);
    } catch (e) {
      console.error("Erro ao resolver disputa", e);
      alert("Erro ao resolver disputa. Verifique as permissões de banco.");
    }
  };

  const exportToCSV = () => {
    const concludedOrders = ordersList.filter(o => o.status === 'completed');
    if (concludedOrders.length === 0) {
      alert("Nenhum pedido concluído para exportar.");
      return;
    }
    const headers = "ID,Cliente,Prestador,Servico,Status,Valor Total,Taxa Plataforma,Data\n";
    const rows = concludedOrders.map(order => {
      const date = new Date(order.created_at).toLocaleDateString('pt-BR');
      const val = order.price || 0;
      const tax = val * 0.15; // 15% platform fee
      return `"${order.id}","${order.client?.full_name || ''}","${order.provider?.full_name || ''}","${order.category?.name || 'Serviço Direto'}","${order.status}","R$ ${val.toFixed(2)}","R$ ${tax.toFixed(2)}","${date}"`;
    }).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `faturamento_iservice_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    // Only fetch for admin if needed, but for now fetch all to simulate dashboard
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        // 1. Fetch profiles for stats and list
        const { data: profiles } = await supabase.from('profiles').select('*');
        const clients = profiles?.filter(p => p.role === 'client') || [];

        // 2. Fetch requests for stats and orders list
        const { data: requests } = await supabase.from('service_requests').select('*, client:profiles!service_requests_client_id_fkey(full_name, avatar_url), provider:profiles!service_requests_provider_id_fkey(full_name, avatar_url), category:service_categories(name)').order('created_at', { ascending: false });
        const compServ = requests?.filter(r => r.status === 'completed') || [];

        // 3. Fetch reviews
        const { data: reviews } = await supabase.from('reviews').select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name), provider:profiles!reviews_provider_id_fkey(full_name, role)').order('created_at', { ascending: false });

        // Calculate dynamic platform revenue (e.g. 15% of all completed service prices)
        const revenue = compServ.reduce((acc, curr) => acc + (curr.price || 0), 0) * 0.15;

        // Enrich providers data
        const providers = (profiles?.filter(p => p.role === 'provider') || []).map(p => {
          const pOrders = (requests || []).filter(r => r.provider_id === p.id && r.status === 'completed');
          const pEarn = pOrders.reduce((acc, curr) => acc + (curr.price || 0), 0) * 0.85;
          const pReviews = (reviews || []).filter(r => r.provider_id === p.id);
          const pRating = pReviews.length > 0 ? (pReviews.reduce((acc, curr) => acc + (curr.rating || 0), 0) / pReviews.length).toFixed(1) : '--';
          
          return {
            ...p,
            completed_services: pOrders.length,
            earnings: pEarn,
            rating: pRating,
            total_reviews: pReviews.length
          };
        });

        // 4. Fetch Categories
        const { data: categories } = await supabase.from('service_categories').select('*').order('name');

        setStats({
          providers: providers.length,
          clients: clients.length,
          completedServices: compServ.length,
          platformRevenue: revenue
        });

        setProvidersList(providers);
        setClientsList(clients);
        setOrdersList(requests || []);
        setReviewsList(reviews || []);
        setCategoriesList(categories || []);
      } catch (e) {
        console.error("Error fetching admin data", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const handleSaveCategory = async () => {
    try {
      const payload = {
        name: categoryForm.name,
        description: categoryForm.description,
        icon: categoryForm.icon_name || 'handyman',
      };

      if (editingCategory) {
        const { error } = await supabase.from('service_categories').update(payload).eq('id', editingCategory.id);
        if (error) throw error;
        setCategoriesList(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...payload } : c));
      } else {
        const { data, error } = await supabase.from('service_categories').insert([payload]).select().single();
        if (error) throw error;
        if (data) setCategoriesList(prev => [...prev, data]);
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (e) {
      console.error("Erro ao salvar categoria", e);
      alert("Erro ao salvar categoria");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
      const { error } = await supabase.from('service_categories').delete().eq('id', id);
      if (error) throw error;
      setCategoriesList(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error("Erro ao excluir categoria", e);
      alert("Erro ao excluir. Pode haver serviços vinculados a ela.");
    }
  };

  const openCategoryModal = (cat: any = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({ name: cat.name, description: cat.description || '', icon_name: cat.icon || '', base_price: cat.base_price?.toString() || '' });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', icon_name: '', base_price: '' });
    }
    setIsCategoryModalOpen(true);
  };

  const handleLogout = () => {
    logout();
    onNavigate('auth');
  };

  const renderDashboardTab = () => (
    <>
      {/* Statistics Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Estatísticas da Plataforma</h2>
          <span className="text-sm text-primary font-medium cursor-pointer hover:underline">Ver relatórios detalhados</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card: Providers - Clickable */}
          <div 
            onClick={() => setActiveTab('providers')}
            className="group cursor-pointer bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/50 hover:shadow-lg transition-all active:scale-95"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 group-hover:bg-primary group-hover:text-white rounded-lg flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined">engineering</span>
              </div>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">arrow_forward_ios</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total de Prestadores</p>
            <p className="text-2xl font-bold">{stats.providers}</p>
          </div>

          {/* Card: Clients - Clickable */}
          <div 
            onClick={() => setActiveTab('clients')}
            className="group cursor-pointer bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-purple-500/50 hover:shadow-lg transition-all active:scale-95"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 group-hover:bg-purple-600 group-hover:text-white rounded-lg flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined">group</span>
              </div>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-purple-500 transition-colors">arrow_forward_ios</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total de Clientes</p>
            <p className="text-2xl font-bold">{stats.clients}</p>
          </div>

          {/* Card: Services - Clickable */}
          <div 
            onClick={() => setActiveTab('orders')}
            className="group cursor-pointer bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-green-500/50 hover:shadow-lg transition-all active:scale-95"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 group-hover:bg-green-600 group-hover:text-white rounded-lg flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined">task_alt</span>
              </div>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-green-500 transition-colors">arrow_forward_ios</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Serviços Concluídos</p>
            <p className="text-2xl font-bold">{stats.completedServices}</p>
          </div>

          {/* Card: Revenue - Clickable */}
          <div 
            onClick={() => setActiveTab('orders')}
            className="group cursor-pointer bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-orange-500/50 hover:shadow-lg transition-all active:scale-95"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 group-hover:bg-orange-600 group-hover:text-white rounded-lg flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-orange-500 transition-colors">arrow_forward_ios</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Receita Estimada</p>
            <p className="text-2xl font-bold">R$ {stats.platformRevenue.toFixed(2)}</p>
          </div>
        </div>
      </section>

      {/* Management Section */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold">Gestão de Prestadores</h2>
          <div className="flex gap-2">
            <div className="relative flex-1 md:flex-none">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-xl pointer-events-none">search</span>
              <input
                className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all w-full md:w-64"
                placeholder="Buscar prestador..."
                type="text"
              />
            </div>
            <button className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              <span className="material-symbols-outlined text-sm md:text-xl">filter_list</span> <span className="hidden sm:inline">Filtrar</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prestador</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Serviço</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Avaliação</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-500">Carregando...</td></tr>
                ) : providersList.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-500">Nenhum prestador encontrado.</td></tr>
                ) : (
                  providersList.slice(0, 5).map(provider => (
                    <tr key={provider.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                            <img className="h-full w-full object-cover" alt="Profile" src={provider.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{provider.full_name || 'Usuário Sem Nome'}</p>
                            <p className="text-xs text-slate-500 font-mono font-bold tracking-wider">{provider.display_id || provider.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">-</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase rounded">Ativo</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-orange-400">
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{provider.rating}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Bloquear</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-500">Mostrando {Math.min(providersList.length, 5)} de {providersList.length} prestadores</p>
            <div className="flex gap-2">
              <button className="p-1 border border-slate-200 dark:border-slate-800 rounded text-slate-400 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" disabled>
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button className="p-1 border border-slate-200 dark:border-slate-800 rounded text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Lower Section: Reviews & Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Reviews */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Avaliações Recentes</h2>
            <button className="text-sm font-medium text-primary hover:underline" onClick={() => setActiveTab('reviews')}>Ver Todas</button>
          </div>
          <div className="space-y-3">
            {reviewsList.length === 0 ? (
              <p className="text-sm text-center text-slate-500 py-4">Nenhuma avaliação encontrada.</p>
            ) : (
              reviewsList.slice(0, 2).map((review: any) => (
                <div key={review.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{review.reviewer?.full_name || 'Usuário'}</span>
                      <span className="text-[10px] text-slate-400">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex text-orange-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: `\'FILL\' ${review.rating >= star ? 1 : 0}` }}>
                          star
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 italic">"{review.comment || 'Sem comentário'}"</p>
                  <p className="mt-2 text-[10px] font-bold text-primary uppercase">Para: {review.provider?.full_name || 'Prestador'}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Platform Orders */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Pedidos da Plataforma</h2>
            <button className="text-sm font-medium text-primary hover:underline" onClick={() => setActiveTab('orders')}>Gerenciar</button>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {ordersList.length === 0 ? (
                <p className="text-sm text-center text-slate-500 py-4">Nenhum pedido encontrado.</p>
              ) : (
                ordersList.slice(0, 3).map((order: any) => (
                  <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary p-2 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined">receipt_long</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-0.5">{order.display_id || `#...${order.id.substring(0, 6)}`}</p>
                        <p className="text-xs text-slate-500">{order.category?.name || 'Serviço'} • {order.price ? `R$ ${order.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'Em negociação'}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase ${order.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : order.status === 'canceled' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                      {order.status === 'accepted' ? 'Aceito' : order.status === 'completed' ? 'Concluído' : order.status === 'canceled' ? 'Cancelado' : order.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );

  const renderProvidersTab = () => (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-2 font-medium">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar ao Dashboard
          </button>
          <h2 className="text-xl font-bold">Gestão de Prestadores</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie todos os prestadores cadastrados na plataforma</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 md:flex-none">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-xl pointer-events-none">search</span>
            <input
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all w-full md:w-64"
              placeholder="Buscar prestador por nome, email ou serviço..."
              type="text"
            />
          </div>
          <button className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-sm md:text-xl">filter_list</span> <span className="hidden sm:inline">Filtros</span>
          </button>
        </div>
      </div>

      {/* Metric Cards for this Tab */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <p className="text-xs text-slate-500 font-medium mb-1">Total Cadastrados</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{providersList.length}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-green-500">
          <p className="text-xs text-slate-500 font-medium mb-1">Ativos</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{providersList.filter(p => p.status !== 'blocked' && p.status !== 'pending').length}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-yellow-500">
          <p className="text-xs text-slate-500 font-medium mb-1">Em Análise (KYC)</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{providersList.filter(p => p.status === 'pending').length}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-red-500">
          <p className="text-xs text-slate-500 font-medium mb-1">Bloqueados</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{providersList.filter(p => p.status === 'blocked').length}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prestador</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Serviços / Ganhos</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plano</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Avaliação</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">Carregando prestadores...</td></tr>
              ) : providersList.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">Nenhum prestador encontrado.</td></tr>
              ) : (
                providersList.map(provider => (
                  <tr key={provider.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                          <img className="h-full w-full object-cover" alt="Profile" src={provider.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} />
                          <div className={`absolute bottom-0 right-0 h-3 w-3 border-2 border-white dark:border-slate-900 rounded-full ${provider.status === 'blocked' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{provider.full_name || 'Usuário Sem Nome'}</p>
                            {provider.is_verified && <span className="material-symbols-outlined text-blue-500 text-[14px]" title="Identidade Verificada">verified</span>}
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-2">
                            <span className="font-mono font-bold">{provider.display_id || `#${provider.id.substring(0, 6)}`}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                            {provider.email || 'S/E'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{provider.service_category || 'Prestador de Serviços'}</p>
                      <p className="text-xs text-slate-500">{provider.completed_services || 0} concluídos • <span className="text-green-600 font-semibold">R$ {provider.earnings ? provider.earnings.toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '0,00'}</span></p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase rounded-full">Básico</span>
                    </td>
                    <td className="px-6 py-4">
                      {provider.status === 'blocked' ? (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-semibold rounded-full flex items-center gap-1 w-max">
                          <span className="material-symbols-outlined text-[12px]">lock</span> Bloqueado
                        </span>
                      ) : provider.status === 'pending' ? (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 text-xs font-semibold rounded-full flex items-center gap-1 w-max">
                          <span className="material-symbols-outlined text-[12px]">schedule</span> Em Análise
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full flex items-center gap-1 w-max">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Ativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-orange-400">
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{provider.rating}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">({provider.total_reviews || 0} reviews)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {provider.status === 'blocked' ? (
                        <button onClick={() => handleUpdateProviderStatus(provider.id, 'active')} className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 ml-auto">
                          <span className="material-symbols-outlined text-[14px]">lock_open</span> Desbloquear
                        </button>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setSelectedProviderForKYC(provider)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Ver Perfil Completo / Analisar KYC">
                            <span className="material-symbols-outlined text-[20px]">visibility</span>
                          </button>
                          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 self-center mx-1"></div>
                          <button onClick={() => handleUpdateProviderStatus(provider.id, 'blocked')} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Bloquear Conta">
                            <span className="material-symbols-outlined text-[20px]">block</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">Mostrando {providersList.length} de {providersList.length} prestadores</p>
          <div className="flex gap-2">
            <button className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" disabled>
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderClientsTab = () => (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-2 font-medium">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar ao Dashboard
          </button>
          <h2 className="text-xl font-bold">Gestão de Clientes</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Usuários que contratam serviços na plataforma</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 md:flex-none">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-xl pointer-events-none">search</span>
            <input
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all w-full md:w-64"
              placeholder="Buscar cliente por nome ou email..."
              type="text"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={4} className="p-6 text-center text-slate-500">Carregando...</td></tr>
              ) : clientsList.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-slate-500">Nenhum cliente encontrado.</td></tr>
              ) : (
                clientsList.map(client => (
                  <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                          <img className="h-full w-full object-cover" alt="Profile" src={client.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} />
                        </div>
                        <p className="font-medium text-sm text-slate-900 dark:text-white">{client.full_name || 'Usuário Sem Nome'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-slate-500">{client.display_id || `#${client.id.substring(0, 8)}`}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase rounded">Ativo</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-red-500 p-2 transition-colors" title="Bloquear Cliente">
                        <span className="material-symbols-outlined">block</span>
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

  const renderOrdersTab = () => (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-2 font-medium">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar ao Dashboard
          </button>
          <h2 className="text-xl font-bold">Gestão Operacional e Financeira</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Acompanhe os pedidos, fluxo de caixa e disputas ativas</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-sm md:text-xl">calendar_month</span> <span className="hidden sm:inline">Últimos 30 Dias</span>
          </button>
          <button className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-sm md:text-xl">download</span> <span className="hidden sm:inline">Exportar Relatório</span>
          </button>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <p className="text-xs text-slate-500 font-medium mb-1">Total Pedidos</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{ordersList.length}</h3>
            <span className="text-xs text-green-500 font-bold"></span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <p className="text-xs text-slate-500 font-medium mb-1">Volume Transacionado (GMV)</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">R$ {(ordersList.reduce((acc, order) => acc + (order.price || 0), 0)).toLocaleString('pt-BR')}</h3>
            <span className="text-xs text-green-500 font-bold"></span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-primary">
          <p className="text-xs text-slate-500 font-medium mb-1">Receita da Plataforma</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">R$ {(ordersList.reduce((acc, order) => acc + ((order.price || 0) * 0.15), 0)).toLocaleString('pt-BR')}</h3>
            <span className="text-xs text-green-500 font-bold"></span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-red-500 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
          <p className="text-xs text-slate-500 font-medium mb-1 text-red-600 dark:text-red-400">Disputas Abertas</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">{ordersList.filter(o => o.status === 'disputed').length}</h3>
            <span className="material-symbols-outlined text-sm text-red-500">warning</span>
          </div>
        </div>
      </div>

      {/* Orders Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button className="px-4 py-1.5 rounded-full text-sm font-semibold bg-slate-800 text-white dark:bg-white dark:text-slate-900 transition-colors">Todos</button>
        <button className="px-4 py-1.5 rounded-full text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Aguardando Pagamento</button>
        <button className="px-4 py-1.5 rounded-full text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Agendados</button>
        <button className="px-4 py-1.5 rounded-full text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Em Andamento</button>
        <button className="px-4 py-1.5 rounded-full text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Concluídos</button>
        <button className="px-4 py-1.5 rounded-full text-sm font-semibold border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1">Disputas <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{ordersList.filter(o => o.status === 'disputed').length}</span></button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID Pedido / Data</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prestador</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor / Taxa</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">Carregando...</td></tr>
              ) : ordersList.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">Nenhum pedido encontrado.</td></tr>
              ) : (
                ordersList.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{order.display_id || `#...${order.id.substring(0, 6)}`}</p>
                        <button className="text-slate-400 hover:text-primary transition-colors" title="Copiar ID" onClick={() => navigator.clipboard.writeText(order.display_id || order.id)}>
                          <span className="material-symbols-outlined text-[14px]">content_copy</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">calendar_today</span> {new Date(order.created_at).toLocaleDateString('pt-BR')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{order.client?.full_name || 'Cliente'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{order.provider?.full_name || '-'}</p>
                      <p className="text-xs text-slate-500">{order.category?.name || 'Serviço'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{order.price ? `R$ ${order.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'Em negociação'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full shadow-sm ${order.status === 'completed' ? 'bg-green-100 dark:bg-green-900/40 text-green-700' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors ml-auto" title="Ver Detalhes do Pedido">
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-500">Mostrando {ordersList.length} pedidos</p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Anterior
            </button>
            <button className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviewsTab = () => (
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
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all w-full md:w-64"
              placeholder="Buscar por termo ofensivo ou nome..."
              type="text"
            />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <p className="text-xs text-slate-500 font-medium mb-1">Média da Plataforma</p>
          <div className="flex items-center gap-2 text-orange-400">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
              {reviewsList.length > 0 ? (reviewsList.reduce((acc, curr) => acc + (curr.rating || 0), 0) / reviewsList.length).toFixed(1) : '0.0'}
            </h3>
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <p className="text-xs text-slate-500 font-medium mb-1">Total de Avaliações</p>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{reviewsList.length}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-red-500 cursor-pointer">
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
            <div key={review.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
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
                    <span className="text-xs text-slate-500 font-medium">• {new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 mb-3 text-sm italic">"{review.comment || 'Sem comentário'}"</p>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                    <div><span className="text-slate-500">Autor:</span> <span className="font-semibold dark:text-white">{review.reviewer?.full_name || 'Usuário'}</span></div>
                    <div><span className="text-slate-500">Destinatário:</span> <span className="font-semibold text-primary">{review.provider?.full_name || 'Prestador'}</span></div>
                    <div><span className="text-slate-500">Pedido:</span> <span className="font-semibold text-blue-500">{review.request_id?.display_id ? review.request_id.display_id : `#${review.request_id?.substring(0, 8) || '...'}`}</span></div>
                  </div>
                </div>
                <div className="flex flex-row md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-4 justify-center">
                  <button className="flex-1 md:flex-none flex justify-center items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 text-red-500 text-xs font-bold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">delete</span> Excluir
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

      </div>
      <div className="flex justify-center mt-6">
        <button className="px-6 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          Carregar Mais
        </button>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div>
        <h2 className="text-xl font-bold">Configurações Globais</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Ajuste taxas, categorias e parâmetros gerais de funcionamento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Taxas do Sistema */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 overflow-hidden relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary/10 text-primary p-2 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <h3 className="text-lg font-bold">Taxas da Plataforma</h3>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Comissão por Serviço Concluído (%)</label>
              <div className="flex items-center gap-4 border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/50">
                <input type="range" min="5" max="30" defaultValue="15" className="w-full accent-primary" />
                <span className="text-lg font-bold w-12 text-right">15%</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Percentual retido pela plataforma sobre o valor cobrado pelo prestador.</p>
            </div>

            <hr className="border-slate-200 dark:border-slate-800" />

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Mensalidade Assinatura VIP Ouro</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-medium">R$</span>
                <input type="number" defaultValue={49.90} className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
              </div>
            </div>

            <button className="w-full py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm">
              Salvar Taxas
            </button>
          </div>
        </section>

        {/* Gestão de Categorias */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-2 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined">category</span>
                </div>
                <h3 className="text-lg font-bold">Gestão de Categorias</h3>
              </div>
              <button className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors" title="Adicionar Categoria">
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-xl pointer-events-none">search</span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-primary transition-all"
                placeholder="Buscar categoria para editar..."
                type="text"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[250px] p-2">
            <ul className="space-y-1">
              {[
                { name: 'Limpeza Residencial', active: true },
                { name: 'Eletricista', active: true },
                { name: 'Encanador', active: true },
                { name: 'Montador de Móveis', active: true },
                { name: 'Aulas Particulares', active: false },
                { name: 'Personal Trainer', active: true }
              ].map((cat, idx) => (
                <li key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group">
                  <span className={`text-sm font-medium ${!cat.active ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <button className={`relative w-10 h-5 rounded-full outline-none transition-colors ${cat.active ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${cat.active ? 'translate-x-5' : 'translate-x-0'}`}></span>
                    </button>
                    <button className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

      </div>
    </div>
  );

  const renderDisputesTab = () => {
    const disputedOrders = ordersList.filter(o => o.status === 'disputed' || o.status === 'conflict');
    
    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-2 font-medium">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar ao Dashboard
            </button>
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Central de Disputas</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Mediação de conflitos entre clientes e prestadores</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 p-4 rounded-xl shadow-sm text-center">
            <span className="material-symbols-outlined text-4xl text-red-500 mb-2">gavel</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{disputedOrders.length}</h3>
            <p className="text-sm text-slate-500">Disputas Abertas</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm text-center">
            <span className="material-symbols-outlined text-4xl text-green-500 mb-2">check_circle</span>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {ordersList.filter(o => o.status === 'resolved' || o.status === 'pay_provider' || o.status === 'refund_client').length}
            </h3>
            <p className="text-sm text-slate-500">Disputas Resolvidas</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
            <h3 className="font-bold">Aguardando Avaliação ({disputedOrders.length})</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {disputedOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">task_alt</span>
                <p>Nenhuma disputa aberta no momento. Tudo limpo!</p>
              </div>
            ) : (
              disputedOrders.map(dispute => (
                <div key={dispute.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 flex flex-col items-center justify-center shrink-0">
                      <span className="material-symbols-outlined">warning</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 rounded">URGENTE</span>
                        <p className="font-bold text-slate-900 dark:text-white">Pedido #{dispute.id.split('-')[0].toUpperCase()}</p>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{dispute.client?.full_name}</span> relata problemas no serviço de <span className="font-medium text-slate-800 dark:text-slate-200">{dispute.provider?.full_name}</span>.
                      </p>
                      <p className="text-xs text-slate-500">Valor Retido: R$ {dispute.price ? dispute.price.toLocaleString('pt-BR') : '0,00'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedDispute(dispute)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-200 dark:hover:border-red-800 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 w-full md:w-auto"
                  >
                    Examinar Caso <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderFinanceTab = () => {
    const concludedOrders = ordersList.filter(o => o.status === 'completed');
    const grossVolume = concludedOrders.reduce((acc, order) => acc + (order.price || 0), 0);
    const platformRevenue = grossVolume * 0.15; // fixed 15% fee assumption
    const avgTicket = concludedOrders.length > 0 ? grossVolume / concludedOrders.length : 0;

    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-2 font-medium">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar ao Dashboard
            </button>
            <h2 className="text-xl font-bold">Relatórios Financeiros</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Visão geral do faturamento e repasses da plataforma</p>
          </div>
          <button onClick={exportToCSV} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[20px]">download</span>
            Exportar CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg inline-flex mb-3">
              <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
            </div>
            <p className="text-sm text-slate-500 font-medium">Volume Bruto Transacionado</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              R$ {grossVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          
          <div className="bg-gradient-to-br from-primary to-primary-hover p-6 rounded-xl shadow-md text-white">
            <div className="p-2 bg-white/20 rounded-lg inline-flex mb-3">
              <span className="material-symbols-outlined text-2xl text-white">savings</span>
            </div>
            <p className="text-sm text-white/80 font-medium">Receita da Plataforma (15%)</p>
            <h3 className="text-3xl font-black mt-1">
              R$ {platformRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg inline-flex mb-3">
              <span className="material-symbols-outlined text-2xl">monitoring</span>
            </div>
            <p className="text-sm text-slate-500 font-medium">Ticket Médio por Serviço</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              R$ {avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold mb-6">Desempenho Simplificado</h3>
            <div className="space-y-4">
              {/* CSS Progress Bar Mockup for Service Types */}
              {['Limpeza', 'Eletricista', 'Encanador', 'Mudanças'].map((cat, idx) => {
                const percentage = [45, 25, 20, 10][idx];
                return (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{cat}</span>
                      <span className="text-slate-500">{percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-6 text-center">* Dados ilustrativos de distribuição por categoria.</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-center items-center text-center">
             <div className="w-20 h-20 bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl">inventory</span>
             </div>
             <h3 className="font-bold text-lg mb-2">Exportar Relatório</h3>
             <p className="text-sm text-slate-500 mb-6">
               Baixe a planilha contendo os dados brutos de todos os pedidos finalizados com sucesso para realizar seus fechamentos de mês.
             </p>
             <button onClick={exportToCSV} className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
               <span className="material-symbols-outlined text-[18px]">table_chart</span>
               Gerar Planilha
             </button>
          </div>
        </div>

      </div>
    );
  };

  const renderCategoriesTab = () => (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-2 font-medium">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar ao Dashboard
          </button>
          <h2 className="text-xl font-bold">Categorias de Serviço</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie os tipos de serviços oferecidos na plataforma</p>
        </div>
        <button onClick={() => openCategoryModal()} className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Nova Categoria
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ícone</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Preço Base</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">Carregando categorias...</td></tr>
              ) : categoriesList.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">Nenhuma categoria cadastrada.</td></tr>
              ) : (
                categoriesList.map(cat => (
                  <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 w-16 text-center">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined">{cat.icon || 'handyman'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {cat.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate" title={cat.description}>
                      {cat.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                      {cat.base_price ? `R$ ${cat.base_price.toLocaleString('pt-BR')}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
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
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display">

      {/* Header Section */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
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
              className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>Sair</span>
            </button>
            <button onClick={() => onNavigate('chatList')} className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Mensagens">
              <span className="material-symbols-outlined">chat</span>
              <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-primary"></span>
            </button>
            <button className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Notificações">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-500"></span>
            </button>
            <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold">
              AD
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-8 pb-32 md:pb-32">
        {activeTab === 'dashboard' && renderDashboardTab()}
        {activeTab === 'providers' && renderProvidersTab()}
        {activeTab === 'clients' && renderClientsTab()}
        {activeTab === 'orders' && renderOrdersTab()}
        {activeTab === 'reviews' && renderReviewsTab()}
        {activeTab === 'categories' && renderCategoriesTab()}
        {activeTab === 'disputes' && renderDisputesTab()}
        {activeTab === 'finance' && renderFinanceTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 fixed bottom-0 left-0 right-0 z-20 transition-transform">
        <div className="max-w-7xl mx-auto flex justify-around p-2 md:py-3">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'dashboard' ? 'text-primary' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>
            <span className="material-symbols-outlined text-[24px]" style={activeTab === 'dashboard' ? { fontVariationSettings: "'FILL' 1" } : {}}>grid_view</span>
            <span className="text-[10px] font-medium hidden md:block">Dashboard</span>
          </button>
          <button onClick={() => setActiveTab('providers')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'providers' ? 'text-primary' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>
            <span className="material-symbols-outlined text-[24px]" style={activeTab === 'providers' ? { fontVariationSettings: "'FILL' 1" } : {}}>engineering</span>
            <span className="text-[10px] font-medium hidden md:block">Prestadores</span>
          </button>
          <button onClick={() => setActiveTab('clients')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'clients' ? 'text-primary' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>
            <span className="material-symbols-outlined text-[24px]" style={activeTab === 'clients' ? { fontVariationSettings: "'FILL' 1" } : {}}>group</span>
            <span className="text-[10px] font-medium hidden md:block">Clientes</span>
          </button>
          <button onClick={() => setActiveTab('orders')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'orders' ? 'text-primary' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>
            <span className="material-symbols-outlined text-[24px]" style={activeTab === 'orders' ? { fontVariationSettings: "'FILL' 1" } : {}}>receipt</span>
            <span className="text-[10px] font-medium hidden md:block">Pedidos</span>
          </button>
          <button onClick={() => setActiveTab('reviews')} className={`hidden lg:flex flex-col items-center gap-1 transition-colors ${activeTab === 'reviews' ? 'text-primary' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>
            <span className="material-symbols-outlined text-[24px]" style={activeTab === 'reviews' ? { fontVariationSettings: "'FILL' 1" } : {}}>reviews</span>
            <span className="text-[10px] font-medium hidden md:block">Reviews</span>
          </button>
          <button onClick={() => setActiveTab('categories')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'categories' ? 'text-primary' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>
            <span className="material-symbols-outlined text-[24px]" style={activeTab === 'categories' ? { fontVariationSettings: "'FILL' 1" } : {}}>category</span>
            <span className="text-[10px] font-medium hidden md:block">Categorias</span>
          </button>
          <button onClick={() => setActiveTab('disputes')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'disputes' ? 'text-red-500' : 'text-slate-500 dark:text-slate-400 hover:text-red-500'}`}>
            <span className="material-symbols-outlined text-[24px] relative" style={activeTab === 'disputes' ? { fontVariationSettings: "'FILL' 1" } : {}}>
              gavel
              {ordersList.filter(o => o.status === 'disputed').length > 0 && <span className="absolute -top-1 -right-1 flex h-3 w-3 rounded-full bg-red-500 border-2 border-white dark:border-slate-900"></span>}
            </span>
            <span className="text-[10px] font-medium hidden md:block">Disputas</span>
          </button>
          <button onClick={() => setActiveTab('finance')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'finance' ? 'text-primary' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>
            <span className="material-symbols-outlined text-[24px]" style={activeTab === 'finance' ? { fontVariationSettings: "'FILL' 1" } : {}}>payments</span>
            <span className="text-[10px] font-medium hidden md:block">Financeiro</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'settings' ? 'text-primary' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>
            <span className="material-symbols-outlined text-[24px]" style={activeTab === 'settings' ? { fontVariationSettings: "'FILL' 1" } : {}}>settings</span>
            <span className="text-[10px] font-medium hidden md:block">Configurações</span>
          </button>
          <button onClick={() => onNavigate('home')} className="flex flex-col items-center gap-1 md:hidden text-slate-500 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[24px]">home</span>
          </button>
        </div>
      </nav>

      {/* KYC Modal */}
      {selectedProviderForKYC && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
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
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Documento de Identidade (Frente)</p>
                  <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl">id_card</span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Selfie com Documento</p>
                  <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl">face</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold mb-2">Detalhes Adicionais</p>
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <p><strong>Status Atual:</strong> {selectedProviderForKYC.status || 'active'}</p>
                  <p><strong>Telefone:</strong> {selectedProviderForKYC.phone || 'Não informado'}</p>
                  <p><strong>Criado em:</strong> {new Date(selectedProviderForKYC.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-end bg-slate-50 dark:bg-slate-800/30">
              <button 
                onClick={() => handleUpdateProviderStatus(selectedProviderForKYC.id, 'blocked')}
                className="px-6 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-xl font-bold transition-colors"
              >
                Bloquear / Recusar
              </button>
              <button
                onClick={() => handleUpdateProviderStatus(selectedProviderForKYC.id, 'active')} 
                className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-colors shadow-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span> Aprovar Perfil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Add/Edit Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
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
                  {categoryForm.icon_name && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">{categoryForm.icon_name}</span> Selecionado
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 p-3 border border-slate-200 dark:border-slate-700 rounded-xl h-32 overflow-y-auto bg-slate-50 dark:bg-slate-800/20">
                  {AVAILABLE_ICONS.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setCategoryForm({...categoryForm, icon_name: icon})}
                      className={`p-2 rounded-lg flex items-center justify-center transition-all ${categoryForm.icon_name === icon ? 'bg-primary text-white shadow-md scale-110 relative z-10' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
                      title={icon}
                    >
                      <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Preço Base Exibido (R$)</label>
                <input 
                  type="number" 
                  value={categoryForm.base_price} 
                  onChange={e => setCategoryForm({...categoryForm, base_price: e.target.value})}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  placeholder="Visão ilustrativa. Deixe 0.00 se o prestador negociar na hora."
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/30">
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-5 py-2.5 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveCategory}
                disabled={!categoryForm.name}
                className="px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">save</span> 
                {editingCategory ? 'Salvar Edição' : 'Criar Categoria'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
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
                
                {/* Client Box */}
                <div className="flex-1 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Lado do Cliente</div>
                  <div className="flex items-center gap-3 mb-3">
                    <img src={selectedDispute.client?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} alt="Cliente" className="w-10 h-10 rounded-full object-cover bg-slate-200" />
                    <div>
                      <p className="font-bold">{selectedDispute.client?.full_name || 'Usuário'}</p>
                      <p className="text-xs text-slate-500">Solicitante</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 p-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                    "O serviço não foi prestado conforme o combinado e o prestador danificou a pintura da minha parede."
                  </p>
                </div>

                {/* Provider Box */}
                <div className="flex-1 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Lado do Prestador</div>
                  <div className="flex items-center gap-3 mb-3">
                    <img src={selectedDispute.provider?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} alt="Prestador" className="w-10 h-10 rounded-full object-cover bg-slate-200" />
                    <div>
                      <p className="font-bold">{selectedDispute.provider?.full_name || 'Prestador'}</p>
                      <p className="text-xs text-slate-500">Profissional</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 p-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                    "Fiz a instalação perfeitamente, a parede já estava descascada antes de eu começar."
                  </p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-900/50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-amber-800 dark:text-amber-500 font-bold">Valor Retido / Em Disputa</p>
                    <p className="text-xs text-amber-700 dark:text-amber-600">O pagamento está em escrow na plataforma.</p>
                  </div>
                  <p className="text-2xl font-black text-amber-600">R$ {selectedDispute.price ? selectedDispute.price.toLocaleString('pt-BR') : '0,00'}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 bg-slate-50 dark:bg-slate-800/30 justify-end">
              <button 
                onClick={() => handleResolveDispute(selectedDispute.id, 'refund_client')}
                className="flex-1 md:flex-none px-6 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">undo</span> Estornar Cliente
              </button>
              <button 
                onClick={() => handleResolveDispute(selectedDispute.id, 'pay_provider')}
                className="flex-1 md:flex-none px-6 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">payments</span> Pagar Prestador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
