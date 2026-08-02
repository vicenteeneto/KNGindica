-- #########################################################
-- # VOCABULÁRIO ÚNICO DE PRECIFICAÇÃO
-- #
-- # A coluna profiles.pricing_model guardava dois vocabulários ao mesmo tempo:
-- #   - o formulário de perfil salvava  visit | hour | service | quote
-- #   - as telas comparavam contra      hourly | negotiable
-- #
-- # Nenhum lado conhecia o outro, então o rótulo saía errado no perfil
-- # público: um prestador com `negotiable` caía no ramo `else` e a tela
-- # anunciava "Valor fixo" logo abaixo de "Sob Consulta".
-- #
-- # O app já traduz os termos antigos na leitura (src/lib/pricing.ts), então
-- # esta migration é higiene de dados, não pré-requisito.
-- #########################################################

-- `negotiable` sempre significou "preço combinado" -> `quote`
UPDATE public.profiles
   SET pricing_model = 'quote'
 WHERE pricing_model = 'negotiable';

-- `hourly` com valor publicado e de fato cobrado por hora -> `hour`
UPDATE public.profiles
   SET pricing_model = 'hour'
 WHERE pricing_model = 'hourly'
   AND price_value IS NOT NULL;

-- `hourly` sem valor era o DEFAULT da coluna, não uma escolha: esses
-- prestadores nunca configuraram preço. Anunciar "Por hora" para eles é falso;
-- `quote` descreve a situação real.
UPDATE public.profiles
   SET pricing_model = 'quote'
 WHERE pricing_model = 'hourly'
   AND price_value IS NULL;

-- Novo padrão da coluna: quem ainda não escolheu fica em "sob orçamento",
-- em vez de herdar uma cobrança por hora que ninguém definiu.
ALTER TABLE public.profiles ALTER COLUMN pricing_model SET DEFAULT 'quote';

-- Trava o vocabulário para o problema não voltar
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pricing_model_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_pricing_model_check
  CHECK (pricing_model IS NULL OR pricing_model IN ('visit', 'hour', 'service', 'quote'));
