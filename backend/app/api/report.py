from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import crud, schemas
from app.db import get_db
from app.services.analysis import (
    build_analysis_json,
    calculate_energy_waste_index,
    summarize_energy,
    summarize_peer_energy,
)
from app.services.llm_report import generate_report_text
from app.services.peer_group import find_peer_buildings

router = APIRouter(tags=["report"])


def _coerce_int(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def build_master_fallback_report(request: schemas.ReportRequest) -> schemas.ReportResponse:
    address = request.road_address or request.address
    plat_plc = request.plat_plc or request.address
    building_id = _coerce_int(request.building_id)
    display_name = address or plat_plc or "선택 건물"

    monthly_energy = [
        schemas.MonthlyEnergyPoint(
            year=2024,
            month=month,
            target_electricity_kwh=0,
            target_gas_m3=0,
            peer_avg_electricity_kwh=0,
            peer_avg_gas_m3=0,
        )
        for month in range(1, 13)
    ]
    raw_analysis_json = {
        "building": {
            "id": building_id,
            "building_code": f"BUILDING-MASTER-{building_id or 'UNKNOWN'}",
            "name": display_name,
            "road_address": address,
            "jibun_address": plat_plc,
            "building_type": "building_master",
            "gross_floor_area": 0,
            "approval_year": 0,
            "floors": 0,
            "elevator_count": 0,
        },
        "energy_summary": {
            "target_avg_electricity_kwh": 0,
            "target_avg_gas_m3": 0,
            "peer_avg_electricity_kwh": 0,
            "peer_avg_gas_m3": 0,
            "electricity_ratio": 1,
            "gas_ratio": 1,
        },
        "analysis": {
            "peer_count": 0,
            "energy_waste_index": 100,
            "grade": "데이터 매핑 필요",
            "interpretation": "building_master 주소 후보는 선택되었지만 에너지 사용량 테이블과의 매핑은 아직 필요합니다.",
        },
    }

    return schemas.ReportResponse(
        building=raw_analysis_json["building"],
        energy_summary=raw_analysis_json["energy_summary"],
        analysis=raw_analysis_json["analysis"],
        monthly_energy=monthly_energy,
        report_text=(
            f"1. 한줄 진단: {display_name} 주소 후보가 선택되었습니다.\n"
            "2. 왜 이렇게 분석되었는지: 현재는 building_master 주소 검색 결과와 에너지 사용량 데이터의 매핑 단계가 필요합니다.\n"
            "3. 우선 실행 액션 3가지: 건물 식별자 매핑, 전기·가스 사용량 연결, 유사 건물군 기준 보정.\n"
            "4. 예상 관리 포인트: 실제 진단 수치는 에너지 데이터 연결 후 산출됩니다."
        ),
        raw_analysis_json=raw_analysis_json,
    )


def build_master_request_from_item(
    source_request: schemas.ReportRequest,
    item: Dict[str, Any],
) -> schemas.ReportRequest:
    return schemas.ReportRequest(
        building_id=item.get("building_id"),
        address=item.get("display_address") or source_request.address,
        plat_plc=item.get("plat_plc"),
        road_address=item.get("road_address"),
    )


def build_monthly_energy(
    target_records: List,
    peer_records_map: Dict[int, List],
) -> List[schemas.MonthlyEnergyPoint]:
    peer_records = [record for records in peer_records_map.values() for record in records]
    monthly_points: List[schemas.MonthlyEnergyPoint] = []

    for target in target_records:
        month_peers = [
            record
            for record in peer_records
            if record.year == target.year and record.month == target.month
        ]

        if month_peers:
            peer_electricity = round(
                sum(record.electricity_kwh for record in month_peers) / len(month_peers),
                2,
            )
            peer_gas = round(
                sum(record.gas_m3 for record in month_peers) / len(month_peers),
                2,
            )
        else:
            peer_electricity = target.electricity_kwh
            peer_gas = target.gas_m3

        monthly_points.append(
            schemas.MonthlyEnergyPoint(
                year=target.year,
                month=target.month,
                target_electricity_kwh=target.electricity_kwh,
                target_gas_m3=target.gas_m3,
                peer_avg_electricity_kwh=peer_electricity,
                peer_avg_gas_m3=peer_gas,
            )
        )

    return monthly_points


@router.post("/report", response_model=schemas.ReportResponse)
def create_report(request: schemas.ReportRequest, db: Session = Depends(get_db)) -> schemas.ReportResponse:
    if request.building_id or request.plat_plc or request.road_address:
        return build_master_fallback_report(request)

    try:
        building = crud.find_building_by_address(db, request.address)
    except SQLAlchemyError:
        db.rollback()
        building = None

    if not building:
        master_result = crud.search_building_master(db, query=request.address, page=1, limit=1)
        if master_result["items"]:
            return build_master_fallback_report(
                build_master_request_from_item(request, master_result["items"][0])
            )
        raise HTTPException(status_code=404, detail="해당 주소로 건물을 찾을 수 없습니다.")

    target_records = crud.get_energy_records_for_building(db, building.id)
    peer_buildings = find_peer_buildings(db, building)
    peer_records_map = {
        peer.id: crud.get_energy_records_for_building(db, peer.id) for peer in peer_buildings
    }

    target_summary = summarize_energy(target_records)
    peer_summary = summarize_peer_energy(peer_records_map)

    if not peer_buildings:
        peer_summary = target_summary.copy()

    analysis_result = calculate_energy_waste_index(target_summary, peer_summary)
    analysis_json = build_analysis_json(
        building=building,
        target_summary=target_summary,
        peer_summary=peer_summary,
        analysis_result=analysis_result,
        peer_count=len(peer_buildings),
    )
    report_text = generate_report_text(analysis_json)

    return schemas.ReportResponse(
        building=analysis_json["building"],
        energy_summary=analysis_json["energy_summary"],
        analysis=analysis_json["analysis"],
        monthly_energy=build_monthly_energy(target_records, peer_records_map),
        report_text=report_text,
        raw_analysis_json=analysis_json,
    )
