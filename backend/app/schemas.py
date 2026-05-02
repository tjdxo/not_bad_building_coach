from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ReportRequest(BaseModel):
    address: str = Field(..., min_length=2, description="검색할 도로명 주소 일부")
    building_id: Optional[Any] = None
    plat_plc: Optional[str] = None
    road_address: Optional[str] = None
    bld_nm: Optional[str] = None
    dong_nm: Optional[str] = None
    grs_ar: Optional[float] = None
    agnd_flr: Optional[int] = None


class BuildingInfo(BaseModel):
    id: int
    building_code: str
    name: str
    road_address: str
    jibun_address: str
    building_type: str
    gross_floor_area: float
    approval_year: int
    floors: int
    elevator_count: int
    building_id: Optional[Any] = None
    display_address: Optional[str] = None
    plat_plc: Optional[str] = None
    bld_nm: Optional[str] = None
    dong_nm: Optional[str] = None
    grs_ar: Optional[float] = None
    agnd_flr: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class BuildingSearchItem(BaseModel):
    building_id: Optional[Any] = None
    plat_plc: Optional[str] = None
    road_address: Optional[str] = None
    sgg_cd_nm: Optional[str] = None
    bjd_cd_nm: Optional[str] = None
    display_address: str
    bld_nm: Optional[str] = None
    dong_nm: Optional[str] = None
    grs_ar: Optional[float] = None
    agnd_flr: Optional[int] = None


class BuildingSearchResponse(BaseModel):
    items: List[BuildingSearchItem]
    page: int
    limit: int
    total: int
    has_next: bool


class StringItemsResponse(BaseModel):
    items: List[str]


class EnergySummary(BaseModel):
    target_avg_electricity_kwh: float
    target_avg_gas_m3: float
    peer_avg_electricity_kwh: float
    peer_avg_gas_m3: float
    electricity_ratio: float
    gas_ratio: float


class AnalysisResult(BaseModel):
    peer_count: int
    energy_waste_index: float
    grade: str
    interpretation: str


class MonthlyEnergyPoint(BaseModel):
    year: int
    month: int
    target_electricity_kwh: float
    target_gas_m3: float
    peer_avg_electricity_kwh: float
    peer_avg_gas_m3: float
    use_ym: Optional[str] = None
    label: Optional[str] = None
    is_estimated: Optional[bool] = None


class ElectricityMonthlyPoint(BaseModel):
    use_ym: str
    label: str
    value: float
    is_estimated: bool = False


class ReportEnergyInfo(BaseModel):
    source: str = "legacy"
    has_data: bool = True
    is_estimated_included: bool = False
    electricity_monthly: List[ElectricityMonthlyPoint] = Field(default_factory=list)


class ReportResponse(BaseModel):
    status: str = "ok"
    message: Optional[str] = None
    building: BuildingInfo
    energy_summary: EnergySummary
    analysis: AnalysisResult
    monthly_energy: List[MonthlyEnergyPoint]
    report_text: str
    raw_analysis_json: Dict[str, Any]
    energy: Optional[ReportEnergyInfo] = None
