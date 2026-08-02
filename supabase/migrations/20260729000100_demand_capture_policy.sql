-- #########################################################
-- # CAPTURA DE DEMANDA A PARTIR DE BUSCA SEM RESULTADO
-- #
-- # O catálogo tem 60 categorias e oferta em 8 delas, então a maioria das
-- # buscas terminava em tela vazia: o cliente ia embora e a plataforma não
-- # ficava sabendo do que ele procurava.
-- #
-- # Agora a busca frustrada vira registro em `service_demand_requests` — a
-- # mesma tabela que o fluxo do WhatsApp já alimenta — servindo de lista de
-- # prospecção de prestadores.
-- #########################################################

ALTER TABLE public.service_demand_requests ENABLE ROW LEVEL SECURITY;

-- Só usuário logado grava: a tela de busca já exige login, e isso evita que a
-- tabela vire alvo de spam com a anon key, que é pública.
DROP POLICY IF EXISTS "demand_insert_authenticated" ON public.service_demand_requests;

CREATE POLICY "demand_insert_authenticated"
ON public.service_demand_requests FOR INSERT
TO authenticated
WITH CHECK (true);

GRANT INSERT ON public.service_demand_requests TO authenticated;

-- Leitura restrita ao admin: a tabela guarda telefone de lead.
DROP POLICY IF EXISTS "demand_select_admin" ON public.service_demand_requests;

CREATE POLICY "demand_select_admin"
ON public.service_demand_requests FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Consultas do admin são sempre por cidade/serviço mais recentes primeiro
CREATE INDEX IF NOT EXISTS idx_demand_city_created
    ON public.service_demand_requests(city, created_at DESC);
