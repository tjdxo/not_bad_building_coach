import math
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

PEER_BENCHMARK_MONTHS: Tuple[Tuple[int, int], ...] = (
    (2024, 11),
    (2024, 12),
    (2025, 1),
    (2025, 2),
    (2025, 3),
    (2025, 4),
    (2025, 5),
    (2025, 6),
    (2025, 7),
    (2025, 8),
    (2025, 9),
    (2025, 10),
)


def _coerce_int(value: Any) -> int:
    if isinstance(value, str) and value.strip().lower() in {"", "none", "null", "nan"}:
        return 0
    try:
        return int(float(value))
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
    if isinstance(value, str) and value.strip().lower() in {"", "none", "null", "nan"}:
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(result) or math.isinf(result):
        return None
    return result


def _safe_float(value: Any) -> Optional[float]:
    return _coerce_float_or_none(value)


def _safe_int(value: Any) -> Optional[int]:
    return _coerce_int_or_none(value)


def _safe_bool(value: Any) -> bool:
    return _coerce_bool(value)


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


def _format_month_parts(year: int, month: int) -> Tuple[str, str]:
    return f"{year}-{month:02d}-01", f"{str(year)[2:]}.{month:02d}"


def _coerce_int_or_none(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, str) and value.strip().lower() in {"", "none", "null", "nan"}:
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _coerce_bool_or_none(value: Any) -> Optional[bool]:
    if value is None:
        return None
    if isinstance(value, str) and value.strip().lower() in {"", "none", "null", "nan"}:
        return None
    return _coerce_bool(value)


def _safe_string(value: Any) -> Optional[str]:
    if value is None:
        return None
    result = str(value).strip()
    if result.lower() in {"", "none", "null", "nan"}:
        return None
    return result


def _peer_status_label(vs_peer_pct: Optional[float]) -> Optional[str]:
    if vs_peer_pct is None:
        return None
    if vs_peer_pct >= 20:
        return "높음"
    if vs_peer_pct <= -20:
        return "낮음"
    return "평균권"


def _build_peer_metric(row: Dict[str, Any], prefix: str) -> Dict[str, Any]:
    vs_peer_pct = _coerce_float_or_none(row.get(f"{prefix}_vs_peer_pct"))
    return {
        "percentile": _coerce_float_or_none(row.get(f"{prefix}_percentile")),
        "target_per_area": _coerce_float_or_none(row.get(f"target_{prefix}_per_area")),
        "peer_mean_per_area": _coerce_float_or_none(row.get(f"peer_{prefix}_per_area_mean")),
        "peer_median_per_area": _coerce_float_or_none(row.get(f"peer_{prefix}_per_area_median")),
        "vs_peer_pct": vs_peer_pct,
        "vs_peer_median_pct": _coerce_float_or_none(row.get(f"{prefix}_vs_peer_median_pct")),
        "status_label": _peer_status_label(vs_peer_pct),
    }


def _build_peer_monthly_series(row: Dict[str, Any], prefix: str) -> List[Dict[str, Any]]:
    monthly = []
    for year, month in PEER_BENCHMARK_MONTHS:
        use_ym, label = _format_month_parts(year, month)
        monthly.append(
            {
                "use_ym": use_ym,
                "label": label,
                "value": _coerce_float_or_none(row.get(f"{prefix}_{year}_{month:02d}")),
            }
        )
    return monthly


def _build_peer_benchmark_response(row: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not row:
        return {
            "has_data": False,
            "message": "이 건물의 유사군 분석 결과가 아직 없습니다.",
        }

    peer_count = _coerce_int_or_none(row.get("peer_count"))
    peer_total_rank = _coerce_int_or_none(row.get("peer_total_rank"))
    peer_rank_label = None
    if peer_count and peer_count > 0 and peer_total_rank:
        peer_rank_label = f"{peer_total_rank} / {peer_count}"

    relative_grade = _safe_string(row.get("relative_grade_by_seoul_percentile"))
    relative_grade_source = "relative_grade_by_seoul_percentile" if relative_grade else None
    proxy_grade = _safe_string(row.get("appendix1_proxy_grade_by_current_peer_percentile"))
    if not relative_grade and proxy_grade:
        relative_grade = proxy_grade
        relative_grade_source = "appendix1_proxy_grade_by_current_peer_percentile"

    return {
        "has_data": True,
        "peer_count": peer_count,
        "peer_total_rank": peer_total_rank,
        "peer_best_building_id": _coerce_int_or_none(row.get("peer_best_building_id")),
        "peer_rank_label": peer_rank_label,
        "reliability_score": _coerce_float_or_none(row.get("reliability_score")),
        "reliability_label": _safe_string(row.get("reliability_label")),
        "reliability_reason": _safe_string(row.get("reliability_reason")),
        "result_quality": _safe_string(row.get("result_quality")),
        "energy_data_quality_detail": _safe_string(row.get("energy_data_quality_detail")),
        "data_source_type": _safe_string(row.get("data_source_type")),
        "diagnosis_type": _safe_string(row.get("diagnosis_type")),
        "peer_overuse_type": _safe_string(row.get("peer_overuse_type")),
        "electricity": _build_peer_metric(row, "elec"),
        "gas": _build_peer_metric(row, "gas"),
        "total": _build_peer_metric(row, "total"),
        "absolute_grade": {
            "grade_type": _safe_string(row.get("absolute_grade_type")),
            "area_band": _safe_string(row.get("absolute_area_band")),
            "energy_intensity": _coerce_float_or_none(row.get("absolute_energy_intensity")),
            "grade": _safe_string(row.get("absolute_grade")),
            "status": _safe_string(row.get("absolute_grade_status")),
            "seoul_grade_applicability": _safe_string(row.get("seoul_grade_applicability")),
            "threshold_A": _coerce_float_or_none(row.get("absolute_threshold_A")),
            "threshold_B": _coerce_float_or_none(row.get("absolute_threshold_B")),
            "threshold_C": _coerce_float_or_none(row.get("absolute_threshold_C")),
            "threshold_D": _coerce_float_or_none(row.get("absolute_threshold_D")),
        },
        "relative_grade": {
            "grade": relative_grade,
            "source": relative_grade_source,
            "relative_grade_by_seoul_percentile": _safe_string(row.get("relative_grade_by_seoul_percentile")),
            "appendix1_proxy_grade_by_current_peer_percentile": proxy_grade,
            "absolute_relative_grade_match": _coerce_bool_or_none(row.get("absolute_relative_grade_match")),
        },
        "peer_monthly": {
            "electricity_mean": _build_peer_monthly_series(row, "peer_elec_mean"),
            "gas_mean": _build_peer_monthly_series(row, "peer_gas_mean"),
        },
    }


def _monthly_values_by_use_ym(series: List[Dict[str, Any]]) -> Dict[str, Optional[float]]:
    return {item["use_ym"]: item.get("value") for item in series}


def _ratio_from_pct(vs_peer_pct: Optional[float], target_average: float, peer_average: float) -> float:
    if vs_peer_pct is not None:
        return round(1 + (vs_peer_pct / 100), 4)
    if peer_average > 0:
        return round(target_average / peer_average, 4)
    return 1


def _energy_waste_index_from_ratios(electricity_ratio: float, gas_ratio: float) -> float:
    ratios = [ratio for ratio in (electricity_ratio, gas_ratio) if ratio > 0]
    if not ratios:
        return 100
    return round((sum(ratios) / len(ratios)) * 100, 1)


def _peer_interpretation(peer_benchmark: Dict[str, Any], electricity_ratio: float, gas_ratio: float) -> str:
    if not peer_benchmark.get("has_data"):
        return "공공 에너지 사용량을 기준으로 진단했지만 유사군 비교 결과는 아직 연결되지 않았습니다."

    parts = []
    rank_label = peer_benchmark.get("peer_rank_label")
    if rank_label:
        parts.append(f"유사군 총 에너지 원단위 순위는 {rank_label}입니다.")

    relative_grade = (peer_benchmark.get("relative_grade") or {}).get("grade")
    absolute_grade = (peer_benchmark.get("absolute_grade") or {}).get("grade")
    if relative_grade or absolute_grade:
        grade_parts = []
        if absolute_grade:
            grade_parts.append(f"절대등급 {absolute_grade}")
        if relative_grade:
            grade_parts.append(f"상대등급 {relative_grade}")
        parts.append(", ".join(grade_parts) + "로 산정되었습니다.")

    electricity_gap = round((electricity_ratio - 1) * 100, 1)
    gas_gap = round((gas_ratio - 1) * 100, 1)
    parts.append(f"유사군 평균 대비 전기는 {electricity_gap:+.1f}%, 가스는 {gas_gap:+.1f}% 수준입니다.")

    return " ".join(parts)


def _build_energy_usage_report_text(
    building_name: str,
    peer_benchmark: Dict[str, Any],
    electricity_ratio: float,
    gas_ratio: float,
) -> str:
    if peer_benchmark.get("has_data"):
        rank = peer_benchmark.get("peer_rank_label") or "산정 가능"
        reliability = peer_benchmark.get("reliability_label") or "신뢰도 산정"
        overuse_type = peer_benchmark.get("peer_overuse_type") or "월별 사용량과 원단위"
        return (
            f"1. 한줄 진단: {building_name}의 최근 12개월 에너지 사용량과 유사군 벤치마크를 함께 확인했습니다.\n"
            f"2. 왜 이렇게 분석되었는지: 매핑된 유사군 기준 순위는 {rank}이며, 비교 신뢰도는 {reliability}입니다. "
            f"전기는 유사군 평균 대비 {(electricity_ratio - 1) * 100:+.1f}%, 가스는 {(gas_ratio - 1) * 100:+.1f}% 수준입니다.\n"
            f"3. 우선 실행 액션 3가지: {overuse_type} 점검, 피크 월 운영 조건 확인, 유사군 평균을 넘는 에너지 항목부터 개선.\n"
            "4. 예상 관리 포인트: 절대등급, 상대등급, 유사군 순위를 함께 보며 개선 우선순위를 정할 수 있습니다."
        )

    return (
        f"1. 한줄 진단: {building_name}의 최근 12개월 전기·가스 사용량 데이터를 확인했습니다.\n"
        "2. 왜 이렇게 분석되었는지: 현재 리포트는 energy_usage 테이블의 월별 전기·가스 사용량을 연결합니다.\n"
        "3. 우선 실행 액션 3가지: 월별 피크 확인, 계절별 사용량 비교, 고지서 데이터 보강.\n"
        "4. 예상 관리 포인트: 유사 건물 비교 데이터는 후속 연결이 필요합니다."
    )


def normalize_service_lite_row(row: Optional[Dict[str, Any]], prefix: str) -> Optional[Dict[str, Any]]:
    if not row:
        return None

    backend_has_result = _safe_bool(row.get(f"{prefix}_backend_has_result"))
    if not backend_has_result:
        return None

    return {
        "data_source_type": _safe_string(row.get(f"{prefix}_data_source_type")),
        "diagnosis_label": _safe_string(row.get(f"{prefix}_diagnosis_label")),
        "confidence_label": _safe_string(row.get(f"{prefix}_confidence_label")),
        "front_badge": _safe_string(row.get(f"{prefix}_front_badge")),
        "actual_kwh": _safe_float(row.get(f"{prefix}_actual_kwh")),
        "ai_pred_kwh": _safe_float(row.get(f"{prefix}_ai_pred_kwh")),
        "baseline_kwh": _safe_float(row.get(f"{prefix}_baseline_kwh")),
        "service_reference_kwh": _safe_float(row.get(f"{prefix}_service_reference_kwh")),
        "display_main_kwh": _safe_float(row.get(f"{prefix}_display_main_kwh")),
        "compare_pct": _safe_float(row.get(f"{prefix}_compare_pct")),
        "compare_basis": _safe_string(row.get(f"{prefix}_compare_basis")),
        "percentile": _safe_float(row.get(f"{prefix}_percentile")),
        "vs_peer_median_pct": _safe_float(row.get(f"{prefix}_vs_peer_median_pct")),
        "service_strategy": _safe_string(row.get(f"{prefix}_service_strategy")),
        "quality_flag": _safe_string(row.get(f"{prefix}_quality_flag")),
        "quality_reason": _safe_string(row.get(f"{prefix}_quality_reason")),
        "backend_has_result": backend_has_result,
        "backend_is_measured": _safe_bool(row.get(f"{prefix}_backend_is_measured")),
        "backend_is_estimated": _safe_bool(row.get(f"{prefix}_backend_is_estimated")),
        "backend_needs_user_input": _safe_bool(row.get(f"{prefix}_backend_needs_user_input")),
        "actual_per_area_year": _safe_float(row.get(f"{prefix}_actual_per_area_year")),
        "estimated_per_area_year": _safe_float(row.get(f"{prefix}_estimated_per_area_year")),
        "peer_reliability_score": _safe_float(row.get("peer_reliability_score")),
        "peer_reliability_label": _safe_string(row.get("peer_reliability_label")),
        "summary": _safe_string(row.get("summary_for_front")),
        "recommendation": _safe_string(row.get("recommendation_for_front")),
    }


def build_ai_diagnosis(
    electric_row: Optional[Dict[str, Any]],
    gas_row: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    electric = normalize_service_lite_row(electric_row, "electric")
    gas = normalize_service_lite_row(gas_row, "gas")
    has_electric = electric is not None
    has_gas = gas is not None
    needs_user_input = bool(
        (electric and electric.get("backend_needs_user_input"))
        or (gas and gas.get("backend_needs_user_input"))
    )
    return {
        "has_data": has_electric or has_gas,
        "mode": "estimated" if has_electric or has_gas else "none",
        "has_electric": has_electric,
        "has_gas": has_gas,
        "needs_user_input": needs_user_input,
        "electric": electric,
        "gas": gas,
    }


def _ai_display_value(diagnosis: Optional[Dict[str, Any]]) -> float:
    if not diagnosis:
        return 0
    for key in ("display_main_kwh", "service_reference_kwh", "ai_pred_kwh", "baseline_kwh", "actual_kwh"):
        value = diagnosis.get(key)
        if value is not None:
            return float(value)
    return 0


def _build_estimated_report_text(building_name: str, ai_diagnosis: Dict[str, Any]) -> str:
    parts = []
    electric = ai_diagnosis.get("electric")
    gas = ai_diagnosis.get("gas")
    if electric:
        parts.append(f"전기: {electric.get('diagnosis_label') or '참고용 진단'} / 신뢰도 {electric.get('confidence_label') or '산정 불가'}")
    if gas:
        parts.append(f"가스: {gas.get('diagnosis_label') or '참고용 진단'} / 신뢰도 {gas.get('confidence_label') or '산정 불가'}")
    summary = ", ".join(parts) if parts else "AI 추정 결과 없음"
    return (
        f"1. 한줄 진단: {building_name}은 실측 에너지 사용량이 부족해 AI 추정 기반 참고용 진단을 표시합니다.\n"
        f"2. 왜 이렇게 분석되었는지: {summary}. AI 예측값, 유사건물 baseline, 서비스 기준값을 함께 검토했습니다.\n"
        "3. 우선 실행 액션 3가지: 실제 고지서 확인, 전기·가스 사용량 직접 입력, 신뢰도 낮은 항목 우선 보정.\n"
        "4. 주의사항: 본 결과는 서울시 공식 등급이나 법적 효력을 갖는 인증 결과가 아닌 참고용 분석입니다."
    )


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
        report_mode="no_data",
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
    peer_benchmark_row: Optional[Dict[str, Any]] = None,
    electric_ai_row: Optional[Dict[str, Any]] = None,
    gas_ai_row: Optional[Dict[str, Any]] = None,
) -> schemas.ReportResponse:
    building = _master_building_info(building_item, fallback_address=request.address)
    peer_benchmark = _build_peer_benchmark_response(peer_benchmark_row)
    ai_diagnosis = build_ai_diagnosis(electric_ai_row, gas_ai_row)

    if not usage_rows:
        if ai_diagnosis.get("has_data"):
            electric_value = _ai_display_value(ai_diagnosis.get("electric"))
            gas_value = _ai_display_value(ai_diagnosis.get("gas"))
            energy_summary = {
                "target_avg_electricity_kwh": electric_value,
                "target_avg_gas_m3": gas_value,
                "peer_avg_electricity_kwh": _safe_float((ai_diagnosis.get("electric") or {}).get("baseline_kwh")) or electric_value,
                "peer_avg_gas_m3": _safe_float((ai_diagnosis.get("gas") or {}).get("baseline_kwh")) or gas_value,
                "electricity_ratio": 1,
                "gas_ratio": 1,
            }
            raw_analysis_json = {
                "building": building,
                "energy_source": "ai_estimated",
                "peer_benchmark": peer_benchmark,
                "ai_diagnosis": ai_diagnosis,
            }
            return schemas.ReportResponse(
                report_mode="estimated",
                message="실측 에너지 사용량이 없어 AI 추정 기반 참고용 진단을 표시합니다.",
                building=building,
                peer_group={
                    "rank": peer_benchmark.get("peer_total_rank"),
                    "total": peer_benchmark.get("peer_count"),
                    "label": peer_benchmark.get("peer_rank_label"),
                } if peer_benchmark.get("has_data") else None,
                energy_summary=energy_summary,
                analysis={
                    "peer_count": peer_benchmark.get("peer_count") or 0,
                    "energy_waste_index": 100,
                    "grade": "AI 추정 참고",
                    "interpretation": "실측 데이터가 부족해 AI 예측값, 유사건물 baseline, 서비스 기준값을 함께 보여주는 참고용 진단입니다.",
                },
                monthly_energy=[],
                report_text=_build_estimated_report_text(building["name"], ai_diagnosis),
                raw_analysis_json=raw_analysis_json,
                energy={
                    "source": "ai_placeholder",
                    "has_data": False,
                    "months_count": 0,
                    "period_start": None,
                    "period_end": None,
                    "is_estimated_included": True,
                    "is_estimated_gas_included": True,
                    "electricity_monthly": [],
                    "gas_monthly": [],
                },
                peer_benchmark=peer_benchmark,
                ai_diagnosis=ai_diagnosis,
            )

        return schemas.ReportResponse(
            status="energy_data_missing",
            report_mode="no_data",
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
            raw_analysis_json={
                "building": building,
                "energy_source": "none",
                "peer_benchmark": peer_benchmark,
            },
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
            peer_benchmark=peer_benchmark,
            ai_diagnosis=ai_diagnosis,
        )

    monthly_energy = []
    electricity_monthly = []
    gas_monthly = []
    electricity_values: List[Optional[float]] = []
    gas_values: List[Optional[float]] = []
    estimated_included = False
    estimated_gas_included = False
    peer_monthly = peer_benchmark.get("peer_monthly") if peer_benchmark.get("has_data") else {}
    peer_electricity_by_month = _monthly_values_by_use_ym(peer_monthly.get("electricity_mean", [])) if peer_monthly else {}
    peer_gas_by_month = _monthly_values_by_use_ym(peer_monthly.get("gas_mean", [])) if peer_monthly else {}
    ordered_usage_rows = sorted(usage_rows, key=lambda row: str(row.get("use_ym") or ""))
    for row in ordered_usage_rows:
        electricity_value = _coerce_float_or_none(row.get("elec_qty"))
        gas_value = _coerce_float_or_none(row.get("gas_qty"))
        year, month, use_ym, label = _format_use_ym(row.get("use_ym"))
        peer_electricity_value = peer_electricity_by_month.get(use_ym)
        peer_gas_value = peer_gas_by_month.get(use_ym)
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
                peer_avg_electricity_kwh=peer_electricity_value if peer_electricity_value is not None else 0,
                peer_avg_gas_m3=peer_gas_value if peer_gas_value is not None else 0,
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
    peer_electricity_values = list(peer_electricity_by_month.values())
    peer_gas_values = list(peer_gas_by_month.values())
    peer_avg_electricity = _average_present(peer_electricity_values)
    peer_avg_gas = _average_present(peer_gas_values)
    if peer_avg_electricity == 0:
        peer_avg_electricity = avg_electricity
    if peer_avg_gas == 0:
        peer_avg_gas = avg_gas
    electricity_ratio = _ratio_from_pct(
        peer_benchmark.get("electricity", {}).get("vs_peer_pct") if peer_benchmark.get("has_data") else None,
        avg_electricity,
        peer_avg_electricity,
    )
    gas_ratio = _ratio_from_pct(
        peer_benchmark.get("gas", {}).get("vs_peer_pct") if peer_benchmark.get("has_data") else None,
        avg_gas,
        peer_avg_gas,
    )
    absolute_grade = peer_benchmark.get("absolute_grade", {}) if peer_benchmark.get("has_data") else {}
    relative_grade = peer_benchmark.get("relative_grade", {}) if peer_benchmark.get("has_data") else {}
    analysis_grade = absolute_grade.get("grade") or relative_grade.get("grade") or "사용량 확인"
    energy_waste_index = _energy_waste_index_from_ratios(electricity_ratio, gas_ratio)
    interpretation = _peer_interpretation(peer_benchmark, electricity_ratio, gas_ratio)
    period_start = electricity_monthly[0].use_ym if electricity_monthly else None
    period_end = electricity_monthly[-1].use_ym if electricity_monthly else None
    raw_analysis_json = {
        "building": building,
        "energy_source": "db",
        "is_estimated_included": estimated_included,
        "is_estimated_gas_included": estimated_gas_included,
        "peer_benchmark": peer_benchmark,
        "ai_diagnosis": ai_diagnosis,
    }
    measured_ai_diagnosis = ai_diagnosis.copy()
    if measured_ai_diagnosis.get("has_data"):
        measured_ai_diagnosis["mode"] = "mixed"
    return schemas.ReportResponse(
        report_mode="mixed" if measured_ai_diagnosis.get("has_data") else "measured",
        building=building,
        peer_group={
            "rank": peer_benchmark.get("peer_total_rank"),
            "total": peer_benchmark.get("peer_count"),
            "label": peer_benchmark.get("peer_rank_label"),
        } if peer_benchmark.get("has_data") else None,
        energy_summary={
            "target_avg_electricity_kwh": avg_electricity,
            "target_avg_gas_m3": avg_gas,
            "peer_avg_electricity_kwh": peer_avg_electricity,
            "peer_avg_gas_m3": peer_avg_gas,
            "electricity_ratio": electricity_ratio,
            "gas_ratio": gas_ratio,
        },
        analysis={
            "peer_count": peer_benchmark.get("peer_count") or 0,
            "energy_waste_index": energy_waste_index,
            "grade": analysis_grade,
            "interpretation": interpretation,
        },
        monthly_energy=monthly_energy,
        report_text=_build_energy_usage_report_text(
            building["name"],
            peer_benchmark,
            electricity_ratio,
            gas_ratio,
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
        peer_benchmark=peer_benchmark,
        ai_diagnosis=measured_ai_diagnosis,
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
        peer_benchmark_row = crud.get_peer_benchmark_for_master_building(db, request.building_id)
        electric_ai_row = crud.get_electric_energy_service_lite_for_building(db, request.building_id)
        gas_ai_row = crud.get_gas_energy_service_lite_for_building(db, request.building_id)
        return build_energy_usage_report(
            request,
            building_item,
            usage_rows,
            peer_benchmark_row,
            electric_ai_row,
            gas_ai_row,
        )

    if request.plat_plc or request.road_address:
        return build_master_fallback_report(request)

    if not request.address.strip():
        raise HTTPException(status_code=400, detail="address 또는 building_id가 필요합니다.")

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
