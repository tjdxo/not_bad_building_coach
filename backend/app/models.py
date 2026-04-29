from datetime import datetime
from typing import List

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Building(Base):
    __tablename__ = "buildings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    building_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    road_address: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    jibun_address: Mapped[str] = mapped_column(String(255), nullable=False)
    building_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    gross_floor_area: Mapped[float] = mapped_column(Float, nullable=False)
    approval_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    floors: Mapped[int] = mapped_column(Integer, nullable=False)
    elevator_count: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    energy_records: Mapped[List["BuildingEnergyMonthly"]] = relationship(
        "BuildingEnergyMonthly",
        back_populates="building",
        cascade="all, delete-orphan",
    )


class BuildingEnergyMonthly(Base):
    __tablename__ = "building_energy_monthly"
    __table_args__ = (
        UniqueConstraint("building_id", "year", "month", name="uq_building_energy_month"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id"), nullable=False, index=True)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    electricity_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    gas_m3: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    building: Mapped[Building] = relationship("Building", back_populates="energy_records")
