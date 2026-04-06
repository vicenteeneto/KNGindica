-- #########################################################
-- # SCRIPT DE GEOLOCALIZAÇÃO - FASE 6
-- #########################################################

-- 1. HABILITAR EXTENSÃO POSTGIS (Item 23 da Análise)
-- Permite cálculos geográficos ultra-precisos no banco de dados.
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. ADICIONAR COLUNA GEOGRÁFICA AOS PERFIS
-- Armazena o ponto exato lat/lng para busca por distância.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- Criar índice espacial para velocidade de busca
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles USING GIST(location);

-- 3. FUNÇÃO DE ATUALIZAÇÃO AUTOMÁTICA DE LOCALIZAÇÃO
-- Quando atualizar lat/lng (já existentes), atualiza o ponto geográfico.
CREATE OR REPLACE FUNCTION update_profile_location_point() 
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL) THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_profile_location ON profiles;
CREATE TRIGGER trg_update_profile_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON profiles
FOR EACH ROW EXECUTE FUNCTION update_profile_location_point();


-- 4. FUNÇÃO PARA BUSCAR PROFISSIONAIS POR PROXIMIDADE (Item 23)
-- Busca prestadores num raio de X km.
CREATE OR REPLACE FUNCTION get_providers_nearby(
    client_lat DOUBLE PRECISION, 
    client_lng DOUBLE PRECISION, 
    max_dist_km DOUBLE PRECISION DEFAULT 20,
    category_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    avatar_url TEXT,
    rating NUMERIC,
    distance_km DOUBLE PRECISION,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION
) SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, 
        p.full_name, 
        p.avatar_url, 
        p.rating,
        ST_Distance(
            p.location, 
            ST_SetSRID(ST_MakePoint(client_lng, client_lat), 4326)::geography
        ) / 1000 as distance_km,
        p.latitude,
        p.longitude
    FROM profiles p
    WHERE p.role = 'provider'
    AND (category_id IS NULL OR p.category_id = category_id) -- Supõe que profiles tem category_id
    AND ST_DWithin(
        p.location, 
        ST_SetSRID(ST_MakePoint(client_lng, client_lat), 4326)::geography,
        max_dist_km * 1000
    )
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;
