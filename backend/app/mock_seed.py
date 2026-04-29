from typing import Dict, List

from sqlalchemy import delete

from app.db import Base, SessionLocal, engine
from app.models import Building, BuildingEnergyMonthly


def seed_mock_data() -> None:
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        building_payloads = [
            {
                "building_code": "SEOUL-OFFICE-001",
                "name": "서초 비즈니스 센터",
                "road_address": "서울특별시 서초구 서초대로 301",
                "jibun_address": "서울특별시 서초구 서초동 1555-3",
                "building_type": "office",
                "gross_floor_area": 11800.0,
                "approval_year": 2012,
                "floors": 12,
                "elevator_count": 4,
            },
            {
                "building_code": "SEOUL-OFFICE-002",
                "name": "강남 스마트 타워",
                "road_address": "서울특별시 강남구 테헤란로 142",
                "jibun_address": "서울특별시 강남구 역삼동 736-24",
                "building_type": "office",
                "gross_floor_area": 12450.0,
                "approval_year": 2016,
                "floors": 15,
                "elevator_count": 5,
            },
            {
                "building_code": "SEOUL-OFFICE-003",
                "name": "송파 파크 오피스",
                "road_address": "서울특별시 송파구 법원로 128",
                "jibun_address": "서울특별시 송파구 문정동 642-3",
                "building_type": "office",
                "gross_floor_area": 10500.0,
                "approval_year": 2009,
                "floors": 11,
                "elevator_count": 4,
            },
            {
                "building_code": "SEOUL-OFFICE-004",
                "name": "성수 그린타워",
                "road_address": "서울특별시 성동구 성수이로 123",
                "jibun_address": "서울특별시 성동구 성수동2가 315-12",
                "building_type": "office",
                "gross_floor_area": 8520.0,
                "approval_year": 2014,
                "floors": 10,
                "elevator_count": 3,
            },
            {
                "building_code": "SEOUL-OFFICE-005",
                "name": "마포 스마트오피스",
                "road_address": "서울특별시 마포구 월드컵북로 55",
                "jibun_address": "서울특별시 마포구 성산동 515-39",
                "building_type": "office",
                "gross_floor_area": 6980.0,
                "approval_year": 2011,
                "floors": 8,
                "elevator_count": 3,
            },
            {
                "building_code": "SEOUL-MEDICAL-001",
                "name": "강남 메디컬플라자",
                "road_address": "서울특별시 강남구 테헤란로 221",
                "jibun_address": "서울특별시 강남구 역삼동 677-25",
                "building_type": "medical",
                "gross_floor_area": 5430.0,
                "approval_year": 2017,
                "floors": 9,
                "elevator_count": 3,
            },
            {
                "building_code": "SEOUL-EDU-001",
                "name": "잠실 교육문화센터",
                "road_address": "서울특별시 송파구 올림픽로 214",
                "jibun_address": "서울특별시 송파구 잠실동 40-1",
                "building_type": "education",
                "gross_floor_area": 4870.0,
                "approval_year": 2010,
                "floors": 6,
                "elevator_count": 2,
            },
        ]

        buildings: List[Building] = []
        for payload in building_payloads:
            building = db.query(Building).filter(Building.building_code == payload["building_code"]).first()
            if building is None:
                building = Building(**payload)
                db.add(building)
                db.flush()
            else:
                for key, value in payload.items():
                    setattr(building, key, value)
            buildings.append(building)

        monthly_profiles: Dict[int, Dict[str, List[int]]] = {
            buildings[0].id: {
                "electricity": [42000, 40000, 41000, 43000, 46000, 49000, 53000, 55000, 50000, 47000, 44000, 43000],
                "gas": [8200, 7900, 7100, 5200, 3100, 1800, 1200, 1100, 1900, 3900, 6100, 7600],
            },
            buildings[1].id: {
                "electricity": [39000, 38500, 40000, 41500, 44500, 47000, 50500, 52000, 48500, 45000, 42000, 40500],
                "gas": [7600, 7350, 6800, 4900, 2800, 1600, 1000, 950, 1700, 3400, 5600, 7100],
            },
            buildings[2].id: {
                "electricity": [36000, 35000, 36500, 39000, 42000, 45000, 49000, 50000, 47000, 43500, 40500, 38000],
                "gas": [8000, 7700, 7000, 5100, 3000, 1700, 1100, 1000, 1800, 3600, 5900, 7400],
            },
            buildings[3].id: {
                "electricity": [32500, 31800, 33000, 35200, 38000, 41500, 46200, 47800, 44100, 39800, 36200, 34400],
                "gas": [6100, 5900, 5300, 3900, 2500, 1450, 920, 880, 1500, 3000, 4550, 5700],
            },
            buildings[4].id: {
                "electricity": [25500, 24900, 26000, 27600, 29800, 32500, 36100, 37200, 34800, 31400, 28600, 27000],
                "gas": [4300, 4150, 3800, 2750, 1700, 980, 620, 590, 1050, 2050, 3200, 4020],
            },
            buildings[5].id: {
                "electricity": [28200, 27600, 28900, 30500, 32400, 35200, 38400, 39200, 36900, 34000, 31500, 29800],
                "gas": [3600, 3450, 3150, 2350, 1500, 920, 700, 680, 1050, 1900, 2780, 3350],
            },
            buildings[6].id: {
                "electricity": [14200, 13600, 14900, 16200, 18100, 20500, 23800, 24600, 21900, 18800, 16000, 15100],
                "gas": [2900, 2760, 2480, 1800, 1050, 640, 420, 400, 720, 1420, 2190, 2680],
            },
        }

        db.execute(delete(BuildingEnergyMonthly).where(BuildingEnergyMonthly.building_id.in_([building.id for building in buildings])))

        energy_rows: List[BuildingEnergyMonthly] = []
        for building_id, profile in monthly_profiles.items():
            for month_index in range(12):
                energy_rows.append(
                    BuildingEnergyMonthly(
                        building_id=building_id,
                        year=2024,
                        month=month_index + 1,
                        electricity_kwh=profile["electricity"][month_index],
                        gas_m3=profile["gas"][month_index],
                    )
                )

        db.add_all(energy_rows)
        db.commit()
        print("Mock seed completed successfully.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_mock_data()
