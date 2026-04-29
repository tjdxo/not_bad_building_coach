from typing import List, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Building, BuildingEnergyMonthly


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


def get_energy_records_for_building(db: Session, building_id: int) -> List[BuildingEnergyMonthly]:
    statement = (
        select(BuildingEnergyMonthly)
        .where(BuildingEnergyMonthly.building_id == building_id)
        .order_by(BuildingEnergyMonthly.year.asc(), BuildingEnergyMonthly.month.asc())
    )
    return list(db.scalars(statement).all())
