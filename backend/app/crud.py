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
    query: str,
    page: int = 1,
    limit: int = 20,
) -> Dict[str, Any]:
    keyword = query.strip()
    if not keyword:
        return {
            "items": [],
            "page": page,
            "limit": limit,
            "total": 0,
            "has_next": False,
        }

    offset = (page - 1) * limit
    search = f"%{keyword}%"
    prefix = f"{keyword}%"
    id_column = _get_building_master_id_column(db)
    if id_column:
        id_select = f"{id_column} AS building_id"
    else:
        # TODO: building_id 매핑 필요. building_master의 안정적인 PK 컬럼이 확인되면 alias로 매핑한다.
        id_select = "NULL AS building_id"

    where_clause = """
        WHERE
          plat_plc ILIKE :search
          OR road_address ILIKE :search
          OR sgg_cd_nm ILIKE :search
          OR bjd_cd_nm ILIKE :search
    """

    # TODO: 60만 건 이상에서 total count가 병목이면 approximate count 또는 has_next 중심 페이지네이션으로 개선한다.
    total_statement = text(f"""
        SELECT COUNT(*) AS total
        FROM building_master
        {where_clause}
    """)
    total = int(db.execute(total_statement, {"search": search}).scalar_one())

    items_statement = text(f"""
        SELECT
          {id_select},
          plat_plc,
          road_address,
          sgg_cd_nm,
          bjd_cd_nm,
          COALESCE(NULLIF(road_address, ''), NULLIF(plat_plc, ''), '') AS display_address
        FROM building_master
        {where_clause}
        ORDER BY
          CASE
            WHEN road_address ILIKE :prefix THEN 0
            WHEN plat_plc ILIKE :prefix THEN 1
            ELSE 2
          END,
          road_address NULLS LAST,
          plat_plc NULLS LAST
        LIMIT :limit OFFSET :offset
    """)
    rows = db.execute(
        items_statement,
        {
            "search": search,
            "prefix": prefix,
            "limit": limit,
            "offset": offset,
        },
    ).mappings().all()

    return {
        "items": [dict(row) for row in rows],
        "page": page,
        "limit": limit,
        "total": total,
        "has_next": offset + limit < total,
    }


def get_energy_records_for_building(db: Session, building_id: int) -> List[BuildingEnergyMonthly]:
    statement = (
        select(BuildingEnergyMonthly)
        .where(BuildingEnergyMonthly.building_id == building_id)
        .order_by(BuildingEnergyMonthly.year.asc(), BuildingEnergyMonthly.month.asc())
    )
    return list(db.scalars(statement).all())
