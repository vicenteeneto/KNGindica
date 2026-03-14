import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { useAuth } from '../AuthContext';
import ProviderMobileNav from '../components/ProviderMobileNav';
import { supabase } from '../lib/supabase';

export default function ProviderDashboardScreen({ onNavigate }: NavigationProps) {
  const { logout, profile, user } = useAuth();
  const [stats, setStats] = useState({ requests: 0, views: 0, earnings: 0, pending: 0 });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isAddingImage, setIsAddingImage] = useState(false);
  
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
        // 1. Fetch leads count
        const { count: leadCount } = await supabase
          .from('lead_events')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', user.id);
          
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
          views: leadCount || 0,
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
      alert("Imagem enviada com sucesso!");
    } catch (err: any) {
      alert("Erro ao enviar imagem: " + err.message);
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

  const renderDashboardTab = () => (
    <>
      <section className="px-4 pt-6 pb-2">
        <h1 className="text-slate-900 dark:text-slate-100 text-2xl font-bold leading-tight">Olá, {profile?.full_name || 'Profissional'}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-normal mt-1">Confira o desempenho do seu perfil hoje.</p>
      </section>

      {/* Banner de upgrade para prestadores Free */}
      {(profile as any)?.plan_type === 'basic' && (
        <section className="px-4 pt-3">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 p-4 shadow-lg shadow-amber-300/30">
            <div className="absolute -right-4 -top-4 size-24 rounded-full bg-white/20" />
            <div className="absolute -right-2 bottom-0 size-16 rounded-full bg-white/10" />
            <div className="relative flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  <span className="text-[11px] font-black text-white/90 uppercase tracking-wider">Prestador Plus</span>
                </div>
                <p className="text-white font-bold text-sm leading-tight">Receba 2× mais clientes</p>
                <p className="text-white/80 text-xs mt-0.5">0% comissão · WhatsApp direto · Destaque</p>
              </div>
              <button
                onClick={() => onNavigate('providerPlan')}
                className="shrink-0 bg-white text-amber-600 font-black text-xs px-4 py-2.5 rounded-xl shadow-sm hover:bg-amber-50 active:scale-95 transition-all whitespace-nowrap"
              >
                Ver Planos →
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-3 gap-3 p-4">
        <div className="flex flex-col gap-1 rounded-xl p-4 bg-primary/10 border border-primary/20">
          <p className="text-slate-600 dark:text-slate-300 text-xs font-medium">Contatos</p>
          <p className="text-primary tracking-tight text-xl font-bold">{stats.views}</p>
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
          <span className="material-symbols-outlined absolute -bottom-8 -right-4 text-[120px] text-white opacity-5 rotate-12 pointer-events-none">verified</span>
        </div>
      </section>

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
          <button onClick={() => setActiveTab('portfolio')} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer group">
            <div className="flex size-10 items-center justify-center rounded-lg bg-white dark:bg-slate-900 text-primary shadow-sm group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined">photo_library</span>
            </div>
            <span className="flex-1 text-left font-medium text-slate-700 dark:text-slate-200">Gerenciar Portfólio</span>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer group">
            <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined">settings</span>
            </div>
            <span className="flex-1 text-left font-medium text-slate-700 dark:text-slate-200">Configurações & Fidelidade</span>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </button>
          
          {/* Só mostra Assinatura Afiliado se NÃO for Admin/Plus ou se for especificamente Afiliado */}
          <button onClick={() => onNavigate('plan')} className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors cursor-pointer group">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-white shadow-sm group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined">workspace_premium</span>
            </div>
            <span className="flex-1 text-left font-medium text-primary">Assinatura Afiliado / Plus</span>
            <span className="material-symbols-outlined text-primary">chevron_right</span>
          </button>
        </div>
      </section>

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
                  <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-1">
                    {statusMap[req.status] || req.status}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(req.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="px-4 pb-6">
        <div onClick={() => onNavigate('providerWallet')} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:border-primary dark:hover:border-primary transition-colors group">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1 group-hover:text-primary transition-colors">Minha Carteira</p>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-end gap-2">
                <span className="text-2xl font-black leading-none group-hover:text-primary transition-colors">
                  R$ {stats.earnings?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-500 font-bold mb-0.5 border border-emerald-500/20 px-1.5 rounded bg-emerald-50 dark:bg-emerald-900/10">Disponível</span>
              </div>
              {stats.pending > 0 && (
                <div className="flex items-center gap-1.5 mt-1 opacity-80">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                    + R$ {stats.pending?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">A Receber</span>
                </div>
              )}
            </div>
          </div>
          <div className="size-10 rounded-full bg-slate-50 dark:bg-slate-900 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">account_balance_wallet</span>
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
            portfolio.map(img => (
              <div key={img.id} className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                <img src={img.image_url} alt="Trabalho" className="w-full h-full object-cover" />
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
        <div className="h-20"></div>
        <ProviderMobileNav onNavigate={onNavigate} currentScreen="dashboard" />
      </div>
    </div>
  );
}
