from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Building


def find_peer_buildings(db: Session, target_building: Building) -> List[Building]:
    area_min = target_building.gross_floor_area * 0.7
    area_max = target_building.gross_floor_area * 1.3
    year_min = target_building.approval_year - 10
    year_max = target_building.approval_year + 10

    statement = (
        select(Building)
        .where(Building.id != target_building.id)
        .where(Building.building_type == target_building.building_type)
        .where(Building.gross_floor_area >= area_min)
        .where(Building.gross_floor_area <= area_max)
        .where(Building.approval_year >= year_min)
        .where(Building.approval_year <= year_max)
        .order_by(Building.id.asc())
    )
    return list(db.scalars(statement).all())
