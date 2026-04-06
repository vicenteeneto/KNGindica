-- #########################################################
-- # SCRIPT DE RESGATE DE DADOS E IMAGENS - FASE FINAL
-- #########################################################

-- 1. GARANTE QUE PERFIS SEJAM PÚBLICOS (Item 21/22/23/24)
-- Sem isso, o app fica "cego" e não vê nomes nem fotos de ninguém.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perfis são visíveis por todos" ON profiles;
CREATE POLICY "Perfis são visíveis por todos" 
ON profiles FOR SELECT 
USING (true);


-- 2. GARANTE ACESSO ÀS CATEGORIAS
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categorias são visíveis por todos" ON service_categories;
CREATE POLICY "Categorias são visíveis por todos" 
ON service_categories FOR SELECT 
USING (true);


-- 3. RESGATE DE IMAGENS (STORAGE)
-- Garante que o bucket 'portfolio' permita visualização das imagens por qualquer um.
-- (Assumindo que seu bucket se chama 'portfolio').
DROP POLICY IF EXISTS "Imagens de portfólio são públicas" ON storage.objects;

CREATE POLICY "Imagens de portfólio são públicas"
ON storage.objects FOR SELECT
USING ( bucket_id = 'portfolio' );


-- 4. RESGATE DE AVATARES (STORAGE)
-- Se você tem um bucket separado de 'avatars', adicione a mesma permissão.
DROP POLICY IF EXISTS "Avatares são públicos" ON storage.objects;

CREATE POLICY "Avatares são públicos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );
