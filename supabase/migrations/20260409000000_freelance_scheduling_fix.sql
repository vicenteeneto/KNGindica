-- #########################################################
-- # CORREÇÃO DE INFRAESTRUTURA DE AGENDAMENTO (FREELANCE) - V2
-- #########################################################

-- 1. ATUALIZAR TRAVA DE STATUS
-- Adicionamos 'scheduled' e outros status que podem existir no banco
ALTER TABLE freelance_orders DROP CONSTRAINT IF EXISTS freelance_orders_status_check;

ALTER TABLE freelance_orders ADD CONSTRAINT freelance_orders_status_check 
CHECK (status IN (
    'open', 
    'awaiting_payment', 
    'paid', 
    'assigned', 
    'scheduled', 
    'in_service', 
    'completed', 
    'cancelled',
    'closed',
    'expired'
));

-- 2. ADICIONAR COLUNA PARA CRONOGRAMA
-- Armazena a data e hora do início agendado
ALTER TABLE freelance_orders ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- 3. ATUALIZAR FUNÇÃO RPC DE TRANSIÇÃO DE STATUS
-- Agora aceita e salva a data agendada qdo o status é 'scheduled'
CREATE OR REPLACE FUNCTION advance_freelance_status(
    order_id UUID, 
    new_status TEXT, 
    scheduled_at_param TIMESTAMPTZ DEFAULT NULL
)
RETURNS void 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE 
    cur_status TEXT;
    allowed_next TEXT[];
BEGIN
    SELECT status INTO cur_status FROM freelance_orders WHERE id = order_id;

    -- Lógica de transição permitida (Flexibilizada para aceitar o fluxo)
    allowed_next := CASE cur_status
        WHEN 'paid'          THEN ARRAY['scheduled']
        WHEN 'scheduled'     THEN ARRAY['in_service']
        WHEN 'in_service'    THEN ARRAY['completed']
        ELSE ARRAY['scheduled', 'in_service', 'completed'] -- Fallback de segurança
    END;

    IF NOT (new_status = ANY(allowed_next)) THEN
        RAISE EXCEPTION 'Transição de status inválida: % -> %', cur_status, new_status;
    END IF;

    -- Atualiza o status e a data (se fornecida)
    UPDATE freelance_orders 
    SET 
        status = new_status,
        scheduled_at = COALESCE(scheduled_at_param, scheduled_at)
    WHERE id = order_id;
END;
$$ LANGUAGE plpgsql;
