import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { ProviderHeader } from '../components/ProviderHeader';

export default function RewardsScreen({ onNavigate }: NavigationProps) {
  const { user, profile, refreshProfile, role } = useAuth();
  const { showToast, showModal } = useNotifications();
  
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchRewardData();
  }, [user]);

  const fetchRewardData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reward_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!profile?.referral_code) return;
    const link = `${window.location.origin}/auth?ref=${profile.referral_code}`;
    navigator.clipboard.writeText(link);
    showToast("Sucesso", "Link de convite copiado!", "success");
  };

  const handleRedeemPlus = async () => {
    if (!profile || (profile.reward_points || 0) < 30) {
      showToast("Pontos Insuficientes", "Você precisa de pelo menos 30 pontos.", "error");
      return;
    }

    setRedeeming(true);
    try {
      // 1. Discount points
      const { error: pointError } = await supabase
        .from('profiles')
        .update({ 
          reward_points: (profile.reward_points || 0) - 30,
          plan_type: 'plus' 
        })
        .eq('id', profile.id);

      if (pointError) throw pointError;

      // 2. Add to history
      await supabase.from('reward_history').insert({
        user_id: profile.id,
        amount: -30,
        description: 'Resgate: 1 Mês KNGindica Premium'
      });

      showModal({
        title: "Parabéns! 🚀",
        message: "Você agora é um usuário Premium por 1 mês! Aproveite os benefícios exclusivos.",
        type: "success"
      });

      await refreshProfile();
      await fetchRewardData();
    } catch (err: any) {
      showToast("Erro", err.message || "Erro ao realizar resgate.", "error");
    } finally {
      setRedeeming(false);
    }
  };

  const handleRedeemContent = async () => {
    if (!profile || (profile.reward_points || 0) < 20) {
      showToast("Pontos Insuficientes", "Você precisa de pelo menos 20 pontos.", "error");
      return;
    }

    setRedeeming(true);
    try {
      // 1. Discount points
      const { error: pointError } = await supabase
        .from('profiles')
        .update({ 
          reward_points: (profile.reward_points || 0) - 20
        })
        .eq('id', profile.id);

      if (pointError) throw pointError;

      // 2. Add to history
      await supabase.from('reward_history').insert({
        user_id: profile.id,
        amount: -20,
        description: 'Resgate: Criação de Conteúdo KNGflow (Pendente)'
      });

      // 3. Create a support ticket for the admin to handle manually
      await supabase.from('support_tickets').insert({
        user_id: profile.id,
        category: 'account',
        subject: 'Resgate de Pontos: Conteúdo KNGflow',
        description: `O usuário ${profile.full_name} resgatou 20 pontos por um serviço de criação de conteúdo KNGflow. Favor entrar em contato para alinhar os detalhes.`,
        status: 'open'
      });

      showModal({
        title: "Resgate Solicitado!",
        message: "Nossa equipe recebeu seu pedido de criação de conteúdo. Entraremos em contato em breve via Chat ou E-mail.",
        type: "success"
      });

      await refreshProfile();
      await fetchRewardData();
    } catch (err: any) {
      showToast("Erro", err.message || "Erro ao realizar resgate.", "error");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden">
      
      {/* Header */}
      {role === 'provider' ? (
        <ProviderHeader 
          title="Indique e Ganhe" 
          onBack={() => onNavigate('dashboard')} 
          onNavigate={onNavigate} 
        />
      ) : (
        <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:pl-16 pr-6 h-16 flex items-center justify-between transition-all duration-300">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onNavigate('back')}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="font-bold text-lg">Indique e Ganhe</h1>
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto w-full p-4 pb-24">
        <div className="max-w-none lg:mx-0 lg:ml-16 pr-6 space-y-6 transition-all duration-300">
          
          {/* Points Card */}
          <div className="bg-gradient-to-br from-primary to-orange-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <span className="material-symbols-outlined text-[120px]">workspace_premium</span>
            </div>
            <div className="relative z-10 text-center lg:text-left">
              <p className="text-white/80 font-bold uppercase tracking-[0.2em] text-xs mb-2">Seu Saldo atual</p>
              <h2 className="text-6xl font-black mb-4 flex items-center justify-center lg:justify-start gap-3">
                {profile?.reward_points || 0}
                <span className="text-2xl font-medium text-white/60">pts</span>
              </h2>
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-sm font-bold">
                <span className="material-symbols-outlined text-[18px]">share</span>
                Link de Convite: {profile?.referral_code || '---'}
              </div>
            </div>
          </div>

          {/* Referral Link Action */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold mb-2">Convide seus amigos</h3>
            <p className="text-sm text-slate-500 mb-4">Ganhe 1 ponto por cada amigo que se cadastrar na plataforma através do seu link.</p>
            
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <input 
                type="text" 
                readOnly 
                value={`${window.location.origin}/auth?ref=${profile?.referral_code || ''}`}
                className="flex-1 bg-transparent px-3 text-sm font-medium outline-none truncate"
              />
              <button 
                onClick={copyReferralLink}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                Copiar
              </button>
            </div>
          </div>

          {/* Prizes Section */}
          <div>
            <h3 className="font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">redeem</span>
                Trocar Pontos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Prize 1 */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                   <span className="material-symbols-outlined text-3xl">bolt</span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">1 Mês KNGindica Premium</h4>
                <p className="text-xs text-slate-500 mb-4">Exposição prioritária, selo de verificação e taxa reduzida.</p>
                <div className="flex items-center justify-between">
                   <span className="font-black text-emerald-600">30 pts</span>
                   <button 
                    onClick={handleRedeemPlus}
                    disabled={redeeming}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
                   >
                     Resgatar
                   </button>
                </div>
              </div>

              {/* Prize 2 */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                   <span className="material-symbols-outlined text-3xl">smart_display</span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">Conteúdo KNGflow</h4>
                <p className="text-xs text-slate-500 mb-4">Criação de artes ou vídeos curtos para suas redes sociais.</p>
                <div className="flex items-center justify-between">
                   <span className="font-black text-blue-600">20 pts</span>
                   <button 
                    onClick={handleRedeemContent}
                    disabled={redeeming}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
                   >
                     Resgatar
                   </button>
                </div>
              </div>
            </div>
          </div>

          {/* History */}
          <div>
            <h3 className="font-bold mb-4">Histórico de Pontos</h3>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                    <div className="p-8 text-center text-slate-400">Carregando histórico...</div>
                ) : history.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">Nenhuma movimentação ainda.</div>
                ) : history.map((item, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold">{item.description}</p>
                            <p className="text-[10px] text-slate-500 lowercase">{new Date(item.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <span className={`font-black ${item.amount > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {item.amount > 0 ? `+${item.amount}` : item.amount}
                        </span>
                    </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
