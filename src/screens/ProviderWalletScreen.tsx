import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { formatCurrency } from '../lib/formatters';

export default function ProviderWalletScreen({ onNavigate }: NavigationProps) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState({ available: 0, pending: 0, monthTotal: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchWalletData = async () => {
      setLoading(true);
      try {
        // 1. Fetch available balance from summary view
        const { data: summary } = await supabase
          .from('provider_wallet_summary')
          .select('total_earnings')
          .eq('provider_id', user.id)
          .single();

        // 2. Fetch pending balance (where status is 'paid' or 'in_service')
        const { data: pendingReqs } = await supabase
          .from('service_requests')
          .select('budget_amount, platform_fee')
          .eq('provider_id', user.id)
          .in('status', ['paid', 'in_service']);

        const pendingBalance = pendingReqs?.reduce((acc, req) => acc + (Number(req.budget_amount) - Number(req.platform_fee)), 0) || 0;

        // 3. Fetch recent transactions
        const { data: txs } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        setBalance({
          available: Number(summary?.total_earnings) || 0,
          pending: pendingBalance,
          monthTotal: (Number(summary?.total_earnings) || 0) + pendingBalance // Simplificado para o MVP
        });
        setTransactions(txs || []);

      } catch (err) {
        console.error("Wallet error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
  }, [user]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden">
      
      {/* Header */}
      <header className="flex items-center p-4 bg-primary text-white sticky top-0 z-10">
        <button 
          onClick={() => onNavigate('dashboard')} 
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight flex-1 text-center">Minha Carteira</h1>
        <div className="w-10 flex justify-end">
          <button className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors" title="Ajuda">
            <span className="material-symbols-outlined">help</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full pb-24">
        
        {/* Balance Card Section */}
        <div className="bg-primary pt-2 pb-12 px-4 rounded-b-[40px] shadow-sm relative">
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            <p className="text-white/80 text-sm font-medium mb-1 uppercase tracking-wider">Saldo Disponível</p>
            <div className="flex items-start gap-1">

              <h2 className="text-5xl font-black text-white tracking-tighter">
                {formatCurrency(balance.available)}
              </h2>
            </div>
            
            <div className="flex gap-4 mt-6 w-full max-w-sm">
              <button 
                onClick={() => showToast("Em Breve", 'Abrir fluxo de saque (Transferência/Pix)', "info")}
                className="flex-1 bg-white text-primary font-bold py-3.5 px-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined">account_balance</span>
                Sacar
              </button>
              <button className="flex-1 bg-primary-600 text-white font-bold py-3.5 px-4 rounded-2xl border border-white/20 flex items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all">
                <span className="material-symbols-outlined">receipt_long</span>
                Extrato
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full px-4 -mt-6 relative z-10 space-y-6">
          
          {/* Quick Metrics */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex divide-x divide-slate-100 dark:divide-slate-700">
            <div className="flex-1 flex flex-col items-center justify-center py-2 px-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 text-center">A Receber</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {formatCurrency(balance.pending)}
              </p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center py-2 px-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 text-center">Total (Mês)</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(balance.monthTotal)}
              </p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center py-2 px-1">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 text-center">Comissão</p>
              <p className="text-lg font-bold text-rose-500 dark:text-rose-400">10%</p>
            </div>
          </div>

          {/* Transactions List */}
          <section>
            <div className="flex justify-between items-center mb-4 px-2">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Recentes</h3>
              <button className="text-primary text-sm font-semibold hover:underline">Ver tudo</button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
              
              {loading ? (
                <div className="p-8 text-center text-slate-400">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                </div>
              ) : transactions.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2">history</span>
                  <p className="text-sm">Nenhuma transação ainda.</p>
                </div>
              ) : (
                transactions.map(tx => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={`size-12 rounded-full flex items-center justify-center ${tx.type === 'fee_deduction' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        <span className="material-symbols-outlined">
                          {tx.type === 'fee_deduction' ? 'account_balance_wallet' : 'payments'}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {tx.type === 'fee_deduction' ? 'Taxa da Plataforma' : 'Serviço Concluído'}
                        </p>
                        <p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleDateString()} • {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${tx.type === 'fee_deduction' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {tx.type === 'fee_deduction' ? '-' : '+'} {formatCurrency(tx.amount)}
                      </p>
                      <p className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded ml-auto mt-1 w-max capitalize">{tx.status}</p>
                    </div>
                  </div>
                ))
              )}

            </div>
          </section>

          {/* Banner Help */}
          <section className="bg-slate-800 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px] flex items-start justify-end p-4 pointer-events-none">
              <span className="material-symbols-outlined text-5xl text-white/10">verified_user</span>
            </div>
            
            <div className="relative z-10">
              <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">shield</span>
                Garantia KNGflow
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm">
                Seu dinheiro está seguro. Todos os pagamentos são retidos até a conclusão e aprovação mútua do serviço.
              </p>
            </div>
            <button className="relative z-10 px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold transition-colors whitespace-nowrap">
              Saiba Mais
            </button>
          </section>

        </div>
      </main>
      
    </div>
  );
}
