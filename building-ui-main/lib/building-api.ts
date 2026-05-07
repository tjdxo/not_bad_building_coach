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
  plat_plc?: string | null;
  bld_nm?: string | null;
  dong_nm?: string | null;
  grs_ar?: number | null;
  agnd_flr?: number | null;
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
  grs_ar: number | null;
  agnd_flr: number | null;
};

export type BuildingSearchResponse = {
  items: BuildingSearchItem[];
  page: number;
  limit: number;
  total: number;
  has_next: boolean;
};

export type MonthlyEnergyPoint = {
  year: number;
  month: number;
  target_electricity_kwh: number;
  target_gas_m3: number;
  peer_avg_electricity_kwh: number;
  peer_avg_gas_m3: number;
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
  message?: string | null;
  peer_count?: number | null;
  peer_total_rank?: number | null;
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
  } | null;
  relative_grade?: {
    grade?: string | null;
    source?: string | null;
    relative_grade_by_seoul_percentile?: string | null;
    appendix1_proxy_grade_by_current_peer_percentile?: string | null;
    absolute_relative_grade_match?: boolean | null;
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

export type ReportApiResponse = {
  status?: "ok" | "energy_data_missing";
  message?: string | null;
  building: ApiBuilding;
  peer_group?: {
    rank?: number | null;
    total?: number | null;
    label?: string | null;
  } | null;
  energy?: ReportEnergyInfo | null;
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
  return `/report?address=${encodeURIComponent(address)}`;
}

export function compareHref(address: string) {
  return `/compare?address=${encodeURIComponent(address)}`;
}

export function reportHrefForReportBuilding(building: ApiBuilding, fallbackAddress = "") {
  const address = building.display_address || building.road_address || fallbackAddress;
  return `/report?${buildingRouteQuery({ ...building, address }).toString()}`;
}

export function compareHrefForReportBuilding(building: ApiBuilding, fallbackAddress = "") {
  const address = building.display_address || building.road_address || fallbackAddress;
  return `/compare?${buildingRouteQuery({ ...building, address }).toString()}`;
}

export function reportHrefForSearchBuilding(building: BuildingSearchItem) {
  const address = building.display_address || building.road_address || building.plat_plc || "";
  return `/report?${buildingRouteQuery({ ...building, address }).toString()}`;
}

export type BuildingSearchParams = {
  district?: string;
  dong?: string;
  query?: string;
  building_keyword?: string;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
};

export async function searchBuildings(paramsInput: BuildingSearchParams = {}) {
  const district = paramsInput.district?.trim() || "";
  const dong = paramsInput.dong?.trim() || "";
  const query = paramsInput.query?.trim() || "";
  const buildingKeyword = paramsInput.building_keyword?.trim() || "";
  const page = Math.max(1, paramsInput.page || 1);
  const limit = Math.min(50, Math.max(1, paramsInput.limit || 20));

  if (!district && !dong && !query && !buildingKeyword) {
    return {
      items: [],
      page,
      limit,
      total: 0,
      has_next: false,
    } satisfies BuildingSearchResponse;
  }

  const params = new URLSearchParams();
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

export function formatBuildingType(type: string) {
  const labels: Record<string, string> = {
    office: "업무시설",
    medical: "의료시설",
    education: "교육연구시설",
  };

  return labels[type] || type;
}

export function formatBuildingDescriptor(
  building: Pick<ApiBuilding, "bld_nm" | "dong_nm" | "building_type">,
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

  return "";
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

  const electricityTons = monthlyElectricityExcess * 12 * 0.000459;
  const gasTons = monthlyGasExcess * 12 * 0.00223;

  return Math.max(0.1, electricityTons + gasTons);
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

function numericEnergyValue(value: number | null | undefined) {
  return value ?? 0;
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
      const electricityValue = numericEnergyValue(electricityItem?.value);
      const gasValue = numericEnergyValue(gasItem?.value);
      const peerElectricityValue = numericEnergyValue(peerElectricityItem?.value);
      const peerGasValue = numericEnergyValue(peerGasItem?.value);

      return {
        year,
        month,
        use_ym: baseItem.use_ym,
        label: baseItem.label,
        is_estimated: electricityItem?.is_estimated ?? false,
        target_electricity_kwh: electricityValue,
        target_gas_m3: gasValue,
        peer_avg_electricity_kwh: peerElectricityItem ? peerElectricityValue : 0,
        peer_avg_gas_m3: peerGasItem ? peerGasValue : 0,
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
