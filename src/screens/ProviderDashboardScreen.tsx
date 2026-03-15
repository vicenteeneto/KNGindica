import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { useAuth } from '../AuthContext';
import ProviderMobileNav from '../components/ProviderMobileNav';
import { supabase } from '../lib/supabase';

export default function ProviderDashboardScreen({ onNavigate }: NavigationProps) {
  const { logout, profile, user } = useAuth();
  const [stats, setStats] = useState({ requests: 0, visits: 0, leads: 0, earnings: 0, pending: 0 });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  

  useEffect(() => {
    if (!user) return;
    
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Fetch distinct lead event counts
        const { data: leadData } = await supabase
          .from('lead_events')
          .select('type')
          .eq('provider_id', user.id);
          
        const visits = leadData?.filter(l => l.type === 'profile_view').length || 0;
        const leads = leadData?.filter(l => l.type === 'whatsapp_click' || l.type === 'chat_start').length || 0;

        // 2. Fetch active requests count
        const { count: reqCount } = await supabase
          .from('service_requests')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', user.id)
          .in('status', ['open', 'proposed', 'accepted', 'awaiting_payment', 'paid', 'in_service']);
          
        // 3. Fetch earnings
        const { data: walletData } = await supabase
          .from('provider_wallet_summary')
          .select('total_earnings')
          .eq('provider_id', user.id)
          .maybeSingle();

        // 3b. Fetch pending earnings
        const { data: pendingReqs } = await supabase
          .from('service_requests')
          .select('budget_amount, platform_fee')
          .eq('provider_id', user.id)
          .in('status', ['paid', 'in_service']);

        const pendingBalance = pendingReqs?.reduce((acc, req) => acc + (Number(req.budget_amount || 0) - Number(req.platform_fee || 0)), 0) || 0;

        setStats({ 
          requests: reqCount || 0, 
          visits: visits,
          leads: leads,
          earnings: walletData?.total_earnings || 0,
          pending: pendingBalance
        });

        // 4. Fetch recent requests
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

  const statusMap: Record<string, string> = {
    'open': 'Novo!',
    'proposed': 'Proposta Enviada',
    'accepted': 'Aceito',
    'awaiting_payment': 'Pagamento Pendente',
    'paid': 'Pago',
    'in_service': 'Em Execução',
    'completed': 'Finalizado',
    'cancelled': 'Cancelado'
  };

  const renderHeader = () => (
    <header className="flex items-center bg-white dark:bg-slate-900 p-3 border-b border-slate-100 dark:border-slate-800 justify-between sticky top-0 z-10 transition-all">
      <div className="flex size-9 shrink-0 items-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" onClick={() => onNavigate('profile', { professionalId: user?.id })}>
        <div className="bg-center bg-no-repeat aspect-square bg-cover size-full cursor-pointer" style={{ backgroundImage: `url('${profile?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}')` }}></div>
      </div>
      <h2 className="text-slate-900 dark:text-slate-100 text-base font-black leading-tight tracking-tight flex-1 ml-3 cursor-pointer">Dashboard</h2>
      <div className="flex gap-1.5">
        <button onClick={() => onNavigate('chatList')} className="flex size-9 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 relative hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Mensagens">
          <span className="material-symbols-outlined text-[20px]">chat</span>
          <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5 rounded-full bg-primary"></span>
        </button>
        <button onClick={() => onNavigate('notifications')} className="flex size-9 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 relative hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Notificações">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5 rounded-full bg-red-500"></span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 p-1.5 text-slate-500 hover:text-red-500 transition-colors"
          title="Sair"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </header>
  );

  const generateInsights = () => {
    return [{
      title: "Consulte seu Perfil",
      desc: "Mantenha seus dados sempre atualizados para atrair mais clientes.",
      icon: "person",
      action: () => onNavigate('userProfile')
    }];
  };

  const renderDashboardTab = () => (
    <>
      <section className="px-4 pt-4 pb-1 text-center sm:text-left">
        <h1 className="text-slate-900 dark:text-slate-100 text-xl font-black leading-tight italic tracking-tighter">Olá, {profile?.full_name?.split(' ')[0] || 'Profissional'}! 👋</h1>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Visão Geral do seu Negócio</p>
      </section>


      {/* Alvo Insights - Performance Central */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden relative group">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">
              Alvo Insights
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tempo Real</span>
            </div>
          </div>
          <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">insights</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Visitas</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">{stats.visits}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Views</span>
            </div>
            <div className="absolute -right-1 -bottom-1 opacity-5">
              <span className="material-symbols-outlined text-4xl">visibility</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Leads</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-500 leading-none">{stats.leads}</span>
              <span className="text-[8px] font-bold text-emerald-500/60 font-black tracking-tighter uppercase">Contatos</span>
            </div>
            <div className="absolute -right-1 -bottom-1 opacity-5 text-emerald-500">
              <span className="material-symbols-outlined text-4xl">chat</span>
            </div>
          </div>
        </div>

        {/* Funil de Conversão */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl mb-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 group-hover:rotate-45 transition-transform duration-700">
            <span className="material-symbols-outlined text-8xl text-white">analytics</span>
          </div>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                Taxa de Conversão
                <span className="bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded text-[8px]">SMART METRIC</span>
              </h4>
              <p className="text-slate-400 text-[10px] mt-1 font-medium italic">Visitas convertidas em contatos reais</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-white leading-none">
                {stats.visits > 0 ? ((stats.leads / stats.visits) * 100).toFixed(1) : '0.0'}%
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="h-3 bg-white/5 rounded-full overflow-hidden flex shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-primary to-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.6)] transition-all duration-1000 ease-out flex items-center justify-end px-1" 
                style={{ width: `${stats.visits > 0 ? Math.max(5, (stats.leads / stats.visits) * 100) : 0}%` }}
              >
                 <div className="size-1 rounded-full bg-white animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Dica Estratégica */}
        {generateInsights().slice(0, 1).map((insight, idx) => (
          <div 
            key={idx} 
            onClick={() => insight.action?.()}
            className={`p-3.5 rounded-xl border-2 border-primary/20 bg-primary/5 dark:bg-primary/10 flex items-center gap-3 transition-all group ${insight.action ? 'cursor-pointer hover:border-primary active:scale-[0.98]' : ''}`}
          >
            <div className="size-10 rounded-lg bg-primary text-white flex items-center justify-center shadow-md shadow-primary/30 shrink-0 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[20px]">{insight.icon}</span>
            </div>
            <div className="flex-1">
              <h5 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5 leading-none">
                {insight.title}
              </h5>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight font-medium">
                {insight.desc}
              </p>
            </div>
            {insight.action && (
              <span className="material-symbols-outlined text-primary text-base group-hover:translate-x-1 transition-transform">chevron_right</span>
            )}
          </div>
        ))}
      </section>

      {/* Ações Rápidas */}
      <section className="px-4 pb-6">
        <h3 className="font-black text-slate-900 dark:text-slate-100 mb-4 ml-1 flex items-center gap-2 text-sm uppercase tracking-tight">
          <span className="material-symbols-outlined text-slate-400 text-[20px]">bolt</span>
          Ações Rápidas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button onClick={() => onNavigate('userProfile')} className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary transition-all cursor-pointer group shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined">person</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Gerenciar Perfil</p>
              <p className="text-[10px] text-slate-500">Dados, Portfólio e Configurações</p>
            </div>
            <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
          </button>
          
          <button onClick={() => onNavigate('chatList')} className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary transition-all cursor-pointer group shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined">chat</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Conversas</p>
              <p className="text-[10px] text-slate-500">Falar com clientes</p>
            </div>
            <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
          </button>
        </div>
      </section>

      {/* Cards Auxiliares */}
      <section className="px-4 pb-4">
         <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
               <div className="size-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                  <span className="material-symbols-outlined text-sm">assignment</span>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ativos</p>
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100">{stats.requests}</p>
               </div>
            </div>
            <div onClick={() => onNavigate('reviews')} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3 cursor-pointer hover:border-primary transition-colors">
               <div className="size-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500">
                  <span className="material-symbols-outlined text-sm">star</span>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Média</p>
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100">{profile?.stats?.rating?.toFixed(1) || '0.0'}</p>
               </div>
            </div>
         </div>
      </section>

      {/* Carteira e Saldo */}
      <section className="px-4 pb-8">
        <h3 className="font-black text-slate-900 dark:text-slate-100 mb-3 ml-1 flex items-center gap-2 text-[10px] uppercase tracking-widest">
          <span className="material-symbols-outlined text-slate-400 text-[18px]">payments</span>
          Carteira Financeira
        </h3>
        <div onClick={() => onNavigate('providerWallet')} className="group flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary transition-all cursor-pointer overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/[0.02] pointer-events-none" />
          <div className="flex flex-col gap-0.5 relative z-10">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 group-hover:text-primary transition-colors">Saldo Atualizado</p>
            <div className="flex items-end gap-1.5">
              <span className="text-2xl font-black leading-none group-hover:text-primary transition-colors">
                R$ {stats.earnings?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[8px] text-emerald-500 font-bold mb-0.5 border border-emerald-500/20 px-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/10 tracking-widest uppercase">Líquido</span>
            </div>
            {stats.pending > 0 && (
              <div className="flex items-center gap-1 mt-1 opacity-80 underline-offset-2 underline decoration-slate-300">
                <span className="text-[10px] font-bold text-slate-500">
                  + R$ {stats.pending?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest ml-1">Em Trânsito</span>
              </div>
            )}
          </div>
          <div className="size-11 rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:bg-primary text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-inner group-hover:shadow-lg group-hover:shadow-primary/30">
            <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
          </div>
        </div>
      </section>
    </>
  );


  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col antialiased">
      <div className="relative flex min-h-screen w-full flex-col mx-auto bg-white dark:bg-slate-900 shadow-xl overflow-x-hidden">
        {renderHeader()}
        <main className="flex-1 overflow-y-auto">
          {renderDashboardTab()}
        </main>
        <ProviderMobileNav onNavigate={onNavigate} currentScreen="dashboard" />
      </div>
    </div>
  );
}
