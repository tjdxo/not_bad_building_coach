import re
from typing import Any, Dict, List, Optional

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


def _dedupe_strings(values: List[str]) -> List[str]:
    seen = set()
    result = []
    for value in values:
        normalized = value.strip()
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result


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


def search_building_master(
    db: Session,
    query: Optional[str] = None,
    district: Optional[str] = None,
    dong: Optional[str] = None,
    building_keyword: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> Dict[str, Any]:
    keyword = query.strip() if query else ""
    district_value = district.strip() if district else ""
    dong_value = dong.strip() if dong else ""
    building_keyword_value = building_keyword.strip() if building_keyword else ""

    if not keyword and not district_value and not dong_value and not building_keyword_value:
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
              OR REPLACE(plat_plc, ' ', '') ILIKE :normalized_search
              OR REPLACE(road_address, ' ', '') ILIKE :normalized_search
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
            ELSE 2
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
          COALESCE(NULLIF(road_address, ''), NULLIF(plat_plc, ''), '') AS display_address
        FROM building_master
        {where_clause}
        {order_clause}
        LIMIT :limit OFFSET :offset
    """)
    rows = db.execute(items_statement, params).mappings().all()

    return {
        "items": [dict(row) for row in rows],
        "page": page,
        "limit": limit,
        "total": total,
        "has_next": offset + limit < total,
    }


def get_building_master_districts(db: Session) -> List[str]:
    statement = text("""
        SELECT DISTINCT sgg_cd_nm
        FROM building_master
        WHERE sgg_cd_nm IS NOT NULL AND sgg_cd_nm <> ''
        ORDER BY sgg_cd_nm
    """)
    return [row[0] for row in db.execute(statement).all()]


def get_building_master_dongs(db: Session, district: str) -> List[str]:
    district_value = district.strip()
    statement = text("""
        SELECT DISTINCT bjd_cd_nm
        FROM building_master
        WHERE sgg_cd_nm = :district
          AND bjd_cd_nm IS NOT NULL
          AND bjd_cd_nm <> ''
        ORDER BY bjd_cd_nm
    """)
    return [row[0] for row in db.execute(statement, {"district": district_value}).all()]


def get_building_master_by_id(db: Session, building_id: Any) -> Optional[Dict[str, Any]]:
    id_column = _get_building_master_id_column(db)
    if not id_column:
        return None

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
        FROM building_master
        WHERE {id_column} = :building_id
        LIMIT 1
    """)
    row = db.execute(statement, {"building_id": building_id}).mappings().first()
    return dict(row) if row else None


def get_energy_usage_for_master_building(db: Session, building_id: Any) -> List[Dict[str, Any]]:
    statement = text("""
        SELECT
          use_ym,
          elec_qty AS electricity_kwh,
          is_estimated
        FROM energy_usage
        WHERE building_id = :building_id
        ORDER BY use_ym ASC
    """)
    return [dict(row) for row in db.execute(statement, {"building_id": building_id}).mappings().all()]


def get_energy_records_for_building(db: Session, building_id: int) -> List[BuildingEnergyMonthly]:
    statement = (
        select(BuildingEnergyMonthly)
        .where(BuildingEnergyMonthly.building_id == building_id)
        .order_by(BuildingEnergyMonthly.year.asc(), BuildingEnergyMonthly.month.asc())
    )
    return list(db.scalars(statement).all())
