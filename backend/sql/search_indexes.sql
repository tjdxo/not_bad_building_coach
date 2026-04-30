-- Supabase SQL Editor에서 실행하세요.
-- /api/buildings는 ILIKE '%검색어%' 조건으로 주소를 검색하므로 pg_trgm GIN 인덱스가 필요합니다.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_building_master_plat_plc_trgm
ON building_master
USING gin (plat_plc gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_building_master_road_address_trgm
ON building_master
USING gin (road_address gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_building_master_sgg_cd_nm_trgm
ON building_master
USING gin (sgg_cd_nm gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_building_master_bjd_cd_nm_trgm
ON building_master
USING gin (bjd_cd_nm gin_trgm_ops);
