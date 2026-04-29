from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException
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
    building = crud.find_building_by_address(db, request.address)
    if not building:
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
