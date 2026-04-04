import React, { useState, useEffect } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { useNotifications } from '../NotificationContext';
import { formatCurrency } from '../lib/formatters';

interface CheckoutScreenProps extends NavigationProps {
  params?: any;
}

export default function CheckoutScreen({ onNavigate, params }: CheckoutScreenProps) {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'pix'>('credit');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      if (!params?.requestId && !params?.freelanceOrderId) {
        setLoading(false);
        return;
      }

      if (params?.freelanceOrderId) {
        const { data, error } = await supabase
          .from('freelance_orders')
          .select(`*, profiles:assigned_provider_id(full_name, avatar_url), service_categories(name)`)
          .eq('id', params.freelanceOrderId)
          .single();
        if (!error && data) {
          setRequest({ ...data, is_freelance: true, budget_amount: data.budget });
        }
        setLoading(false);
        return;
      }

      let query = supabase
        .from('service_requests')
        .select(`
          *,
          profiles:provider_id(full_name, avatar_url),
          service_categories(name)
        `);

      if (params.requestId.startsWith('ORD-')) {
        query = query.eq('display_id', params.requestId);
      } else {
        query = query.eq('id', params.requestId);
      }

      const { data, error } = await query.single();
      
      if (!error) setRequest(data);
      setLoading(false);
    };
    fetchRequest();
  }, [params?.requestId]);

  const handlePayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!params?.requestId && !params?.freelanceOrderId) || !user) return;
    
    setIsProcessing(true);
    try {
      // 1. Atualizar status para 'paid'
      if (request?.is_freelance) {
        const { error } = await supabase
          .from('freelance_orders')
          .update({ status: 'paid' })
          .eq('id', params.freelanceOrderId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('service_requests')
          .update({ status: 'paid' })
          .eq('id', request?.id || params.requestId);
        if (error) throw error;
      }

      // 2. Registrar transação
      const totalAmount = (request?.budget_amount || 0) + PLATFORM_FEE;
      await supabase.from('transactions').insert({
        request_id: request?.is_freelance ? null : params.requestId,
        freelance_order_id: request?.is_freelance ? params.freelanceOrderId : null,
        user_id: user.id,
        type: request?.is_freelance ? 'freelance_payment' : 'service_payment',
        amount: totalAmount,
        status: 'completed',
        metadata: { 
          method: paymentMethod,
          service_amount: request?.budget_amount,
          platform_fee: PLATFORM_FEE
        }
      });

      // 3. Notificar no chat
      if (request?.is_freelance) {
        const { data: existingRoom } = await supabase.from('chat_rooms').select('id').eq('freelance_order_id', params.freelanceOrderId).maybeSingle();
        if (!existingRoom) {
          const { data: newRoom } = await supabase.from('chat_rooms').insert({
             freelance_order_id: params.freelanceOrderId,
             client_id: user.id,
             provider_id: request.assigned_provider_id,
             title: request.title
          }).select().single();
          if (newRoom) {
             await supabase.from('chat_messages').insert({
               room_id: newRoom.id,
               sender_id: user.id,
               content: "💳 Taxa paga! O chat está liberado para iniciarem os trabalhos."
             });
          }

          // Notificação manual removida - Gatilho do banco de dados gerencia isso
        }
      } else {
        const { data: room } = await supabase.from('chat_rooms').select('id').eq('request_id', params.requestId).single();
        if (room) {
          await supabase.from('chat_messages').insert({
            room_id: room.id,
            sender_id: user.id,
            content: "💳 Taxa de intermediação paga com sucesso! O serviço foi oficialmente confirmado."
          });
        }
        
        // Notificação manual removida - Gatilho do banco de dados gerencia isso
      }

      if (request?.is_freelance) {
        onNavigate('freelanceStatus', { orderId: params.freelanceOrderId });
      } else {
        onNavigate('serviceStatus', { requestId: params.requestId });
      }
    } catch (err: any) {
      showToast("Erro", "Erro ao processar pagamento: " + err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  const displayData = request || {
    profiles: { full_name: 'Profissional' },
    service_categories: { name: 'Serviço' }
  };

  const PLATFORM_FEE = 9.90;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden">
      
      {/* Header */}
      <header className="flex items-center p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 max-w-4xl mx-auto w-full">
        <button 
          onClick={() => {
            if (params?.freelanceOrderId) {
              onNavigate('freelanceStatus', { orderId: params.freelanceOrderId });
            } else {
              onNavigate('serviceStatus', { requestId: params?.requestId });
            }
          }} 
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight flex-1 text-center">Pagamento da Taxa</h1>
        <div className="w-10"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full pb-32">
        <div className="max-w-4xl mx-auto w-full p-4 space-y-6">
          
          {/* Order Summary */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Resumo do Pedido</h2>
            
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="size-14 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                <img src={displayData.profiles?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} className="w-full h-full object-cover" alt="Profile" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-base leading-tight">{displayData.profiles?.full_name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{displayData.title || displayData.service_categories?.name}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Valor do Orçamento (A pagar ao prestador)</span>
                <span>{formatCurrency(displayData.budget_amount || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300 font-bold">
                <span>Taxa de Intermediação (Agora)</span>
                <span>{formatCurrency(PLATFORM_FEE)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 mt-2 border-t border-slate-100 dark:border-slate-700">
                <span>Total a pagar via App</span>
                <span className="text-primary">{formatCurrency((displayData.budget_amount || 0) + PLATFORM_FEE)}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">* O valor do serviço ficará retido com a KNGindica e será liberado ao profissional após a conclusão.</p>
            </div>
          </section>

          {/* Payment Method Selection */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1">Forma de Pagamento</h2>
            
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'credit' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
                <input type="radio" name="payment" value="credit" className="sr-only" checked={paymentMethod === 'credit'} onChange={() => setPaymentMethod('credit')} />
                <span className="material-symbols-outlined text-3xl">credit_card</span>
                <span className="text-sm font-bold">Cartão de Crédito</span>
              </label>

              <label className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'pix' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
                <input type="radio" name="payment" value="pix" className="sr-only" checked={paymentMethod === 'pix'} onChange={() => setPaymentMethod('pix')} />
                <span className="material-symbols-outlined text-3xl">pix</span>
                <span className="text-sm font-bold">Pix</span>
              </label>
            </div>
          </section>

          {/* Payment Details Form */}
          {paymentMethod === 'credit' && (
            <form id="payment-form" onSubmit={handlePayment} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Número do Cartão</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">credit_score</span>
                  <input type="text" required placeholder="0000 0000 0000 0000" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all font-mono" />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Nome no Cartão</label>
                <input type="text" required placeholder="NOME COMO ESTÁ NO CARTÃO" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all uppercase" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Validade</label>
                  <input type="text" required placeholder="MM/AA" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">CVV</label>
                  <div className="relative">
                    <input type="text" required placeholder="123" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all font-mono" />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg cursor-help" title="3 dígitos no verso do cartão">info</span>
                  </div>
                </div>
              </div>
            </form>
          )}

          {paymentMethod === 'pix' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-2 text-center">
              <div className="size-48 bg-white p-2 rounded-xl mb-4 border border-slate-200">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=KNGindica-pix-tax-10&color=000000&bgcolor=FFFFFF`} alt="QR Code Pix" className="w-full h-full object-contain" />
              </div>
              <h3 className="font-bold text-lg mb-1">Escaneie o QR Code</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-[250px]">
                Abra o app do seu banco e escaneie o código acima para pagar a taxa de intermediação de R$ 9,90.
              </p>
              <button onClick={() => showToast('Copiado', 'Código Copiado!', 'success')} className="flex items-center gap-2 font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-6 py-3 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
                <span className="material-symbols-outlined">content_copy</span>
                Copiar Código Pix
              </button>
            </div>
          )}

        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-center z-20">
        <div className="max-w-4xl mx-auto w-full flex items-center gap-4">
          <div className="flex-col hidden sm:flex">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total</span>
            <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{formatCurrency((displayData.budget_amount || 0) + PLATFORM_FEE)}</span>
          </div>
          <button 
            type={paymentMethod === 'credit' ? 'submit' : 'button'}
            form={paymentMethod === 'credit' ? "payment-form" : undefined}
            onClick={paymentMethod === 'pix' ? () => handlePayment() : undefined}
            disabled={isProcessing}
            className={`flex-1 py-2.5 px-6 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${paymentMethod === 'pix' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-primary hover:bg-primary/90 shadow-primary/30'} ${isProcessing ? 'opacity-80 cursor-wait' : 'hover:-translate-y-0.5 active:translate-y-0'}`}
          >
            {isProcessing ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined">{paymentMethod === 'pix' ? 'pix' : 'lock'}</span>
            )}
            {isProcessing ? 'Processando...' : 'Confirmar Pagamento'}
          </button>
        </div>
      </div>
    </div>
  );
}
