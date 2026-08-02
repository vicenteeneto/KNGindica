-- #########################################################
-- # BASELINE DO SCHEMA — KNGindica
-- #
-- # Reconstruído por introspecção do PostgREST (OpenAPI) do projeto de
-- # produção em 28/07/2026, porque o schema base nunca foi versionado:
-- # as tabelas foram criadas direto no painel do Supabase e só existiam lá.
-- #
-- # ESCOPO: tabelas, colunas, tipos, defaults, NOT NULL, PKs e FKs.
-- #
-- # O QUE ESTA INTROSPECÇÃO **NÃO** ENXERGA — e portanto NÃO está aqui:
-- #   - políticas RLS            - índices
-- #   - triggers                 - CHECK constraints
-- #   - UNIQUE constraints       - corpo das funções/RPCs
-- #   - definição das views      - grants
-- #
-- # Parte disso está nas migrations incrementais 2026034*/2026040*.
-- # Para um dump fiel e completo, rode com a CLI logada:
-- #     supabase link --project-ref yhtrvhievhrgmzijgpkk
-- #     supabase db pull
-- # e substitua este arquivo pelo resultado.
-- #
-- # USO: provisionar um ambiente novo (staging/local). Todos os comandos são
-- # idempotentes, então rodar contra a produção existente é no-op.
-- #########################################################

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS postgis;

-- Status do pedido de serviço (enum real em produção)
DO $$ BEGIN
    CREATE TYPE public.request_status AS ENUM (
        'open', 'accepted', 'in_progress', 'completed', 'cancelled',
        'proposed', 'awaiting_payment', 'paid', 'in_service', 'quoted', 'scheduled'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ---------------------------------------------------------
-- Perfis
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id                          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role                        text,
    full_name                   text,
    created_at                  timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    avatar_url                  text,
    status                      text DEFAULT 'active',
    city                        text,
    latitude                    numeric,
    longitude                   numeric,
    phone                       text,
    address                     text,
    cep                         text,
    bio                         text,
    categories                  jsonb,
    display_id                  text,
    plan_type                   text DEFAULT 'basic',
    whatsapp_number             text,
    email                       text,
    is_verified                 boolean DEFAULT false,
    pricing_model               text DEFAULT 'hourly',
    price_value                 numeric,
    show_price                  boolean DEFAULT true,
    terms_accepted              boolean DEFAULT false,
    terms_accepted_at           timestamptz,
    push_token                  text,
    onesignal_id                text,
    address_complement          text,
    opening_hours               text,
    loyalty_enabled             boolean DEFAULT false,
    loyalty_required_services   integer DEFAULT 10,
    loyalty_benefit_description text,
    referral_code               text,
    reward_points               integer DEFAULT 0,
    referred_by                 uuid REFERENCES public.profiles(id),
    state                       text,
    neighborhood                text,
    street                      text,
    number                      text,
    service_category            text,
    description                 text,
    rating                      numeric DEFAULT 0,
    reviews_count               integer DEFAULT 0,
    cover_image                 text,
    location                    geography(Point, 4326)
);

-- Dados sensíveis separados do perfil público
CREATE TABLE IF NOT EXISTS public.profiles_private (
    id          uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    cpf         text,
    metadata    jsonb,
    birth_date  text
);


-- ---------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_categories (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    icon        text NOT NULL,
    description text,
    created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_services (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES public.service_categories(id),
    title       text NOT NULL,
    description text,
    base_price  numeric,
    created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.category_requests (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_name text NOT NULL,
    status        text NOT NULL DEFAULT 'pending',
    created_at    timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);


-- ---------------------------------------------------------
-- Pedidos diretos
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_requests (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id        uuid NOT NULL REFERENCES public.service_categories(id),
    provider_id        uuid REFERENCES public.profiles(id),
    title              text NOT NULL,
    description        text NOT NULL,
    status             public.request_status DEFAULT 'open',
    address            text,
    created_at         timestamptz DEFAULT now(),
    updated_at         timestamptz DEFAULT now(),
    display_id         text,
    budget_amount      numeric DEFAULT 0,
    platform_fee       numeric DEFAULT 10,
    provider_earnings  numeric DEFAULT 0,
    delivery_deadline  timestamptz,
    city               text,
    cep                text,
    address_complement text,
    street             text,
    number             text,
    neighborhood       text,
    state              text,
    payment_method     text,
    desired_date       timestamptz,
    attachments        jsonb,
    rejection_reason   text,
    latitude           numeric,
    longitude          numeric
);


-- ---------------------------------------------------------
-- Freelance (leilão)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.freelance_orders (
    id                   uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    client_id            uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id          uuid REFERENCES public.service_categories(id),
    title                text NOT NULL,
    description          text NOT NULL,
    budget               numeric NOT NULL,
    status               text DEFAULT 'open',
    assigned_provider_id uuid REFERENCES public.profiles(id),
    created_at           timestamptz DEFAULT now(),
    city                 text,
    expires_at           timestamptz,
    street               text,
    number               text,
    neighborhood         text,
    state                text,
    cep                  text,
    address_complement   text,
    attachments          jsonb,
    scheduled_at         timestamptz
);

CREATE TABLE IF NOT EXISTS public.freelance_bids (
    id          uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    order_id    uuid REFERENCES public.freelance_orders(id) ON DELETE CASCADE,
    provider_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount      numeric NOT NULL,
    message     text,
    status      text DEFAULT 'pending',
    created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_dismissals (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id    uuid NOT NULL,
    order_type  text NOT NULL,
    created_at  timestamptz DEFAULT now()
);


-- ---------------------------------------------------------
-- Chat
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id         uuid REFERENCES public.service_requests(id) ON DELETE CASCADE,
    client_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at         timestamptz DEFAULT now(),
    client_archived    boolean DEFAULT false,
    provider_archived  boolean DEFAULT false,
    freelance_order_id uuid REFERENCES public.freelance_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id    uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content    text NOT NULL,
    created_at timestamptz DEFAULT now(),
    is_read    boolean DEFAULT false
);


-- ---------------------------------------------------------
-- Avaliações, portfólio, favoritos, verificação
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id          uuid REFERENCES public.service_requests(id) ON DELETE CASCADE,
    reviewer_id         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    provider_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating              integer NOT NULL,
    comment             text,
    created_at          timestamptz DEFAULT now(),
    reviewer_name       text,
    reviewer_avatar_url text,
    freelance_order_id  uuid REFERENCES public.freelance_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.provider_portfolio (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    image_url    text NOT NULL,
    storage_path text,
    created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_favorites (
    id          uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at  timestamptz DEFAULT now(),
    UNIQUE (user_id, provider_id)
);

CREATE TABLE IF NOT EXISTS public.provider_verifications (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_front_path   text,
    document_back_path    text,
    selfie_path           text,
    residence_proof_path  text,
    status                text DEFAULT 'pending',
    rejection_reason      text,
    created_at            timestamptz DEFAULT now(),
    updated_at            timestamptz DEFAULT now()
);


-- ---------------------------------------------------------
-- Agenda do prestador
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_schedule (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week integer NOT NULL,
    start_time  time NOT NULL DEFAULT '08:00:00',
    end_time    time NOT NULL DEFAULT '18:00:00'
);

CREATE TABLE IF NOT EXISTS public.provider_blocked_dates (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_date date NOT NULL,
    reason       text
);


-- ---------------------------------------------------------
-- Financeiro e métricas
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id         uuid REFERENCES public.service_requests(id) ON DELETE SET NULL,
    user_id            uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    type               text NOT NULL,
    amount             numeric NOT NULL,
    status             text DEFAULT 'completed',
    metadata           jsonb,
    created_at         timestamptz DEFAULT now(),
    freelance_order_id uuid REFERENCES public.freelance_orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.lead_events (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    provider_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    type        text NOT NULL,
    metadata    jsonb,
    created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reward_history (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount      integer NOT NULL,
    description text NOT NULL,
    created_at  timestamptz DEFAULT timezone('utc'::text, now())
);


-- ---------------------------------------------------------
-- Suporte e notificações
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    related_order_id   uuid REFERENCES public.service_requests(id) ON DELETE SET NULL,
    category           text NOT NULL,
    subject            text NOT NULL,
    description        text NOT NULL,
    status             text NOT NULL DEFAULT 'open',
    created_at         timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at         timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    attachments        jsonb,
    admin_response     text,
    freelance_order_id uuid REFERENCES public.freelance_orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title             text NOT NULL,
    message           text NOT NULL,
    type              text NOT NULL,
    related_entity_id uuid,
    is_read           boolean DEFAULT false,
    created_at        timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.user_push_subscriptions (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    subscription jsonb NOT NULL,
    device_info  text,
    active       boolean DEFAULT true,
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id         uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint   text NOT NULL,
    request_at timestamptz DEFAULT now()
);


-- ---------------------------------------------------------
-- Funil WhatsApp
--
-- Estas tabelas são alimentadas por um fluxo n8n que vive FORA deste
-- repositório. `whatsapp_searches` é a origem do deep link /search/:id
-- consumido por WhatsAppSearchScreen.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_searches (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id     uuid NOT NULL REFERENCES public.service_categories(id),
    client_phone    text,
    created_at      timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at      timestamptz DEFAULT (timezone('utc'::text, now()) + interval '24 hours'),
    city            text,
    servico         text,
    providers_count integer DEFAULT 0
);

-- Demanda capturada quando não há prestador para o serviço pedido
CREATE TABLE IF NOT EXISTS public.service_demand_requests (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_phone text NOT NULL,
    city         text NOT NULL,
    servico      text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- Histórico de conversas do agente n8n (LangChain chat memory)
CREATE TABLE IF NOT EXISTS public.n8n_chat_histories_kngindica (
    id         serial PRIMARY KEY,
    session_id varchar NOT NULL,
    message    jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.blocked_numbers (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone      text NOT NULL,
    reason     text,
    blocked_by text DEFAULT 'manual',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rate_limit_events (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone      text NOT NULL,
    event_type text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------
-- VIEW: provider_wallet_summary
--
-- ⚠️ DELIBERADAMENTE NÃO EXECUTÁVEL.
--
-- A view existe em produção (provider_id, full_name, total_earnings,
-- completed_services), mas a introspecção do PostgREST não expõe a definição
-- real. O SQL abaixo é uma RECONSTRUÇÃO POR SUPOSIÇÃO da semântica.
--
-- Rodar isso como CREATE OR REPLACE substituiria a view verdadeira por um
-- palpite e poderia alterar silenciosamente os saldos mostrados aos
-- prestadores. Fica comentado até que `supabase db pull` traga a definição
-- real — só então descomente, já com o texto correto.
--
-- CREATE OR REPLACE VIEW public.provider_wallet_summary AS
-- SELECT
--     p.id                                   AS provider_id,
--     p.full_name                            AS full_name,
--     COALESCE(SUM(sr.provider_earnings), 0) AS total_earnings,
--     COUNT(sr.id)                           AS completed_services
-- FROM public.profiles p
-- LEFT JOIN public.service_requests sr
--        ON sr.provider_id = p.id
--       AND sr.status = 'completed'
-- WHERE p.role = 'provider'
-- GROUP BY p.id, p.full_name;
-- ---------------------------------------------------------
