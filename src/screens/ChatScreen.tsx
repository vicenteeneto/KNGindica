import React, { useState, useEffect, useRef } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';

interface ChatScreenProps extends NavigationProps {
  params?: any;
  onClose?: () => void;
}

export default function ChatScreen({ onNavigate, params, onClose }: ChatScreenProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const roomId = params?.roomId;
  const opponentName = params?.opponentName || 'Usuário';
  const opponentAvatar = params?.opponentAvatar || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";

  useEffect(() => {
    if (!roomId || !user) return;

    const fetchMessages = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        setMessages(prev => {
          // Só atualiza (e rola) se a quantidade de mensagens vindas do banco mudar
          const validPrev = prev.filter(m => !m.id?.toString().startsWith('temp-'));
          if (validPrev.length !== (data || []).length) {
            scrollToBottom();
            return data || [];
          }
          return prev;
        });
      } catch (err) {
        console.error(err);
      } finally {
        if (!silent) setLoading(false);
      }
    };

    fetchMessages();

    // Fallback polling de 3 em 3 segundos para garantir delivery caso websocket falhe
    const interval = setInterval(() => fetchMessages(true), 3000);

    // Subscribe to real-time updates as primary driver
    const messageSubscription = supabase
      .channel(`chat_room_${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        setMessages((prev) => {
          // remove temp message with same content if exists
          const filtered = prev.filter(m => !(m.id?.toString().startsWith('temp-') && m.content === payload.new.content));
          return [...filtered, payload.new];
        });
        scrollToBottom();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(messageSubscription);
    };
  }, [roomId, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !roomId) return;
    const msgText = newMessage.trim();
    setNewMessage('');

    // Optimistic Update
    const tempMsg = {
      id: `temp-${Date.now()}`,
      room_id: roomId,
      sender_id: user.id,
      content: msgText,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempMsg]);
    scrollToBottom();

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          content: msgText
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error sending message:', err);
      // optionally set the message back if failed
      setNewMessage(msgText);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  return (
    <div className="flex flex-col w-full h-full md:h-[550px] md:w-[350px] bg-white dark:bg-slate-900 md:rounded-t-2xl sm:shadow-2xl md:border-t md:border-x border-slate-200 dark:border-slate-800 overflow-hidden font-display text-slate-900 dark:text-slate-100 z-50">
        {/* TopAppBar */}
        <nav className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-primary/10 px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => onClose ? onClose() : onNavigate('chatList')} className="p-1 hover:bg-primary/10 rounded-full text-slate-600 dark:text-slate-400">
            <span className="material-symbols-outlined">{onClose ? 'close' : 'arrow_back'}</span>
          </button>
          <div className="relative">
            <div className="size-10 rounded-full bg-cover bg-center border border-primary/20 overflow-hidden">
              <img src={opponentAvatar} alt={opponentName} className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-base leading-tight truncate max-w-[150px]">{opponentName}</h1>
            <span className="text-xs text-primary font-medium">Online</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onNavigate('home')} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-primary/10 rounded-lg" title="Início">
            <span className="material-symbols-outlined">home</span>
          </button>
          <button onClick={() => alert('Iniciando chamada de vídeo...')} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-primary/10 rounded-lg">
            <span className="material-symbols-outlined">videocam</span>
          </button>
          <button onClick={() => alert('Iniciando chamada de voz...')} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-primary/10 rounded-lg">
            <span className="material-symbols-outlined">call</span>
          </button>
          <button onClick={() => alert('Opções do contato: Bloquear, Limpar Conversa, etc.')} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-primary/10 rounded-lg hidden sm:block">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </nav>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-slate-50 dark:bg-slate-950/50 relative">
        {loading ? (
          <div className="flex justify-center p-8">
            <span className="material-symbols-outlined animate-spin text-4xl text-slate-300">progress_activity</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-50">
            <span className="material-symbols-outlined text-4xl mb-2">chat</span>
            <p className="text-sm">Envie a primeira mensagem para iniciar.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === user?.id;
            const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            if (isMe) {
              return (
                <div key={msg.id} className="flex flex-col items-end gap-1 ml-auto max-w-[85%]">
                  <div className="bg-primary text-white p-3 rounded-xl rounded-br-none shadow-md">
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">{time}</span>
                    <span className="material-symbols-outlined text-primary text-[14px]">done_all</span>
                  </div>
                </div>
              );
            } else {
              return (
                <div key={msg.id} className="flex items-end gap-2 max-w-[85%]">
                  <div className="size-8 shrink-0 rounded-full bg-cover bg-center overflow-hidden border border-slate-200 dark:border-slate-700 hidden sm:block">
                    <img src={opponentAvatar} alt={opponentName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-1 items-start">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-xl rounded-bl-none shadow-sm border border-primary/5 text-slate-800 dark:text-slate-100">
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 ml-1">{time}</span>
                  </div>
                </div>
              );
            }
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 bg-white dark:bg-slate-900 border-t border-primary/10">
        <div className="flex items-end gap-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-1">
            <button onClick={() => alert('Abrir opções de anexo de arquivo')} className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors">
              <span className="material-symbols-outlined">add_circle</span>
            </button>
            <button onClick={() => alert('Abrir galeria de imagens')} className="p-2 text-slate-500 hover:bg-primary/10 rounded-full transition-colors">
              <span className="material-symbols-outlined">image</span>
            </button>
          </div>
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full bg-background-light dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/50 rounded-2xl py-3 px-4 text-sm resize-none max-h-32 scrollbar-hide"
              placeholder="Escreva uma mensagem..."
              rows={1}
            />
          </div>
          <button
            disabled={!newMessage.trim()}
            onClick={handleSendMessage}
            className="size-11 flex items-center justify-center bg-primary text-white rounded-full shadow-lg hover:shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 disabled:hover:scale-100"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
        <div className="h-1.5 w-24 bg-slate-200 dark:bg-slate-800 mx-auto mt-4 rounded-full sm:hidden"></div>
      </footer>
    </div>
  );
}
