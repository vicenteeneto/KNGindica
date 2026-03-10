import React, { useState } from 'react';
import { NavigationProps } from '../types';

export default function CheckoutScreen({ onNavigate }: NavigationProps) {
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'pix'>('credit');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      onNavigate('serviceConfirmation'); // Assume success and go to a confirmation or home
    }, 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden">
      
      {/* Header */}
      <header className="flex items-center p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 max-w-4xl mx-auto w-full">
        <button 
          onClick={() => onNavigate('serviceStatus')} 
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-700 dark:text-slate-300">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight flex-1 text-center">Pagamento</h1>
        <div className="w-10"></div> {/* spacer */}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full pb-32">
        <div className="max-w-4xl mx-auto w-full p-4 space-y-6">
          
          {/* Order Summary */}
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Resumo do Pedido</h2>
            
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div 
                className="size-14 rounded-xl bg-cover bg-center border border-slate-200 dark:border-slate-700"
                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAnLhxuX85nwXe4l4ukunmaHAX_G7C0Ya68Ue_8JsG0v1COIg-GYB-c6pQdp4dhXwyvoL17fqD-540wSSagPUfoKLJf2s0vYqGRH_8ULqLl-f2kJIzMgr2DNdpdcW0OHU-vPwwcc5KgUorZrdkcWJUSMQ9aKFqaDYzzzCh-bh-OKQljm1NtpQZsZF7Aq-Y1MWwIw9SktAYvcbZlgR3XQ65DMEMODKbXECLbzemXHr7xgDLTPUM1KwX8aVlqNbXHqRnXgs1YWx_B7BY')" }}
              ></div>
              <div className="flex-1">
                <p className="font-bold text-base leading-tight">Marcos Oliveira</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Instalação de Ar Condicionado</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Valor do Serviço</span>
                <span>R$ 250,00</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Taxa da Plataforma</span>
                <span>R$ 25,00</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 mt-2 border-t border-slate-100 dark:border-slate-700">
                <span>Total a pagar</span>
                <span className="text-primary">R$ 275,00</span>
              </div>
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
          {paymentMethod === 'credit' ? (
            <form id="payment-form" onSubmit={handlePayment} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Número do Cartão</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">credit_score</span>
                  <input type="text" required placeholder="0000 0000 0000 0000" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all font-mono" />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Nome no Cartão</label>
                <input type="text" required placeholder="NOME COMO ESTÁ NO CARTÃO" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all uppercase" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Validade</label>
                  <input type="text" required placeholder="MM/AA" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">CVV</label>
                  <div className="relative">
                    <input type="text" required placeholder="123" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all font-mono" />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg cursor-help" title="3 dígitos no verso do cartão">info</span>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-2 text-center">
              <div className="size-48 bg-white p-2 rounded-xl mb-4 border border-slate-200">
                {/* Fake QR Code using a generic placeholder pattern */}
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=kngflow-pix-payment-sim-275&color=000000&bgcolor=FFFFFF`} alt="QR Code Pix" className="w-full h-full object-contain" />
              </div>
              <h3 className="font-bold text-lg mb-1">Escaneie o QR Code</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-[250px]">
                Abra o app do seu banco e escaneie o código acima para pagar.
              </p>
              <button className="flex items-center gap-2 font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-6 py-3 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
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
            <span className="text-xl font-black text-slate-900 dark:text-white leading-none">R$ 275,00</span>
          </div>
          <button 
            type={paymentMethod === 'credit' ? 'submit' : 'button'}
            form={paymentMethod === 'credit' ? "payment-form" : undefined}
            onClick={paymentMethod === 'pix' ? handlePayment : undefined}
            disabled={isProcessing}
            className={`flex-1 py-4 px-6 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${paymentMethod === 'pix' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-primary hover:bg-primary/90 shadow-primary/30'} ${isProcessing ? 'opacity-80 cursor-wait' : 'hover:-translate-y-0.5 active:translate-y-0'}`}
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
