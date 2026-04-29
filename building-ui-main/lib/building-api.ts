export type ApiBuilding = {
  id: number;
  building_code: string;
  name: string;
  road_address: string;
  jibun_address: string;
  building_type: string;
  gross_floor_area: number;
  approval_year: number;
  floors: number;
  elevator_count: number;
};

export type MonthlyEnergyPoint = {
  year: number;
  month: number;
  target_electricity_kwh: number;
  target_gas_m3: number;
  peer_avg_electricity_kwh: number;
  peer_avg_gas_m3: number;
};

export type ReportApiResponse = {
  building: ApiBuilding;
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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const legacyBuildingAddress: Record<string, string> = {
  "seongsu-green": "서울특별시 성동구 성수이로 123",
  "mapo-smart": "서울특별시 마포구 월드컵북로 55",
  "gangnam-medical": "서울특별시 강남구 테헤란로 221",
  "jamsil-school": "서울특별시 송파구 올림픽로 214",
};

const fallbackBuildings: ApiBuilding[] = [
  {
    id: 1,
    building_code: "SEOUL-OFFICE-001",
    name: "서초 비즈니스 센터",
    road_address: "서울특별시 서초구 서초대로 301",
    jibun_address: "서울특별시 서초구 서초동 1555-3",
    building_type: "office",
    gross_floor_area: 11800,
    approval_year: 2012,
    floors: 12,
    elevator_count: 4,
  },
  {
    id: 2,
    building_code: "SEOUL-OFFICE-002",
    name: "강남 스마트 타워",
    road_address: "서울특별시 강남구 테헤란로 142",
    jibun_address: "서울특별시 강남구 역삼동 736-24",
    building_type: "office",
    gross_floor_area: 12450,
    approval_year: 2016,
    floors: 15,
    elevator_count: 5,
  },
  {
    id: 3,
    building_code: "SEOUL-OFFICE-003",
    name: "송파 파크 오피스",
    road_address: "서울특별시 송파구 법원로 128",
    jibun_address: "서울특별시 송파구 문정동 642-3",
    building_type: "office",
    gross_floor_area: 10500,
    approval_year: 2009,
    floors: 11,
    elevator_count: 4,
  },
  {
    id: 4,
    building_code: "SEOUL-OFFICE-004",
    name: "성수 그린타워",
    road_address: "서울특별시 성동구 성수이로 123",
    jibun_address: "서울특별시 성동구 성수동2가 315-12",
    building_type: "office",
    gross_floor_area: 8520,
    approval_year: 2014,
    floors: 10,
    elevator_count: 3,
  },
  {
    id: 5,
    building_code: "SEOUL-OFFICE-005",
    name: "마포 스마트오피스",
    road_address: "서울특별시 마포구 월드컵북로 55",
    jibun_address: "서울특별시 마포구 성산동 515-39",
    building_type: "office",
    gross_floor_area: 6980,
    approval_year: 2011,
    floors: 8,
    elevator_count: 3,
  },
  {
    id: 6,
    building_code: "SEOUL-MEDICAL-001",
    name: "강남 메디컬플라자",
    road_address: "서울특별시 강남구 테헤란로 221",
    jibun_address: "서울특별시 강남구 역삼동 677-25",
    building_type: "medical",
    gross_floor_area: 5430,
    approval_year: 2017,
    floors: 9,
    elevator_count: 3,
  },
  {
    id: 7,
    building_code: "SEOUL-EDU-001",
    name: "잠실 교육문화센터",
    road_address: "서울특별시 송파구 올림픽로 214",
    jibun_address: "서울특별시 송파구 잠실동 40-1",
    building_type: "education",
    gross_floor_area: 4870,
    approval_year: 2010,
    floors: 6,
    elevator_count: 2,
  },
];

function searchFallbackBuildings(query: string) {
  const keyword = query.trim();
  const normalizedKeyword = keyword.replace(/\s/g, "");

  if (!keyword) {
    return fallbackBuildings;
  }

  return fallbackBuildings.filter((building) => {
    const values = [
      building.name,
      building.road_address,
      building.jibun_address,
      building.building_type,
      building.building_code,
    ];

    return values.some((value) => {
      const normalizedValue = value.replace(/\s/g, "");
      return value.includes(keyword) || normalizedValue.includes(normalizedKeyword);
    });
  });
}

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

export function reportHref(address: string) {
  return `/report?address=${encodeURIComponent(address)}`;
}

export function compareHref(address: string) {
  return `/compare?address=${encodeURIComponent(address)}`;
}

export async function searchBuildings(query = "") {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("query", query.trim());
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/buildings?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`건물 검색 API 오류: ${response.status}`);
    }

    return (await response.json()) as ApiBuilding[];
  } catch {
    return searchFallbackBuildings(query);
  }
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

export function getMonthlyEnergy(report: ReportApiResponse) {
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
