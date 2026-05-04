from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import NoSuchTableError, SQLAlchemyError
from sqlalchemy.orm import Session

from app import crud, schemas
from app.db import get_db

router = APIRouter(tags=["buildings"])


@router.get("/buildings", response_model=schemas.BuildingSearchResponse)
def search_buildings(
    district: Optional[str] = Query(default=None),
    dong: Optional[str] = Query(default=None),
    query: Optional[str] = Query(default=None),
    building_keyword: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> schemas.BuildingSearchResponse:
    try:
        return crud.search_building_master(
            db,
            district=district,
            dong=dong,
            query=query,
            building_keyword=building_keyword,
            page=page,
            limit=limit,
        )
    except NoSuchTableError as exc:
        raise HTTPException(
            status_code=500,
            detail="building_master 테이블을 찾을 수 없습니다. Supabase DATABASE_URL 연결과 테이블명을 확인해주세요.",
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
    district: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
) -> schemas.StringItemsResponse:
    try:
        return schemas.StringItemsResponse(items=crud.get_building_master_dongs(db, district=district))
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="동 목록 조회 중 데이터베이스 오류가 발생했습니다.",
        ) from exc
