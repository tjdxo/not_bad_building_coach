import re
from typing import Any, Dict, List, Literal, Optional

from sqlalchemy import func, inspect, or_, select, text
from sqlalchemy.orm import Session

from app.models import Building, BuildingEnergyMonthly

BUILDING_MASTER_ID_CANDIDATES = (
    "id",
    "building_id",
    "mgm_bldrgst_pk",
    "bldrgst_pk",
    "pk",
)
_building_master_id_column: Optional[str] = None
_building_master_id_column_checked = False
_building_master_columns: Optional[set] = None

Region = Literal["seoul", "incheon"]

REGION_NAMES: Dict[Region, str] = {
    "seoul": "서울특별시",
    "incheon": "인천광역시",
}

REGION_PREFIXES: Dict[Region, str] = {
    "seoul": "서울특별시",
    "incheon": "인천광역시",
}

REGION_TABLES: Dict[Region, Dict[str, str]] = {
    "seoul": {
        "electric": "electric_energy_service_lite",
        "gas": "gas_energy_service_lite",
        "peer": "building_peer_benchmark",
    },
    "incheon": {
        "electric": "electric_energy_service_lite_incheon",
        "gas": "gas_energy_service_lite_incheon",
        "peer": "peer_benchmark_results_incheon_with_monthly_absolute",
    },
}


def _dedupe_strings(values: List[str]) -> List[str]:
    seen = set()
    result = []
    for value in values:
        normalized = value.strip()
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result


def _clean_admin_names(values: List[str]) -> List[str]:
    return _dedupe_strings([value for value in values if "�" not in value])


def detect_region_from_building(building: Optional[Dict[str, Any]]) -> Region:
    if not building:
        return "seoul"

    values = [
        str(building.get("sgg_cd_nm") or "").strip(),
        str(building.get("road_address") or "").strip(),
        str(building.get("plat_plc") or "").strip(),
        str(building.get("display_address") or "").strip(),
    ]
    if any(value.startswith("인천광역시") for value in values):
        return "incheon"
    if any(value.startswith("서울특별시") for value in values):
        return "seoul"

    joined = " ".join(values)
    if "인천광역시" in joined:
        return "incheon"
    if "서울특별시" in joined:
        return "seoul"
    return "seoul"


def get_region_name(region: str) -> str:
    return REGION_NAMES.get(_normalize_region(region), REGION_NAMES["seoul"])


def attach_region_fields(building: Dict[str, Any]) -> Dict[str, Any]:
    region = detect_region_from_building(building)
    building["region"] = region
    building["region_name"] = REGION_NAMES[region]
    return building


def _normalize_region(region: Optional[str]) -> Region:
    value = str(region or "").strip()
    if value in {"incheon", "인천", "인천광역시"}:
        return "incheon"
    return "seoul"


def normalize_region_filter(region: Optional[str]) -> Optional[Region]:
    value = str(region or "").strip()
    if value in {"seoul", "서울", "서울특별시"}:
        return "seoul"
    if value in {"incheon", "인천", "인천광역시"}:
        return "incheon"
    return None


def _region_table(region: Optional[str], table_key: str) -> str:
    return REGION_TABLES[_normalize_region(region)][table_key]


def _expand_building_keyword_terms(keyword: str) -> List[str]:
    compact_keyword = "".join(keyword.split())
    terms = [keyword, compact_keyword]

    if "에스케이" in compact_keyword:
        terms.append(compact_keyword.replace("에스케이", "SK"))

    if "sk" in compact_keyword.lower():
        terms.append(re.sub("sk", "에스케이", compact_keyword, flags=re.IGNORECASE))

    return _dedupe_strings(terms)


def find_building_by_address(db: Session, address: str) -> Optional[Building]:
    normalized_address = "".join(address.split())
    road_address_normalized = func.replace(Building.road_address, " ", "")
    jibun_address_normalized = func.replace(Building.jibun_address, " ", "")

    statement = (
        select(Building)
        .where(
            or_(
                Building.road_address.ilike(f"%{address}%"),
                Building.jibun_address.ilike(f"%{address}%"),
                road_address_normalized.ilike(f"%{normalized_address}%"),
                jibun_address_normalized.ilike(f"%{normalized_address}%"),
                Building.name.ilike(f"%{address}%"),
            )
        )
        .order_by(Building.id.asc())
    )
    return db.scalars(statement).first()


def search_buildings(db: Session, query: str = "", limit: int = 20) -> List[Building]:
    keyword = query.strip()
    normalized_keyword = "".join(keyword.split())

    statement = select(Building).order_by(Building.id.asc()).limit(limit)
    if keyword:
        road_address_normalized = func.replace(Building.road_address, " ", "")
        jibun_address_normalized = func.replace(Building.jibun_address, " ", "")
        name_normalized = func.replace(Building.name, " ", "")

        statement = (
            select(Building)
            .where(
                or_(
                    Building.name.ilike(f"%{keyword}%"),
                    Building.road_address.ilike(f"%{keyword}%"),
                    Building.jibun_address.ilike(f"%{keyword}%"),
                    Building.building_type.ilike(f"%{keyword}%"),
                    name_normalized.ilike(f"%{normalized_keyword}%"),
                    road_address_normalized.ilike(f"%{normalized_keyword}%"),
                    jibun_address_normalized.ilike(f"%{normalized_keyword}%"),
                )
            )
            .order_by(Building.id.asc())
            .limit(limit)
        )

    return list(db.scalars(statement).all())


def _get_building_master_id_column(db: Session) -> Optional[str]:
    global _building_master_id_column, _building_master_id_column_checked

    if _building_master_id_column_checked:
        return _building_master_id_column

    inspector = inspect(db.get_bind())
    column_names = {
        column["name"] for column in inspector.get_columns("building_master")
    }
    _building_master_id_column = next(
        (
            candidate
            for candidate in BUILDING_MASTER_ID_CANDIDATES
            if candidate in column_names
        ),
        None,
    )
    _building_master_id_column_checked = True
    return _building_master_id_column


def _get_building_master_columns(db: Session) -> set:
    global _building_master_columns
    if _building_master_columns is None:
        inspector = inspect(db.get_bind())
        _building_master_columns = {column["name"] for column in inspector.get_columns("building_master")}
    return _building_master_columns


def search_building_master(
    db: Session,
    query: Optional[str] = None,
    district: Optional[str] = None,
    dong: Optional[str] = None,
    building_keyword: Optional[str] = None,
    region: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> Dict[str, Any]:
    keyword = query.strip() if query else ""
    district_value = district.strip() if district else ""
    dong_value = dong.strip() if dong else ""
    building_keyword_value = building_keyword.strip() if building_keyword else ""
    region_value = normalize_region_filter(region)

    if not keyword and not district_value and not dong_value and not building_keyword_value and not region_value:
        return {
            "items": [],
            "page": page,
            "limit": limit,
            "total": 0,
            "has_next": False,
        }

    offset = (page - 1) * limit
    id_column = _get_building_master_id_column(db)
    if id_column:
        id_select = f"{id_column} AS building_id"
    else:
        # TODO: building_id 매핑 필요. building_master의 안정적인 PK 컬럼이 확인되면 alias로 매핑한다.
        id_select = "NULL AS building_id"

    where_parts = []
    params: Dict[str, Any] = {
        "limit": limit,
        "offset": offset,
    }

    if region_value:
        where_parts.append("""
            (
              sgg_cd_nm ILIKE :region_prefix
              OR road_address ILIKE :region_prefix
              OR plat_plc ILIKE :region_prefix
            )
        """)
        params["region_prefix"] = f"{REGION_PREFIXES[region_value]}%"

    if district_value:
        where_parts.append("sgg_cd_nm = :district")
        params["district"] = district_value

    if dong_value:
        where_parts.append("bjd_cd_nm = :dong")
        params["dong"] = dong_value

    if keyword:
        where_parts.append("""
            (
              plat_plc ILIKE :search
              OR road_address ILIKE :search
              OR sgg_cd_nm ILIKE :search
              OR bjd_cd_nm ILIKE :search
              OR COALESCE(bld_nm, '') ILIKE :search
              OR COALESCE(dong_nm, '') ILIKE :search
              OR REPLACE(plat_plc, ' ', '') ILIKE :normalized_search
              OR REPLACE(road_address, ' ', '') ILIKE :normalized_search
              OR REPLACE(COALESCE(sgg_cd_nm, ''), ' ', '') ILIKE :normalized_search
              OR REPLACE(COALESCE(bjd_cd_nm, ''), ' ', '') ILIKE :normalized_search
              OR REPLACE(COALESCE(bld_nm, ''), ' ', '') ILIKE :normalized_search
              OR REPLACE(COALESCE(dong_nm, ''), ' ', '') ILIKE :normalized_search
            )
        """)
        params["search"] = f"%{keyword}%"
        params["normalized_search"] = f"%{''.join(keyword.split())}%"
        params["prefix"] = f"{keyword}%"

    building_terms = _expand_building_keyword_terms(building_keyword_value) if building_keyword_value else []
    if building_terms:
        building_term_parts = []
        for index, term in enumerate(building_terms):
            search_key = f"building_search_{index}"
            no_space_key = f"building_search_no_space_{index}"
            building_term_parts.append(f"""
                COALESCE(bld_nm, '') ILIKE :{search_key}
                OR COALESCE(dong_nm, '') ILIKE :{search_key}
                OR REPLACE(COALESCE(bld_nm, ''), ' ', '') ILIKE :{no_space_key}
                OR REPLACE(COALESCE(dong_nm, ''), ' ', '') ILIKE :{no_space_key}
            """)
            params[search_key] = f"%{term}%"
            params[no_space_key] = f"%{''.join(term.split())}%"
        where_parts.append("(" + " OR ".join(building_term_parts) + ")")

    where_clause = "WHERE " + " AND ".join(where_parts)
    order_clause = """
        ORDER BY
          CASE
            WHEN road_address ILIKE :prefix THEN 0
            WHEN plat_plc ILIKE :prefix THEN 1
            WHEN sgg_cd_nm ILIKE :prefix THEN 2
            WHEN bjd_cd_nm ILIKE :prefix THEN 3
            WHEN COALESCE(bld_nm, '') ILIKE :prefix THEN 4
            WHEN COALESCE(dong_nm, '') ILIKE :prefix THEN 5
            ELSE 6
          END,
          road_address NULLS LAST,
          plat_plc NULLS LAST
    """ if keyword else """
        ORDER BY
          road_address NULLS LAST,
          plat_plc NULLS LAST
    """

    # TODO: 60만 건 이상에서 total count가 병목이면 approximate count 또는 has_next 중심 페이지네이션으로 개선한다.
    total_statement = text(f"""
        SELECT COUNT(*) AS total
        FROM building_master
        {where_clause}
    """)
    total = int(db.execute(total_statement, params).scalar_one())

    items_statement = text(f"""
        SELECT
          {id_select},
          plat_plc,
          road_address,
          sgg_cd_nm,
          bjd_cd_nm,
          bld_nm,
          dong_nm,
          grs_ar,
          agnd_flr,
          purp_nm,
          COALESCE(NULLIF(road_address, ''), NULLIF(plat_plc, ''), '') AS display_address
        FROM building_master
        {where_clause}
        {order_clause}
        LIMIT :limit OFFSET :offset
    """)
    rows = db.execute(items_statement, params).mappings().all()

    return {
        "items": [attach_region_fields(dict(row)) for row in rows],
        "page": page,
        "limit": limit,
        "total": total,
        "has_next": offset + limit < total,
    }


def get_building_master_districts(db: Session, region: Optional[str] = None) -> List[str]:
    region_value = normalize_region_filter(region)
    where_parts = [
        "sgg_cd_nm IS NOT NULL",
        "sgg_cd_nm <> ''",
    ]
    params: Dict[str, Any] = {}
    if region_value:
        where_parts.append("sgg_cd_nm ILIKE :region_prefix")
        params["region_prefix"] = f"{REGION_PREFIXES[region_value]}%"

    statement = text(f"""
        SELECT DISTINCT sgg_cd_nm
        FROM building_master
        WHERE {" AND ".join(where_parts)}
        ORDER BY sgg_cd_nm
    """)
    return _clean_admin_names([row[0] for row in db.execute(statement, params).all()])


def get_building_master_dongs(db: Session, district: str, region: Optional[str] = None) -> List[str]:
    district_value = district.strip()
    region_value = normalize_region_filter(region)
    region_clause = ""
    params: Dict[str, Any] = {"district": district_value}
    if region_value:
        region_clause = "AND sgg_cd_nm ILIKE :region_prefix"
        params["region_prefix"] = f"{REGION_PREFIXES[region_value]}%"

    statement = text(f"""
        SELECT DISTINCT bjd_cd_nm
        FROM building_master
        WHERE sgg_cd_nm = :district
          {region_clause}
          AND bjd_cd_nm IS NOT NULL
          AND bjd_cd_nm <> ''
        ORDER BY bjd_cd_nm
    """)
    return _clean_admin_names([row[0] for row in db.execute(statement, params).all()])


def get_building_master_by_id(db: Session, building_id: Any) -> Optional[Dict[str, Any]]:
    id_column = _get_building_master_id_column(db)
    if not id_column:
        return None
    column_names = _get_building_master_columns(db)
    optional_selects = [
        column_name
        for column_name in ("use_apr_day", "purp_nm", "main_purpose", "approval_year", "is_district_heating")
        if column_name in column_names
    ]
    optional_sql = (",\n          " + ",\n          ".join(optional_selects)) if optional_selects else ""

    statement = text(f"""
        SELECT
          {id_column} AS building_id,
          plat_plc,
          road_address,
          sgg_cd_nm,
          bjd_cd_nm,
          bld_nm,
          dong_nm,
          grs_ar,
          agnd_flr,
          COALESCE(NULLIF(road_address, ''), NULLIF(plat_plc, ''), '') AS display_address
          {optional_sql}
        FROM building_master
        WHERE {id_column} = :building_id
        LIMIT 1
    """)
    row = db.execute(statement, {"building_id": building_id}).mappings().first()
    return attach_region_fields(dict(row)) if row else None


def get_energy_usage_for_master_building(db: Session, building_id: Any) -> List[Dict[str, Any]]:
    statement = text("""
        SELECT
          use_ym,
          elec_qty,
          gas_qty,
          is_estimated,
          is_estimated_gas
        FROM (
          SELECT
            use_ym,
            elec_qty,
            gas_qty,
            is_estimated,
            is_estimated_gas
          FROM energy_usage
          WHERE building_id = :building_id
          ORDER BY use_ym DESC
          LIMIT 12
        ) recent
        ORDER BY use_ym ASC
    """)
    return [dict(row) for row in db.execute(statement, {"building_id": building_id}).mappings().all()]


def get_energy_usage_sum_for_period(
    db: Session,
    building_id: Any,
    period_start: Optional[str],
    period_end: Optional[str],
) -> Dict[str, Optional[float]]:
    if not building_id or not period_start or not period_end:
        return {"elec_qty": None, "gas_qty": None}

    statement = text("""
        SELECT
          SUM(elec_qty) AS elec_qty,
          SUM(gas_qty) AS gas_qty
        FROM energy_usage
        WHERE building_id = :building_id
          AND use_ym >= :period_start
          AND use_ym <= :period_end
    """)
    row = db.execute(
        statement,
        {
            "building_id": building_id,
            "period_start": period_start,
            "period_end": period_end,
        },
    ).mappings().first()
    return dict(row) if row else {"elec_qty": None, "gas_qty": None}


def get_peer_benchmark_for_master_building(
    db: Session,
    building_id: Any,
    region: Optional[str] = "seoul",
) -> Optional[Dict[str, Any]]:
    table_name = _region_table(region, "peer")
    statement = text(f"""
        SELECT *
        FROM {table_name}
        WHERE building_id = :building_id
        LIMIT 1
    """)
    row = db.execute(statement, {"building_id": building_id}).mappings().first()
    return dict(row) if row else None


def get_electric_energy_service_lite_for_building(
    db: Session,
    building_id: Any,
    region: Optional[str] = "seoul",
) -> Optional[Dict[str, Any]]:
    table_name = _region_table(region, "electric")
    statement = text(f"""
        SELECT *
        FROM {table_name}
        WHERE building_id = :building_id
        LIMIT 1
    """)
    row = db.execute(statement, {"building_id": building_id}).mappings().first()
    return dict(row) if row else None


def get_gas_energy_service_lite_for_building(
    db: Session,
    building_id: Any,
    region: Optional[str] = "seoul",
) -> Optional[Dict[str, Any]]:
    table_name = _region_table(region, "gas")
    statement = text(f"""
        SELECT *
        FROM {table_name}
        WHERE building_id = :building_id
        LIMIT 1
    """)
    row = db.execute(statement, {"building_id": building_id}).mappings().first()
    return dict(row) if row else None


def get_energy_records_for_building(db: Session, building_id: int) -> List[BuildingEnergyMonthly]:
    statement = (
        select(BuildingEnergyMonthly)
        .where(BuildingEnergyMonthly.building_id == building_id)
        .order_by(BuildingEnergyMonthly.year.asc(), BuildingEnergyMonthly.month.asc())
    )
    return list(db.scalars(statement).all())
