-- SQL v9: Automação de Ratings e Governança

-- 1. Trigger para atualizar Rating e Total_Reviews no perfil do prestador
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET 
        rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM reviews
            WHERE provider_id = NEW.provider_id
        ),
        reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE provider_id = NEW.provider_id
        )
    WHERE id = NEW.provider_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_provider_rating ON reviews;
CREATE TRIGGER tr_update_provider_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_provider_rating();

-- 2. Garantir que a coluna 'status' no service_requests suporte 'disputed'
DO $$ 
BEGIN
    -- Se o tipo enum existir, adicionamos o valor
    -- Nota: O Supabase às vezes requer alteração direta se for enum customizado
    ALTER TYPE request_status ADD VALUE IF NOT EXISTS 'disputed';
EXCEPTION
    WHEN others THEN 
        RAISE NOTICE 'Não foi possível alterar o enum (pode não ser um enum).';
END $$;

-- 3. Criar uma View para métricas de conversão para o Administrador (Conversão de Leads)
CREATE OR REPLACE VIEW admin_conversion_metrics AS
SELECT 
    p.full_name as provider_name,
    p.plan_type,
    (SELECT COUNT(*) FROM lead_events WHERE provider_id = p.id) as total_leads,
    (SELECT COUNT(*) FROM service_requests WHERE provider_id = p.id AND status = 'paid') as total_orders_paid,
    CASE 
        WHEN (SELECT COUNT(*) FROM lead_events WHERE provider_id = p.id) > 0 
        THEN ROUND(((SELECT COUNT(*)::DECIMAL FROM service_requests WHERE provider_id = p.id AND status = 'paid') / (SELECT COUNT(*) FROM lead_events WHERE provider_id = p.id)) * 100, 2)
        ELSE 0 
    END as conversion_rate
FROM profiles p
WHERE p.role = 'provider'
ORDER BY total_leads DESC;
