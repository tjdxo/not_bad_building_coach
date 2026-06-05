import math
import os
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app import crud

PEER_BENCHMARK_MONTHS = (
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

DEFAULT_ELECTRICITY_UNIT_PRICE = 180.0
DEFAULT_GAS_UNIT_PRICE = 120.0

SAVING_ESTIMATE_TITLE = "유사군 상위 10% 기준 예상 절약액"
SAVING_ESTIMATE_CAUTION = (
    "본 금액은 유사군 상위권 기준과 평균 단가를 활용한 참고용 추정액이며, "
    "실제 요금은 계약종별, 계절, 기본요금, 부가세, 지역별 도시가스 요금 등에 따라 달라질 수 있습니다."
)


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
    number = safe_float(value)
    if number is None:
        return None
    return int(number)


def _env_float(name: str, default: float) -> float:
    value = safe_float(os.getenv(name))
    return value if value is not None and value > 0 else default


def get_electricity_unit_price() -> float:
    return _env_float("ELECTRICITY_UNIT_PRICE_KRW_PER_KWH", DEFAULT_ELECTRICITY_UNIT_PRICE)


def get_gas_unit_price() -> float:
    return _env_float("GAS_UNIT_PRICE_KRW_PER_KWH", DEFAULT_GAS_UNIT_PRICE)


def estimate_electricity_cost_krw(kwh: Optional[float], unit_price: Optional[float] = None) -> int:
    if not kwh or kwh <= 0:
        return 0
    price = unit_price if unit_price is not None else get_electricity_unit_price()
    return int(round(kwh * price))


def estimate_gas_cost_krw(kwh: Optional[float], unit_price: Optional[float] = None) -> int:
    if not kwh or kwh <= 0:
        return 0
    price = unit_price if unit_price is not None else get_gas_unit_price()
    return int(round(kwh * price))


def _sum_usage(rows: List[Dict[str, Any]], field: str) -> Optional[float]:
    total = 0.0
    has_value = False
    for row in rows:
        value = safe_float(row.get(field))
        if value is not None:
            total += value
            has_value = True
    return total if has_value else None


def _sum_peer_monthly(row: Optional[Dict[str, Any]], prefix: str) -> Optional[float]:
    if not row:
        return None
    total = 0.0
    has_value = False
    for year, month in _peer_months_from_row(row, prefix):
        value = safe_float(row.get("{0}_{1}_{2:02d}".format(prefix, year, month)))
        if value is not None:
            total += value
            has_value = True
    return total if has_value else None


def _peer_months_from_row(row: Dict[str, Any], prefix: str) -> Tuple[Tuple[int, int], ...]:
    marker = f"{prefix}_"
    months = set()
    for key in row.keys():
        if not str(key).startswith(marker):
            continue
        suffix = str(key)[len(marker):]
        parts = suffix.rsplit("_", 1)
        if len(parts) != 2:
            continue
        year_raw, month_raw = parts
        if not (year_raw.isdigit() and month_raw.isdigit()):
            continue
        year = int(year_raw)
        month = int(month_raw)
        if 1 <= month <= 12:
            months.add((year, month))
    return tuple(sorted(months)) or PEER_BENCHMARK_MONTHS


def _first_positive(row: Optional[Dict[str, Any]], keys: Tuple[str, ...]) -> Optional[float]:
    if not row:
        return None
    for key in keys:
        value = safe_float(row.get(key))
        if value is not None and value > 0:
            return value
    return None


def _best_based_target(peer_best_usage: Optional[float], peer_mean_usage: Optional[float]) -> Optional[float]:
    if peer_best_usage is None or peer_mean_usage is None:
        return None
    if peer_best_usage <= 0 or peer_mean_usage <= 0:
        return None
    if peer_best_usage > peer_mean_usage:
        return None
    return peer_best_usage + (peer_mean_usage - peer_best_usage) * 0.30


def _mean_based_target(peer_mean_usage: Optional[float]) -> Optional[float]:
    if peer_mean_usage is None or peer_mean_usage <= 0:
        return None
    return peer_mean_usage * 0.85


def _build_energy_saving_item(
    unit: str,
    my_annual_usage: Optional[float],
    peer_mean_annual_usage: Optional[float],
    peer_best_annual_usage: Optional[float],
    exact_target_annual_usage: Optional[float],
    unit_price: float,
    cost_fn,
) -> Dict[str, Any]:
    target = None
    benchmark_type = "not_available"

    if exact_target_annual_usage is not None and exact_target_annual_usage > 0:
        target = exact_target_annual_usage
        benchmark_type = "peer_top10_exact"
    else:
        target = _best_based_target(peer_best_annual_usage, peer_mean_annual_usage)
        if target is not None:
            benchmark_type = "estimated_from_best_and_mean"
        else:
            target = _mean_based_target(peer_mean_annual_usage)
            if target is not None:
                benchmark_type = "estimated_from_peer_mean"

    saving_usage = 0.0
    saving_krw = 0
    available = my_annual_usage is not None and my_annual_usage > 0 and target is not None
    if available:
        saving_usage = max(0.0, my_annual_usage - target)
        saving_krw = cost_fn(saving_usage, unit_price)

    return {
        "available": available,
        "unit": unit,
        "benchmark_type": benchmark_type,
        "my_annual_usage": round(my_annual_usage, 2) if my_annual_usage is not None else None,
        "peer_mean_annual_usage": round(peer_mean_annual_usage, 2) if peer_mean_annual_usage is not None else None,
        "peer_best_annual_usage": round(peer_best_annual_usage, 2) if peer_best_annual_usage is not None else None,
        "target_annual_usage": round(target, 2) if target is not None else None,
        "saving_usage": round(saving_usage, 2),
        "saving_krw": saving_krw,
    }


def build_saving_estimate(
    db: Optional[Session],
    usage_rows: List[Dict[str, Any]],
    peer_row: Optional[Dict[str, Any]],
    period_start: Optional[str],
    period_end: Optional[str],
) -> Dict[str, Any]:
    electricity_unit_price = get_electricity_unit_price()
    gas_unit_price = get_gas_unit_price()

    if not usage_rows or not peer_row:
        return {
            "available": False,
            "benchmark_type": "not_available",
            "reason": "유사군 평균 또는 내 에너지 사용량이 부족해 예상 절약액을 산정할 수 없습니다.",
            "title": SAVING_ESTIMATE_TITLE,
            "caution": SAVING_ESTIMATE_CAUTION,
            "unit_price": {
                "electricity_krw_per_kwh": electricity_unit_price,
                "gas_krw_per_kwh": gas_unit_price,
                "gas_krw_per_m3": gas_unit_price,
            },
        }

    my_elec = _sum_usage(usage_rows, "elec_qty")
    my_gas = _sum_usage(usage_rows, "gas_qty")
    peer_mean_elec = _sum_peer_monthly(peer_row, "peer_elec_mean")
    peer_mean_gas = _sum_peer_monthly(peer_row, "peer_gas_mean")

    exact_elec_target = _first_positive(
        peer_row,
        ("peer_elec_top10_annual_kwh", "peer_elec_p10_annual_kwh"),
    )
    exact_gas_target = _first_positive(
        peer_row,
        ("peer_gas_top10_annual_kwh", "peer_gas_p10_annual_kwh", "peer_gas_top10_annual_m3", "peer_gas_p10_annual_m3"),
    )

    peer_best_elec = None
    peer_best_gas = None
    peer_best_building_id = safe_int(peer_row.get("peer_best_building_id"))
    if db is not None and peer_best_building_id:
        best_usage = crud.get_energy_usage_sum_for_period(db, peer_best_building_id, period_start, period_end)
        peer_best_elec = safe_float(best_usage.get("elec_qty"))
        peer_best_gas = safe_float(best_usage.get("gas_qty"))

    electricity = _build_energy_saving_item(
        "kWh",
        my_elec,
        peer_mean_elec,
        peer_best_elec,
        exact_elec_target,
        electricity_unit_price,
        estimate_electricity_cost_krw,
    )
    gas = _build_energy_saving_item(
        "kWh",
        my_gas,
        peer_mean_gas,
        peer_best_gas,
        exact_gas_target,
        gas_unit_price,
        estimate_gas_cost_krw,
    )

    benchmark_types = [item["benchmark_type"] for item in (electricity, gas) if item.get("available")]
    if "peer_top10_exact" in benchmark_types:
        benchmark_type = "peer_top10_exact"
    elif "estimated_from_best_and_mean" in benchmark_types:
        benchmark_type = "estimated_from_best_and_mean"
    elif "estimated_from_peer_mean" in benchmark_types:
        benchmark_type = "estimated_from_peer_mean"
    else:
        benchmark_type = "not_available"

    total_saving = int(electricity.get("saving_krw") or 0) + int(gas.get("saving_krw") or 0)
    available = electricity.get("available") or gas.get("available")
    reason = None
    if not available:
        reason = "유사군 평균 또는 우수건물 사용량이 부족해 예상 절약액을 산정할 수 없습니다."

    return {
        "available": bool(available),
        "title": SAVING_ESTIMATE_TITLE,
        "benchmark_type": benchmark_type,
        "unit_price": {
            "electricity_krw_per_kwh": electricity_unit_price,
            "gas_krw_per_kwh": gas_unit_price,
            "gas_krw_per_m3": gas_unit_price,
        },
        "electricity": electricity,
        "gas": gas,
        "total": {
            "saving_krw": total_saving,
        },
        "reason": reason,
        "caution": SAVING_ESTIMATE_CAUTION,
    }
