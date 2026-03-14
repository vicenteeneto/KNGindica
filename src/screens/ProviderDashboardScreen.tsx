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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [completePercent, setCompletePercent] = useState(0);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && portfolio.length > 1) {
      setSelectedImageIndex((prev) => (prev! + 1) % portfolio.length);
    } else if (isRightSwipe && portfolio.length > 1) {
      setSelectedImageIndex((prev) => (prev! - 1 + portfolio.length) % portfolio.length);
    }
  };
  
  // Settings State
  const [businessInfo, setBusinessInfo] = useState({
    address: profile?.address || '',
    opening_hours: profile?.opening_hours || 'Seg à Sex: 08:00 - 18:00',
    loyalty_enabled: (profile as any)?.loyalty_enabled || false,
    loyalty_benefit_description: (profile as any)?.loyalty_benefit_description || '11º serviço com 50% de desconto',
    loyalty_required_services: (profile as any)?.loyalty_required_services || 10
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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

    const fetchPortfolio = async () => {
      const { data } = await supabase
        .from('provider_portfolio')
        .select('*')
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false });
      setPortfolio(data || []);
    };
    fetchPortfolio();
  }, [user]);

  useEffect(() => {
    if (!profile) return;
    
    let percent = 0;
    if (profile.avatar_url) percent += 15;
    if (profile.bio) percent += 15;
    if (profile.categories && profile.categories.length > 0) percent += 10;
    if (profile.address) percent += 10;
    if (portfolio.length >= 3) percent += 20;
    if (profile.is_verified) percent += 30;
    
    setCompletePercent(percent);
  }, [profile, portfolio]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    
    if (portfolio.length >= 5) {
      alert("Você pode ter no máximo 5 fotos no seu portfólio.");
      return;
    }

    setIsAddingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('portfolio')
        .getPublicUrl(filePath);

      // 3. Save to DB
      const { data, error: dbError } = await supabase
        .from('provider_portfolio')
        .insert({ 
          provider_id: user.id, 
          image_url: publicUrl,
          storage_path: filePath // Preciso salvar o path para deletar depois
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setPortfolio([data, ...portfolio]);
    } catch (err: any) {
      if (err.message?.includes('Bucket not found')) {
        alert("Erro: O bucket 'portfolio' não foi encontrado. Certifique-se de criá-lo no painel do Supabase Storage.");
      } else {
        alert("Erro ao enviar imagem: " + err.message);
      }
    } finally {
      setIsAddingImage(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleDeletePortfolioImage = async (id: string, storagePath?: string) => {
    if (!window.confirm("Deseja remover esta imagem do seu portfólio?")) return;
    try {
      // 1. Delete from DB
      const { error: dbError } = await supabase.from('provider_portfolio').delete().eq('id', id);
      if (dbError) throw dbError;

      // 2. Delete from Storage if path exists
      if (storagePath) {
        await supabase.storage.from('portfolio').remove([storagePath]);
      }

      setPortfolio(portfolio.filter(img => img.id !== id));
    } catch (err: any) {
      alert("Erro ao remover imagem: " + err.message);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setIsSavingSettings(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(businessInfo)
        .eq('id', user.id);
      
      if (error) throw error;
      alert("Configurações salvas com sucesso!");
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

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
    <header className="flex items-center bg-white dark:bg-slate-900 p-4 border-b border-slate-100 dark:border-slate-800 justify-between sticky top-0 z-10">
      <div className="flex size-10 shrink-0 items-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700" onClick={() => onNavigate('profile', { professionalId: user?.id })}>
        <div className="bg-center bg-no-repeat aspect-square bg-cover size-full cursor-pointer" style={{ backgroundImage: `url('${profile?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}')` }}></div>
      </div>
      <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 ml-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>Dashboard</h2>
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
  );

  const generateInsights = () => {
    const insights = [];
    const convRate = stats.visits > 0 ? (stats.leads / stats.visits) * 100 : 0;

    if (portfolio.length < 3) {
      insights.push({
        title: "Complete seu Portfólio",
        desc: "Perfis com pelo menos 3 fotos passam 50% mais confiança para os clientes.",
        icon: "add_a_photo",
        action: () => setActiveTab('portfolio')
      });
    }

    if (convRate < 5 && stats.visits > 10) {
      insights.push({
        title: "Sua conversão está baixa",
        desc: "Muitas pessoas visitam seu perfil mas poucas entram em contato. Tente melhorar sua Bio ou baixar um pouco o preço médio.",
        icon: "trending_down",
        action: () => setActiveTab('settings')
      });
    }

    if (!businessInfo.address) {
      insights.push({
        title: "Adicione seu Endereço",
        desc: "Clientes preferem profissionais que mostram um endereço físico ou base de atendimento.",
        icon: "location_on",
        action: () => setActiveTab('settings')
      });
    }

    if (!businessInfo.loyalty_enabled) {
      insights.push({
        title: "Ative a Fidelidade",
        desc: "Profissionais que oferecem prêmios de fidelidade têm mais chances de serem re-contratados.",
        icon: "card_membership",
        action: () => setActiveTab('settings')
      });
    }

    if (insights.length === 0) {
      insights.push({
        title: "Perfil Campeão! ✨",
        desc: "Seu perfil está completo e otimizado. Continue prestando um ótimo serviço para manter sua nota alta.",
        icon: "verified_user",
        action: null
      });
    }

    return insights;
  };

  const renderDashboardTab = () => (
    <>
      <section className="px-4 pt-6 pb-2 text-center sm:text-left">
        <h1 className="text-slate-900 dark:text-slate-100 text-2xl font-black leading-tight">Olá, {profile?.full_name?.split(' ')[0] || 'Profissional'}! 👋</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Veja como o <strong>Alvus Clube</strong> está impulsionando seu negócio.</p>
      </section>

      {/* Profile Completion Tracker */}
      {completePercent < 100 && (
        <section className="px-4 py-2">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Completude do Perfil</h3>
                <p className="text-[10px] text-slate-500 font-medium">Complete seu perfil para atrair mais clientes</p>
              </div>
              <span className="text-lg font-black text-primary">{completePercent}%</span>
            </div>
            
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-out" 
                style={{ width: `${completePercent}%` }}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {!profile?.is_verified && (
                <button 
                  onClick={() => onNavigate('providerVerification')}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-primary/10 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-sm text-primary">verified_user</span>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Verificar Identidade (+30%)</span>
                </button>
              )}
              {portfolio.length < 3 && (
                <button 
                  onClick={() => setActiveTab('portfolio')}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-primary/10 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-sm text-primary">add_a_photo</span>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Add 3+ Fotos (+20%)</span>
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Alvus Insights - Performance Central */}
      <section className="px-4 py-4">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm uppercase tracking-tight">
            <span className="material-symbols-outlined text-primary text-[20px]">insights</span>
            Alvus Insights
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tempo Real</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Visitas</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-900 dark:text-slate-100 leading-none">{stats.visits}</span>
              <span className="text-[10px] font-bold text-slate-400">visualizações</span>
            </div>
            <div className="absolute -right-2 -bottom-2 opacity-5">
              <span className="material-symbols-outlined text-6xl">visibility</span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Leads</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-emerald-500 leading-none">{stats.leads}</span>
              <span className="text-[10px] font-bold text-emerald-500/60 font-black tracking-tighter uppercase">Interessados</span>
            </div>
            <div className="absolute -right-2 -bottom-2 opacity-5 text-emerald-500">
              <span className="material-symbols-outlined text-6xl">chat</span>
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
            className={`p-5 rounded-2xl border-2 border-primary/20 bg-primary/5 dark:bg-primary/10 flex items-center gap-4 transition-all group ${insight.action ? 'cursor-pointer hover:border-primary active:scale-[0.98]' : ''}`}
          >
            <div className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 shrink-0 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined">{insight.icon}</span>
            </div>
            <div className="flex-1">
              <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                {insight.title}
                {insight.action && <span className="text-[10px] bg-primary text-white px-1 rounded">RELEVANTE</span>}
              </h5>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed font-medium">
                {insight.desc}
              </p>
            </div>
            {insight.action && (
              <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">chevron_right</span>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button onClick={() => onNavigate('userProfile')} className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary transition-all cursor-pointer group shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined">edit_square</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Editar Perfil</p>
              <p className="text-[10px] text-slate-500">Foto, bio e contato</p>
            </div>
            <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
          </button>
          
          <button onClick={() => setActiveTab('portfolio')} className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary transition-all cursor-pointer group shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined">photo_library</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Meus Trabalhos</p>
              <p className="text-[10px] text-slate-500">Galeria e fotos</p>
            </div>
            <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
          </button>

          <button onClick={() => setActiveTab('settings')} className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary transition-all cursor-pointer group shadow-sm">
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined">settings_heart</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Configurações</p>
              <p className="text-[10px] text-slate-500">Fidelidade e horários</p>
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
        <h3 className="font-black text-slate-900 dark:text-slate-100 mb-4 ml-1 flex items-center gap-2 text-sm uppercase tracking-tight">
          <span className="material-symbols-outlined text-slate-400 text-[20px]">payments</span>
          Carteira Financeira
        </h3>
        <div onClick={() => onNavigate('providerWallet')} className="group flex items-center justify-between p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary transition-all cursor-pointer overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/[0.02] pointer-events-none" />
          <div className="flex flex-col gap-0.5 relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-primary transition-colors">Saldo Atualizado</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black leading-none group-hover:text-primary transition-colors">
                R$ {stats.earnings?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-emerald-500 font-bold mb-0.5 border border-emerald-500/20 px-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/10 tracking-widest uppercase">Líquido</span>
            </div>
            {stats.pending > 0 && (
              <div className="flex items-center gap-1.5 mt-2 opacity-80 decoration-dotted underline-offset-4 underline decoration-slate-300">
                <span className="text-sm font-bold text-slate-500">
                  + R$ {stats.pending?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Em Trânsito</span>
              </div>
            )}
          </div>
          <div className="size-14 rounded-2xl bg-slate-50 dark:bg-slate-800 group-hover:bg-primary text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-inner group-hover:shadow-lg group-hover:shadow-primary/30">
            <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
          </div>
        </div>
      </section>
    </>
  );

  const renderPortfolioTab = () => (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="px-4 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-1 font-medium">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar
          </button>
          <h2 className="text-xl font-bold">Meu Portfólio</h2>
        </div>
      </div>
      <div className="p-4 space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold mb-1">Adicionar Nova Foto</h3>
          <p className="text-xs text-slate-500 mb-4">Você pode subir até 5 fotos do seu trabalho.</p>
          
          <div className="flex flex-col gap-4">
            <label className={`
              flex flex-col items-center justify-center w-full h-32 
              border-2 border-dashed border-slate-200 dark:border-slate-800 
              rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 
              transition-all group
              ${portfolio.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}
            `}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isAddingImage ? (
                  <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-primary transition-colors">upload_file</span>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {portfolio.length >= 5 ? 'Limite de 5 fotos atingido' : 'Clique para selecionar uma foto'}
                    </p>
                  </>
                )}
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isAddingImage || portfolio.length >= 5}
              />
            </label>
            
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-medium text-slate-400">Progresso: {portfolio.length}/5 fotos</span>
              <div className="h-1.5 w-24 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ width: `${(portfolio.length / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {portfolio.length === 0 ? (
            <div className="col-span-2 py-12 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
               <span className="material-symbols-outlined text-4xl mb-2 opacity-30">add_a_photo</span>
               <p className="text-sm">Seu portfólio está vazio.</p>
            </div>
          ) : (
            portfolio.map((img, idx) => (
              <div 
                key={img.id} 
                className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-sm active:scale-95 transition-transform"
                onClick={() => setSelectedImageIndex(idx)}
              >
                <img src={img.image_url} alt="Trabalho" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <button 
                  onClick={() => handleDeletePortfolioImage(img.id, img.storage_path)}
                  className="absolute top-2 right-2 size-8 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="px-4 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors text-sm mb-1 font-medium">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Voltar
          </button>
          <h2 className="text-xl font-bold">Configurações do Negócio</h2>
        </div>
      </div>
      
      <div className="p-4 space-y-6">
        {/* Google Style Info */}
        <section className="space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">info</span>
            Informações Públicas
          </h3>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Endereço de Atendimento (Opcional)</label>
              <textarea 
                value={businessInfo.address}
                onChange={e => setBusinessInfo({...businessInfo, address: e.target.value})}
                placeholder="Rua Exemplo, 123 - Centro..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:border-primary outline-none transition-all text-sm min-h-[80px]"
              />
              <p className="text-[10px] text-slate-400 mt-1">Deixe vazio para "Atendimento em domicílio".</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Horário de Funcionamento</label>
              <input 
                type="text"
                value={businessInfo.opening_hours}
                onChange={e => setBusinessInfo({...businessInfo, opening_hours: e.target.value})}
                placeholder="Ex: Seg a Sex: 08h às 18h"
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:border-primary outline-none transition-all text-sm"
              />
            </div>
          </div>
        </section>

        {/* Loyalty Program */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500">loyalty</span>
              Programa de Fidelidade
            </h3>
            <button 
              onClick={() => setBusinessInfo({...businessInfo, loyalty_enabled: !businessInfo.loyalty_enabled})}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${businessInfo.loyalty_enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${businessInfo.loyalty_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all ${!businessInfo.loyalty_enabled && 'opacity-50 pointer-events-none'}`}>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Benefício do Programa</label>
                <input 
                  type="text"
                  value={businessInfo.loyalty_benefit_description}
                  onChange={e => setBusinessInfo({...businessInfo, loyalty_benefit_description: e.target.value})}
                  placeholder="Ex: 50% de desconto no 11º serviço"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent focus:border-primary outline-none transition-all text-sm font-bold text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Serviços Necessários para ganhar</label>
                <div className="flex items-center gap-4">
                   <input 
                    type="range"
                    min="3"
                    max="20"
                    value={businessInfo.loyalty_required_services}
                    onChange={e => setBusinessInfo({...businessInfo, loyalty_required_services: parseInt(e.target.value)})}
                    className="flex-1 accent-primary"
                  />
                  <span className="size-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold">{businessInfo.loyalty_required_services}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <button 
          onClick={handleSaveSettings}
          disabled={isSavingSettings}
          className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-primary/20"
        >
          {isSavingSettings ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col antialiased">
      <div className="relative flex min-h-screen w-full flex-col mx-auto bg-white dark:bg-slate-900 shadow-xl overflow-x-hidden">
        {renderHeader()}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' ? renderDashboardTab() : 
           activeTab === 'portfolio' ? renderPortfolioTab() : 
           renderSettingsTab()}
        </main>
        <ProviderMobileNav onNavigate={onNavigate} currentScreen="dashboard" />
      </div>

      {/* Image Modal Lightbox with Navigation */}
      {selectedImageIndex !== null && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300 select-none touch-none"
          onClick={() => setSelectedImageIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close Button */}
          <button 
            className="absolute top-6 right-6 text-white size-12 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors z-[110]"
            onClick={() => setSelectedImageIndex(null)}
          >
            <span className="material-symbols-outlined text-4xl">close</span>
          </button>

          {/* Navigation Buttons */}
          {portfolio.length > 1 && (
            <>
              <button 
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white size-14 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors active:scale-90"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((selectedImageIndex - 1 + portfolio.length) % portfolio.length);
                }}
              >
                <span className="material-symbols-outlined text-5xl">chevron_left</span>
              </button>
              <button 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white size-14 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors active:scale-90"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((selectedImageIndex + 1) % portfolio.length);
                }}
              >
                <span className="material-symbols-outlined text-5xl">chevron_right</span>
              </button>
            </>
          )}
          
          <div className="relative max-w-full max-h-[80vh] flex flex-col items-center">
            <img 
              src={portfolio[selectedImageIndex].image_url} 
              alt="Foto do Portfólio" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            />
            
            <div className="absolute -bottom-10 left-0 right-0 text-center">
              <p className="text-white font-bold tracking-widest text-sm bg-black/40 px-4 py-1 rounded-full inline-block">
                {selectedImageIndex + 1} / {portfolio.length}
              </p>
            </div>
          </div>

          <div className="absolute bottom-8 left-0 right-0 text-center hidden md:block">
             <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Use setas ou clique fora para fechar</p>
          </div>
        </div>
      )}
    </div>
  );
}
