from __future__ import annotations

from typing import Any, Dict, Iterable, List, Union

from app.models import Building, BuildingEnergyMonthly


def _safe_average(values: List[float]) -> float:
    if not values:
        return 0.0
    return round(sum(values) / len(values), 2)


def summarize_energy(records: Iterable[BuildingEnergyMonthly]) -> Dict[str, float]:
    record_list = list(records)
    electricity_values = [record.electricity_kwh for record in record_list]
    gas_values = [record.gas_m3 for record in record_list]

    return {
        "avg_electricity_kwh": _safe_average(electricity_values),
        "avg_gas_m3": _safe_average(gas_values),
    }


def summarize_peer_energy(peer_records_map: Dict[int, List[BuildingEnergyMonthly]]) -> Dict[str, float]:
    electricity_values: List[float] = []
    gas_values: List[float] = []

    for records in peer_records_map.values():
        summary = summarize_energy(records)
        electricity_values.append(summary["avg_electricity_kwh"])
        gas_values.append(summary["avg_gas_m3"])

    return {
        "avg_electricity_kwh": _safe_average(electricity_values),
        "avg_gas_m3": _safe_average(gas_values),
    }


def _calculate_ratio(target_value: float, peer_value: float) -> float:
    if peer_value <= 0:
        return 1.0 if target_value <= 0 else round(target_value, 2)
    return round(target_value / peer_value, 2)


def calculate_energy_waste_index(
    target_summary: Dict[str, float],
    peer_summary: Dict[str, float],
) -> Dict[str, Union[float, str]]:
    electricity_ratio = _calculate_ratio(
        target_summary["avg_electricity_kwh"],
        peer_summary["avg_electricity_kwh"],
    )
    gas_ratio = _calculate_ratio(
        target_summary["avg_gas_m3"],
        peer_summary["avg_gas_m3"],
    )

    waste_index = round(((electricity_ratio + gas_ratio) / 2) * 100, 2)

    if waste_index < 90:
        grade = "양호"
        interpretation = "동일 조건의 유사 건물 대비 평균 사용량이 안정적인 편입니다."
    elif waste_index <= 110:
        grade = "주의"
        interpretation = "또래 건물 평균과 유사하거나 약간 높은 수준이므로 추이를 지켜볼 필요가 있습니다."
    else:
        grade = "과소비 의심"
        interpretation = "또래 건물 평균 대비 에너지 사용량이 높아 점검 우선순위가 높습니다."

    return {
        "electricity_ratio": electricity_ratio,
        "gas_ratio": gas_ratio,
        "energy_waste_index": waste_index,
        "grade": grade,
        "interpretation": interpretation,
    }


def build_analysis_json(
    building: Building,
    target_summary: Dict[str, float],
    peer_summary: Dict[str, float],
    analysis_result: Dict[str, Union[float, str]],
    peer_count: int,
) -> Dict[str, Any]:
    return {
        "building": {
            "id": building.id,
            "building_code": building.building_code,
            "name": building.name,
            "road_address": building.road_address,
            "jibun_address": building.jibun_address,
            "building_type": building.building_type,
            "gross_floor_area": building.gross_floor_area,
            "approval_year": building.approval_year,
            "floors": building.floors,
            "elevator_count": building.elevator_count,
        },
        "energy_summary": {
            "target_avg_electricity_kwh": target_summary["avg_electricity_kwh"],
            "target_avg_gas_m3": target_summary["avg_gas_m3"],
            "peer_avg_electricity_kwh": peer_summary["avg_electricity_kwh"],
            "peer_avg_gas_m3": peer_summary["avg_gas_m3"],
            "electricity_ratio": analysis_result["electricity_ratio"],
            "gas_ratio": analysis_result["gas_ratio"],
        },
        "analysis": {
            "peer_count": peer_count,
            "energy_waste_index": analysis_result["energy_waste_index"],
            "grade": analysis_result["grade"],
            "interpretation": analysis_result["interpretation"],
        },
    }
