from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import crud, schemas
from app.db import get_db

router = APIRouter(tags=["buildings"])


@router.get("/buildings", response_model=List[schemas.BuildingInfo])
def search_buildings(
    query: str = "",
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> List[schemas.BuildingInfo]:
    return crud.search_buildings(db, query=query, limit=limit)
