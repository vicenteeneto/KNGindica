import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';

export default function OpenOrdersScreen({ onNavigate }: NavigationProps) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidMessage, setBidMessage] = useState('');

  useEffect(() => {
    fetchOrders();
    
    // Subscribe to new orders
    const channel = supabase
      .channel('freelance_orders_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'freelance_orders' }, payload => {
        setOrders(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('freelance_orders')
      .select(`
        *,
        profiles:client_id(full_name, avatar_url),
        service_categories(name, icon)
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    
    if (!error) setOrders(data || []);
    setLoading(false);
  };

  const handlePlaceBid = async (orderId: string) => {
    if (!user) return alert("Erro de autenticação.");
    if (!bidAmount) return alert("Insira um valor.");

    try {
      const { error } = await supabase
        .from('freelance_bids')
        .insert([{
          order_id: orderId,
          provider_id: user.id,
          amount: parseFloat(bidAmount),
          message: bidMessage,
          status: 'pending'
        }]);

      if (error) {
        if (error.code === '23505') alert("Você já fez um lance para esta ordem.");
        else throw error;
      } else {
        // Send notification to client
        await supabase.from('notifications').insert({
          user_id: orders.find(o => o.id === orderId)?.client_id,
          title: "Novo Lance Recebido!",
          content: `Um profissional deu um lance de R$ ${parseFloat(bidAmount).toFixed(2)} em sua ordem: ${orders.find(o => o.id === orderId)?.title}`,
          type: 'new_bid',
          metadata: { orderId: orderId, amount: bidAmount }
        });

        alert("Lance enviado com sucesso!");
        setBidding(null);
        setBidAmount('');
        setBidMessage('');
      }
    } catch (err: any) {
      alert("Erro ao enviar lance: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col antialiased">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center p-4 justify-between max-w-4xl mx-auto w-full">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="text-slate-900 dark:text-slate-100 flex size-10 items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-xl font-black tracking-tighter italic uppercase text-primary">Oportunidades Alvo</h2>
          <button onClick={fetchOrders} className="size-10 flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 lg:p-8 space-y-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
            </div>
            <h3 className="text-xl font-bold">Nenhuma ordem aberta</h3>
            <p className="text-slate-500 max-w-[250px] mx-auto">Fique ligado! Novas oportunidades podem aparecer a qualquer momento.</p>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative group transition-all hover:shadow-xl hover:border-primary/20">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined">{order.service_categories?.icon || 'work'}</span>
                  </div>
                  <div>
                    <h3 className="font-black text-lg leading-tight uppercase tracking-tight">{order.title}</h3>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">{order.service_categories?.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Budget Cliente</p>
                  <p className="text-xl font-black text-emerald-500 leading-none">R$ {order.budget?.toFixed(2)}</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl leading-relaxed">
                {order.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-slate-200 overflow-hidden">
                    <img src={order.profiles?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-full h-full object-cover" alt="" />
                  </div>
                  <p className="text-xs font-bold text-slate-500">{order.profiles?.full_name?.split(' ')[0]}</p>
                </div>

                {bidding === order.id ? (
                  <div className="flex-1 ml-4 flex gap-2 animate-in slide-in-from-right-2">
                    <input 
                      type="number"
                      placeholder="Valor R$"
                      className="w-24 bg-slate-100 dark:bg-slate-900 border-none rounded-xl px-3 text-sm font-bold"
                      value={bidAmount}
                      onChange={e => setBidAmount(e.target.value)}
                    />
                    <button 
                      onClick={() => handlePlaceBid(order.id)}
                      className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600"
                    >
                      Enviar
                    </button>
                    <button onClick={() => setBidding(null)} className="text-slate-400">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setBidding(order.id);
                      setBidAmount(order.budget.toString());
                    }}
                    className="bg-primary text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Disputar Ordem
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
