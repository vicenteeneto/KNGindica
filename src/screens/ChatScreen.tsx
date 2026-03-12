import React, { useState, useEffect, useRef } from 'react';
import { NavigationProps } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';

interface ChatScreenProps extends NavigationProps {
  params?: any;
  onClose?: () => void;
}

export default function ChatScreen({ onNavigate, params, onClose }: ChatScreenProps) {
  const { user, role } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estados para Proposta
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalPrice, setProposalPrice] = useState('');
  const [isSendingProposal, setIsSendingProposal] = useState(false);
  const [serviceRequest, setServiceRequest] = useState<any>(null);
  const statusMap: Record<string, string> = {
    'open': 'Aberto',
    'proposed': 'Proposta Enviada',
    'accepted': 'Aceite de Proposta',
    'awaiting_payment': 'Aguardando Pagamento',
    'paid': 'Pago / Confirmado',
    'in_service': 'Em Andamento',
    'completed': 'Finalizado',
    'cancelled': 'Cancelado'
  };

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

    // Buscar dados do pedido vinculado
    const fetchRequest = async () => {
      let finalRequestId = params?.requestId;
      
      // Fallback: se não veio por parâmetro, busca da sala de chat
      if (!finalRequestId && roomId) {
        const { data: roomData } = await supabase
          .from('chat_rooms')
          .select('request_id')
          .eq('id', roomId)
          .single();
        if (roomData?.request_id) finalRequestId = roomData.request_id;
      }

      if (!finalRequestId) return;

      const { data } = await supabase
        .from('service_requests')
        .select('*')
        .eq('id', finalRequestId)
        .single();
      
      if (data) {
        setServiceRequest(data);
        // Atualiza o parâmetro internamente para outras funções
        params.requestId = finalRequestId;
      }
    };
    fetchRequest();

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
        if (payload.new.content.startsWith('[PROPOSTA]')) {
          fetchRequest();
        }
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !roomId) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("O arquivo é muito grande. Limite de 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const contentStr = `[ANEXO]${base64String}`;
      
      const tempMsg = {
        id: `temp-${Date.now()}`,
        room_id: roomId,
        sender_id: user.id,
        content: contentStr,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempMsg]);
      scrollToBottom();

      try {
        const { error } = await supabase.from('chat_messages').insert({
          room_id: roomId,
          sender_id: user.id,
          content: contentStr
        });
        if (error) throw error;
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendProposal = async () => {
    if (!proposalPrice || !user || !params?.requestId || !roomId) {
       console.error("Missing data for proposal", { proposalPrice, user: !!user, requestId: params?.requestId, roomId });
       return;
    }

    setIsSendingProposal(true);
    try {
      const price = parseFloat(proposalPrice.replace(',', '.'));
      if (isNaN(price)) {
        alert("Por favor, insira um valor válido.");
        setIsSendingProposal(false);
        return;
      }

      // 1. Atualizar o pedido com o valor, status e vincular o prestador (caso ainda não esteja)
      const { data: updateData, error: reqError } = await supabase
        .from('service_requests')
        .update({
          budget_amount: price,
          status: 'proposed',
          platform_fee: 10,
          provider_id: user.id // Força o vínculo do prestador que está enviando a proposta
        })
        .eq('id', params.requestId)
        .select();

      console.log("Resultado do update service_request:", { updateData, reqError });
      
      if (reqError) {
        if (reqError.message.includes('invalid input value for enum request_status')) {
          alert("ERRO DE BANCO: O status 'proposed' não existe no banco de dados. Você PRECISA rodar o script SQL de correção (sql_v6_enum_fix.sql) no editor do Supabase.");
        }
        throw reqError;
      }
      if (!updateData || updateData.length === 0) {
        alert("Erro: O pedido não foi encontrado ou você não tem permissão para alterá-lo.");
        setIsSendingProposal(false);
        return;
      }

      // 2. Enviar mensagem especial de proposta
      const content = `[PROPOSTA]Valor: R$ ${price.toFixed(2)} | Clique para ver detalhes e aceitar.`;
      const { error: msgError } = await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: user.id,
        content: content
      });

      if (msgError) throw msgError;

      setShowProposalModal(false);
      setProposalPrice('');
      
      const { data: updatedReq } = await supabase.from('service_requests').select('*').eq('id', params.requestId).single();
      setServiceRequest(updatedReq);

    } catch (err: any) {
      console.error("Erro no envio de proposta:", err);
      if (err.message.includes('permission denied') || err.message.includes('RLS')) {
         alert("ERRO DE PERMISSÃO: O banco de dados não permitiu gravar sua proposta. Você PRECISA rodar o SCRIPT SQL UNIFICADO (sql_v7_final_fix.sql) no editor do Supabase.");
      } else {
         alert("Erro ao enviar proposta: " + err.message);
      }
    } finally {
      setIsSendingProposal(false);
    }
  };

  const handleAcceptProposal = async () => {
    if (!params?.requestId || !user) return;
    setLoading(true);
    try {
      // No fluxo real, aqui abriria o checkout. No mock, aprovamos direto.
      const { error } = await supabase
        .from('service_requests')
        .update({ status: 'awaiting_payment' }) // Próximo passo seria o pagamento da taxa
        .eq('id', params.requestId);

      if (error) {
        if (error.message.includes('enum')) {
          alert("ERRO DE BANCO: O status 'awaiting_payment' não existe no banco de dados. Você PRECISA rodar o script SQL de correção (sql_v6_enum_fix.sql) no editor do Supabase.");
        }
        throw error;
      }
      
      // Notificar no chat
      await supabase.from('chat_messages').insert({
        room_id: roomId,
        sender_id: user.id,
        content: "✅ Proposta aceita! Aguardando confirmação do pagamento da taxa de intermediação."
      });

      const { data } = await supabase.from('service_requests').select('*').eq('id', params.requestId).single();
      setServiceRequest(data);
      alert("Proposta aceita com sucesso! Vamos seguir para o pagamento.");
    } catch (err: any) {
       console.error("Erro no aceite de proposta:", err);
       if (err.message.includes('permission denied') || err.message.includes('RLS')) {
          alert("ERRO DE PERMISSÃO: O banco de dados não permitiu aceitar a proposta. Você PRECISA rodar o SCRIPT SQL UNIFICADO (sql_v7_final_fix.sql) no editor do Supabase.");
       } else {
          alert(err.message);
       }
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
    {selectedImage && (
      <div 
        className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
        onClick={() => setSelectedImage(null)}
      >
        <button 
          onClick={() => setSelectedImage(null)}
          className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined text-3xl">close</span>
        </button>
        <img 
          src={selectedImage} 
          alt="Anexo Ampliado" 
          className="max-w-full max-h-full object-contain select-none shadow-2xl rounded-sm"
          onClick={(e) => e.stopPropagation()} // impede fechamento ao clicar na imagem
        />
      </div>
    )}

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
                  <div className={`rounded-xl rounded-br-none shadow-md overflow-hidden ${msg.content.startsWith('[ANEXO]') ? 'bg-transparent border border-slate-200 dark:border-slate-800' : msg.content.startsWith('[PROPOSTA]') ? 'bg-orange-600 text-white p-4' : 'bg-primary text-white p-3'}`}>
                    {msg.content.startsWith('[ANEXO]') ? (
                      <img 
                        src={msg.content.replace('[ANEXO]', '')} 
                        alt="Anexo" 
                        className="max-w-full sm:max-w-[200px] max-h-[200px] object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                        onClick={() => setSelectedImage(msg.content.replace('[ANEXO]', ''))}
                      />
                    ) : msg.content.startsWith('[PROPOSTA]') ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 font-bold text-orange-100">
                          <span className="material-symbols-outlined">request_quote</span>
                          ORÇAMENTO ENVIADO
                        </div>
                        <p className="text-sm font-medium">{msg.content.replace('[PROPOSTA]', '')}</p>
                        <div className="mt-1 pt-2 border-t border-white/20">
                          <span className="text-[10px] uppercase font-bold text-orange-200">Aguardando aceite do cliente</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    )}
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
                    <div className={`rounded-xl rounded-bl-none shadow-sm border border-primary/5 overflow-hidden ${msg.content.startsWith('[ANEXO]') ? 'bg-transparent border-slate-200 dark:border-slate-800' : msg.content.startsWith('[PROPOSTA]') ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 p-4 text-slate-800 dark:text-slate-100' : 'bg-white dark:bg-slate-800 p-3 text-slate-800 dark:text-slate-100'}`}>
                      {msg.content.startsWith('[ANEXO]') ? (
                        <img 
                          src={msg.content.replace('[ANEXO]', '')} 
                          alt="Anexo" 
                          className="max-w-full sm:max-w-[200px] max-h-[200px] object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                          onClick={() => setSelectedImage(msg.content.replace('[ANEXO]', ''))}
                        />
                      ) : msg.content.startsWith('[PROPOSTA]') ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold">
                            <span className="material-symbols-outlined">description</span>
                            ORÇAMENTO RECEBIDO
                          </div>
                          <p className="text-sm font-medium">{msg.content.replace('[PROPOSTA]', '')}</p>
                          
                          {(serviceRequest?.status === 'proposed' || serviceRequest?.status === 'open') && (
                            <button 
                              onClick={handleAcceptProposal}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold text-xs shadow-md transition-all active:scale-95"
                            >
                              Aceitar e Pagar Taxa (R$ 10)
                            </button>
                          )}
                          {serviceRequest?.status !== 'proposed' && serviceRequest?.status !== 'open' && (
                            <span className="text-[10px] uppercase font-bold text-emerald-500 flex items-center gap-1 mt-2">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              Status: {statusMap[serviceRequest?.status] || serviceRequest?.status}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      )}
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
          <div className="flex items-center gap-1 mb-1">
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined">add_circle</span>
            </button>
            {role === 'provider' && (serviceRequest?.status === 'open' || !serviceRequest?.status) && (
              <button 
                onClick={() => setShowProposalModal(true)}
                className="p-2 text-orange-500 hover:bg-orange-500/10 rounded-full transition-colors flex items-center justify-center"
                title="Enviar Orçamento"
              >
                <span className="material-symbols-outlined">request_quote</span>
              </button>
            )}
          </div>
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary/50 outline-none rounded-2xl py-3 px-4 text-sm"
              placeholder="Escreva uma mensagem..."
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
      {/* Modal de Proposta */}
      {showProposalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-500">request_quote</span>
                Enviar Orçamento
              </h3>
              <button disabled={isSendingProposal} onClick={() => setShowProposalModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Valor Total do Serviço (R$)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                  <input
                    type="text"
                    required
                    value={proposalPrice}
                    onChange={(e) => setProposalPrice(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  * Será cobrada uma taxa de **R$ 10,00** de cada parte após o aceite.
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button" 
                  disabled={isSendingProposal} 
                  onClick={() => setShowProposalModal(false)} 
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSendProposal}
                  disabled={isSendingProposal || !proposalPrice} 
                  className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSendingProposal ? <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span> : 'Enviar Proposta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
