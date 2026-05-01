-- Supabase SQL Editor에서 실행하세요.
-- plat_plc, road_address는 ILIKE '%검색어%' 검색을 위해 pg_trgm GIN 인덱스를 사용합니다.
-- sgg_cd_nm, bjd_cd_nm은 구/동 드롭다운과 exact match 필터를 위해 btree 인덱스를 사용합니다.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_building_master_plat_plc_trgm
ON building_master
USING gin (plat_plc gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_building_master_road_address_trgm
ON building_master
USING gin (road_address gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_building_master_sgg_cd_nm
ON building_master (sgg_cd_nm);

CREATE INDEX IF NOT EXISTS idx_building_master_bjd_cd_nm
ON building_master (bjd_cd_nm);

CREATE INDEX IF NOT EXISTS idx_building_master_sgg_bjd
ON building_master (sgg_cd_nm, bjd_cd_nm);
