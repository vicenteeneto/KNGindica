import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { formatCurrency } from '../lib/formatters';
import { supabase } from '../lib/supabase';
import { ProviderHeader } from '../components/ProviderHeader';

export default function ProviderDashboardScreen({ onNavigate }: NavigationProps) {
  const { logout, profile, user } = useAuth();
  const { unreadNotifications, unreadMessages, unreadRequests } = useNotifications();
  const [stats, setStats] = useState({ requests: 0, visits: 0, leads: 0, earnings: 0, rating: 0, pending: 0, latestReview: null as any });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string>>({});


  

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

        // 2. Fetch active requests count - FILTER BY CATEGORY if open
        const providerCategories = (profile as any)?.categories || [];
        
        // Fetch categories to map names to IDs if not already done
        let currentMap = categoriesMap;
        if (Object.keys(currentMap).length === 0) {
          const { data: catData } = await supabase.from('service_categories').select('id, name');
          if (catData) {
            const map: Record<string, string> = {};
            catData.forEach(c => { map[c.name] = c.id; });
            setCategoriesMap(map);
            currentMap = map;
          }
        }

        const categoryIds = providerCategories
          .map((name: string) => currentMap[name])
          .filter(Boolean);
        
        // Base query for already assigned/interacted requests
        let query = supabase
          .from('service_requests')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'completed')
          .neq('status', 'cancelled');

        if (categoryIds.length > 0) {
          // If has categories, show assigned OR (open AND in categorical match)
          // Using a more robust string for PostgREST .or()
          const catList = categoryIds.join(',');
          query = query.or(`provider_id.eq.${user.id},and(provider_id.is.null,status.eq.open,category_id.in.(${catList}))`);
        } else {
          // If no categories set, only show assigned ones
          query = query.eq('provider_id', user.id);
        }

        const { count: reqCount } = await query;
          
        // 3. Fetch real rating average
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('rating')
          .eq('provider_id', user.id);
        
        const sum = reviewsData?.reduce((acc, r) => acc + r.rating, 0) || 0;
        const avg = reviewsData?.length ? sum / reviewsData.length : 0;
          
        // 4. Fetch earnings
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
          pending: pendingBalance,
          rating: Number(avg.toFixed(1))
        });

        // 4. Fetch recent requests with same category filter
        let recentQuery = supabase
          .from('service_requests')
          .select(`
            id,
            title,
            status,
            created_at,
            profiles!service_requests_client_id_fkey(full_name, avatar_url),
            service_categories(name, icon)
          `)
          .not('status', 'in', '("completed","cancelled")')
          .order('created_at', { ascending: false })
          .limit(3);

        if (categoryIds.length > 0) {
          const catList = categoryIds.join(',');
          recentQuery = recentQuery.or(`provider_id.eq.${user.id},and(provider_id.is.null,status.eq.open,category_id.in.(${catList}))`);
        } else {
          recentQuery = recentQuery.eq('provider_id', user.id);
        }

        const { data: recentReqs } = await recentQuery;

        if (recentReqs) setRecentRequests(recentReqs);

        // 5. Fetch portfolio count
        const { count: pCount } = await supabase
          .from('provider_portfolio')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', user.id);
        
        setPortfolioCount(pCount || 0);

        // 6. Fetch verification status
        const { data: verifData } = await supabase
          .from('provider_verifications')
          .select('status')
          .eq('provider_id', user.id)
          .maybeSingle();
        
        if (verifData) setVerificationStatus(verifData.status as any);

        // EXTRA: Fetch latest review
        const { data: latestReviewData } = await supabase
          .from('reviews')
          .select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)')
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (latestReviewData) (setStats as any)(prev => ({ ...prev, latestReview: latestReviewData }));
        
        // Fetch today's freelance orders count
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const { count, error: countError } = await supabase
          .from('freelance_orders')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfDay.toISOString());
          
        if (!countError) setTodayOrdersCount(count || 0);

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
    <ProviderHeader 
      title="Painel" 
      onBack={() => onNavigate('home')} 
      onNavigate={onNavigate} 
      rightActions={
        <div className="flex gap-1.5 mt-1 sm:mt-0">
          <button onClick={() => onNavigate('chatList')} className="flex size-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 relative hover:bg-slate-200 dark:hover:bg-slate-700 transition-all group" title="Mensagens">
            <span className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">chat</span>
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white border-2 border-white dark:border-slate-900 shadow-lg animate-bounce">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            )}
          </button>
          <button onClick={() => onNavigate('notifications', { returnTo: 'dashboard' })} className="flex size-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 relative hover:bg-slate-200 dark:hover:bg-slate-700 transition-all group" title="Notificações">
            <span className="material-symbols-outlined text-[22px] group-hover:scale-110 transition-transform">notifications</span>
            {(unreadNotifications > 0 || unreadRequests > 0) && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white border-2 border-white dark:border-slate-900 shadow-lg animate-bounce">
                {unreadNotifications + unreadRequests > 9 ? '9+' : unreadNotifications + unreadRequests}
              </span>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="flex size-10 items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group"
            title="Sair"
          >
            <span className="material-symbols-outlined text-[22px] group-hover:rotate-12 transition-transform">logout</span>
          </button>
        </div>
      }
    />
  );

  const getGreetingName = () => {
    if (!profile?.full_name) return 'Profissional';
    const names = profile.full_name.trim().split(' ');
    if (names.length > 1 && (names[0].length <= 2 || ['Dr.', 'Dra.', 'Sr.', 'Sra.'].includes(names[0]))) {
      return `${names[0]} ${names[1]}`;
    }
    return names[0];
  };

  const generateInsights = () => {
    return []; // Removed "Consulte seu Perfil" as requested
  };

  const renderDashboardTab = () => (
    <>
      <section className="pt-4 pb-1 text-center sm:text-left">
        <h1 className="text-slate-900 dark:text-slate-100 text-xl font-black leading-tight italic tracking-tighter">Olá, {getGreetingName()}! 👋</h1>
        <p className="text-slate-400 text-[10px] font-bold mt-0.5">Visão Geral do seu Negócio</p>
      </section>

      {/* Completude do Perfil - PRIORIDADE TOTAL NO TOPO SE INCOMPLETO */}
      {(() => {
        const missing = [];
        if (!profile?.avatar_url) missing.push("Foto de Perfil");
        if (!(profile as any)?.bio || (profile as any)?.bio.length < 30) missing.push("Bio completa");
        if (!(profile as any)?.categories || (profile as any)?.categories.length === 0) missing.push("Categorias");
        if (!(profile as any)?.latitude || !(profile as any)?.longitude) missing.push("Localização (GPS)");
        if (!profile?.pricing_model || (profile.pricing_model !== 'negotiable' && !profile.price_value)) missing.push("Preço do serviço");
        if (portfolioCount === 0) missing.push("Fotos no Portfólio");

        if (missing.length === 0) return null;

        return (
          <section className="py-4">
            <div className="bg-red-500/10 dark:bg-red-500/5 rounded-3xl p-6 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse-subtle relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-7xl text-red-500">warning</span>
              </div>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="size-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 shrink-0">
                  <span className="material-symbols-outlined text-3xl">error</span>
                </div>
                <div>
                  <h3 className="text-base font-black text-red-600 dark:text-red-500 italic">
                    Perfil com Baixa Visibilidade!
                  </h3>
                  <p className="text-[10px] text-red-500 dark:text-red-400 font-black">
                    Complete agora para aparecer nas buscas
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-900 dark:text-slate-300 mb-4 leading-relaxed font-bold bg-white/50 dark:bg-black/20 p-3 rounded-xl">
                Seu perfil está incompleto e pode ser ignorado pelos clientes. Finalize estes itens:
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {missing.map((item, idx) => (
                  <span key={idx} className="bg-white dark:bg-slate-900 text-red-600 dark:text-red-500 text-[10px] font-black px-3 py-1.5 rounded-xl border border-red-500/30 shadow-sm">
                    • {item}
                  </span>
                ))}
              </div>

              <button 
                onClick={() => onNavigate('userProfile')}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-red-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              >
                FINALIZAR MEU PERFIL AGORA
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </section>
        );
      })()}


      {/* Alvo Insights - Performance Central */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden relative group">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white italic">
              Análises KNGindica
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-[10px] font-bold text-slate-400">Tempo Real</span>
            </div>
          </div>
          <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">analytics</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <p className="text-[9px] font-black text-slate-400 mb-0.5">Visitas</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">{stats.visits}</span>
              <span className="text-[8px] font-bold text-slate-400">Views</span>
            </div>
            <div className="absolute -right-1 -bottom-1 opacity-5">
              <span className="material-symbols-outlined text-4xl">visibility</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <p className="text-[9px] font-black text-slate-400 mb-0.5">Leads</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-500 leading-none">{stats.leads}</span>
              <span className="text-[8px] font-bold text-emerald-500/60 font-black tracking-tighter">Contatos</span>
            </div>
            <div className="absolute -right-1 -bottom-1 opacity-5 text-emerald-500">
              <span className="material-symbols-outlined text-4xl">chat</span>
            </div>
          </div>
        </div>

        {/* Funil de Conversão */}
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl mb-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 group-hover:rotate-45 transition-transform duration-700">
            <span className="material-symbols-outlined text-8xl text-white">analytics</span>
          </div>
          
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-white font-black text-[10px] flex items-center gap-2">
                Taxa de Conversão
                <span className="bg-primary/20 text-primary border border-primary/30 px-1 py-0.5 rounded-[4px] text-[7px] leading-none">SMART METRIC</span>
              </h4>
              <p className="text-slate-400 text-[9px] mt-0.5 font-medium italic">Visitas convertidas em contatos reais</p>
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

      {/* Último Feedback Recebido */}
      {stats.latestReview && (
        <section className="pt-4">
          <div 
            onClick={() => onNavigate('reviews', { professionalId: user?.id, returnTo: 'dashboard' })}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-lg cursor-pointer hover:border-amber-500 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-slate-400 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-sm">stars</span>
                Último Feedback Recebido
              </h3>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-amber-500 transition-colors">chevron_right</span>
            </div>
            
            <div className="flex gap-4">
              <img 
                src={stats.latestReview.reviewer?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} 
                className="size-12 rounded-full object-cover border-2 border-slate-100 dark:border-slate-800"
                alt="Avatar"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{stats.latestReview.reviewer?.full_name || 'Cliente'}</p>
                  <div className="flex text-amber-500">
                    {[1, 2, 3, 4, 5].map(star => (
                      <span key={star} className="material-symbols-outlined text-xs" style={{ fontVariationSettings: `'FILL' ${stats.latestReview.rating >= star ? 1 : 0}` }}>
                        star
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                  "{stats.latestReview.comment || 'Sem comentário.'}"
                </p>
              </div>
            </div>
          </div>
        </section>
      )}


      {/* Plano Premium - Promo Card */}
      {profile?.plan_type !== 'plus' && (
        <section className="pt-4">
          <div 
            onClick={() => onNavigate('providerPlan')}
            className="bg-slate-900 dark:bg-slate-800 rounded-3xl py-4 px-5 shadow-2xl relative overflow-hidden cursor-pointer group hover:scale-[1.02] active:scale-[0.98] transition-all border border-slate-700/50"
          >
            <div className="absolute -top-10 -right-10 size-40 bg-primary/20 blur-[60px] rounded-full group-hover:bg-primary/30 transition-colors" />
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
              <span className="material-symbols-outlined text-7xl text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
            </div>
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-amber-500/20 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest mb-3 text-amber-500 border border-amber-500/20">
                <span className="material-symbols-outlined text-xs">bolt</span>
                Upgrade Premium
              </div>
              <h3 className="text-2xl font-black text-white italic leading-none mb-2">
                Seja um Prestador <span className="text-amber-500">Premium</span>
              </h3>
              <p className="text-slate-400 text-[11px] font-medium leading-[1.4] max-w-[220px]">
                Tenha isenção total de taxas, selo de destaque e prioridade máxima em novos serviços.
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-amber-500 hover:text-white transition-colors">
                  Saiba Mais
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Indique e Ganhe - Referral System */}
      <section className="pt-2">
        <div 
          onClick={() => onNavigate('rewards')}
          className="bg-gradient-to-br from-primary to-orange-600 rounded-3xl py-3 px-4 shadow-lg border border-white/10 relative overflow-hidden cursor-pointer group hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-7xl text-white">workspace_premium</span>
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-2 py-1 rounded-full text-[9px] font-black tracking-widest mb-2 text-white">
              <span className="material-symbols-outlined text-xs">share</span>
              Ganhe Prêmios Indicando
            </div>
            <h3 className="text-xl font-black text-white italic leading-none mb-1">
              Indique e Ganhe
            </h3>
            <p className="text-white/80 text-[11px] font-medium leading-[1.3] max-w-sm">
              Seu link de convite vale pontos que podem ser trocados por KNG Premium e mais.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] font-black text-white bg-white/20 px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-2">
                Ver Meus Pontos ({profile?.reward_points || 0} pts)
                <span className="material-symbols-outlined text-xs">chevron_right</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Oportunidades KNGindica - Feed de Freelances */}
      <section className="pt-3 pb-3">
        <div 
          onClick={() => onNavigate('openOrders')}
          className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-3xl py-3 px-4 shadow-lg border border-white/10 relative overflow-hidden cursor-pointer group hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
            <span className="material-symbols-outlined text-7xl text-white">rocket_launch</span>
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-2 py-1 rounded-full text-[9px] font-black tracking-widest mb-2 text-emerald-200">
              <span className="material-symbols-outlined text-xs">campaign</span>
              {todayOrdersCount > 0 ? `${todayOrdersCount} ${todayOrdersCount === 1 ? 'ordem' : 'ordens'} hoje` : 'Novas oportunidades'}
            </div>
            <h3 className="text-xl font-black text-white italic leading-none mb-1">
              Oportunidades KNGindica
            </h3>
            <p className="text-emerald-50/80 text-[11px] font-medium leading-tight max-w-sm">
              Novos freelances abertos na sua região disponíveis.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] font-black text-white bg-emerald-400/20 px-3 py-1.5 rounded-xl border border-white/20">Ver Ordens Disponíveis</span>
            </div>
          </div>
        </div>
      </section>


      {/* Cards Auxiliares */}
      <section className="pb-4">
         <div className="grid grid-cols-2 gap-2">
            <div onClick={() => onNavigate('providerRequests')} className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3 cursor-pointer hover:border-primary transition-all group">
               <div className="size-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-sm">assignment</span>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-slate-400">Pedidos</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-lg font-black text-slate-900 dark:text-slate-100">{stats.requests}</p>
                    <span className="material-symbols-outlined text-slate-300 text-sm group-hover:translate-x-1 transition-transform">chevron_right</span>
                  </div>
               </div>
            </div>
            <div onClick={() => onNavigate('reviews', { professionalId: user.id, returnTo: 'dashboard' })} className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3 cursor-pointer hover:border-primary transition-all group">
               <div className="size-8 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-sm">star</span>
               </div>
               <div>
                  <p className="text-[10px] font-bold text-slate-400">Média</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-lg font-black text-slate-900 dark:text-slate-100">{stats.rating > 0 ? stats.rating.toFixed(1) : '0.0'}</p>
                    <span className="material-symbols-outlined text-slate-300 text-sm group-hover:translate-x-1 transition-transform">chevron_right</span>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Carteira e Saldo */}
      <section className="pb-8">
        <h3 className="font-black text-slate-900 dark:text-slate-100 mb-2 ml-1 flex items-center gap-2 text-[10px]">
          <span className="material-symbols-outlined text-slate-400 text-[18px]">payments</span>
          Carteira Financeira
        </h3>
        <div onClick={() => onNavigate('providerWallet')} className="group flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary transition-all cursor-pointer overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/[0.02] pointer-events-none" />
          <div className="flex flex-col gap-0.5 relative z-10">
            <p className="text-[8px] font-black text-slate-400 mb-0.5 group-hover:text-primary transition-colors">Saldo Atualizado</p>
            <div className="flex items-end gap-1.5">
              <span className="text-xl font-black leading-none group-hover:text-primary transition-colors">
                {formatCurrency(stats.earnings)}
              </span>
              <span className="text-[7px] text-emerald-500 font-bold mb-0.5 border border-emerald-500/20 px-1 rounded-full bg-emerald-50 dark:bg-emerald-900/10 tracking-widest">Líquido</span>
            </div>
            {stats.pending > 0 && (
              <div className="flex items-center gap-1 mt-1 opacity-80 underline-offset-2 underline decoration-slate-300">
                <span className="text-[10px] font-bold text-slate-500">
                  + {formatCurrency(stats.pending)}
                </span>
                <span className="text-[8px] text-slate-400 font-black ml-1">Em Trânsito</span>
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
    <div className="netflix-main-bg font-display text-white min-h-screen flex flex-col antialiased">
      <div className="relative flex min-h-screen w-full flex-col mx-auto bg-transparent overflow-x-hidden">
        {renderHeader()}
        <main className="flex-1 overflow-y-auto">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 animate-pulse">
                <div className="lg:col-span-8 space-y-6">
                  <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg mb-2" />
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg mb-8" />
                  <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-[2rem]" />
                  <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-[2rem]" />
                </div>
                <div className="lg:col-span-4 space-y-6">
                  <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-[2rem]" />
                  <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
                {/* Left Column: Greeting & Main Cards */}
                <div className="lg:col-span-8 space-y-4 sm:space-y-6">
                  {renderDashboardTab()}
                </div>

                {/* Right Column: Feed & Portfolio (Visible on Desktop) */}
                <div className="lg:col-span-4 space-y-4 sm:space-y-6 lg:sticky lg:top-[90px] self-start z-10">
                  <div className="">
                    <h3 className="font-black text-slate-900 dark:text-slate-100 mb-4 ml-1 flex items-center gap-2 text-[10px]">
                      <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                      Status da Conta
                    </h3>
                    {(() => {
                      const missingForStatus = [];
                      if (!profile?.avatar_url) missingForStatus.push("Foto");
                      if (!(profile as any)?.bio || (profile as any)?.bio.length < 30) missingForStatus.push("Bio");
                      if (!(profile as any)?.categories || (profile as any)?.categories.length === 0) missingForStatus.push("Categorias");
                      if (!(profile as any)?.latitude || !(profile as any)?.longitude) missingForStatus.push("Localização");
                      if (!(profile?.pricing_model === 'negotiable' || profile?.price_value)) missingForStatus.push("Preço");
                      if (portfolioCount === 0) missingForStatus.push("Portfólio");

                      const isComplete = missingForStatus.length === 0;

                      return (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-xl mb-4">
                          <div className="flex items-center gap-4 mb-4">
                            <div className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${isComplete ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                               <span className="material-symbols-outlined text-3xl">{isComplete ? 'verified_user' : 'account_circle'}</span>
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-900 dark:text-white">
                                {isComplete ? 'Perfil Verificado' : 'Perfil em Construção'}
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                {isComplete ? 'Selo de Confiança Ativo' : 'Complete para ganhar selo'}
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => onNavigate('profile', { professionalId: user?.id, returnTo: 'dashboard' })}
                            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all ${
                              isComplete 
                                ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300' 
                                : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
                            }`}
                          >
                            Ver Perfil Público
                          </button>
                        </div>
                      );
                    })()}

                    <h3 className="font-black text-slate-900 dark:text-slate-100 mb-4 ml-1 flex items-center gap-2 text-[10px]">
                      <span className="material-symbols-outlined text-slate-400 text-[18px]">support_agent</span>
                      Ajuda e Suporte
                    </h3>
                    <div onClick={() => onNavigate('helpCenter')} className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-primary transition-all">
                      <div className="flex items-center gap-3">
                         <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">help_center</span>
                         <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Central de Ajuda KNG</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
