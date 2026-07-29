-- #########################################################
-- # RESTRIÇÃO DE EXPOSIÇÃO PÚBLICA DE PERFIS
-- #
-- # Problema: a política criada em 20260408000000_profiles_images_rescue.sql
-- # é `FOR SELECT USING (true)`, sem restrição de papel. Como WhatsAppSearchScreen
-- # roda deslogada e faz `select('*')`, qualquer visitante com o link
-- # /search/:id — ou com a anon key, que é pública por natureza — consegue ler
-- # phone, whatsapp_number, email, address, cep, street, number e a
-- # latitude/longitude exatas de TODOS os perfis.
-- #
-- # Correção: anônimo passa a enxergar apenas a view `profiles_public`, com as
-- # colunas que a tela pública realmente usa. A tabela `profiles` continua
-- # legível por usuários autenticados, preservando o comportamento atual do app
-- # (o WhatsApp do profissional segue visível para quem está logado).
-- #
-- # ⚠️ APLICAR EM STAGING PRIMEIRO e conferir o fluxo /search/:id deslogado.
-- #########################################################

-- ---------------------------------------------------------
-- 1. View pública: só prestadores, só colunas não sensíveis
-- ---------------------------------------------------------
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
    id,
    full_name,
    avatar_url,
    cover_image,
    bio,
    city,
    state,
    neighborhood,
    categories,
    service_category,
    plan_type,
    is_verified,
    rating,
    reviews_count,
    pricing_model,
    price_value,
    show_price,
    opening_hours,
    created_at
FROM public.profiles
WHERE role = 'provider'
  AND status = 'active';

COMMENT ON VIEW public.profiles_public IS
  'Subconjunto de profiles seguro para leitura anônima. Não expõe telefone, '
  'whatsapp, e-mail, endereço nem coordenadas exatas.';


-- ---------------------------------------------------------
-- 2. profiles: leitura só para autenticados
-- ---------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perfis são visíveis por todos" ON public.profiles;

CREATE POLICY "profiles_select_authenticated"
ON public.profiles FOR SELECT
TO authenticated
USING (true);


-- ---------------------------------------------------------
-- 3. Grants
--
-- A view roda com os privilégios do owner, então atravessa o RLS de profiles
-- de propósito — é justamente o que permite ao anônimo ler o subconjunto seguro.
-- ---------------------------------------------------------
REVOKE SELECT ON public.profiles FROM anon;

GRANT SELECT ON public.profiles_public TO anon, authenticated;


-- ---------------------------------------------------------
-- 4. Dados privados continuam fechados
-- ---------------------------------------------------------
ALTER TABLE public.profiles_private ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_private_own_row" ON public.profiles_private;

CREATE POLICY "profiles_private_own_row"
ON public.profiles_private FOR SELECT
TO authenticated
USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
