from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.security import clean_optional_text, validate_finite_number


class ReportRequest(BaseModel):
    address: str = Field("", description="검색할 도로명 주소 일부", max_length=120)
    building_id: Optional[Any] = None
    plat_plc: Optional[str] = None
    road_address: Optional[str] = None
    bld_nm: Optional[str] = None
    dong_nm: Optional[str] = None
    grs_ar: Optional[float] = None
    agnd_flr: Optional[int] = None

    @field_validator("address", "plat_plc", "road_address", "bld_nm", "dong_nm", mode="before")
    @classmethod
    def clean_text_fields(cls, value):
        if value is None:
            return value
        try:
            return clean_optional_text(value, field_name="검색어")
        except HTTPException as exc:
            raise ValueError(str(exc.detail)) from exc

    @field_validator("grs_ar", mode="before")
    @classmethod
    def validate_area(cls, value):
        if value is None or value == "":
            return None
        try:
            return validate_finite_number(value, field_name="연면적", maximum=100_000_000)
        except HTTPException as exc:
            raise ValueError(str(exc.detail)) from exc

    @field_validator("agnd_flr", mode="before")
    @classmethod
    def validate_floor(cls, value):
        if value is None or value == "":
            return None
        try:
            number = validate_finite_number(value, field_name="층수", maximum=300)
        except HTTPException as exc:
            raise ValueError(str(exc.detail)) from exc
        return int(number)


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


class EnergyUsageMonthlyPoint(BaseModel):
    use_ym: str
    label: str
    value: Optional[float] = None
    is_estimated: bool = False


class ReportEnergyInfo(BaseModel):
    source: str = "legacy"
    has_data: bool = True
    months_count: int = 0
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    is_estimated_included: bool = False
    is_estimated_gas_included: bool = False
    electricity_monthly: List[EnergyUsageMonthlyPoint] = Field(default_factory=list)
    gas_monthly: List[EnergyUsageMonthlyPoint] = Field(default_factory=list)


class PeerGroupInfo(BaseModel):
    rank: Optional[int] = None
    total: Optional[int] = None
    label: Optional[str] = None


class EnergyAiLiteDiagnosis(BaseModel):
    data_source_type: Optional[str] = None
    diagnosis_label: Optional[str] = None
    confidence_label: Optional[str] = None
    front_badge: Optional[str] = None
    actual_kwh: Optional[float] = None
    ai_pred_kwh: Optional[float] = None
    baseline_kwh: Optional[float] = None
    service_reference_kwh: Optional[float] = None
    display_main_kwh: Optional[float] = None
    compare_pct: Optional[float] = None
    compare_basis: Optional[str] = None
    percentile: Optional[float] = None
    vs_peer_median_pct: Optional[float] = None
    service_strategy: Optional[str] = None
    quality_flag: Optional[str] = None
    quality_reason: Optional[str] = None
    backend_has_result: bool = False
    backend_is_measured: bool = False
    backend_is_estimated: bool = False
    backend_needs_user_input: bool = False
    actual_per_area_year: Optional[float] = None
    estimated_per_area_year: Optional[float] = None
    peer_reliability_score: Optional[float] = None
    peer_reliability_label: Optional[str] = None
    summary: Optional[str] = None
    recommendation: Optional[str] = None


class AiDiagnosis(BaseModel):
    has_data: bool = False
    mode: str = "none"
    has_electric: bool = False
    has_gas: bool = False
    needs_user_input: bool = False
    electric: Optional[EnergyAiLiteDiagnosis] = None
    gas: Optional[EnergyAiLiteDiagnosis] = None


class ReportResponse(BaseModel):
    status: str = "ok"
    report_mode: str = "measured"
    message: Optional[str] = None
    building: BuildingInfo
    peer_group: Optional[PeerGroupInfo] = None
    energy_summary: EnergySummary
    analysis: AnalysisResult
    monthly_energy: List[MonthlyEnergyPoint]
    report_text: str
    raw_analysis_json: Dict[str, Any]
    energy: Optional[ReportEnergyInfo] = None
    peer_benchmark: Optional[Dict[str, Any]] = None
    ai_diagnosis: Optional[AiDiagnosis] = None
    saving_estimate: Optional[Dict[str, Any]] = None
