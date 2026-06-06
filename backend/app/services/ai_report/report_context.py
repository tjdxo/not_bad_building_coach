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
    availability = build_energy_availability(
        [item["value"] for item in electricity_monthly],
        [item["value"] for item in gas_monthly],
    )

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
        "energy_availability": availability,
        "gas_unit_note": "energy_usage.gas_qty 원본 단위 기준입니다.",
    }


def classify_energy_availability(values: List[Optional[float]], label: str) -> Dict[str, Any]:
    total_months = len(values)
    numeric_values = [value for value in values if value is not None]
    positive_months = sum(1 for value in numeric_values if value and value > 0)
    zero_months = sum(1 for value in numeric_values if value == 0)
    measured_months = len(numeric_values)
    missing_months = max(0, total_months - measured_months)
    is_zero_confirmed = total_months >= 12 and measured_months >= 12 and zero_months >= 12
    has_data = positive_months > 0 or is_zero_confirmed
    compare_available = measured_months >= 9 and has_data
    if compare_available:
        status_label = "비교 가능"
    elif 3 <= measured_months <= 8 and has_data:
        status_label = "참고용"
    else:
        status_label = "데이터 부족"
    return {
        "has_data": has_data,
        "compare_available": compare_available,
        "measured_months": measured_months,
        "missing_months": missing_months,
        "zero_months": zero_months,
        "is_missing": not has_data or measured_months <= 2,
        "is_zero_confirmed": is_zero_confirmed,
        "status_label": status_label,
        "label": label,
    }


def build_energy_availability(
    electricity_values: List[Optional[float]],
    gas_values: List[Optional[float]],
) -> Dict[str, Any]:
    electricity = classify_energy_availability(electricity_values, "전기")
    gas = classify_energy_availability(gas_values, "가스")
    total_compare_available = electricity["compare_available"] and gas["compare_available"]
    missing_labels = [
        item["label"]
        for item in (electricity, gas)
        if item["is_missing"] or not item["compare_available"]
    ]
    limitation_message = None
    if missing_labels:
        limitation_message = "{0} 사용량 데이터가 부족하여 종합 등급과 원인 해석은 참고용으로만 봐야 합니다.".format(
            ", ".join(missing_labels)
        )
    return {
        "electricity": electricity,
        "gas": gas,
        "total": {
            "has_data": total_compare_available,
            "compare_available": total_compare_available,
            "measured_months": min(electricity["measured_months"], gas["measured_months"]),
            "missing_months": max(electricity["missing_months"], gas["missing_months"]),
            "zero_months": 0,
            "is_missing": not total_compare_available,
            "is_zero_confirmed": False,
            "status_label": "비교 가능" if total_compare_available else "산정 제한",
        },
        "has_partial_missing": electricity["is_missing"] != gas["is_missing"] or not total_compare_available,
        "limitation_message": limitation_message,
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


def relative_grade_from_percentile(percentile: Optional[float]) -> Optional[str]:
    if percentile is None:
        return None
    if percentile <= 20:
        return "A"
    if percentile <= 40:
        return "B"
    if percentile <= 60:
        return "C"
    if percentile <= 80:
        return "D"
    return "E"


def peer_basis_label(region: str) -> str:
    if region == "incheon":
        return "인천시 내 유사 건물군 기준"
    if region == "seoul":
        return "서울시 내 유사 건물군 기준"
    return "동일 지역 내 유사 건물군 기준"


def build_peer_context(row: Optional[Dict[str, Any]], region: str = "seoul") -> Dict[str, Any]:
    if not row:
        return {
            "has_data": False,
            "region": region,
            "region_name": crud.get_region_name(region),
            "peer_basis_label": peer_basis_label(region),
        }

    return {
        "has_data": True,
        "region": region,
        "region_name": crud.get_region_name(region),
        "peer_basis_label": peer_basis_label(region),
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


def build_grade_context(row: Optional[Dict[str, Any]], region: str = "seoul") -> Dict[str, Any]:
    if region == "incheon":
        reference_grade = relative_grade_from_percentile(safe_float((row or {}).get("total_percentile")))
        return {
            "absolute_grade": reference_grade,
            "absolute_grade_status": "seoul_reference",
            "absolute_grade_type": "서울 등급제 참고 기준",
            "absolute_energy_intensity": safe_float((row or {}).get("target_total_per_area")),
            "relative_grade": reference_grade,
            "relative_grade_basis": "인천시 내 유사 건물군 기준",
            "basis_caution": "인천 절대등급은 서울시 건물 에너지 등급제의 A~E 해석 체계를 참고해 적용한 자체 참고등급이며, 공식 인증 등급은 아닙니다. 동일 기준의 타 지역 확산 가능성을 검토할 수 있습니다.",
        }
    if not row:
        return {
            "basis_caution": "공식 등급 또는 법적 효력을 갖는 인증 결과가 아니라 참고용 진단 결과입니다.",
        }
    return {
        "absolute_grade": safe_string(row.get("absolute_grade")),
        "absolute_grade_status": safe_string(row.get("absolute_grade_status")),
        "seoul_grade_applicability": safe_string(row.get("seoul_grade_applicability")),
        "absolute_grade_type": safe_string(row.get("absolute_grade_type")),
        "absolute_energy_intensity": safe_float(row.get("absolute_energy_intensity")),
        "relative_grade": safe_string(row.get("relative_grade_by_seoul_percentile"))
        or safe_string(row.get("appendix1_proxy_grade_by_current_peer_percentile")),
        "relative_grade_basis": "서울시 내 유사 건물군 기준",
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

    region = crud.detect_region_from_building(building)
    region_name = crud.get_region_name(region)
    usage_rows = crud.get_energy_usage_for_master_building(db, building_id)
    peer_row = crud.get_peer_benchmark_for_master_building(db, building_id, region=region)
    electric_row = crud.get_electric_energy_service_lite_for_building(db, building_id, region=region)
    gas_row = crud.get_gas_energy_service_lite_for_building(db, building_id, region=region)
    ai_estimate = build_ai_estimate(electric_row, gas_row)
    report_mode = report_mode_from_data(usage_rows, ai_estimate)
    energy_context = measured_energy_summary(usage_rows)
    saving_estimate = build_saving_estimate(
        db,
        usage_rows,
        peer_row,
        energy_context.get("period_start"),
        energy_context.get("period_end"),
        energy_availability=energy_context.get("energy_availability"),
    )

    context = {
        "building": {
            "building_id": building.get("building_id"),
            "region": region,
            "region_name": region_name,
            "sgg_cd_nm": building.get("sgg_cd_nm"),
            "bjd_cd_nm": building.get("bjd_cd_nm"),
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
        "region": region,
        "region_name": region_name,
        "report_audience": report_audience,
        "energy": energy_context,
        "energy_availability": energy_context.get("energy_availability"),
        "peer_benchmark": build_peer_context(peer_row, region),
        "grades": build_grade_context(peer_row, region),
        "ai_estimate": ai_estimate,
        "saving_estimate": saving_estimate,
        "user_answers": user_answers or {},
        "contractor_categories": CONTRACTOR_CATEGORIES,
        "report_rules": {
            "legal_effect": "본 제공 데이터는 법적 효력을 가지지 않으며, 단순 참고용으로만 활용해 주세요.",
            "official_grade_caution": (
                "인천 참고 절대등급은 서울 등급제 해석 체계를 참고한 자체 참고등급이며, 공식 인증 또는 지원사업 선정 결과를 의미하지 않습니다."
                if region == "incheon"
                else "서울시 공식 등급, 인증, 지원사업 선정 결과를 의미하지 않습니다."
            ),
            "regional_basis": (
                "인천광역시 건물 공공데이터와 동일 지역 내 유사 건물군 비교를 기반으로 한 참고용 결과입니다."
                if region == "incheon"
                else "서울시 건물 공공데이터와 서울시 내 유사 건물군 비교를 기반으로 한 참고용 결과입니다."
            ),
            "policy_basis": (
                "인천 건물은 인천광역시 지원사업과 전국 공통 사업 후보를 검토 가능 또는 추가 확인 필요 톤으로 표현합니다."
                if region == "incheon"
                else "서울시 및 전국 공통 에너지 지원사업 기준으로 표현합니다."
            ),
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
