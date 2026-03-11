import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { useAuth } from '../AuthContext';
import ProviderMobileNav from '../components/ProviderMobileNav';
import { supabase } from '../lib/supabase';

export default function ProviderDashboardScreen({ onNavigate }: NavigationProps) {
  const { logout, profile, user } = useAuth();
  const [stats, setStats] = useState({ requests: 0, views: 0 });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch new requests count targeting this provider specifically, or global if we want
        const { count: reqCount } = await supabase
          .from('service_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open')
          .or(`provider_id.is.null,provider_id.eq.${user.id}`);
          
        setStats(prev => ({ ...prev, requests: reqCount || 0 }));

        // Fetch recent requests
        const { data: recentReqs } = await supabase
          .from('service_requests')
          .select(`
            id,
            title,
            status,
            created_at,
            profiles!service_requests_client_id_fkey(full_name, avatar_url),
            service_categories(name, icon)
          `)
          .in('status', ['open', 'accepted', 'in_progress'])
          .or(`provider_id.is.null,provider_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(3);

        if (recentReqs) setRecentRequests(recentReqs);

      } catch (err) {
        console.error("Dashboard error", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user]);

  const handleLogout = () => {
    logout();
    onNavigate('auth');
  };
  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col antialiased">
      <div className="relative flex min-h-screen w-full flex-col mx-auto bg-white dark:bg-slate-900 shadow-xl overflow-x-hidden">

        {/* Header */}
        <header className="flex items-center bg-white dark:bg-slate-900 p-4 border-b border-slate-100 dark:border-slate-800 justify-between sticky top-0 z-10">
          <div className="flex size-10 shrink-0 items-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" onClick={() => onNavigate('profile')}>
            <div className="bg-center bg-no-repeat aspect-square bg-cover size-full cursor-pointer" style={{ backgroundImage: `url('${profile?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}')` }}></div>
          </div>
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 ml-3 cursor-pointer" onClick={() => onNavigate('home')}>Dashboard</h2>
          <div className="flex gap-2">
            <button onClick={() => onNavigate('chatList')} className="flex size-10 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 relative hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Mensagens">
              <span className="material-symbols-outlined">chat</span>
              <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-primary"></span>
            </button>
            <button onClick={() => onNavigate('notifications')} className="flex size-10 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 relative hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Notificações">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-500"></span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 p-2 text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-bold"
              title="Sair"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="hidden sm:inline text-sm">Sair</span>
            </button>
          </div>
        </header>

        {/* Welcome Message */}
        <section className="px-4 pt-6 pb-2">
          <h1 className="text-slate-900 dark:text-slate-100 text-2xl font-bold leading-tight">Olá, {profile?.full_name || 'Profissional'}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-normal mt-1">Confira o desempenho do seu perfil hoje.</p>
        </section>

        {/* Stats Cards */}
        <section className="grid grid-cols-3 gap-3 p-4">
          <div className="flex flex-col gap-1 rounded-xl p-4 bg-primary/10 border border-primary/20">
            <p className="text-slate-600 dark:text-slate-300 text-xs font-medium">Visitas</p>
            <p className="text-primary tracking-tight text-xl font-bold">{stats.views > 0 ? stats.views : '0'}</p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl p-4 bg-primary/10 border border-primary/20">
            <p className="text-slate-600 dark:text-slate-300 text-xs font-medium">Pedidos</p>
            <p className="text-primary tracking-tight text-xl font-bold">{stats.requests}</p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl p-4 bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => onNavigate('reviews')}>
            <p className="text-slate-600 dark:text-slate-300 text-xs font-medium">Avaliação</p>
            <div className="flex items-center gap-1">
              <p className="text-primary tracking-tight text-xl font-bold">{profile?.stats?.rating?.toFixed(1) || '-'}</p>
              <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>star_half</span>
            </div>
          </div>
        </section>
        {/* Verification Banner */}
        <section className="px-4 mt-2">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 shadow-lg shadow-blue-500/20 text-white relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex gap-4 items-start md:items-center">
                <div className="size-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white">shield_person</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Ganhe o Selo de Verificado</h3>
                  <p className="text-sm text-blue-100 mt-1 max-w-sm">
                    Envie seus documentos para aprovação e transmita mais confiança para novos clientes.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('providerVerification')}
                className="bg-white text-blue-700 font-bold py-2.5 px-5 rounded-xl text-sm hover:bg-blue-50 transition-colors shadow-sm whitespace-nowrap"
              >
                Verificar Agora
              </button>
            </div>

            {/* BG pattern */}
            <span className="material-symbols-outlined absolute -bottom-8 -right-4 text-[120px] text-white opacity-5 rotate-12 pointer-events-none">verified</span>
          </div>
        </section>
        {/* Quick Actions */}
        <section className="px-4 py-2">
          <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold mb-3">Ações Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-y border-slate-100 dark:border-slate-800 py-4">
            <button onClick={() => onNavigate('userProfile')} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer group">
              <div className="flex size-10 items-center justify-center rounded-lg bg-white dark:bg-slate-900 text-primary shadow-sm group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined">edit_square</span>
              </div>
              <span className="flex-1 text-left font-medium text-slate-700 dark:text-slate-200">Editar Perfil</span>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
            <button onClick={() => alert('Em breve você poderá gerenciar as categorias e preços dos seus serviços reais cadastrados no Supabase.')} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer group">
              <div className="flex size-10 items-center justify-center rounded-lg bg-white dark:bg-slate-900 text-primary shadow-sm group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined">home_repair_service</span>
              </div>
              <span className="flex-1 text-left font-medium text-slate-700 dark:text-slate-200">Meus Serviços</span>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
            <button onClick={() => onNavigate('plan')} className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors cursor-pointer group">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-white shadow-sm group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined">workspace_premium</span>
              </div>
              <span className="flex-1 text-left font-medium text-primary">Assinatura Afiliado</span>
              <span className="material-symbols-outlined text-primary">chevron_right</span>
            </button>
          </div>
        </section>

        {/* Recent Notifications / Leads */}
        <section className="px-4 py-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-slate-900 dark:text-slate-100 text-base font-bold">Novos Pedidos & Mensagens</h3>
            <button onClick={() => onNavigate('providerRequests')} className="text-xs font-semibold text-primary hover:underline">Ver todos</button>
          </div>
          <div className="space-y-3">

            {loading ? (
              <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <span className="material-symbols-outlined animate-spin text-2xl text-slate-400">progress_activity</span>
              </div>
            ) : recentRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">inbox</span>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Nenhum pedido ou mensagem ainda.</p>
                <p className="text-xs text-slate-500 mt-1">Seu perfil já está visível para novos clientes.</p>
              </div>
            ) : (
              recentRequests.map(req => (
                <div key={req.id} onClick={() => onNavigate('providerRequests')} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer hover:border-primary transition-colors">
                  <div className="size-12 rounded-full bg-cover bg-center shrink-0 border border-slate-100 dark:border-slate-700" style={{ backgroundImage: `url('${req.profiles?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}')` }}></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{req.profiles?.full_name || 'Cliente'}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5"><span className="material-symbols-outlined text-[14px]">{req.service_categories?.icon || 'work'}</span> {req.service_categories?.name || 'Serviço'}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-1">{req.status === 'open' ? 'Novo!' : req.status}</span>
                    <span className="text-xs text-slate-400">{new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}

          </div>
        </section>

        {/* Faturamento Mini Card */}
        <section className="px-4 pb-6">
          <div
            onClick={() => onNavigate('providerWallet')}
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:border-primary dark:hover:border-primary transition-colors group"
          >
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1 group-hover:text-primary transition-colors">Minha Carteira</p>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black leading-none group-hover:text-primary transition-colors">R$ 0,00</span>
                <span className="text-xs text-emerald-500 font-bold mb-0.5">Disponível</span>
              </div>
            </div>
            <div className="size-10 rounded-full bg-slate-50 dark:bg-slate-900 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">account_balance_wallet</span>
            </div>
          </div>
        </section>

        {/* Spacer for Bottom Nav */}
        <div className="h-20"></div>

        <ProviderMobileNav onNavigate={onNavigate} currentScreen="dashboard" />
      </div>
    </div>
  );
}
