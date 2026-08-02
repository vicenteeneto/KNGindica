-- #########################################################
-- # INVENTÁRIO DE RPCs + get_unread_counts
-- #
-- # Levantado por introspecção do PostgREST em 28/07/2026.
-- #########################################################

-- ---------------------------------------------------------
-- 1. RPCs QUE EXISTEM EM PRODUÇÃO MAS NÃO ESTÃO VERSIONADAS
--
-- A introspecção expõe a assinatura, não o corpo. Recuperar os corpos exige
-- `supabase db pull` (ou `pg_get_functiondef`) com acesso ao Postgres.
-- Até lá, este é o inventário do que existe — para que ninguém assuma que
-- as migrations descrevem o banco inteiro.
--
--   admin_remove_reward_points(history_id uuid)
--   advance_service_status(desired_date_param timestamptz, id_param uuid, new_status text)
--   block_number(p_phone text, p_reason text)
--   check_is_admin()
--   delete_user_entirely(target_user_id uuid)
--   generate_referral_code()
--   get_categories_for_prompt()
--   get_professionals_for_maia(category_name text, user_lat float8, user_lon float8)
--   get_providers_within_radius(radius_km float8, user_lat float8, user_lon float8)
--   is_number_blocked(p_phone text)
--   rls_auto_enable()
--   search_providers(p_category_name text, p_city text)
--   search_providers_fallback(p_city text, p_query text)
--
-- Observações:
--  - `get_providers_within_radius` (usada em HomeScreen) e `get_providers_nearby`
--    (definida em 20260407000000_geo_and_maia.sql) coexistem e fazem a mesma
--    coisa com assinaturas diferentes. Consolidar em uma só.
--  - `get_professionals_for_maia`, `get_categories_for_prompt`, `search_providers`,
--    `search_providers_fallback`, `block_number` e `is_number_blocked` não são
--    chamadas por nenhuma tela: pertencem ao fluxo n8n do WhatsApp, que roda
--    fora deste repositório.
-- ---------------------------------------------------------


-- ---------------------------------------------------------
-- 2. get_unread_counts — ESTA SIM NÃO EXISTE
--
-- `NotificationContext.fetchCounts()` a chama e, ao receber 404, cai num
-- fallback de 3 queries. Os contadores funcionam, mas sempre pelo caminho
-- caro, em toda montagem do provider. Criar a função troca 3 round-trips
-- por 1.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_unread_counts(p_user_id uuid)
RETURNS TABLE (
    notifications_count bigint,
    messages_count      bigint
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Só o próprio usuário (ou um admin) pode consultar seus contadores.
    IF auth.uid() IS DISTINCT FROM p_user_id
       AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    THEN
        RAISE EXCEPTION 'Acesso negado aos contadores de outro usuário.';
    END IF;

    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM notifications n
          WHERE n.user_id = p_user_id
            AND n.is_read = false),
        (SELECT COUNT(*) FROM chat_messages m
          JOIN chat_rooms r ON r.id = m.room_id
         WHERE (r.client_id = p_user_id OR r.provider_id = p_user_id)
           AND m.sender_id <> p_user_id
           AND m.is_read = false);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_unread_counts(uuid) TO authenticated;

-- Índices que sustentam a função acima
CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON notifications(user_id) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_chat_messages_unread
    ON chat_messages(room_id, sender_id) WHERE is_read = false;
