-- #########################################################
-- # FECHA LEITURA ANÔNIMA DE DADOS PESSOAIS
-- #
-- # Auditoria feita em 29/07/2026 com a anon key (que é pública por
-- # natureza: qualquer pessoa a extrai do bundle do site) mostrou que um
-- # visitante deslogado conseguia ler:
-- #
-- #   profiles_private   -> CPF
-- #   service_requests   -> endereço e descrição de todos os pedidos
-- #   freelance_orders   -> endereço de todos os pedidos
-- #   whatsapp_searches  -> client_phone, o telefone de cada lead
-- #
-- # A migration 20260728000200 fechou `profiles`, mas não resolveu
-- # profiles_private: criar uma política restritiva não basta quando o GRANT
-- # de tabela para `anon` continua existindo e há outra política permissiva
-- # concedendo acesso. RLS e GRANT são camadas independentes — é preciso
-- # remover o GRANT.
-- #
-- # Aqui revogamos apenas SELECT, e não ALL: se o fluxo n8n do WhatsApp
-- # estiver usando a anon key para gravar, os INSERTs continuam funcionando.
-- #########################################################

-- CPF e metadados privados: nunca para visitante
REVOKE SELECT ON public.profiles_private FROM anon;

-- Pedidos só interessam a quem está logado; nenhuma tela anônima os consulta
REVOKE SELECT ON public.service_requests FROM anon;
REVOKE SELECT ON public.freelance_orders FROM anon;

-- A landing /search/:id precisa ler a linha da busca (categoria, cidade,
-- serviço), mas não o telefone do lead. Revogação por coluna preserva a tela.
REVOKE SELECT (client_phone) ON public.whatsapp_searches FROM anon;

-- Demanda capturada pelo WhatsApp também guarda telefone
REVOKE SELECT (client_phone) ON public.service_demand_requests FROM anon;
