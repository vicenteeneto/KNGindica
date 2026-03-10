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
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch for admin if needed, but for now fetch all to simulate dashboard
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        // 1. Fetch profiles for stats and list
        const { data: profiles } = await supabase.from('profiles').select('*');
        const providers = profiles?.filter(p => p.role === 'provider') || [];
        const clients = profiles?.filter(p => p.role === 'client') || [];

        // 2. Fetch requests for stats and orders list
        const { data: requests } = await supabase.from('service_requests').select('*, client:profiles!service_requests_client_id_fkey(full_name, avatar_url), provider:profiles!service_requests_provider_id_fkey(full_name, avatar_url), category:service_categories(name)').order('created_at', { ascending: false });
        const compServ = requests?.filter(r => r.status === 'completed') || [];

        // Mock revenue (e.g. 15% of mock prices)
        const revenue = compServ.length * 25.50; // simple mock

        // 3. Fetch reviews
        const { data: reviews } = await supabase.from('reviews').select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name), provider:profiles!reviews_provider_id_fkey(full_name, role)').order('created_at', { ascending: false });

        setStats({
          providers: providers.length,
          clients: clients.length,
          completedServices: compServ.length,
          platformRevenue: revenue
        });

        setProvidersList(providers);
        setOrdersList(requests || []);
        setReviewsList(reviews || []);
      } catch (e) {
        console.error("Error fetching admin data", e);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

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
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined">engineering</span>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total de Prestadores</p>
            <p className="text-2xl font-bold">{stats.providers}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined">group</span>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total de Clientes</p>
            <p className="text-2xl font-bold">{stats.clients}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined">task_alt</span>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Serviços Concluídos</p>
            <p className="text-2xl font-bold">{stats.completedServices}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined">payments</span>
              </div>
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
                            <p className="text-xs text-slate-500">{provider.id.substring(0, 8)}</p>
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
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">0.0</span>
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
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Ricardo Mendes</span>
                  <span className="text-[10px] text-slate-400">Há 2 horas</span>
                </div>
                <div className="flex text-orange-400">
                  {[1, 2, 3, 4, 5].map(i => (
                    <span key={i} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 italic">"Excelente atendimento do Carlos. Chegou no horário e resolveu o problema rapidamente. Recomendo muito!"</p>
              <p className="mt-2 text-[10px] font-bold text-primary uppercase">Para: Carlos Silva (Eletricista)</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">Juliana Lopes</span>
                  <span className="text-[10px] text-slate-400">Há 5 horas</span>
                </div>
                <div className="flex text-orange-400">
                  {[1, 2, 3, 4].map(i => (
                    <span key={i} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  ))}
                  <span className="material-symbols-outlined text-sm">star_half</span>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 italic">"O design ficou maravilhoso, exatamente como pedi. Mariana é muito talentosa."</p>
              <p className="mt-2 text-[10px] font-bold text-primary uppercase">Para: Mariana Costa (Designer)</p>
            </div>
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
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary p-2 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined">receipt_long</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">#ORD-2394</p>
                    <p className="text-xs text-slate-500">Serviço de Pintura • R$ 450,00</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded uppercase">Em Andamento</span>
              </div>
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary p-2 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined">receipt_long</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">#ORD-2393</p>
                    <p className="text-xs text-slate-500">Consultoria Jurídica • R$ 1.200,00</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded uppercase">Concluído</span>
              </div>
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 text-primary p-2 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined">receipt_long</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">#ORD-2392</p>
                    <p className="text-xs text-slate-500">Reparo Ar Condicionado • R$ 180,00</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold rounded uppercase">Cancelado</span>
              </div>
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
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">1,240</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-green-500">
          <p className="text-xs text-slate-500 font-medium mb-1">Ativos</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">1,180</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-yellow-500">
          <p className="text-xs text-slate-500 font-medium mb-1">Em Análise (KYC)</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">45</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-red-500">
          <p className="text-xs text-slate-500 font-medium mb-1">Bloqueados</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">15</h3>
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

              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                      <img className="h-full w-full object-cover" alt="Profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnMVXlAm2PcGLz-sLY7rG--yL8zLJOs9L5xoTDJDTskdL-E4_Tbic31AwKnCMVULA5ihBND4Ud7UJKROZ2z3eiGQvlP8zvY5lplvoGXkdaVd0ykZ3eMJaJMIic1aedja1pq2q-NRqfQjHI-YYlRmnsOjpR6_Q3LUUv_veLReaplcgAM3nNCkTFlgFZOCqKzVxquAzOJYboWG-j3QHvYQE71DWY7NOQpIZbx9O2Bmzjjpx9CaIHXGehSMTIE5s53tYqZrnzAI5hm1I" />
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">Carlos Silva</p>
                        <span className="material-symbols-outlined text-blue-500 text-[14px]" title="Identidade Verificada">verified</span>
                      </div>
                      <p className="text-xs text-slate-500">carlos.silva@prestador.com</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Eletricista Residencial</p>
                  <p className="text-xs text-slate-500">142 concluídos • <span className="text-green-600 font-semibold">R$ 14.5k</span></p>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-[10px] font-bold uppercase rounded-full shadow-sm">VIP Ouro</span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full flex items-center gap-1 w-max">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Ativo
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-orange-400">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">4.8</span>
                    </div>
                    <span className="text-[10px] text-slate-500">(98 reviews)</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Ver Perfil Completo">
                      <span className="material-symbols-outlined text-[20px]">visibility</span>
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Editar">
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 self-center mx-1"></div>
                    <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Suspender Conta">
                      <span className="material-symbols-outlined text-[20px]">block</span>
                    </button>
                  </div>
                </td>
              </tr>

              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                      <span className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-sm bg-slate-200 dark:bg-slate-800">JR</span>
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-yellow-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">João Roberto</p>
                      <p className="text-xs text-slate-500">joao.r@email.com</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Montador de Móveis</p>
                  <p className="text-xs text-slate-500">0 concluídos • R$ 0</p>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase rounded-full">Básico</span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 text-xs font-semibold rounded-full flex items-center gap-1 w-max">
                    <span className="material-symbols-outlined text-[12px]">schedule</span> Em Análise (KYC)
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-400 italic">Novo</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <button className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">fact_check</span> Aprovar Doc
                    </button>
                    <button className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                      Recusar
                    </button>
                  </div>
                </td>
              </tr>

              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                      <img className="h-full w-full object-cover grayscale opacity-60" alt="Profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLSw6idectrBtJ67W7Kue22sNR3SHP9zVfNhqPdJcHLOLsBHDVJJS3YqGc9GK9pnWJsw_GIMiymlyFCn3qTsM-QCDMhDGhSBTa_xeDfv-hjCYYN1luyHQqVUdbqu9TG-_DHhh52S8QDwnEbSMmyclkB-ss9-xTJZ3yNfR3u7GI0-F26ATWAtFF7RnGqaLBnLEt7eRNcrEbA4NO5NDknOUPESqN0whNAJdPF2mHjPB5L2IKvEt5_REWGyd8Tt1iWD2_aHDOMz2S-ys" />
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white line-through text-slate-400">Roberto Alves</p>
                      <p className="text-xs text-slate-500">roberto.alves@encanador.net</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 opacity-60">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Encanador Profissional</p>
                  <p className="text-xs text-slate-500">32 concluídos • R$ 3.2k</p>
                </td>
                <td className="px-6 py-4 opacity-60">
                  <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase rounded-full">Básico</span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-semibold rounded-full flex items-center gap-1 w-max">
                    <span className="material-symbols-outlined text-[12px]">lock</span> Bloqueado
                  </span>
                </td>
                <td className="px-6 py-4 opacity-60">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-orange-400">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">3.2</span>
                    </div>
                    <span className="text-[10px] text-slate-500">(41 reviews)</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 ml-auto">
                    <span className="material-symbols-outlined text-[14px]">lock_open</span> Desbloquear
                  </button>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">Mostrando 3 de 1,240 prestadores</p>
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

  const renderOrdersTab = () => (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
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
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">1,452</h3>
            <span className="text-xs text-green-500 font-bold">+12%</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <p className="text-xs text-slate-500 font-medium mb-1">Volume Transacionado (GMV)</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">R$ 384k</h3>
            <span className="text-xs text-green-500 font-bold">+5%</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-primary">
          <p className="text-xs text-slate-500 font-medium mb-1">Receita da Plataforma</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">R$ 57.6k</h3>
            <span className="text-xs text-green-500 font-bold">+8%</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center border-l-4 border-l-red-500 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
          <p className="text-xs text-slate-500 font-medium mb-1 text-red-600 dark:text-red-400">Disputas Abertas</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">12</h3>
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
        <button className="px-4 py-1.5 rounded-full text-sm font-semibold border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1">Disputas <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">12</span></button>
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
                      <p className="font-bold text-sm text-slate-900 dark:text-white mb-1">#{order.id.substring(0, 8)}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">calendar_today</span> {new Date(order.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{order.client?.full_name || 'Cliente'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{order.provider?.full_name || '-'}</p>
                      <p className="text-xs text-slate-500">{order.category?.name || 'Serviço'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Em negociação</p>
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
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">4.6</h3>
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
            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">24</h3>
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
                    <div><span className="text-slate-500">Pedido:</span> <span className="font-semibold text-blue-500">#{review.request_id?.substring(0, 8)}</span></div>
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

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 space-y-8 pb-24 md:pb-8">
        {activeTab === 'dashboard' && renderDashboardTab()}
        {activeTab === 'providers' && renderProvidersTab()}
        {activeTab === 'orders' && renderOrdersTab()}
        {activeTab === 'reviews' && renderReviewsTab()}
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
            <span className="material-symbols-outlined text-[24px]" style={activeTab === 'providers' ? { fontVariationSettings: "'FILL' 1" } : {}}>groups</span>
            <span className="text-[10px] font-medium hidden md:block">Prestadores</span>
          </button>
          <button onClick={() => setActiveTab('orders')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'orders' ? 'text-primary' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>
            <span className="material-symbols-outlined text-[24px]" style={activeTab === 'orders' ? { fontVariationSettings: "'FILL' 1" } : {}}>receipt</span>
            <span className="text-[10px] font-medium hidden md:block">Pedidos</span>
          </button>
          <button onClick={() => setActiveTab('reviews')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'reviews' ? 'text-primary' : 'text-slate-500 dark:text-slate-400 hover:text-primary'}`}>
            <span className="material-symbols-outlined text-[24px]" style={activeTab === 'reviews' ? { fontVariationSettings: "'FILL' 1" } : {}}>reviews</span>
            <span className="text-[10px] font-medium hidden md:block">Reviews</span>
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
    </div>
  );
}
