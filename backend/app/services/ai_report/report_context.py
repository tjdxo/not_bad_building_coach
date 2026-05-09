import math
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app import crud
from app.services.ai_report.policy_candidates import CONTRACTOR_CATEGORIES
from app.services.ai_report.policy_matcher import match_policies
from app.services.saving_estimate import build_saving_estimate


def safe_float(value: Any) -> Optional[float]:
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


def safe_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, str) and value.strip().lower() in {"", "none", "null", "nan"}:
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def safe_bool(value: Any) -> Optional[bool]:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"", "none", "null", "nan"}:
            return None
        if normalized in {"1", "true", "t", "y", "yes", "on"}:
            return True
        if normalized in {"0", "false", "f", "n", "no", "off"}:
            return False
    return None


def safe_string(value: Any) -> Optional[str]:
    if value is None:
        return None
    result = str(value).strip()
    if result.lower() in {"", "none", "null", "nan"}:
        return None
    return result


def format_date_value(value: Any) -> Optional[str]:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return safe_string(value)


def normalize_service_lite_row(row: Optional[Dict[str, Any]], prefix: str) -> Optional[Dict[str, Any]]:
    if not row:
        return None

    backend_has_result = safe_bool(row.get("{0}_backend_has_result".format(prefix)))
    if backend_has_result is False:
        return None

    return {
        "data_source_type": safe_string(row.get("{0}_data_source_type".format(prefix))),
        "diagnosis_label": safe_string(row.get("{0}_diagnosis_label".format(prefix))),
        "confidence_label": safe_string(row.get("{0}_confidence_label".format(prefix))),
        "front_badge": safe_string(row.get("{0}_front_badge".format(prefix))),
        "actual_kwh": safe_float(row.get("{0}_actual_kwh".format(prefix))),
        "ai_pred_kwh": safe_float(row.get("{0}_ai_pred_kwh".format(prefix))),
        "baseline_kwh": safe_float(row.get("{0}_baseline_kwh".format(prefix))),
        "service_reference_kwh": safe_float(row.get("{0}_service_reference_kwh".format(prefix))),
        "display_main_kwh": safe_float(row.get("{0}_display_main_kwh".format(prefix))),
        "compare_pct": safe_float(row.get("{0}_compare_pct".format(prefix))),
        "compare_basis": safe_string(row.get("{0}_compare_basis".format(prefix))),
        "percentile": safe_float(row.get("{0}_percentile".format(prefix))),
        "vs_peer_median_pct": safe_float(row.get("{0}_vs_peer_median_pct".format(prefix))),
        "service_strategy": safe_string(row.get("{0}_service_strategy".format(prefix))),
        "quality_flag": safe_string(row.get("{0}_quality_flag".format(prefix))),
        "quality_reason": safe_string(row.get("{0}_quality_reason".format(prefix))),
        "backend_has_result": bool(backend_has_result),
        "backend_is_measured": safe_bool(row.get("{0}_backend_is_measured".format(prefix))),
        "backend_is_estimated": safe_bool(row.get("{0}_backend_is_estimated".format(prefix))),
        "backend_needs_user_input": safe_bool(row.get("{0}_backend_needs_user_input".format(prefix))),
        "actual_per_area_year": safe_float(row.get("{0}_actual_per_area_year".format(prefix))),
        "estimated_per_area_year": safe_float(row.get("{0}_estimated_per_area_year".format(prefix))),
        "peer_reliability_score": safe_float(row.get("peer_reliability_score")),
        "peer_reliability_label": safe_string(row.get("peer_reliability_label")),
        "summary": safe_string(row.get("summary_for_front")),
        "recommendation": safe_string(row.get("recommendation_for_front")),
    }


def build_ai_estimate(electric_row: Optional[Dict[str, Any]], gas_row: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    electric = normalize_service_lite_row(electric_row, "electric")
    gas = normalize_service_lite_row(gas_row, "gas")
    return {
        "has_data": bool(electric or gas),
        "electric": electric,
        "gas": gas,
    }


def measured_energy_summary(usage_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    electricity_monthly = []
    gas_monthly = []
    elec_total = 0.0
    gas_total = 0.0
    elec_has = False
    gas_has = False

    for row in usage_rows:
        use_ym = format_date_value(row.get("use_ym"))
        elec = safe_float(row.get("elec_qty"))
        gas = safe_float(row.get("gas_qty"))
        electricity_monthly.append({"use_ym": use_ym, "value": elec})
        gas_monthly.append({"use_ym": use_ym, "value": gas})
        if elec is not None:
            elec_total += elec
            elec_has = True
        if gas is not None:
            gas_total += gas
            gas_has = True

    period_start = format_date_value(usage_rows[0].get("use_ym")) if usage_rows else None
    period_end = format_date_value(usage_rows[-1].get("use_ym")) if usage_rows else None

    return {
        "has_measured_data": bool(elec_has or gas_has),
        "months_count": len(usage_rows),
        "period_start": period_start,
        "period_end": period_end,
        "electricity_annual_kwh": round(elec_total, 2) if elec_has else None,
        "gas_annual_source_value": round(gas_total, 2) if gas_has else None,
        "total_annual_source_value": round(elec_total + gas_total, 2) if (elec_has or gas_has) else None,
        "electricity_monthly": electricity_monthly,
        "gas_monthly": gas_monthly,
        "gas_unit_note": "energy_usage.gas_qty 원본 단위 기준입니다.",
    }


def report_mode_from_data(usage_rows: List[Dict[str, Any]], ai_estimate: Dict[str, Any]) -> str:
    has_measured = measured_energy_summary(usage_rows).get("has_measured_data")
    has_ai = ai_estimate.get("has_data")
    if has_measured and has_ai:
        return "mixed"
    if has_measured:
        return "measured"
    if has_ai:
        return "estimated"
    return "no_data"


def build_peer_context(row: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not row:
        return {"has_data": False}

    return {
        "has_data": True,
        "peer_count": safe_int(row.get("peer_count")),
        "peer_total_rank": safe_int(row.get("peer_total_rank")),
        "reliability_score": safe_float(row.get("reliability_score")),
        "reliability_label": safe_string(row.get("reliability_label")),
        "electric_vs_peer_pct": safe_float(row.get("elec_vs_peer_pct")),
        "gas_vs_peer_pct": safe_float(row.get("gas_vs_peer_pct")),
        "total_vs_peer_pct": safe_float(row.get("total_vs_peer_pct")),
        "electric_percentile": safe_float(row.get("elec_percentile")),
        "gas_percentile": safe_float(row.get("gas_percentile")),
        "total_percentile": safe_float(row.get("total_percentile")),
        "peer_overuse_type": safe_string(row.get("peer_overuse_type")),
    }


def build_grade_context(row: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not row:
        return {}
    return {
        "absolute_grade": safe_string(row.get("absolute_grade")),
        "absolute_grade_status": safe_string(row.get("absolute_grade_status")),
        "seoul_grade_applicability": safe_string(row.get("seoul_grade_applicability")),
        "absolute_grade_type": safe_string(row.get("absolute_grade_type")),
        "absolute_energy_intensity": safe_float(row.get("absolute_energy_intensity")),
        "relative_grade": safe_string(row.get("relative_grade_by_seoul_percentile"))
        or safe_string(row.get("appendix1_proxy_grade_by_current_peer_percentile")),
        "basis_caution": "서울시 공식 등급 또는 법적 효력을 갖는 인증 결과가 아니라 참고용 진단 결과입니다.",
    }


def build_ai_report_context(
    db: Session,
    building_id: Any,
    user_answers: Optional[Dict[str, Any]] = None,
    report_audience: str = "building_owner",
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    building = crud.get_building_master_by_id(db, building_id)
    if not building:
        return None, "not_found"

    usage_rows = crud.get_energy_usage_for_master_building(db, building_id)
    peer_row = crud.get_peer_benchmark_for_master_building(db, building_id)
    electric_row = crud.get_electric_energy_service_lite_for_building(db, building_id)
    gas_row = crud.get_gas_energy_service_lite_for_building(db, building_id)
    ai_estimate = build_ai_estimate(electric_row, gas_row)
    report_mode = report_mode_from_data(usage_rows, ai_estimate)
    energy_context = measured_energy_summary(usage_rows)
    saving_estimate = build_saving_estimate(
        db,
        usage_rows,
        peer_row,
        energy_context.get("period_start"),
        energy_context.get("period_end"),
    )

    context = {
        "building": {
            "building_id": building.get("building_id"),
            "address": building.get("display_address"),
            "road_address": building.get("road_address"),
            "jibun_address": building.get("plat_plc"),
            "purpose": building.get("main_purpose") or building.get("purp_nm") or building.get("bld_nm"),
            "purp_nm": building.get("purp_nm"),
            "main_purpose": building.get("main_purpose"),
            "use_apr_day": building.get("use_apr_day"),
            "area_m2": safe_float(building.get("grs_ar")),
            "floor": safe_int(building.get("agnd_flr")),
            "approval_year": safe_int(building.get("approval_year")),
            "is_district_heating": safe_bool(building.get("is_district_heating")),
        },
        "report_mode": report_mode,
        "report_audience": report_audience,
        "energy": energy_context,
        "peer_benchmark": build_peer_context(peer_row),
        "grades": build_grade_context(peer_row),
        "ai_estimate": ai_estimate,
        "saving_estimate": saving_estimate,
        "user_answers": user_answers or {},
        "contractor_categories": CONTRACTOR_CATEGORIES,
        "report_rules": {
            "legal_effect": "본 제공 데이터는 법적 효력을 가지지 않으며, 단순 참고용으로만 활용해 주세요.",
            "official_grade_caution": "서울시 공식 등급, 인증, 지원사업 선정 결과를 의미하지 않습니다.",
        },
    }
    context.update(
        match_policies(
            context["building"],
            context["energy"],
            context["peer_benchmark"],
            context["ai_estimate"],
            user_answers or {},
        )
    )
    return context, None
