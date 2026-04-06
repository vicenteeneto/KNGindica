-- sql_v10_portfolio_favs.sql
-- Adiciona suporte para galeria de fotos e profissionais favoritos

-- 1. Tabela de Portfólio dos Prestadores
CREATE TABLE IF NOT EXISTS provider_portfolio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS no portfólio
ALTER TABLE provider_portfolio ENABLE ROW LEVEL SECURITY;

-- Políticas Portfólio
CREATE POLICY "Qualquer um pode ver o portfólio" 
ON provider_portfolio FOR SELECT USING (true);

CREATE POLICY "Prestadores podem gerenciar seu portfólio" 
ON provider_portfolio FOR ALL USING (auth.uid() = provider_id);

-- 2. Tabela de Favoritos do Cliente
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, provider_id) -- Impede favoritar o mesmo profissional duas vezes
);

-- Habilitar RLS nos favoritos
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Políticas Favoritos
CREATE POLICY "Usuários podem ver seus próprios favoritos" 
ON user_favorites FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem gerenciar seus favoritos" 
ON user_favorites FOR ALL USING (auth.uid() = user_id);

-- 3. Adicionar bucket de storage (Comentário instrucional para o Admin)
-- NOTA: O administrador deve criar manualmente o bucket 'portfolio' no Painel do Supabase
-- e definir permissões de leitura pública.
