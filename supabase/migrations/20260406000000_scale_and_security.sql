-- #########################################################
-- # SCRIPT DE ESCALA E SEGURANÇA DE API - FASE 5
-- #########################################################

-- 1. ÍNDICES DE ALTA VELOCIDADE (Item 17 da Análise)
-- Garante que o banco não trave conforme o número de pedidos e chats cresce.
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_client ON service_requests(client_id, status);
CREATE INDEX IF NOT EXISTS idx_service_requests_provider ON service_requests(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_freelance_orders_status ON freelance_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_events_provider ON lead_events(provider_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_freelance_bids_order ON freelance_bids(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id);


-- 2. INFRAESTRUTURA PARA RATE LIMITING (Item 20 da Análise)
-- Cria uma tabela para registrar as requisições à IA e evitar abusos (custos Gemini).
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL, -- ex: 'maia-chat'
    request_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS e permitir que o usuário veja seu próprio uso
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários veem seu próprio log de uso" ON ai_usage_logs FOR SELECT USING (auth.uid() = user_id);

-- Criar índice para checagem rápida de limite
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_time ON ai_usage_logs(user_id, request_at DESC);

-- Função RPC para checar limite (ex: 10 chamadas por 5 minutos)
CREATE OR REPLACE FUNCTION check_ai_rate_limit(user_id_param UUID, limit_count INT, interval_minutes INT)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INT;
BEGIN
    -- Conta requisições nos últimos X minutos
    SELECT COUNT(*) INTO current_count 
    FROM ai_usage_logs 
    WHERE user_id = user_id_param 
      AND request_at > (now() - (interval_minutes || ' minutes')::INTERVAL);

    -- Se passou do limite, retorna FALSE
    IF current_count >= limit_count THEN
        RETURN FALSE;
    END IF;

    -- Caso contrário, registra o uso e retorna TRUE
    INSERT INTO ai_usage_logs (user_id, endpoint) VALUES (user_id_param, 'maia-chat');
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
