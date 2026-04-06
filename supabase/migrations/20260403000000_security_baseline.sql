-- #########################################################
-- # SCRIPT DE SEGURANÇA E GOVERNANÇA KNGINDICA - SUPER SCRIPT
-- # RODAR NO SQL EDITOR DO SUPABASE (FASESS 1, 2 E 3)
-- #########################################################


-- 1. PROTEÇÃO DE MÉTRICAS ADMINISTRATIVAS
DROP VIEW IF EXISTS admin_conversion_metrics;

CREATE OR REPLACE FUNCTION get_conversion_metrics()
RETURNS TABLE (
    provider_name text,
    plan_type text,
    total_leads bigint,
    total_orders_paid bigint,
    conversion_rate numeric
) 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin' THEN
        RAISE EXCEPTION 'Acesso negado: Somente administradores podem ver métricas globais.';
    END IF;

    RETURN QUERY
    SELECT 
        p.full_name as provider_name,
        p.plan_type,
        (SELECT COUNT(*) FROM lead_events WHERE provider_id = p.id) as total_leads,
        (SELECT COUNT(*) FROM freelance_orders WHERE provider_id = p.id AND status = 'paid') as total_orders_paid,
        CASE 
            WHEN (SELECT COUNT(*) FROM lead_events WHERE provider_id = p.id) > 0 
            THEN ROUND(((SELECT COUNT(*)::DECIMAL FROM freelance_orders WHERE provider_id = p.id AND status = 'paid') / (SELECT COUNT(*) FROM lead_events WHERE provider_id = p.id)) * 100, 2)
            ELSE 0 
        END as conversion_rate
    FROM profiles p
    WHERE p.role = 'provider'
    ORDER BY total_leads DESC;
END;
$$ LANGUAGE plpgsql;


-- 2. VALIDAÇÃO DE TRANSIÇÃO DE STATUS (FREELANCE)
CREATE OR REPLACE FUNCTION advance_freelance_status(order_id uuid, new_status text)
RETURNS void 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE 
    cur_status text;
    allowed_next text[];
BEGIN
    SELECT status INTO cur_status FROM freelance_orders WHERE id = order_id;

    allowed_next := CASE cur_status
        WHEN 'paid'          THEN ARRAY['scheduled']
        WHEN 'scheduled'     THEN ARRAY['in_service']
        WHEN 'in_service'    THEN ARRAY['completed']
        ELSE ARRAY[]::text[]
    END;

    IF NOT (new_status = ANY(allowed_next)) THEN
        RAISE EXCEPTION 'Transição de status inválida: % -> %', cur_status, new_status;
    END IF;

    UPDATE freelance_orders SET status = new_status WHERE id = order_id;
END;
$$ LANGUAGE plpgsql;


-- 3. POLÍTICA DE PRIVACIDADE DE CHAT
DROP POLICY IF EXISTS "admin_ou_participante" ON chat_messages;

CREATE POLICY "admin_ou_participante"
ON chat_messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
    OR auth.uid() IN (
        SELECT client_id FROM chat_rooms WHERE id = chat_messages.room_id
        UNION
        SELECT provider_id FROM chat_rooms WHERE id = chat_messages.room_id
    )
);


-- 4. SEGURANÇA DE STORAGE (Item 6 da Análise)
-- Bloqueia uploads maliciosos e limita tamanho no bucket 'portfolio'
DROP POLICY IF EXISTS "upload_imagens_portfolio" ON storage.objects;
DROP POLICY IF EXISTS "update_imagens_portfolio" ON storage.objects;
DROP POLICY IF EXISTS "delete_imagens_portfolio" ON storage.objects;

CREATE POLICY "upload_imagens_portfolio"
ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'portfolio'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND storage.extension(name) IN ('jpg','jpeg','png','webp','gif')
    AND (metadata->>'size')::int < 5242880 -- 5MB máximo
);

CREATE POLICY "update_imagens_portfolio"
ON storage.objects FOR UPDATE USING (
    bucket_id = 'portfolio'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "delete_imagens_portfolio"
ON storage.objects FOR DELETE USING (
    bucket_id = 'portfolio'
    AND auth.uid()::text = (storage.foldername(name))[1]
);


-- 5. VALIDAÇÃO DE SAQUE (Item 7 da Análise)
-- Impede saques superiores ao saldo disponível
CREATE OR REPLACE FUNCTION request_payout(amount numeric)
RETURNS uuid 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE 
    available_balance numeric;
    new_request_id uuid;
BEGIN
    -- 1. Buscar saldo real consolidado
    SELECT total_earnings INTO available_balance 
    FROM provider_wallet_summary 
    WHERE provider_id = auth.uid();

    -- 2. Validar se tem saldo suficiente
    IF (COALESCE(available_balance, 0) < amount) THEN
        RAISE EXCEPTION 'Saldo insuficiente para o saque solicitado: %', amount;
    END IF;

    -- 3. Inserir o pedido de saque
    INSERT INTO payout_requests (provider_id, amount, status)
    VALUES (auth.uid(), amount, 'pending')
    RETURNING id INTO new_request_id;

    -- 4. Gerar transação de débito pendente (opcional, dependendo do seu fluxo de transações)
    INSERT INTO transactions (user_id, amount, type, status, description)
    VALUES (auth.uid(), amount, 'withdrawal', 'pending', 'Solicitação de Saque');

    RETURN new_request_id;
END;
$$ LANGUAGE plpgsql;


-- 6. CORREÇÃO DE TRIGGER DE REPUTAÇÃO (Item 9 da Análise)
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
DECLARE 
    affected_id uuid;
BEGIN
    -- CORREÇÃO: Usar COALESCE para funcionar em INSERT, UPDATE e DELETE
    affected_id := COALESCE(NEW.provider_id, OLD.provider_id);

    UPDATE profiles
    SET 
        rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM reviews
            WHERE provider_id = affected_id
        ),
        reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE provider_id = affected_id
        )
    WHERE id = affected_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;


-- 7. SPLIT DE POLÍTICAS RLS (Item 10 da Análise)
DROP POLICY IF EXISTS "Prestadores podem gerenciar seu portfólio" ON provider_portfolio;
DROP POLICY IF EXISTS "Usuários podem gerenciar seus favoritos" ON user_favorites;

CREATE POLICY "portfolio_insert" ON provider_portfolio FOR INSERT WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "portfolio_update" ON provider_portfolio FOR UPDATE USING (auth.uid() = provider_id);
CREATE POLICY "portfolio_delete" ON provider_portfolio FOR DELETE USING (auth.uid() = provider_id);

CREATE POLICY "favorites_insert" ON user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites_delete" ON user_favorites FOR DELETE USING (auth.uid() = user_id);
