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

export type ElectricityMonthlyPoint = {
  use_ym: string;
  label: string;
  value: number;
  is_estimated: boolean;
};

export type ReportEnergyInfo = {
  source: "db" | "none" | "manual" | "ai_placeholder" | "legacy";
  has_data: boolean;
  is_estimated_included: boolean;
  electricity_monthly: ElectricityMonthlyPoint[];
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

export function dashboardHrefForBuilding(building: BuildingSearchItem) {
  const params = new URLSearchParams();
  const address = building.display_address || building.road_address || building.plat_plc || "";
  params.set("address", address);
  if (building.building_id !== null && building.building_id !== undefined) {
    params.set("building_id", String(building.building_id));
  }
  if (building.plat_plc) params.set("plat_plc", building.plat_plc);
  if (building.road_address) params.set("road_address", building.road_address);
  if (building.bld_nm) params.set("bld_nm", building.bld_nm);
  if (building.dong_nm) params.set("dong_nm", building.dong_nm);
  if (building.grs_ar) params.set("grs_ar", String(building.grs_ar));
  if (building.agnd_flr) params.set("agnd_flr", String(building.agnd_flr));
  return `/dashboard?${params.toString()}`;
}

export function reportHref(address: string) {
  return `/report?address=${encodeURIComponent(address)}`;
}

export function compareHref(address: string) {
  return `/compare?address=${encodeURIComponent(address)}`;
}

export type BuildingSearchParams = {
  district?: string;
  dong?: string;
  query?: string;
  building_keyword?: string;
  page?: number;
  limit?: number;
};

export async function searchBuildings(paramsInput: BuildingSearchParams = {}) {
  const district = paramsInput.district?.trim() || "";
  const dong = paramsInput.dong?.trim() || "";
  const query = paramsInput.query?.trim() || "";
  const buildingKeyword = paramsInput.building_keyword?.trim() || "";
  const page = paramsInput.page || 1;
  const limit = paramsInput.limit || 20;

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

export function getMonthlyEnergy(report: ReportApiResponse): MonthlyEnergyPoint[] {
  if (report.energy?.electricity_monthly?.length) {
    return report.energy.electricity_monthly.map((item) => ({
      year: Number(item.label.slice(0, 4)),
      month: Number(item.label.slice(5, 7)),
      use_ym: item.use_ym,
      label: item.label,
      is_estimated: item.is_estimated,
      target_electricity_kwh: item.value,
      target_gas_m3: 0,
      peer_avg_electricity_kwh: item.value,
      peer_avg_gas_m3: 0,
    }));
  }

  if (report.monthly_energy?.length) {
    return report.monthly_energy;
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
