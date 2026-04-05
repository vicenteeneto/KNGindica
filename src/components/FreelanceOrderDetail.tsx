import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../NotificationContext';
import { formatCurrency } from '../lib/formatters';
import { useAuth } from '../AuthContext';

interface FreelanceOrderDetailProps {
  orderId: string;
  onNavigate: (screen: any, params?: any) => void;
  isEmbedded?: boolean;
}

export function FreelanceOrderDetail({ orderId, onNavigate, isEmbedded = false }: FreelanceOrderDetailProps) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imageModal, setImageModal] = useState<{ isOpen: boolean, url: string }>({ isOpen: false, url: '' });

  const fetchOrder = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('freelance_orders')
        .select(`
          *,
          profiles:client_id(full_name, avatar_url, phone),
          service_categories(name, icon)
        `)
        .eq('id', orderId)
        .single();
      
      if (error) throw error;
      setOrder(data);
    } catch (e) {
      console.error("Erro ao buscar freelance:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    const channel = supabase
      .channel(`freelance_detail_${orderId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'freelance_orders', 
        filter: `id=eq.${orderId}` 
      }, () => fetchOrder())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-950/20 rounded-[40px]">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center opacity-30">
        <span className="material-symbols-outlined text-6xl mb-4 italic">error</span>
        <p className="text-xs font-black uppercase tracking-widest">Freelance não encontrado</p>
      </div>
    );
  }

  const isClient = user?.id === order.client_id;

  return (
    <div className={`flex flex-col h-full bg-slate-950 font-display text-slate-100 antialiased overflow-hidden ${isEmbedded ? 'rounded-[40px] border border-white/5' : ''}`}>
      
      {/* Header */}
      <header className="h-[60px] shrink-0 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur-md border-b border-white/5 z-50">
        <div className="flex items-center gap-4">
          <div className="size-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden shadow-lg">
            <img src={order.profiles?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-tighter italic leading-none mb-1">{order.profiles?.full_name || 'Cliente'}</h2>
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-[8px] text-primary">
              <div className="size-1.5 rounded-full bg-primary animate-pulse" />
              Oportunidade de Freelance • {order.display_id || 'ID'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-primary/20 text-primary border border-primary/20">
              {order.status}
           </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 lg:p-10 space-y-10 no-scrollbar">
        
        {/* 1. Descrição */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="size-2 bg-primary rounded-full"></span>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Descrição do Freelance</h4>
          </div>
          <div className="bg-slate-900/50 p-6 rounded-[32px] border border-white/5 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
               <span className="material-symbols-outlined text-[100px] italic">{order.service_categories?.icon || 'work'}</span>
             </div>
             <h3 className="text-xl font-black text-white uppercase tracking-tighter italic leading-tight mb-4 relative z-10">{order.title}</h3>
             <p className="text-sm text-slate-300 font-medium leading-relaxed whitespace-pre-line relative z-10 italic">
               "{order.description || 'Nenhuma descrição detalhada fornecida.'}"
             </p>
          </div>
        </section>

        {/* 2. Fotos */}
        {order.attachments && order.attachments.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="size-2 bg-amber-500 rounded-full"></span>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Galeria de Mídia ({order.attachments.length})</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {order.attachments.map((url: string, idx: number) => (
                <button 
                  key={idx} 
                  onClick={() => setImageModal({ isOpen: true, url })}
                  className="aspect-square rounded-2xl overflow-hidden border border-white/5 bg-slate-900 hover:ring-2 hover:ring-primary/40 transition-all group"
                >
                  <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={`Anexo Job ${idx + 1}`} />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 3. Localização */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="size-2 bg-emerald-500 rounded-full"></span>
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Local do Freelance</h4>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[32px] flex items-center justify-between">
             <div className="min-w-0">
                {order.street ? (
                  <>
                     <p className="text-lg font-black text-white leading-tight uppercase tracking-tighter italic">
                       {order.street}, {order.number || 'S/N'}
                     </p>
                     <p className="text-sm font-bold text-slate-400">
                       {order.neighborhood} • {order.city} - {order.state}
                     </p>
                  </>
                ) : (
                  <p className="text-slate-500 italic text-sm">Localização não especificada (pode ser serviço remoto).</p>
                )}
             </div>
             <button onClick={() => {
                const address = `${order.street}, ${order.number || 'S/N'}, ${order.neighborhood}, ${order.city} - ${order.state}`;
                const url = order.latitude && order.longitude 
                  ? `https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                window.open(url, '_blank');
             }} className="size-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                <span className="material-symbols-outlined text-2xl">near_me</span>
             </button>
          </div>
        </section>

        {/* 4. Budget e Prazo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="size-2 bg-emerald-500 rounded-full"></span>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Orçamento</h4>
            </div>
            <div className="bg-slate-900 border border-white/5 p-6 rounded-[28px] shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <span className="material-symbols-outlined text-4xl italic">payments</span>
               </div>
               <p className="text-2xl font-black text-emerald-500 italic">
                 {formatCurrency(order.budget || 0)}
               </p>
               <p className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest mt-1">Valor do freelance</p>
            </div>
          </section>

           <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="size-2 bg-orange-500 rounded-full"></span>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Estimativa de Entrega</h4>
            </div>
            <div className="bg-slate-900 border border-white/5 p-6 rounded-[28px] shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <span className="material-symbols-outlined text-4xl italic">timer</span>
               </div>
               <p className="text-xl font-black text-orange-500 italic">
                 A combinar
               </p>
               <p className="text-[9px] font-bold text-orange-500/60 uppercase tracking-widest mt-1">Definido após o pagamento</p>
            </div>
          </section>
        </div>

        {/* Action Button */}
        <div className="pt-6">
           <button 
             onClick={() => {
               if (['assigned', 'awaiting_payment', 'paid', 'in_service', 'completed', 'cancelled'].includes(order.status)) {
                 onNavigate('freelanceStatus', { orderId: order.id });
               } else {
                 onNavigate('bidRoom', { orderId: order.id });
               }
             }}
             className="w-full py-4 bg-primary text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 group"
           >
             <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
               {['assigned', 'awaiting_payment', 'paid', 'in_service', 'completed'].includes(order.status) ? 'visibility' : 'send_money'}
             </span>
             {['assigned', 'awaiting_payment', 'paid', 'in_service', 'completed'].includes(order.status) ? 'Verificar Status do Freelance' : 'Entrar na Sala de Lance'}
           </button>
        </div>

        <div className="h-10"></div>
      </main>

      {/* Image Modal */}
      {imageModal.isOpen && (
        <div 
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={() => setImageModal({ isOpen: false, url: '' })}
        >
          <div className="relative w-full h-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <img src={imageModal.url} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300" />
            <button onClick={() => setImageModal({ isOpen: false, url: '' })} className="absolute top-6 right-6 size-12 bg-white/10 rounded-full flex items-center justify-center text-white">
               <span className="material-symbols-outlined text-3xl">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
