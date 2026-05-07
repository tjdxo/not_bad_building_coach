from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

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


def _coerce_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "t", "y", "yes", "o", "예", "추정"}
    return False


def _coerce_float_or_none(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _average_present(values: List[Optional[float]]) -> float:
    present_values = [value for value in values if value is not None]
    return round(sum(present_values) / len(present_values), 2) if present_values else 0


def _format_use_ym(value: Any) -> Tuple[int, int, str, str]:
    if isinstance(value, datetime):
        year = value.year
        month = value.month
        use_ym = value.date().isoformat()
    elif isinstance(value, date):
        year = value.year
        month = value.month
        use_ym = value.isoformat()
    else:
        raw = str(value)
        year = int(raw[0:4])
        month = int(raw[5:7])
        use_ym = raw[0:10]
    return year, month, use_ym, f"{str(year)[2:]}.{month:02d}"


def _master_building_info(item: Dict[str, Any], fallback_address: str = "") -> Dict[str, Any]:
    display_address = item.get("display_address") or item.get("road_address") or item.get("plat_plc") or fallback_address
    building_id = _coerce_int(item.get("building_id"))
    return {
        "id": building_id,
        "building_id": item.get("building_id"),
        "building_code": f"BUILDING-MASTER-{building_id or 'UNKNOWN'}",
        "name": item.get("bld_nm") or display_address or "선택 건물",
        "road_address": item.get("road_address") or display_address or "",
        "jibun_address": item.get("plat_plc") or fallback_address or "",
        "building_type": "building_master",
        "gross_floor_area": float(item.get("grs_ar") or 0),
        "approval_year": 0,
        "floors": int(item.get("agnd_flr") or 0),
        "elevator_count": 0,
        "display_address": display_address,
        "plat_plc": item.get("plat_plc"),
        "bld_nm": item.get("bld_nm"),
        "dong_nm": item.get("dong_nm"),
        "grs_ar": item.get("grs_ar"),
        "agnd_flr": item.get("agnd_flr"),
    }


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
        "building": _master_building_info(
            {
                "building_id": request.building_id,
                "display_address": display_name,
                "road_address": request.road_address,
                "plat_plc": request.plat_plc,
                "bld_nm": request.bld_nm,
                "dong_nm": request.dong_nm,
                "grs_ar": request.grs_ar,
                "agnd_flr": request.agnd_flr,
            },
            fallback_address=request.address,
        ),
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
        bld_nm=item.get("bld_nm"),
        dong_nm=item.get("dong_nm"),
        grs_ar=item.get("grs_ar"),
        agnd_flr=item.get("agnd_flr"),
    )


def build_energy_usage_report(
    request: schemas.ReportRequest,
    building_item: Dict[str, Any],
    usage_rows: List[Dict[str, Any]],
) -> schemas.ReportResponse:
    building = _master_building_info(building_item, fallback_address=request.address)

    if not usage_rows:
        return schemas.ReportResponse(
            status="energy_data_missing",
            message="선택한 건물의 공공 에너지 사용량 데이터가 없습니다.",
            building=building,
            energy_summary={
                "target_avg_electricity_kwh": 0,
                "target_avg_gas_m3": 0,
                "peer_avg_electricity_kwh": 0,
                "peer_avg_gas_m3": 0,
                "electricity_ratio": 1,
                "gas_ratio": 1,
            },
            analysis={
                "peer_count": 0,
                "energy_waste_index": 0,
                "grade": "데이터 없음",
                "interpretation": "선택한 건물은 현재 공공 에너지 사용량 데이터와 직접 매칭되지 않았습니다.",
            },
            monthly_energy=[],
            report_text="선택한 건물의 공공 에너지 사용량 데이터가 없습니다.",
            raw_analysis_json={"building": building, "energy_source": "none"},
            energy={
                "source": "none",
                "has_data": False,
                "months_count": 0,
                "period_start": None,
                "period_end": None,
                "is_estimated_included": False,
                "is_estimated_gas_included": False,
                "electricity_monthly": [],
                "gas_monthly": [],
            },
        )

    monthly_energy = []
    electricity_monthly = []
    gas_monthly = []
    electricity_values: List[Optional[float]] = []
    gas_values: List[Optional[float]] = []
    estimated_included = False
    estimated_gas_included = False
    ordered_usage_rows = sorted(usage_rows, key=lambda row: str(row.get("use_ym") or ""))
    for row in ordered_usage_rows:
        electricity_value = _coerce_float_or_none(row.get("elec_qty"))
        gas_value = _coerce_float_or_none(row.get("gas_qty"))
        year, month, use_ym, label = _format_use_ym(row.get("use_ym"))
        is_estimated = _coerce_bool(row.get("is_estimated"))
        is_estimated_gas = _coerce_bool(row.get("is_estimated_gas"))
        estimated_included = estimated_included or is_estimated
        estimated_gas_included = estimated_gas_included or is_estimated_gas
        electricity_values.append(electricity_value)
        gas_values.append(gas_value)
        monthly_energy.append(
            schemas.MonthlyEnergyPoint(
                year=year,
                month=month,
                use_ym=use_ym,
                label=label,
                is_estimated=is_estimated,
                target_electricity_kwh=electricity_value if electricity_value is not None else 0,
                target_gas_m3=gas_value if gas_value is not None else 0,
                peer_avg_electricity_kwh=electricity_value if electricity_value is not None else 0,
                peer_avg_gas_m3=gas_value if gas_value is not None else 0,
            )
        )
        electricity_monthly.append(
            schemas.EnergyUsageMonthlyPoint(
                use_ym=use_ym,
                label=label,
                value=electricity_value,
                is_estimated=is_estimated,
            )
        )
        gas_monthly.append(
            schemas.EnergyUsageMonthlyPoint(
                use_ym=use_ym,
                label=label,
                value=gas_value,
                is_estimated=is_estimated_gas,
            )
        )

    avg_electricity = _average_present(electricity_values)
    avg_gas = _average_present(gas_values)
    period_start = electricity_monthly[0].use_ym if electricity_monthly else None
    period_end = electricity_monthly[-1].use_ym if electricity_monthly else None
    raw_analysis_json = {
        "building": building,
        "energy_source": "db",
        "is_estimated_included": estimated_included,
        "is_estimated_gas_included": estimated_gas_included,
    }
    return schemas.ReportResponse(
        building=building,
        energy_summary={
            "target_avg_electricity_kwh": avg_electricity,
            "target_avg_gas_m3": avg_gas,
            "peer_avg_electricity_kwh": avg_electricity,
            "peer_avg_gas_m3": avg_gas,
            "electricity_ratio": 1,
            "gas_ratio": 1,
        },
        analysis={
            "peer_count": 0,
            "energy_waste_index": 100,
            "grade": "사용량 확인",
            "interpretation": "energy_usage 테이블의 월별 전기·가스 사용량을 기준으로 표시합니다.",
        },
        monthly_energy=monthly_energy,
        report_text=(
            f"1. 한줄 진단: {building['name']}의 최근 12개월 전기·가스 사용량 데이터를 확인했습니다.\n"
            "2. 왜 이렇게 분석되었는지: 현재 리포트는 energy_usage 테이블의 월별 전기·가스 사용량을 연결합니다.\n"
            "3. 우선 실행 액션 3가지: 월별 피크 확인, 계절별 사용량 비교, 고지서 데이터 보강.\n"
            "4. 예상 관리 포인트: 유사 건물 비교 데이터는 후속 연결이 필요합니다."
        ),
        raw_analysis_json=raw_analysis_json,
        energy={
            "source": "db",
            "has_data": True,
            "months_count": len(monthly_energy),
            "period_start": period_start,
            "period_end": period_end,
            "is_estimated_included": estimated_included,
            "is_estimated_gas_included": estimated_gas_included,
            "electricity_monthly": electricity_monthly,
            "gas_monthly": gas_monthly,
        },
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
    if request.building_id:
        building_item = crud.get_building_master_by_id(db, request.building_id)
        if not building_item:
            building_item = {
                "building_id": request.building_id,
                "display_address": request.road_address or request.address,
                "road_address": request.road_address,
                "plat_plc": request.plat_plc,
                "bld_nm": request.bld_nm,
                "dong_nm": request.dong_nm,
                "grs_ar": request.grs_ar,
                "agnd_flr": request.agnd_flr,
            }
        usage_rows = crud.get_energy_usage_for_master_building(db, request.building_id)
        return build_energy_usage_report(request, building_item, usage_rows)

    if request.plat_plc or request.road_address:
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
