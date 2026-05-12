from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import NoSuchTableError, SQLAlchemyError
from sqlalchemy.orm import Session

from app import crud, schemas
from app.db import get_db
from app.security import MAX_QUERY_LENGTH, clean_text

router = APIRouter(tags=["buildings"])


@router.get("/buildings", response_model=schemas.BuildingSearchResponse)
def search_buildings(
    district: Optional[str] = Query(default=None, max_length=MAX_QUERY_LENGTH),
    dong: Optional[str] = Query(default=None, max_length=MAX_QUERY_LENGTH),
    query: Optional[str] = Query(default=None, max_length=MAX_QUERY_LENGTH),
    building_keyword: Optional[str] = Query(default=None, max_length=MAX_QUERY_LENGTH),
    building_keyword_camel: Optional[str] = Query(default=None, alias="buildingKeyword", max_length=MAX_QUERY_LENGTH),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> schemas.BuildingSearchResponse:
    try:
        return crud.search_building_master(
            db,
            district=clean_text(district, field_name="구") if district else None,
            dong=clean_text(dong, field_name="동") if dong else None,
            query=clean_text(query, field_name="검색어") if query else None,
            building_keyword=clean_text(building_keyword or building_keyword_camel, field_name="건물명") if (building_keyword or building_keyword_camel) else None,
            page=page,
            limit=limit,
        )
    except NoSuchTableError as exc:
        raise HTTPException(
            status_code=500,
            detail="건물 주소 검색 설정을 확인해야 합니다.",
        ) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="건물 주소 검색 중 데이터베이스 오류가 발생했습니다.",
        ) from exc


@router.get("/districts", response_model=schemas.StringItemsResponse)
def get_districts(db: Session = Depends(get_db)) -> schemas.StringItemsResponse:
    try:
        return schemas.StringItemsResponse(items=crud.get_building_master_districts(db))
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="구 목록 조회 중 데이터베이스 오류가 발생했습니다.",
        ) from exc


@router.get("/dongs", response_model=schemas.StringItemsResponse)
def get_dongs(
    district: str = Query(..., min_length=1, max_length=MAX_QUERY_LENGTH),
    db: Session = Depends(get_db),
) -> schemas.StringItemsResponse:
    try:
        return schemas.StringItemsResponse(items=crud.get_building_master_dongs(db, district=clean_text(district, field_name="구")))
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="동 목록 조회 중 데이터베이스 오류가 발생했습니다.",
        ) from exc
