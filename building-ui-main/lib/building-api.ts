export type ApiBuilding = {
  id: number;
  building_id?: string | number | null;
  building_code: string;
  name: string;
  road_address: string;
  jibun_address: string;
  building_type: string;
  gross_floor_area: number;
  approval_year: number;
  floors: number;
  elevator_count: number;
  display_address?: string | null;
  sgg_cd_nm?: string | null;
  bjd_cd_nm?: string | null;
  plat_plc?: string | null;
  bld_nm?: string | null;
  dong_nm?: string | null;
  purp_nm?: string | null;
  main_purpose?: string | null;
  grs_ar?: number | null;
  agnd_flr?: number | null;
  region?: "seoul" | "incheon" | string | null;
  region_name?: string | null;
};

export type BuildingSearchItem = {
  building_id: string | number | null;
  plat_plc: string | null;
  road_address: string | null;
  sgg_cd_nm: string | null;
  bjd_cd_nm: string | null;
  display_address: string;
  bld_nm: string | null;
  dong_nm: string | null;
  purp_nm?: string | null;
  grs_ar: number | null;
  agnd_flr: number | null;
  region?: "seoul" | "incheon" | string | null;
  region_name?: string | null;
};

export type BuildingSearchResponse = {
  items: BuildingSearchItem[];
  page: number;
  limit: number;
  total: number;
  has_next: boolean;
};

export type SearchRegion = "seoul" | "incheon";

export type MonthlyEnergyPoint = {
  year: number;
  month: number;
  target_electricity_kwh: number | null;
  target_gas_m3: number | null;
  peer_avg_electricity_kwh: number | null;
  peer_avg_gas_m3: number | null;
  use_ym?: string | null;
  label?: string | null;
  is_estimated?: boolean | null;
};

export type EnergyUsageMonthlyPoint = {
  use_ym: string;
  label: string;
  value: number | null;
  is_estimated: boolean;
};

export type EnergyAvailabilityItem = {
  has_data: boolean;
  compare_available: boolean;
  measured_months: number;
  missing_months: number;
  zero_months: number;
  is_missing: boolean;
  is_zero_confirmed: boolean;
  status_label: string;
};

export type EnergyAvailability = {
  electricity: EnergyAvailabilityItem;
  gas: EnergyAvailabilityItem;
  total: EnergyAvailabilityItem;
  has_partial_missing: boolean;
  limitation_message?: string | null;
};

export type PeerMetric = {
  percentile?: number | null;
  target_per_area?: number | null;
  peer_mean_per_area?: number | null;
  peer_median_per_area?: number | null;
  vs_peer_pct?: number | null;
  vs_peer_median_pct?: number | null;
  status_label?: string | null;
};

export type PeerBenchmark = {
  has_data: boolean;
  region?: "seoul" | "incheon" | string | null;
  region_name?: string | null;
  peer_basis_label?: string | null;
  message?: string | null;
  peer_count?: number | null;
  peer_total_rank?: number | null;
  peer_rank_basis?: string | null;
  peer_best_building_id?: number | null;
  peer_rank_label?: string | null;
  reliability_score?: number | null;
  reliability_label?: string | null;
  reliability_reason?: string | null;
  result_quality?: string | null;
  energy_data_quality_detail?: string | null;
  data_source_type?: string | null;
  diagnosis_type?: string | null;
  peer_overuse_type?: string | null;
  electricity?: PeerMetric | null;
  gas?: PeerMetric | null;
  total?: PeerMetric | null;
  absolute_grade?: {
    grade_type?: string | null;
    area_band?: string | null;
    energy_intensity?: number | null;
    grade?: string | null;
    status?: string | null;
    seoul_grade_applicability?: string | null;
    threshold_A?: number | null;
    threshold_B?: number | null;
    threshold_C?: number | null;
    threshold_D?: number | null;
    basis_label?: string | null;
    description?: string | null;
  } | null;
  relative_grade?: {
    grade?: string | null;
    source?: string | null;
    relative_grade_by_seoul_percentile?: string | null;
    appendix1_proxy_grade_by_current_peer_percentile?: string | null;
    absolute_relative_grade_match?: boolean | null;
    basis_label?: string | null;
  } | null;
  peer_monthly?: {
    electricity_mean?: EnergyUsageMonthlyPoint[];
    gas_mean?: EnergyUsageMonthlyPoint[];
  } | null;
};

export type ReportEnergyInfo = {
  source: "db" | "none" | "manual" | "ai_placeholder" | "legacy";
  has_data: boolean;
  months_count?: number;
  period_start?: string | null;
  period_end?: string | null;
  is_estimated_included: boolean;
  is_estimated_gas_included?: boolean;
  electricity_monthly: EnergyUsageMonthlyPoint[];
  gas_monthly?: EnergyUsageMonthlyPoint[];
};

export type EnergyAiLiteDiagnosis = {
  data_source_type?: string | null;
  diagnosis_label?: string | null;
  confidence_label?: string | null;
  front_badge?: string | null;
  actual_kwh?: number | null;
  ai_pred_kwh?: number | null;
  baseline_kwh?: number | null;
  service_reference_kwh?: number | null;
  display_main_kwh?: number | null;
  compare_pct?: number | null;
  compare_basis?: string | null;
  percentile?: number | null;
  vs_peer_median_pct?: number | null;
  service_strategy?: string | null;
  quality_flag?: string | null;
  quality_reason?: string | null;
  backend_has_result?: boolean;
  backend_is_measured?: boolean;
  backend_is_estimated?: boolean;
  backend_needs_user_input?: boolean;
  actual_per_area_year?: number | null;
  estimated_per_area_year?: number | null;
  peer_reliability_score?: number | null;
  peer_reliability_label?: string | null;
  summary?: string | null;
  recommendation?: string | null;
};

export type AiDiagnosis = {
  has_data: boolean;
  mode: "estimated" | "mixed" | "none";
  has_electric: boolean;
  has_gas: boolean;
  needs_user_input: boolean;
  electric?: EnergyAiLiteDiagnosis | null;
  gas?: EnergyAiLiteDiagnosis | null;
};

export type SavingEstimateEnergy = {
  available?: boolean;
  unit?: "kWh" | "m3" | string;
  benchmark_type?: string | null;
  my_annual_usage?: number | null;
  peer_mean_annual_usage?: number | null;
  peer_best_annual_usage?: number | null;
  target_annual_usage?: number | null;
  saving_usage?: number | null;
  saving_krw?: number | null;
  reason?: string | null;
};

export type SavingEstimate = {
  available: boolean;
  title?: string | null;
  benchmark_type?: string | null;
  reason?: string | null;
  unit_price?: {
    electricity_krw_per_kwh?: number | null;
    gas_krw_per_m3?: number | null;
    gas_krw_per_kwh?: number | null;
  } | null;
  electricity?: SavingEstimateEnergy | null;
  gas?: SavingEstimateEnergy | null;
  total?: {
    saving_krw?: number | null;
  } | null;
  caution?: string | null;
};

export type ReportApiResponse = {
  status?: "ok" | "energy_data_missing";
  report_mode?: "measured" | "estimated" | "mixed" | "no_data";
  message?: string | null;
  region?: "seoul" | "incheon" | string | null;
  region_name?: string | null;
  building: ApiBuilding;
  peer_group?: {
    rank?: number | null;
    total?: number | null;
    label?: string | null;
  } | null;
  energy?: ReportEnergyInfo | null;
  energy_availability?: EnergyAvailability | null;
  peer_benchmark?: PeerBenchmark | null;
  energy_summary: {
    target_avg_electricity_kwh: number;
    target_avg_gas_m3: number;
    peer_avg_electricity_kwh: number;
    peer_avg_gas_m3: number;
    electricity_ratio: number;
    gas_ratio: number;
  };
  analysis: {
    peer_count: number;
    energy_waste_index: number;
    grade: string;
    interpretation: string;
  };
  monthly_energy?: MonthlyEnergyPoint[];
  report_text: string;
  raw_analysis_json: Record<string, unknown>;
  ai_diagnosis?: AiDiagnosis | null;
  saving_estimate?: SavingEstimate | null;
};

export function reportRegion(report: ReportApiResponse) {
  return report.region || report.building.region || report.peer_benchmark?.region || "seoul";
}

export function reportRegionName(report: ReportApiResponse) {
  const region = reportRegion(report);
  return report.region_name || report.building.region_name || report.peer_benchmark?.region_name || (region === "incheon" ? "인천광역시" : "서울특별시");
}

export function peerBasisLabel(report: ReportApiResponse) {
  const region = reportRegion(report);
  return report.peer_benchmark?.peer_basis_label || (region === "incheon" ? "인천시 내 유사 건물군 기준" : "서울시 내 유사 건물군 기준");
}

export function isIncheonReport(report: ReportApiResponse) {
  return reportRegion(report) === "incheon";
}

export type AiReportUserAnswers = {
  electric?: Record<string, string | string[]>;
  gas?: Record<string, string | string[]>;
  policy?: Record<string, string | string[]>;
};

export type AiReportAudience = "building_owner" | "facility_manager" | "contractor" | "policy_reviewer";

export type AiGeneratedReport = {
  audience?: AiReportAudience | string;
  title?: string;
  subtitle?: string;
  report_mode_label?: string;
  executive_summary?: string;
  one_line_summary?: string;
  overall_assessment?: {
    grade_label?: string;
    summary?: string;
    confidence_label?: string;
    caution?: string;
  };
  energy_summary?: {
    electricity?: {
      status?: string;
      summary?: string;
      main_reason_candidates?: string[];
      recommended_checks?: string[];
    };
    gas?: {
      status?: string;
      summary?: string;
      main_reason_candidates?: string[];
      recommended_checks?: string[];
    };
  };
  peer_comparison?: {
    summary?: string;
    rank_text?: string;
    interpretation?: string;
  };
  grade_interpretation?: {
    absolute_grade?: string;
    relative_grade?: string;
    caution?: string;
  };
  cause_hypotheses?: Array<{
    title?: string;
    confidence?: string;
    reason?: string;
    check_next?: string;
  }>;
  priority_actions?: Array<{
    rank?: number;
    title?: string;
    impact?: string;
    difficulty?: string;
    reason?: string;
    next_step?: string;
    related_policy_or_service?: string | null;
  }>;
  risk_scenarios?: Array<{
    horizon?: string;
    title?: string;
    description?: string;
    mitigation?: string;
  }>;
  recommended_actions?: Array<{
    priority?: number;
    title?: string;
    reason?: string;
    expected_effect?: string;
    contractor_category?: string;
    contractor_cta_label?: string;
  }>;
  policy_recommendations?: Array<{
    policy_id?: string;
    policy_name?: string;
    category?: string;
    benefit_type?: string;
    fit_score?: number;
    fit_label?: string;
    reason?: string;
    matched_reasons?: string[];
    missing_checks?: string[];
    recommended_next_step?: string;
    official_url?: string | null;
    caution?: string;
  }>;
  user_answer_reflection?: {
    summary?: string;
    important_answers?: string[];
  };
  limitations?: string[];
};

export type AiReportApiResponse = {
  status: "ok";
  provider?: string;
  model?: string;
  report_type: string;
  report_context?: Record<string, unknown>;
  report?: AiGeneratedReport | null;
  raw_text?: string | null;
  fallback?: boolean;
  cached?: boolean;
};

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const legacyBuildingAddress: Record<string, string> = {
  "seongsu-green": "서울특별시 성동구 성수이로 123",
  "mapo-smart": "서울특별시 마포구 월드컵북로 55",
  "gangnam-medical": "서울특별시 강남구 테헤란로 221",
  "jamsil-school": "서울특별시 송파구 올림픽로 214",
};

export function resolveAddressParam(params: {
  address?: string;
  building?: string;
  query?: string;
}) {
  if (params.address?.trim()) {
    return params.address.trim();
  }

  if (params.building?.trim()) {
    return legacyBuildingAddress[params.building] || params.building.trim();
  }

  if (params.query?.trim()) {
    return params.query.trim();
  }

  return "";
}

export function dashboardHref(address: string) {
  return `/dashboard?address=${encodeURIComponent(address)}`;
}

type BuildingRouteParams = {
  address: string;
  building_id?: string | number | null;
  plat_plc?: string | null;
  road_address?: string | null;
  bld_nm?: string | null;
  dong_nm?: string | null;
  purp_nm?: string | null;
  main_purpose?: string | null;
  grs_ar?: number | null;
  agnd_flr?: number | null;
};

function buildingRouteQuery(building: BuildingRouteParams) {
  const params = new URLSearchParams();
  params.set("address", building.address);
  if (building.building_id !== null && building.building_id !== undefined) {
    params.set("building_id", String(building.building_id));
  }
  if (building.plat_plc) params.set("plat_plc", building.plat_plc);
  if (building.road_address) params.set("road_address", building.road_address);
  if (building.bld_nm) params.set("bld_nm", building.bld_nm);
  if (building.dong_nm) params.set("dong_nm", building.dong_nm);
  if (building.purp_nm) params.set("purp_nm", building.purp_nm);
  if (building.main_purpose) params.set("main_purpose", building.main_purpose);
  if (building.grs_ar) params.set("grs_ar", String(building.grs_ar));
  if (building.agnd_flr) params.set("agnd_flr", String(building.agnd_flr));
  return params;
}

export function dashboardHrefForBuilding(building: BuildingSearchItem) {
  const address = building.display_address || building.road_address || building.plat_plc || "";
  return `/dashboard?${buildingRouteQuery({ ...building, address }).toString()}`;
}

export function dashboardHrefForReportBuilding(building: ApiBuilding, fallbackAddress = "") {
  const address = building.display_address || building.road_address || fallbackAddress;
  return `/dashboard?${buildingRouteQuery({ ...building, address }).toString()}`;
}

export function reportHref(address: string) {
  const params = new URLSearchParams({ address, open_ai_report: "1" });
  return `/dashboard?${params.toString()}`;
}

export function compareHref(address: string) {
  return `/compare?address=${encodeURIComponent(address)}`;
}

export function reportHrefForReportBuilding(building: ApiBuilding, fallbackAddress = "") {
  const address = building.display_address || building.road_address || fallbackAddress;
  const params = buildingRouteQuery({ ...building, address });
  params.set("open_ai_report", "1");
  return `/dashboard?${params.toString()}`;
}

export function compareHrefForReportBuilding(building: ApiBuilding, fallbackAddress = "") {
  const address = building.display_address || building.road_address || fallbackAddress;
  return `/compare?${buildingRouteQuery({ ...building, address }).toString()}`;
}

export function reportHrefForSearchBuilding(building: BuildingSearchItem) {
  const address = building.display_address || building.road_address || building.plat_plc || "";
  const params = buildingRouteQuery({ ...building, address });
  params.set("open_ai_report", "1");
  return `/dashboard?${params.toString()}`;
}

export type BuildingSearchParams = {
  region?: SearchRegion | string;
  district?: string;
  dong?: string;
  query?: string;
  building_keyword?: string;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
};

export async function fetchDistricts(paramsInput: { region?: SearchRegion | string; signal?: AbortSignal } = {}) {
  const params = new URLSearchParams();
  const region = paramsInput.region?.trim() || "";
  if (region) {
    params.set("region", region);
  }

  const response = await fetch(`${API_BASE_URL}/api/districts?${params.toString()}`, {
    cache: "no-store",
    signal: paramsInput.signal,
  });

  if (!response.ok) {
    throw new Error(`구 목록 API 오류: ${response.status}`);
  }

  return (await response.json()) as { items: string[] };
}

export async function fetchDongs(paramsInput: {
  district: string;
  region?: SearchRegion | string;
  signal?: AbortSignal;
}) {
  const district = paramsInput.district.trim();
  if (!district) {
    return { items: [] as string[] };
  }

  const params = new URLSearchParams({ district });
  const region = paramsInput.region?.trim() || "";
  if (region) {
    params.set("region", region);
  }

  const response = await fetch(`${API_BASE_URL}/api/dongs?${params.toString()}`, {
    cache: "no-store",
    signal: paramsInput.signal,
  });

  if (!response.ok) {
    throw new Error(`동 목록 API 오류: ${response.status}`);
  }

  return (await response.json()) as { items: string[] };
}

export async function searchBuildings(paramsInput: BuildingSearchParams = {}) {
  const region = paramsInput.region?.trim() || "";
  const district = paramsInput.district?.trim() || "";
  const dong = paramsInput.dong?.trim() || "";
  const query = paramsInput.query?.trim() || "";
  const buildingKeyword = paramsInput.building_keyword?.trim() || "";
  const page = Math.max(1, paramsInput.page || 1);
  const limit = Math.min(50, Math.max(1, paramsInput.limit || 20));

  if (!region && !district && !dong && !query && !buildingKeyword) {
    return {
      items: [],
      page,
      limit,
      total: 0,
      has_next: false,
    } satisfies BuildingSearchResponse;
  }

  const params = new URLSearchParams();
  if (region) {
    params.set("region", region);
  }
  if (district) {
    params.set("district", district);
  }
  if (dong) {
    params.set("dong", dong);
  }
  if (query) {
    params.set("query", query);
  }
  if (buildingKeyword) {
    params.set("building_keyword", buildingKeyword);
  }
  params.set("page", String(page));
  params.set("limit", String(limit));

  const response = await fetch(`${API_BASE_URL}/api/buildings?${params.toString()}`, {
    cache: "no-store",
    signal: paramsInput.signal,
  });

  if (!response.ok) {
    throw new Error(`건물 검색 API 오류: ${response.status}`);
  }

  return (await response.json()) as BuildingSearchResponse;
}

export async function createReportForBuilding(building: BuildingSearchItem) {
  const address = building.display_address || building.road_address || building.plat_plc || "";
  const response = await fetch(`${API_BASE_URL}/api/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      building_id: building.building_id,
      address,
      plat_plc: building.plat_plc,
      road_address: building.road_address,
      bld_nm: building.bld_nm,
      dong_nm: building.dong_nm,
      purp_nm: building.purp_nm,
      grs_ar: building.grs_ar,
      agnd_flr: building.agnd_flr,
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    const message =
      typeof payload?.detail === "string" ? payload.detail : `리포트 API 오류: ${response.status}`;
    throw new Error(message);
  }

  return payload as ReportApiResponse;
}

export async function fetchReport(address: string) {
  const response = await fetch(`${API_BASE_URL}/api/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ address }),
    cache: "no-store",
  });

  const payload = await response.json();

  if (!response.ok) {
    const message =
      typeof payload?.detail === "string" ? payload.detail : `리포트 API 오류: ${response.status}`;
    throw new Error(message);
  }

  return payload as ReportApiResponse;
}

export async function fetchReportForParams(params: {
  address: string;
  building_id?: string;
  plat_plc?: string;
  road_address?: string;
  bld_nm?: string;
  dong_nm?: string;
  purp_nm?: string;
  main_purpose?: string;
  grs_ar?: string;
  agnd_flr?: string;
}) {
  const body: Record<string, string | number> = {
    address: params.address,
  };
  if (params.building_id) body.building_id = params.building_id;
  if (params.plat_plc) body.plat_plc = params.plat_plc;
  if (params.road_address) body.road_address = params.road_address;
  if (params.bld_nm) body.bld_nm = params.bld_nm;
  if (params.dong_nm) body.dong_nm = params.dong_nm;
  if (params.purp_nm) body.purp_nm = params.purp_nm;
  if (params.main_purpose) body.main_purpose = params.main_purpose;
  if (params.grs_ar) body.grs_ar = Number(params.grs_ar);
  if (params.agnd_flr) body.agnd_flr = Number(params.agnd_flr);

  const response = await fetch(`${API_BASE_URL}/api/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await response.json();

  if (!response.ok) {
    const message =
      typeof payload?.detail === "string" ? payload.detail : `리포트 API 오류: ${response.status}`;
    throw new Error(message);
  }

  return payload as ReportApiResponse;
}

export async function createAiReport(params: {
  building_id: string | number;
  report_type?: "basic" | "detailed";
  report_audience?: AiReportAudience;
  user_answers?: AiReportUserAnswers;
  signal?: AbortSignal;
}) {
  const response = await fetch(`${API_BASE_URL}/api/ai-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      building_id: Number(params.building_id),
      report_type: params.report_type ?? "basic",
      report_audience: params.report_audience ?? "building_owner",
      user_answers: params.user_answers,
    }),
    signal: params.signal,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("AI report API error", payload);
    const detailObject = typeof payload?.detail === "object" && payload.detail !== null ? payload.detail : null;
    const detail =
      typeof payload?.detail === "string"
        ? payload.detail
        : typeof detailObject?.detail === "string"
          ? detailObject.detail
          : "";
    const errorCode =
      typeof payload?.error_code === "string"
        ? payload.error_code
        : typeof detailObject?.error_code === "string"
          ? detailObject.error_code
          : "";
    const errorMessages: Record<string, string> = {
      OPENAI_CONFIG_MISSING: "AI 리포트 기능 설정을 확인해야 합니다.",
      OPENAI_RATE_LIMITED: "현재 AI 리포트 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.",
      OPENAI_BILLING_LIMIT: "AI 리포트 사용량 한도에 도달했습니다.",
      OPENAI_AUTH_ERROR: "AI API 인증 설정을 확인해야 합니다.",
      AI_REPORT_ALREADY_RUNNING: "이미 리포트를 생성 중입니다. 잠시만 기다려주세요.",
      AI_REPORT_RATE_LIMITED: "AI 리포트 요청이 잠시 많습니다. 잠시 후 다시 시도해주세요.",
      AI_REPORT_INPUT_TOO_LARGE: "리포트 입력 데이터가 너무 커서 생성할 수 없습니다.",
      AI_REPORT_PARSE_ERROR: "AI 리포트 응답 형식을 처리하지 못했습니다.",
      GEMINI_RATE_LIMITED: "현재 AI 리포트 요청이 많아 잠시 후 다시 시도해주세요.",
    };
    const message =
      errorMessages[errorCode] ||
      detail ||
      "리포트 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
    const error = new Error(message);
    error.name = errorCode || String(response.status);
    throw error;
  }

  return payload as AiReportApiResponse;
}

export function formatBuildingType(type: string) {
  const labels: Record<string, string> = {
    office: "업무시설",
    medical: "의료시설",
    education: "교육연구시설",
  };

  return labels[type] || type;
}

export function formatBuildingDescriptor(
  building: Pick<ApiBuilding, "bld_nm" | "dong_nm" | "purp_nm" | "main_purpose" | "building_type">,
) {
  const nameParts = [building.bld_nm, building.dong_nm]
    .map((item) => item?.trim())
    .filter(Boolean);

  if (nameParts.length > 0) {
    return nameParts.join(" ");
  }

  if (building.building_type && building.building_type !== "building_master") {
    return formatBuildingType(building.building_type);
  }

  return building.purp_nm || building.main_purpose || "";
}

export function formatArea(value: number) {
  return `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(value)}㎡`;
}

export function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits }).format(value);
}

export function formatRatioGap(ratio: number) {
  const diff = Math.round((ratio - 1) * 100);
  if (Math.abs(diff) < 1) {
    return "평균권";
  }

  return `${diff > 0 ? "+" : ""}${diff}%`;
}

export const CARBON_EMISSION_FACTORS_GCO2 = {
  electricityKwh: 424,
  waterM3: 332,
  gasM3: 2240,
} as const;

export function estimateCurrentCarbonEmission(report: ReportApiResponse) {
  const electricityTons =
    Math.max(0, report.energy_summary.target_avg_electricity_kwh || 0) *
    12 *
    (CARBON_EMISSION_FACTORS_GCO2.electricityKwh / 1_000_000);
  const gasTons =
    Math.max(0, report.energy_summary.target_avg_gas_m3 || 0) *
    12 *
    (CARBON_EMISSION_FACTORS_GCO2.gasM3 / 1_000_000);

  return electricityTons + gasTons;
}

export function estimateCarbonSaving(report: ReportApiResponse) {
  const monthlyElectricityExcess = Math.max(
    0,
    report.energy_summary.target_avg_electricity_kwh -
      report.energy_summary.peer_avg_electricity_kwh,
  );
  const monthlyGasExcess = Math.max(
    0,
    report.energy_summary.target_avg_gas_m3 - report.energy_summary.peer_avg_gas_m3,
  );

  const electricityTons =
    monthlyElectricityExcess * 12 * (CARBON_EMISSION_FACTORS_GCO2.electricityKwh / 1_000_000);
  const gasTons = monthlyGasExcess * 12 * (CARBON_EMISSION_FACTORS_GCO2.gasM3 / 1_000_000);

  return electricityTons + gasTons;
}

function latestTwelve<T>(items: T[]) {
  return items.slice(-12);
}

function parseEnergyUsageMonth(point: EnergyUsageMonthlyPoint) {
  const raw = point.use_ym || point.label;
  const fullYearMatch = raw.match(/^(\d{4})[-.](\d{1,2})/);
  if (fullYearMatch) {
    return {
      year: Number(fullYearMatch[1]),
      month: Number(fullYearMatch[2]),
    };
  }

  const shortYearMatch = point.label.match(/^(\d{2})[-.](\d{1,2})/);
  if (shortYearMatch) {
    return {
      year: 2000 + Number(shortYearMatch[1]),
      month: Number(shortYearMatch[2]),
    };
  }

  return { year: 0, month: 0 };
}

export function getMonthlyEnergy(report: ReportApiResponse): MonthlyEnergyPoint[] {
  const electricityMonthly = report.energy?.electricity_monthly ?? [];
  const gasMonthly = report.energy?.gas_monthly ?? [];
  const peerElectricityMonthly = report.peer_benchmark?.peer_monthly?.electricity_mean ?? [];
  const peerGasMonthly = report.peer_benchmark?.peer_monthly?.gas_mean ?? [];

  if (electricityMonthly.length || gasMonthly.length) {
    const electricityByMonth = new Map(electricityMonthly.map((item) => [item.use_ym, item]));
    const gasByMonth = new Map(gasMonthly.map((item) => [item.use_ym, item]));
    const peerElectricityByMonth = new Map(peerElectricityMonthly.map((item) => [item.use_ym, item]));
    const peerGasByMonth = new Map(peerGasMonthly.map((item) => [item.use_ym, item]));
    const baseMonthly = latestTwelve(electricityMonthly.length ? electricityMonthly : gasMonthly);

    return baseMonthly.map((baseItem, index) => {
      const electricityItem = electricityByMonth.get(baseItem.use_ym) ?? electricityMonthly[index];
      const gasItem = gasByMonth.get(baseItem.use_ym) ?? gasMonthly[index];
      const peerElectricityItem = peerElectricityByMonth.get(baseItem.use_ym);
      const peerGasItem = peerGasByMonth.get(baseItem.use_ym);
      const { year, month } = parseEnergyUsageMonth(baseItem);
      const electricityValue = electricityItem?.value ?? null;
      const gasValue = gasItem?.value ?? null;
      const peerElectricityValue = peerElectricityItem?.value ?? null;
      const peerGasValue = peerGasItem?.value ?? null;

      return {
        year,
        month,
        use_ym: baseItem.use_ym,
        label: baseItem.label,
        is_estimated: electricityItem?.is_estimated ?? false,
        target_electricity_kwh: electricityValue,
        target_gas_m3: gasValue,
        peer_avg_electricity_kwh: peerElectricityItem ? peerElectricityValue : null,
        peer_avg_gas_m3: peerGasItem ? peerGasValue : null,
      };
    });
  }

  if (report.monthly_energy?.length) {
    return latestTwelve(report.monthly_energy);
  }

  return Array.from({ length: 12 }, (_, index) => ({
    year: 2024,
    month: index + 1,
    target_electricity_kwh: report.energy_summary.target_avg_electricity_kwh,
    target_gas_m3: report.energy_summary.target_avg_gas_m3,
    peer_avg_electricity_kwh: report.energy_summary.peer_avg_electricity_kwh,
    peer_avg_gas_m3: report.energy_summary.peer_avg_gas_m3,
  }));
}
