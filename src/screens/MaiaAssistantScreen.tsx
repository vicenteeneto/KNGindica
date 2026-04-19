import React, { useState, useRef, useEffect } from 'react';
import { NavigationProps } from '../types';
import { useNotifications } from '../NotificationContext';
import { supabase } from '../lib/supabase';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
  timestamp: string;
}

export default function MaiaAssistantScreen({ onNavigate }: NavigationProps) {
  const { showToast } = useNotifications();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'model', 
      parts: [{ text: 'Ol\u00e1! Sou a MAIA, sua assistente virtual de servi\u00e7os em Rondon\u00f3polis. Em que posso te ajudar hoje?' }],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMsg = inputText.trim();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newMessages: Message[] = [
      ...messages,
      { role: 'user', parts: [{ text: userMsg }], timestamp }
    ];
    
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    try {
      // Prepara o hist\u00f3rico para o formato que o Gemini espera (sem os timestamps)
      const history = messages.map(m => ({
        role: m.role,
        parts: m.parts
      }));

      const { data, error } = await supabase.functions.invoke('maia-chat', {
        body: { message: userMsg, history }
      });

      if (error) throw error;

      setMessages(prev => [
        ...prev,
        { 
          role: 'model', 
          parts: [{ text: data.text }], 
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        }
      ]);
    } catch (err: any) {
      console.error('Erro na MAIA:', err);
      showToast('Erro', 'N\u00e3o consegui processar sua mensagem agora. Tente novamente em breve.', 'error');
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="relative mx-auto flex h-screen w-full flex-col bg-[#e5ddd5] dark:bg-slate-950 overflow-hidden font-display antialiased">
      {/* Header */}
      <div className="flex items-center bg-primary text-white p-3 gap-3 shadow-md z-10 sticky top-0 h-16">
        <button 
          onClick={() => onNavigate('home')}
          className="material-symbols-outlined cursor-pointer hover:bg-white/10 p-1 rounded-full transition-colors"
        >
          arrow_back
        </button>
        <div className="relative shrink-0">
          <div 
            className="bg-primary/20 bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border border-white/20 shadow-inner" 
            title="Avatar circular da assistente virtual MAIA" 
            style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDU4c5UGnllwSwkYQq6_vbHZO5FLVBPJoM0oH5jqcSFiP989WCLH7Uj2jYnSDzRwL3CWp9aXgIMe1M2mpPQ0R3H4Q4YIFpSHv8tbaWiDsyEYPI_4K6HnK0OrKvefKg0ImNsipqwg-hRe6_dT3DCEEHx6mxOEVxyPbOpMFJ2bDS4_QpprD6gT5YKUO_NZlqKbi8pz4uixK78JVkMuYn5mhMUnvwEI3kX54XzC2ZkbPBx6DkCBcWza_I8Opz3fJ7GbEZbyLvgjNGqfkA")' }}
          />
          <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-primary rounded-full"></div>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">
          <h2 className="text-white text-base font-black leading-tight truncate italic">MAIA</h2>
          <p className="text-white/80 text-[10px] font-bold flex items-center gap-1">
             <span className="size-1.5 bg-green-400 rounded-full animate-pulse" /> Dispon\u00edvel
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span 
            className="material-symbols-outlined cursor-pointer text-2xl hover:bg-white/10 p-2 rounded-full transition-colors"
            onClick={() => showToast('Informa\u00e7\u00f5es', 'Eu sou a IA da KNG. Posso te ajudar a encontrar profissionais e tirar d\u00favidas.', 'info')}
          >
            info
          </span>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] dark:bg-none no-scrollbar pb-24"
      >
        <div className="flex justify-center my-4">
          <span className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm text-slate-700 dark:text-slate-300 text-[10px] px-3 py-1 rounded-full font-black border border-white/10 shadow-sm">Chat Seguro com IA</span>
        </div>

        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex items-start gap-2 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'ml-auto justify-end' : ''}`}
          >
            <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`relative text-sm font-medium leading-relaxed rounded-2xl px-4 py-2.5 shadow-sm border ${
                msg.role === 'user' 
                  ? 'bg-primary text-white border-primary rounded-tr-none' 
                  : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-white/10 rounded-tl-none'
              }`}>
                {msg.parts[0].text}
                <div className={`flex items-center gap-1 mt-1.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span className={`text-[9px] font-bold ${msg.role === 'user' ? 'text-white/70' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </span>
                  {msg.role === 'user' && <span className="material-symbols-outlined text-[10px] text-white/50">done_all</span>}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start gap-2 max-w-[85%] animate-pulse">
            <div className="bg-white dark:bg-slate-900 border border-white/10 px-4 py-2 rounded-2xl rounded-tl-none">
               <div className="flex gap-1">
                  <div className="size-1.5 bg-primary/40 rounded-full animate-bounce"></div>
                  <div className="size-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="size-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-white/5 p-3 flex items-center gap-3 z-10 sticky bottom-0">
        <div className="flex flex-1 items-center bg-slate-100 dark:bg-slate-900 rounded-2xl px-4 py-3 gap-3 shadow-inner focus-within:ring-2 focus-within:ring-primary/30 transition-all">
          <input 
            className="flex-1 border-none bg-transparent text-sm font-medium focus:ring-0 text-slate-900 dark:text-slate-100 placeholder-slate-500 outline-none w-full" 
            placeholder="Pergunte qualquer coisa..." 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            disabled={isTyping}
          />
        </div>
        <button 
          onClick={handleSendMessage}
          disabled={!inputText.trim() || isTyping}
          className={`flex size-12 items-center justify-center rounded-2xl shadow-lg transition-all active:scale-90 shrink-0 ${
            !inputText.trim() || isTyping 
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400' 
              : 'bg-primary text-white shadow-primary/30'
          }`}
        >
          {isTyping ? (
             <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
          ) : (
             <span className="material-symbols-outlined text-xl">send</span>
          )}
        </button>
      </div>
    </div>
  );
}
