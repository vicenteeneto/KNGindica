-- #########################################################
-- # SCRIPT DE SEGURANÇA E PERFORMANCE - FASE 4
-- # RODAR NO SQL EDITOR DO SUPABASE
-- #########################################################

-- 1. BLOQUEIO DE REVIEW BOMBING (Item 11 da Análise)
-- Garante que só quem CONCLUIU um serviço pode avaliar o profissional.
DROP POLICY IF EXISTS "Usuários podem avaliar prestadores" ON reviews;

CREATE POLICY "reviews_insert_completed_only"
ON reviews FOR INSERT WITH CHECK (
    auth.uid() = client_id
    AND (
        EXISTS (
            SELECT 1 FROM service_requests 
            WHERE id = reviews.request_id 
            AND client_id = auth.uid() 
            AND status = 'completed'
        )
        OR 
        EXISTS (
            SELECT 1 FROM freelance_orders 
            WHERE id = reviews.freelance_order_id 
            AND client_id = auth.uid() 
            AND status = 'completed'
        )
    )
);

-- Habilitar RLS se ainda não estiver
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;


-- 2. OTIMIZAÇÃO DE PERFORMANCE ADMIN (Item 13 da Análise)
-- Remove as N+1 queries que deixariam o painel lento com centenas de prestadores.
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
    WITH leads_cte AS (
        SELECT provider_id, COUNT(*) as count FROM lead_events GROUP BY provider_id
    ),
    orders_cte AS (
        SELECT provider_id, COUNT(*) as count FROM service_requests WHERE status = 'paid' GROUP BY provider_id
    )
    SELECT 
        p.full_name as provider_name,
        p.plan_type,
        COALESCE(l.count, 0) as total_leads,
        COALESCE(o.count, 0) as total_orders_paid,
        CASE 
            WHEN COALESCE(l.count, 0) > 0 
            THEN ROUND((COALESCE(o.count, 0)::NUMERIC / COALESCE(l.count, 0)::NUMERIC) * 100, 2)
            ELSE 0 
        END as conversion_rate
    FROM profiles p
    LEFT JOIN leads_cte l ON l.provider_id = p.id
    LEFT JOIN orders_cte o ON o.provider_id = p.id
    WHERE p.role = 'provider'
    ORDER BY total_leads DESC;
END;
$$ LANGUAGE plpgsql;
