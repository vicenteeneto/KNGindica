import { useState, useEffect } from 'react';
import { NavigationProps } from '../../types';
import { useAuth } from '../../AuthContext';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../NotificationContext';
import { formatCurrency } from '../../lib/formatters';
import { calculateServiceFees, PREMIUM_PLAN_PRICE, PROVIDER_INTERMEDIATION_FEE } from '../../lib/billing';

export interface UseAdminDashboardDataParams {
  onNavigate: NavigationProps['onNavigate'];
  /** Aba ativa — alguns efeitos recarregam dados ao trocar de aba. */
  activeTab: string;
}

/**
 * Estado, efeitos e handlers do painel administrativo.
 *
 * Extraído de AdminDashboardScreen para que o componente cuide só da
 * renderização. O tipo do retorno é inferido — as abas consomem via
 * AdminDashboardContext.
 */
export function useAdminDashboardData({ onNavigate, activeTab }: UseAdminDashboardDataParams) {
  const { logout, user, profile, role } = useAuth();
  const isPremiumUser = profile?.plan_type === 'plus' || role === 'admin';
  const { showToast, showModal, unreadNotifications, unreadMessages } = useNotifications();
  const [stats, setStats] = useState({
    providers: 0,
    clients: 0,
    servicesCompleted: 0,
    revenue: 0,
    newToday: 0,
  });
  const [providersList, setProvidersList] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProviderForKYC, setSelectedProviderForKYC] = useState<any>(null);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [chatRoomsList, setChatRoomsList] = useState<any[]>([]);
  const [selectedChatRoom, setSelectedChatRoom] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any>(null);

  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [categoryRequests, setCategoryRequests] = useState<any[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', icon_name: '' });
  const [conversionMetrics, setConversionMetrics] = useState<any[]>([]);
  const [recentUsersList, setRecentUsersList] = useState<any[]>([]);
  const [providerSearch, setProviderSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [growthData, setGrowthData] = useState<{ clients: number[], providers: number[] }>({ clients: [0,0,0,0,0,0,0], providers: [0,0,0,0,0,0,0] });
  const [mockReviewForm, setMockReviewForm] = useState({ 
    provider_id: '', 
    reviewer_id: '', 
    reviewer_name: '', 
    reviewer_avatar_url: '', 
    rating: 5, 
    comment: '', 
    request_id: '',
    created_at: new Date().toISOString().split('T')[0]
  });
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [activeCities, setActiveCities] = useState<string[]>([]);
  const [providerSearchTerm, setProviderSearchTerm] = useState('');
  const [reviewerSearchTerm, setReviewerSearchTerm] = useState('');
  const [showProviderResults, setShowProviderResults] = useState(false);
  const [showReviewerResults, setShowReviewerResults] = useState(false);
  const [maintenanceSearchTerm, setMaintenanceSearchTerm] = useState('');
  const [ordersFilter, setOrdersFilter] = useState<'all' | 'awaiting_payment' | 'scheduled' | 'in_progress' | 'completed' | 'disputed'>('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [adminResponseText, setAdminResponseText] = useState('');
  const [referralsHistory, setReferralsHistory] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    cep: '',
    city: '',
    state: '',
    neighborhood: '',
    street: '',
    number: '',
    address_complement: '',
    service_category: '',
    description: '',
    status: 'active',
    role: 'client'
  });
  const [chatAuditSearchTerm, setChatAuditSearchTerm] = useState('');
  const [platformCommissionFixed, setPlatformCommissionFixed] = useState(PROVIDER_INTERMEDIATION_FEE);
  const [premiumSubscriptionPrice, setPremiumSubscriptionPrice] = useState(PREMIUM_PLAN_PRICE);
  const [newAuditMessage, setNewAuditMessage] = useState('');

  const ticketCategoryLabels: Record<string, string> = {
    dispute: 'Disputa Financeira',
    question: 'Dúvida Geral',
    suggestion: 'Sugestão',
    account: 'Problemas de Conta',
  };



  const AVAILABLE_ICONS = [
    'handyman', 'bolt', 'plumbing', 'cleaning_services', 'yard', 'local_shipping', 'ac_unit', 'format_paint', 
    'carpenter', 'pest_control', 'iron', 'local_laundry_service', 'computer', 'tv', 'directions_car', 
    'content_cut', 'imagesearch_roller', 'construction', 'engineering', 'architecture', 'pets', 'camera_alt',
    'fitness_center', 'school', 'spa', 'local_florist', 'local_dining', 'local_pizza', 'child_care', 'sports_esports'
  ];

  const formatPhone = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length <= 10) {
      return v.replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 14);
    }
    return v.replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
  };

  const formatCEP = (value: string) => {
    return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
  };

  const handleCepChange = async (cepValue: string) => {
    const formattedCep = formatCEP(cepValue);
    const digits = formattedCep.replace(/\D/g, '');
    setUserForm(prev => ({ ...prev, cep: formattedCep }));

    if (digits.length === 8) {
      setIsFetchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setUserForm(prev => ({
            ...prev,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
            neighborhood: data.bairro || prev.neighborhood,
            street: data.logradouro || prev.street
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      } finally {
        setIsFetchingCep(false);
      }
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: string) => {
    try {
      const { error } = await supabase.from('profiles').update({ status }).eq('id', userId);
      if (error) throw error;
      setProvidersList(prev => prev.map(p => p.id === userId ? { ...p, status } : p));
      setClientsList(prev => prev.map(c => c.id === userId ? { ...c, status } : c));
      setSelectedProviderForKYC(null);
      showToast("Sucesso", "Status atualizado com sucesso.", "success");
    } catch (e) {
      console.error("Erro ao atualizar status do usuário", e);
      showToast("Erro", "Erro ao atualizar status", "error");
    }
  };

  const handleUpdateCategoryStatus = async (categoryId: string, active: boolean) => {
    try {
      const { error } = await supabase.from('service_categories').update({ active }).eq('id', categoryId);
      if (error) throw error;
      setCategoriesList(prev => prev.map(c => c.id === categoryId ? { ...c, active } : c));
      showToast("Sucesso", `Categoria ${active ? 'ativada' : 'desativada'} com sucesso.`, "success");
    } catch (e) {
      console.error("Erro ao atualizar status da categoria", e);
      showToast("Erro", "Erro ao atualizar categoria", "error");
    }
  };

  const handleApproveVerification = async (verification: any) => {
    try {
      // 1. Update verification status
      const { error: vError } = await supabase
        .from('provider_verifications')
        .update({ status: 'approved' })
        .eq('id', verification.id);
      
      if (vError) throw vError;

      // 2. Update profile is_verified
      const { error: pError } = await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('id', verification.provider_id);
      
      if (pError) throw pError;

      setPendingVerifications(prev => prev.filter(v => v.id !== verification.id));
      setSelectedVerification(null);
      showToast("Sucesso", "Prestador verificado com sucesso!", "success");
    } catch (e) {
      console.error("Erro ao aprovar verificação", e);
      showToast("Erro", "Erro ao aprovar", "error");
    }
  };

  const handleRejectVerification = async (verification: any, reason: string) => {
    try {
      const { error } = await supabase
        .from('provider_verifications')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', verification.id);
      
      if (error) throw error;
      setPendingVerifications(prev => prev.filter(v => v.id !== verification.id));
      setSelectedVerification(null);
      showToast("Aviso", "Verificação rejeitada.", "notification");
    } catch (e) {
      console.error("Erro ao rejeitar verificação", e);
      showToast("Erro", "Erro ao rejeitar", "error");
    }
  };

  const handleDeleteUserRecords = async (userId: string) => {
    showModal({
      title: "Confirmar Reset Total",
      message: "ATENÇÃO: Isso apagará permanentemente a conta do usuário (incluindo o e-mail no Supabase Auth) e todos os seus registros. Deseja continuar?",
      confirmLabel: "Sim, Excluir Tudo",
      cancelLabel: "Cancelar",
      type: "danger",
      onConfirm: async () => {
        setMaintenanceLoading(true);
        try {
          // Chamando a nova função RPC que deleta do Auth e Cascade para o resto
          const { error } = await supabase.rpc('delete_user_entirely', { target_user_id: userId });

          if (error) throw error;
          
          showModal({
            title: "Sucesso!",
            message: "A conta e todos os dados foram removidos permanentemente.",
            type: "success"
          });
          fetchData();
        } catch (e: any) {
          console.error("Erro ao excluir usuário:", e);
          showToast("Erro", e.message || "Erro ao excluir registros.", "error");
        } finally {
          setMaintenanceLoading(false);
        }
      }
    });
  };

  const handleCreateMockReview = async () => {
    if (!mockReviewForm.provider_id || (!mockReviewForm.reviewer_id && !mockReviewForm.reviewer_name) || !mockReviewForm.comment) {
      showToast("Campos Incompletos", "Preencha o prestador, o autor e o comentário.", "error");
      return;
    }

    setMaintenanceLoading(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        provider_id: mockReviewForm.provider_id,
        reviewer_id: mockReviewForm.reviewer_id || null, 
        reviewer_name: mockReviewForm.reviewer_name || null,
        reviewer_avatar_url: mockReviewForm.reviewer_avatar_url || null,
        rating: mockReviewForm.rating,
        comment: mockReviewForm.comment,
        request_id: mockReviewForm.request_id || null,
        created_at: mockReviewForm.created_at ? new Date(mockReviewForm.created_at).toISOString() : new Date().toISOString()
      });

      if (error) throw error;
      showToast("Sucesso", "Avaliação mock criada com sucesso!", "success");
      setMockReviewForm({ 
        provider_id: '', 
        reviewer_id: '', 
        reviewer_name: '', 
        reviewer_avatar_url: '', 
        rating: 5, 
        comment: '', 
        request_id: '',
        created_at: new Date().toISOString().split('T')[0]
      });
      setProviderSearchTerm('');
      setReviewerSearchTerm('');
      fetchData();
    } catch (e: any) {
      console.error("Erro ao inserir avaliação mock:", e);
      const errorMsg = e.message || "Verifique se o script SQL foi aplicado no Supabase.";
      showToast("Erro", `Erro ao criar avaliação: ${errorMsg}`, "error");
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    showModal({
      title: "Excluir Avaliação",
      message: "Deseja realmente excluir esta avaliação?",
      confirmLabel: "Sim, Excluir",
      cancelLabel: "Voltar",
      type: "danger",
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
          if (error) throw error;
          setReviewsList(prev => prev.filter(r => r.id !== reviewId));
          showToast("Sucesso", "Avaliação removida", "success");
        } catch (e) {
          console.error("Erro ao excluir review:", e);
          showToast("Erro", "Não foi possível excluir", "error");
        }
      }
    });
  };

  const handleRemoveReferralPoint = async (historyId: string, referrerEmail: string) => {
    if (!historyId) {
      showToast("Aviso", "Não foi possível encontrar o registro de pontos para esta indicação.", "notification");
      return;
    }

    showModal({
      title: "Remover Pontos de Indicação",
      message: `Deseja realmente remover o ponto creditado para ${referrerEmail}? Esta ação irá decrementar o saldo do indicador.`,
      confirmLabel: "Sim, Remover Ponto",
      cancelLabel: "Cancelar",
      type: "danger",
      onConfirm: async () => {
        setMaintenanceLoading(true);
        try {
          const { error } = await supabase.rpc('admin_remove_reward_points', { history_id: historyId });
          if (error) throw error;
          
          showToast("Sucesso", "Ponto removido com sucesso.", "success");
          fetchData();
        } catch (e: any) {
          console.error("Erro ao remover ponto:", e);
          showToast("Erro", "Falha ao remover ponto.", "error");
        } finally {
          setMaintenanceLoading(false);
        }
      }
    });
  };

  const handleOpenEditModal = (user: any) => {
    setEditingUser(user);
    setUserForm({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      cep: user.cep || '',
      city: user.city || '',
      state: user.state || '',
      neighborhood: user.neighborhood || '',
      street: user.street || '',
      number: user.number || '',
      address_complement: user.address_complement || '',
      service_category: user.service_category || '',
      description: user.description || '',
      status: user.status || 'active',
      role: user.role || 'client'
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUserProfile = async () => {
    if (!editingUser) return;
    setMaintenanceLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: userForm.full_name,
          phone: userForm.phone,
          cep: userForm.cep,
          city: userForm.city,
          state: userForm.state,
          neighborhood: userForm.neighborhood,
          street: userForm.street,
          number: userForm.number,
          address_complement: userForm.address_complement,
          service_category: userForm.service_category,
          description: userForm.description,
          status: userForm.status,
          role: userForm.role
        })
        .eq('id', editingUser.id);

      if (error) throw error;
      showToast("Sucesso", "Perfil atualizado com sucesso!", "success");
      setIsEditModalOpen(false);
      fetchData();
    } catch (e: any) {
      console.error("Erro ao atualizar perfil:", e);
      showToast("Erro", "Erro ao salvar alterações.", "error");
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const handleClearTestRequests = async () => {
    showModal({
      title: "Limpeza de Testes",
      message: "Deseja apagar todas as solicitações 'abertas' sem prestador vinculados? (Limpeza de Testes)",
      confirmLabel: "Limpar Agora",
      cancelLabel: "Não",
      type: "warning",
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('service_requests').delete().is('provider_id', null).eq('status', 'open');
          if (error) throw error;
          showToast("Sucesso", "Limpeza concluída!", "success");
          fetchData();
        } catch (e) {
          console.error("Erro na limpeza:", e);
          showToast("Erro", "Erro na limpeza", "error");
        }
      }
    });
  };

  const handleDeleteOrder = async (orderId: string) => {
    showModal({
      title: "Excluir Pedido",
      message: "Tem certeza que deseja excluir permanentemente este pedido? Isso também apagará o chat e avaliações vinculadas.",
      confirmLabel: "Sim, Excluir",
      cancelLabel: "Cancelar",
      type: "danger",
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('service_requests').delete().eq('id', orderId);
          if (error) throw error;
          setOrdersList(prev => prev.filter(o => o.id !== orderId));
          setSelectedOrders(prev => prev.filter(id => id !== orderId));
          showToast("Sucesso", "Pedido removido com sucesso", "success");
          fetchData();
        } catch (e) {
          console.error("Erro ao excluir pedido:", e);
          showToast("Erro", "Não foi possível excluir o pedido. Verifique se há transações financeiras ligadas a ele.", "error");
        }
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.length === 0) return;

    showModal({
      title: "Exclusão em Massa",
      message: `Tem certeza que deseja excluir permanentemente ${selectedOrders.length} pedidos selecionados? Esta ação não pode ser desfeita.`,
      confirmLabel: `Sim, Excluir ${selectedOrders.length} Pedidos`,
      cancelLabel: "Cancelar",
      type: "danger",
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('service_requests').delete().in('id', selectedOrders);
          if (error) throw error;
          
          showToast("Sucesso", `${selectedOrders.length} pedidos removidos com sucesso.`, "success");
          setSelectedOrders([]);
          fetchData();
        } catch (e) {
          console.error("Erro na exclusão em massa:", e);
          showToast("Erro", "Falha ao excluir alguns pedidos. Verifique se há transações vinculadas.", "error");
        }
      }
    });
  };

  const handleToggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  };

  const handleToggleSelectAll = (visibleOrders: any[]) => {
    if (selectedOrders.length === visibleOrders.length && visibleOrders.length > 0) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(visibleOrders.map(o => o.id));
    }
  };

  const handleStartAdminChat = async (ticket: any) => {
    try {
      const adminId = user?.id;
      if (!adminId) return;

      // Verifica se já existe uma sala entre Admin e Cliente para esse contexto
      const { data: existingRooms, error: searchError } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('client_id', ticket.user_id)
        .eq('provider_id', adminId);

      let roomId;
      if (existingRooms && existingRooms.length > 0) {
        roomId = existingRooms[0].id;
        // Se for disputa e a sala não tinha o request_id, podemos atualizar opcionalmente
        if (ticket.related_order_id) {
            await supabase.from('chat_rooms').update({ request_id: ticket.related_order_id }).eq('id', roomId);
        }
      } else {
        const { data: newRoom, error: insertError } = await supabase
          .from('chat_rooms')
          .insert({ 
             client_id: ticket.user_id, 
             provider_id: adminId,
             request_id: ticket.related_order_id || null
          })
          .select('id')
          .single();
        
        if (insertError) throw insertError;
        roomId = newRoom?.id;
      }

      onNavigate('chat', { 
         roomId, 
         opponentName: ticket.user?.full_name || 'Usuário', 
         opponentAvatar: ticket.user?.avatar_url,
         requestId: ticket.related_order_id || undefined
      });
      setSelectedTicket(null); // Fecha o modal
    } catch (e) {
      console.error("Erro ao iniciar chat admin:", e);
      showToast("Erro", "Falha ao iniciar chat", "error");
    }
  };

  const handleSendAuditMessage = async () => {
    if (!selectedChatRoom || !newAuditMessage.trim() || !user) return;
    
    const msgText = newAuditMessage.trim();
    setNewAuditMessage(''); // Clear immediately for better UX
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: selectedChatRoom.id,
          sender_id: user.id,
          content: msgText
        });
      
      if (error) throw error;
      
      // Enviar notificação para ambos os participantes
      const participants = [selectedChatRoom.client_id, selectedChatRoom.provider_id];
      for (const recipientId of participants) {
          if (recipientId) {
            await supabase.from('notifications').insert({
              user_id: recipientId,
              title: 'Mensagem da Administração',
              message: msgText.length > 50 ? msgText.substring(0, 50) + '...' : msgText,
              type: 'message',
              related_entity_id: selectedChatRoom.id
            });
          }
      }

      // As mensagens são carregadas via subscription ou efeito, mas para garantir:
      const { data: latest } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', selectedChatRoom.id)
        .order('created_at', { ascending: false });
      
      if (latest) setChatMessages(latest.reverse());

    } catch (err) {
      console.error(err);
      showToast("Erro", "Falha ao enviar mensagem", "error");
    }
  };


  const handleUpdateTicketStatus = async (ticketId: string, status: 'open' | 'in_review' | 'answered' | 'resolved' | 'closed') => {
    try {
      const { error } = await supabase.from('support_tickets').update({ status }).eq('id', ticketId);
      if (error) throw error;
      setSupportTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status } : null);
      }
      showToast("Sucesso", "Status atualizado.", "success");
    } catch (e) {
      console.error("Erro ao atualizar ticket:", e);
      showToast("Erro", "Falha ao atualizar ticket.", "error");
    }
  };

  const handleSendAdminResponse = async () => {
    if (!selectedTicket || !adminResponseText.trim()) return;
    
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          admin_response: adminResponseText,
          status: 'answered'
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      setSupportTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, admin_response: adminResponseText, status: 'answered' } : t));
      showToast("Sucesso", "Resposta enviada. O ticket agora está como respondido.", "success");
      setAdminResponseText('');
      setSelectedTicket(null);
    } catch (e) {
      console.error(e);
      showToast("Erro", "Erro ao enviar resposta.", "error");
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'resolved' })
        .eq('id', ticketId);

      if (error) throw error;

      setSupportTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'resolved' } : t));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: 'resolved' } : null);
      }
      showToast("Sucesso", "Ticket marcado como resolvido.", "success");
    } catch (e) {
      console.error(e);
      showToast("Erro", "Erro ao resolver ticket.", "error");
    }
  };

  const handleResolveDispute = async (requestId: string, resolution: 'refund_client' | 'pay_provider' | 'resolved') => {
    try {
      const { error } = await supabase.from('service_requests').update({ status: resolution }).eq('id', requestId);
      if (error) throw error;
      setOrdersList(prev => prev.map(o => o.id === requestId ? { ...o, status: resolution } : o));
      
      // Atualiza automaticamente tickets de disputa relacionados
      await supabase.from('support_tickets').update({ status: 'resolved' }).eq('related_order_id', requestId).eq('category', 'dispute');
      setSupportTickets(prev => prev.map(t => t.related_order_id === requestId && t.category === 'dispute' ? { ...t, status: 'resolved' } : t));

      setSelectedDispute(null);
      showToast("Sucesso", "Disputa resolvida.", "success");
    } catch (e) {
      console.error("Erro ao resolver disputa", e);
      showToast("Erro", "Erro ao resolver disputa. Verifique as permissões de banco.", "error");
    }
  };

  const exportToCSV = () => {
    const concludedOrders = ordersList.filter(o => o.status === 'completed');
    if (concludedOrders.length === 0) {
      showToast("Aviso", "Nenhum pedido concluído para exportar.", "notification");
      return;
    }
    const headers = "ID,Cliente,Prestador,Servico,Status,Valor Total,Taxa Plataforma,Data\n";
    const rows = concludedOrders.map(order => {
      const date = new Date(order.created_at).toLocaleDateString('pt-BR');
      const val = order.price || 0;
      const tax = calculateServiceFees(val, order.provider?.plan_type).providerFee;
      return `"${order.id}","${order.client?.full_name || ''}","${order.provider?.full_name || ''}","${order.category?.name || 'Serviço Direto'}","${order.status}","R$ ${formatCurrency(val)}","R$ ${formatCurrency(tax)}","${date}"`;
    }).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `faturamento_kngindica_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusMap: Record<string, string> = {
    'open': 'Aberto',
    'proposed': 'Proposta',
    'quoted': 'Orçado',
    'accepted': 'Aceito',
    'scheduled': 'Agendado',
    'awaiting_payment': 'Aguard. Pagamento',
    'paid': 'Pago',
    'in_service': 'Em Execução',
    'completed': 'Concluído',
    'cancelled': 'Cancelado',
    'disputed': 'Em Disputa'
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch profiles for stats and list
      const { data: profiles } = await supabase.from('profiles').select('*');
      const clients = profiles?.filter(p => p.role === 'client') || [];

      // 2. Fetch requests for stats and orders list
      const { data: requests } = await supabase.from('service_requests').select('*, client:profiles!service_requests_client_id_fkey(full_name, avatar_url), provider:profiles!service_requests_provider_id_fkey(full_name, avatar_url), category:service_categories(name)').order('created_at', { ascending: false });
      const compServ = requests?.filter(r => r.status === 'completed') || [];

      // 3. Fetch reviews
      const { data: reviews } = await supabase.from('reviews').select('*, reviewer:profiles!reviews_reviewer_id_fkey(full_name), provider:profiles!reviews_provider_id_fkey(full_name, role)').order('created_at', { ascending: false });

      // Receita da plataforma: taxa de intermediação por serviço concluído (lib/billing.ts)
      const revenue = compServ.reduce(
        (acc: number, s: any) => acc + calculateServiceFees(s.price || 0, s.provider?.plan_type).providerFee,
        0
      );

      // Enrich providers data
      const providers = (profiles?.filter(p => p.role === 'provider') || []).map(p => {
        const pOrders = (requests || []).filter(r => r.provider_id === p.id && r.status === 'completed');
        const pEarn = pOrders.reduce((acc, curr) => acc + calculateServiceFees(curr.price || 0, p.plan_type).providerNet, 0);
        const pReviews = (reviews || []).filter(r => r.provider_id === p.id);
        const pRating = pReviews.length > 0 ? (pReviews.reduce((acc, curr) => acc + (curr.rating || 0), 0) / pReviews.length).toFixed(1) : '--';
        
        return {
          ...p,
          completed_services: pOrders.length,
          earnings: pEarn,
          rating: pRating,
          total_reviews: pReviews.length
        };
      });

      // 4. Fetch Categories
      const { data: categories } = await supabase.from('service_categories').select('*').order('name');

      // 5. Fetch Conversion Metrics from the view
      const { data: metrics } = await supabase.rpc('get_conversion_metrics');
      setConversionMetrics(metrics || []);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newToday = profiles?.filter(p => new Date(p.created_at) >= today).length || 0;

      setStats({
        providers: providers.length,
        clients: clients.length,
        servicesCompleted: compServ.length,
        revenue: revenue,
        newToday: newToday
      });

      setProvidersList(providers);
      setClientsList(clients);
      setOrdersList(requests || []);
      setReviewsList(reviews || []);
      setCategoriesList(categories || []);

      const allUsers = (profiles || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentUsersList(allUsers);

      const uniqueCities = Array.from(new Set((profiles || []).map(p => p.city))).filter(Boolean) as string[];
      setActiveCities(uniqueCities);

      // Calculate Growth Data for the last 7 days
      const gClients = [0,0,0,0,0,0,0];
      const gProviders = [0,0,0,0,0,0,0];
      const now = new Date();
      
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(now.getDate() - (6 - i));
        d.setHours(0,0,0,0);
        const nextD = new Date(d);
        nextD.setDate(d.getDate() + 1);

        const dayProfiles = profiles?.filter(p => {
           const created = new Date(p.created_at);
           return created >= d && created < nextD;
        }) || [];

        gClients[i] = dayProfiles.filter(p => p.role === 'client').length;
        gProviders[i] = dayProfiles.filter(p => p.role === 'provider').length;
      }
      setGrowthData({ clients: gClients, providers: gProviders });

      // 6. Fetch Category Requests
      const { data: requests_cats } = await supabase
        .from('category_requests')
        .select('*, provider:profiles(full_name, email)')
        .order('created_at', { ascending: false });
      setCategoryRequests(requests_cats || []);

      // 7. Fetch Pending Verifications (two-step to avoid RLS join issues)
      const { data: rawVerifications, error: verifError } = await supabase
        .from('provider_verifications')
        .select('*')
        .eq('status', 'pending')
        .order('updated_at', { ascending: false });
      
      if (!verifError && rawVerifications) {
        // Enrich with provider info already fetched
        const enriched = rawVerifications.map((v: any) => {
          const providerProfile = (profiles || []).find((p: any) => p.id === v.provider_id);
          return { ...v, provider: providerProfile || null };
        });
        setPendingVerifications(enriched);
      } else {
        setPendingVerifications([]);
      }

      // 8. Fetch Chat Rooms
      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('*, client:profiles!chat_rooms_client_id_fkey(full_name, avatar_url), provider:profiles!chat_rooms_provider_id_fkey(full_name, avatar_url), request:service_requests(title, status)')
        .order('updated_at', { ascending: false });
      setChatRoomsList(rooms || []);

      // 9. Fetch Support Tickets
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('*, user:profiles!support_tickets_user_id_fkey(full_name, email, avatar_url)')
        .order('created_at', { ascending: false });
      
      // We will map request object if related_order_id exists from ordersList
      // Because referencing service_requests in support_tickets table might hit RLS or constraints if not defined right.
      // 10. Fetch Referrals History
      try {
        const { data: allProfiles, error: pError } = await supabase
          .from('profiles')
          .select('id, full_name, email, created_at, referred_by, reward_points');
        
        if (!pError && allProfiles) {
          const referredUsers = allProfiles.filter(p => p.referred_by !== null);
          const { data: history } = await supabase.from('reward_history').select('*');
          
          const enriched = referredUsers.map(ref => {
            const referrerProfile = allProfiles.find(p => p.id === ref.referred_by);
            const histItem = history?.find(h => h.user_id === ref.referred_by && (h.description?.includes(ref.email) || h.description?.includes(ref.full_name || '')));
            return { 
              ...ref, 
              referrer: referrerProfile || null,
              history_id: histItem?.id, 
              points_given: histItem?.amount || 1 
            };
          }).filter(item => item.referrer !== null); // Only show if we found the referrer (safety)
          
          setReferralsHistory(enriched);
        } else if (pError) {
          console.error("Profile fetch error for referrals:", pError);
        }
      } catch (refErr) {
        console.error("Critical error fetching referrals:", refErr);
      }

      setSupportTickets(tickets || []);

    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'chat_audit') {
      const fetchChatRooms = async () => {
        const { data } = await supabase
          .from('chat_rooms')
          .select('*, client:profiles!chat_rooms_client_id_fkey(full_name), provider:profiles!chat_rooms_provider_id_fkey(full_name), request:service_requests(title, status)');
        setChatRoomsList(data || []);
      };
      fetchChatRooms();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedChatRoom) {
      const fetchMessages = async () => {
        const { data } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_id', selectedChatRoom.id)
          .order('created_at', { ascending: true });
        setChatMessages(data || []);
      };
      fetchMessages();
    }
  }, [selectedChatRoom]);

  const handleSaveCategory = async () => {
    try {
      const payload = {
        name: categoryForm.name,
        description: categoryForm.description,
        icon: categoryForm.icon_name || 'handyman',
      };

      if (editingCategory) {
        const { error } = await supabase.from('service_categories').update(payload).eq('id', editingCategory.id);
        if (error) throw error;
        setCategoriesList(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...payload } : c));
      } else {
        const { data, error } = await supabase.from('service_categories').insert([payload]).select().single();
        if (error) throw error;
        if (data) setCategoriesList(prev => [...prev, data]);
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (e) {
      console.error("Erro ao salvar categoria", e);
      showToast("Erro", "Erro ao salvar categoria", "error");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) return;
    try {
      const { error } = await supabase.from('service_categories').delete().eq('id', id);
      if (error) throw error;
      setCategoriesList(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error("Erro ao excluir categoria", e);
      showToast("Erro", "Erro ao excluir. Pode haver serviços vinculados a ela.", "error");
    }
  };

  const handleApproveCategoryRequest = async (request: any) => {
    try {
      // 1. Create the global category
      const { data: newCat, error: catError } = await supabase
        .from('service_categories')
        .insert({
          name: request.category_name,
          icon: 'handyman', // Default icon
          description: `Serviço de ${request.category_name} — profissionais especializados disponíveis na plataforma KNGindica.`
        })
        .select()
        .single();
      
      if (catError) throw catError;

      // 2. Update request status
      const { error: reqError } = await supabase
        .from('category_requests')
        .update({ status: 'approved' })
        .eq('id', request.id);
      
      if (reqError) throw reqError;

      // 3. Proactively add this category to the provider's profiles.categories if possible
      // This is a nice-to-have, but let's try
      const { data: profile } = await supabase.from('profiles').select('categories').eq('id', request.provider_id).single();
      if (profile) {
        const currentCats = profile.categories || [];
        if (!currentCats.includes(request.category_name)) {
          await supabase.from('profiles').update({
            categories: [...currentCats, request.category_name]
          }).eq('id', request.provider_id);
        }
      }

      // Update UI
      setCategoriesList(prev => [...prev, newCat]);
      setCategoryRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'approved' } : r));
      
      // Notify the provider
      await supabase.from('notifications').insert({
        user_id: request.provider_id,
        title: 'Categoria Aprovada! 🎉',
        message: `Sua sugestão "${request.category_name}" foi aprovada e já está no seu perfil.`,
        type: 'notification'
      });

    } catch (e: any) {
      console.error("Erro ao aprovar categoria", e);
    }
  };

  const handleRejectCategoryRequest = async (requestId: string) => {
    if (!window.confirm('Tem certeza que deseja rejeitar esta solicitação?')) return;
    try {
      const { error } = await supabase.from('category_requests').update({ status: 'rejected' }).eq('id', requestId);
      if (error) throw error;
      setCategoryRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
    } catch (e) {
      console.error("Erro ao rejeitar categoria", e);
    }
  };

  const openCategoryModal = (cat: any = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({ name: cat.name, description: cat.description || '', icon_name: cat.icon || '' });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', icon_name: '' });
    }
    setIsCategoryModalOpen(true);
  };

  const handleLogout = () => {
    logout();
    onNavigate('auth');
  };

  return {
    AVAILABLE_ICONS,
    activeCities,
    adminResponseText,
    categoriesList,
    categoryForm,
    categoryRequests,
    chatAuditSearchTerm,
    chatMessages,
    chatRoomsList,
    clientSearch,
    clientsList,
    conversionMetrics,
    editingCategory,
    editingUser,
    exportToCSV,
    fetchData,
    formatCEP,
    formatPhone,
    growthData,
    handleApproveCategoryRequest,
    handleApproveVerification,
    handleBulkDelete,
    handleCepChange,
    handleClearTestRequests,
    handleCreateMockReview,
    handleDeleteCategory,
    handleDeleteOrder,
    handleDeleteReview,
    handleDeleteUserRecords,
    handleLogout,
    handleOpenEditModal,
    handleRejectCategoryRequest,
    handleRejectVerification,
    handleRemoveReferralPoint,
    handleResolveDispute,
    handleResolveTicket,
    handleSaveCategory,
    handleSendAdminResponse,
    handleSendAuditMessage,
    handleStartAdminChat,
    handleToggleOrderSelection,
    handleToggleSelectAll,
    handleUpdateCategoryStatus,
    handleUpdateTicketStatus,
    handleUpdateUserProfile,
    handleUpdateUserStatus,
    isCategoryModalOpen,
    isEditModalOpen,
    isFetchingCep,
    isPremiumUser,
    loading,
    logout,
    maintenanceLoading,
    maintenanceSearchTerm,
    mockReviewForm,
    newAuditMessage,
    openCategoryModal,
    ordersFilter,
    ordersList,
    pendingVerifications,
    platformCommissionFixed,
    premiumSubscriptionPrice,
    profile,
    providerSearch,
    providerSearchTerm,
    providersList,
    recentUsersList,
    referralsHistory,
    reviewerSearchTerm,
    reviewsList,
    role,
    selectedChatRoom,
    selectedDispute,
    selectedOrderDetail,
    selectedOrders,
    selectedProviderForKYC,
    selectedTicket,
    selectedVerification,
    setActiveCities,
    setAdminResponseText,
    setCategoriesList,
    setCategoryForm,
    setCategoryRequests,
    setChatAuditSearchTerm,
    setChatMessages,
    setChatRoomsList,
    setClientSearch,
    setClientsList,
    setConversionMetrics,
    setEditingCategory,
    setEditingUser,
    setGrowthData,
    setIsCategoryModalOpen,
    setIsEditModalOpen,
    setIsFetchingCep,
    setLoading,
    setMaintenanceLoading,
    setMaintenanceSearchTerm,
    setMockReviewForm,
    setNewAuditMessage,
    setOrdersFilter,
    setOrdersList,
    setPendingVerifications,
    setPlatformCommissionFixed,
    setPremiumSubscriptionPrice,
    setProviderSearch,
    setProviderSearchTerm,
    setProvidersList,
    setRecentUsersList,
    setReferralsHistory,
    setReviewerSearchTerm,
    setReviewsList,
    setSelectedChatRoom,
    setSelectedDispute,
    setSelectedOrderDetail,
    setSelectedOrders,
    setSelectedProviderForKYC,
    setSelectedTicket,
    setSelectedVerification,
    setShowProviderResults,
    setShowReviewerResults,
    setStats,
    setSupportTickets,
    setUserForm,
    showModal,
    showProviderResults,
    showReviewerResults,
    showToast,
    stats,
    statusMap,
    supportTickets,
    ticketCategoryLabels,
    unreadMessages,
    unreadNotifications,
    user,
    userForm,
  };
}
