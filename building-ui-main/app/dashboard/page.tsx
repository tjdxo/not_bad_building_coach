import Link from "next/link";
import {
  compareHrefForReportBuilding,
  dashboardHref,
  fetchReport,
  fetchReportForParams,
  formatArea,
  formatBuildingDescriptor,
  getMonthlyEnergy,
  formatNumber,
  formatRatioGap,
  reportHrefForReportBuilding,
  resolveAddressParam,
  searchBuildings,
  type BuildingSearchItem,
  type EnergyUsageMonthlyPoint,
  type PeerBenchmark,
  type PeerMetric,
  type ReportApiResponse,
} from "@/lib/building-api";
import { ManualEnergyDashboard } from "./manual-energy-dashboard";

type ChartPoint = {
  month: string;
  tooltipMonth: string;
  value: number | null;
  avg: number | null;
  isEstimated: boolean;
};

function formatMonthShort(value?: string | null, year?: number, month?: number) {
  const raw = value || "";
  const match = raw.match(/^(\d{4})[-.](\d{1,2})/);
  if (match) {
    return `${match[1].slice(2)}.${match[2].padStart(2, "0")}`;
  }
  if (year && month) {
    return `${String(year).slice(2)}.${String(month).padStart(2, "0")}`;
  }
  return raw;
}

function formatMonthTooltip(value?: string | null, year?: number, month?: number) {
  const raw = value || "";
  const match = raw.match(/^(\d{4})[-.](\d{1,2})/);
  if (match) {
    return `${match[1]}.${match[2].padStart(2, "0")}`;
  }
  if (year && month) {
    return `${year}.${String(month).padStart(2, "0")}`;
  }
  return raw;
}

function latestTwelve<T>(items: T[]) {
  return items.slice(-12);
}

function buildEnergyUsageChartData(
  targetPoints?: EnergyUsageMonthlyPoint[],
  peerPoints?: EnergyUsageMonthlyPoint[],
) {
  if (!targetPoints?.length) {
    return null;
  }

  const peerByMonth = new Map((peerPoints ?? []).map((item) => [item.use_ym, item]));

  return latestTwelve(targetPoints).map((item, index) => {
    const peerItem = peerByMonth.get(item.use_ym) ?? peerPoints?.[index];

    return {
      month: formatMonthShort(item.use_ym || item.label),
      tooltipMonth: formatMonthTooltip(item.use_ym || item.label),
      value: item.value ?? null,
      avg: peerItem ? peerItem.value ?? null : null,
      isEstimated: item.is_estimated,
    };
  });
}

function buildChartData(report: ReportApiResponse, source: "electricity" | "gas") {
  const dbData = buildEnergyUsageChartData(
    source === "electricity" ? report.energy?.electricity_monthly : report.energy?.gas_monthly,
    source === "electricity"
      ? report.peer_benchmark?.peer_monthly?.electricity_mean
      : report.peer_benchmark?.peer_monthly?.gas_mean,
  );

  if (dbData) {
    return dbData;
  }

  return latestTwelve(getMonthlyEnergy(report)).map((item) => ({
    month: formatMonthShort(item.use_ym || item.label, item.year, item.month),
    tooltipMonth: formatMonthTooltip(item.use_ym || item.label, item.year, item.month),
    value: source === "electricity" ? item.target_electricity_kwh : item.target_gas_m3,
    avg: source === "electricity" ? item.peer_avg_electricity_kwh : item.peer_avg_gas_m3,
    isEstimated: item.is_estimated ?? false,
  }));
}

function buildActions(report: ReportApiResponse) {
  const electricityRatio = report.energy_summary.electricity_ratio;
  const gasRatio = report.energy_summary.gas_ratio;
  const actions = [];

  actions.push({
    title: electricityRatio > 1.08 ? "피크 전력과 야간 기준 부하 점검" : "전력 사용 추이 정기 점검",
    desc:
      electricityRatio > 1.08
        ? `월평균 전기 사용량이 유사 건물 대비 ${formatRatioGap(electricityRatio)} 수준입니다. 공조, 조명, 대기전력의 운영 시간을 먼저 확인해야 합니다.`
        : "전기 사용량은 유사 건물 평균권에 있어 급격한 피크 시간대만 추적하면 됩니다.",
    impact: electricityRatio > 1.12 ? "높음" : "중간",
  });

  actions.push({
    title: gasRatio > 1.08 ? "난방 설정 온도와 예열 시간 최적화" : "계절별 가스 사용량 관리",
    desc:
      gasRatio > 1.08
        ? `월평균 가스 사용량이 유사 건물 대비 ${formatRatioGap(gasRatio)} 수준입니다. 겨울철 난방 스케줄과 환기 손실을 함께 점검해야 합니다.`
        : "가스 사용량은 유사 건물 평균과 비슷해 계절별 변동폭 중심으로 관리하면 됩니다.",
    impact: gasRatio > 1.12 ? "높음" : "중간",
  });

  actions.push({
    title: "정책 지원 전 단계 데이터 정리",
    desc: `${report.building.name}의 면적, 준공연도, 월별 사용량을 기준으로 에너지효율화 지원 사업 신청 가능성을 검토합니다.`,
    impact: "중간",
  });

  return actions;
}

function formatChartValue(value: number | null, unit: string) {
  if (value === null) {
    return "데이터 없음";
  }

  return `${formatNumber(value, 1)} ${unit}`;
}

function BarChart({
  data,
  colorClass,
  unit,
  emptyMessage,
  peerMissingMessage,
}: {
  data: ChartPoint[];
  colorClass: string;
  unit: string;
  emptyMessage?: string;
  peerMissingMessage?: string;
}) {
  const maxValue = Math.max(
    1,
    ...data.map((item) => Math.max(item.value ?? 0, item.avg ?? 0)),
  );
  const hasData = data.some((item) => item.value !== null);
  const hasPeerData = data.some((item) => item.avg !== null);

  if (!hasData && emptyMessage) {
    return (
      <div className="mt-8 flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 text-center text-sm font-bold leading-6 text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="mt-8 w-full min-w-0 overflow-x-hidden">
      <div className="flex h-48 w-full min-w-0 items-end gap-1 sm:gap-2">
        {data.map((item) => {
          const value = item.value ?? 0;
          const avg = item.avg ?? 0;
          const valueLabel = formatChartValue(item.value, unit);
          const avgLabel = formatChartValue(item.avg, unit);

          return (
            <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-end justify-center gap-1">
                {hasPeerData && (
                  <div
                    className={`w-2 rounded-t ${item.avg === null ? "bg-transparent" : "bg-slate-200"}`}
                    style={{ height: `${(avg / maxValue) * 160}px` }}
                    title={`${item.tooltipMonth}\n유사 건물 평균: ${avgLabel}`}
                  />
                )}
                <div className="group relative flex items-end justify-center">
                  <div
                    className={`w-3 rounded-t ${colorClass}`}
                    style={{ height: `${(value / maxValue) * 160}px` }}
                    title={`${item.tooltipMonth}\n대상 건물: ${valueLabel}${
                      item.isEstimated ? " (추정)" : ""
                    }${item.avg !== null ? `\n유사 건물 평균: ${avgLabel}` : ""}`}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-3 hidden w-44 -translate-x-1/2 rounded-xl bg-slate-950 px-3 py-2 text-left text-[11px] font-bold leading-5 text-white shadow-xl group-hover:block">
                    <div className="font-black">{item.tooltipMonth}</div>
                    <div>
                      대상 건물: {valueLabel}
                      {item.isEstimated ? " (추정)" : ""}
                    </div>
                    {item.avg !== null && <div>유사 건물 평균: {avgLabel}</div>}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400">{item.month}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex items-center justify-center gap-6 text-xs font-bold">
        <span className="flex items-center gap-2 text-slate-700">
          <span className={`h-3 w-3 rounded ${colorClass}`} /> 대상 건물 ({unit})
        </span>
        {hasPeerData && (
          <span className="flex items-center gap-2 text-slate-500">
            <span className="h-3 w-3 rounded bg-slate-200" /> 유사 건물 평균
          </span>
        )}
      </div>
      {!hasPeerData && peerMissingMessage && (
        <p className="mt-3 text-center text-xs font-bold text-slate-400">{peerMissingMessage}</p>
      )}
    </div>
  );
}

type SummaryCard = {
  label: string;
  value: string;
  desc?: string;
  title?: string;
};

function formatSignedPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return `${value > 0 ? "+" : ""}${formatNumber(value, 1)}%`;
}

function metricStatusLabel(metric?: PeerMetric | null) {
  if (metric?.status_label) {
    return metric.status_label;
  }

  const diff = metric?.vs_peer_pct;
  if (diff === null || diff === undefined) {
    return "산정 불가";
  }
  if (diff >= 20) {
    return "높음";
  }
  if (diff <= -20) {
    return "낮음";
  }
  return "평균권";
}

function metricDescription(metric?: PeerMetric | null) {
  if (!metric) {
    return "유사군 데이터 없음";
  }

  const parts = [];
  const vsPeerPct = formatSignedPercent(metric.vs_peer_pct);
  if (vsPeerPct) {
    parts.push(`유사군 평균 대비 ${vsPeerPct}`);
  }
  if (metric.percentile !== null && metric.percentile !== undefined) {
    parts.push(`상위 ${formatNumber(metric.percentile, 1)}% 사용량`);
  }

  return parts.length > 0 ? parts.join(" · ") : "산정 불가";
}

function absoluteGradeSummary(peerBenchmark?: PeerBenchmark | null) {
  const absoluteGrade = peerBenchmark?.absolute_grade;
  const status = absoluteGrade?.status || absoluteGrade?.seoul_grade_applicability;

  if (!peerBenchmark?.has_data || !absoluteGrade) {
    return { value: "산정 불가", desc: "유사군 분석 결과 없음" };
  }

  if (status === "under_3000_out_of_scope") {
    return { value: "적용 제외", desc: "절대등급 적용 제외" };
  }

  if (status === "excluded_residential") {
    return { value: "적용 제외", desc: "주거용 건물 기준 적용 제외" };
  }

  if (!absoluteGrade.grade) {
    return { value: "산정 불가", desc: status ? "절대등급 적용 제외" : "서울시 기준 데이터 없음" };
  }

  return {
    value: absoluteGrade.grade,
    desc: status === "ok" ? "서울시 기준" : status || "서울시 기준",
  };
}

function relativeGradeSummary(peerBenchmark?: PeerBenchmark | null) {
  const relativeGrade = peerBenchmark?.relative_grade;
  if (!peerBenchmark?.has_data || !relativeGrade?.grade) {
    return { value: "산정 불가", desc: "유사군/서울 분포 기준" };
  }

  return {
    value: relativeGrade.grade,
    desc:
      relativeGrade.source === "appendix1_proxy_grade_by_current_peer_percentile"
        ? "현재 유사군 기준 proxy"
        : "서울 전체 분포 기준",
  };
}

function rankSummary(peerBenchmark?: PeerBenchmark | null) {
  if (!peerBenchmark?.has_data || !peerBenchmark.peer_rank_label) {
    return { value: "산정 불가", desc: "유사군 순위 산정 불가" };
  }

  return {
    value: peerBenchmark.peer_rank_label,
    desc: "총 에너지 원단위 기준",
  };
}

function buildSummaryCards(peerBenchmark?: PeerBenchmark | null): SummaryCard[] {
  const absoluteGrade = absoluteGradeSummary(peerBenchmark);
  const relativeGrade = relativeGradeSummary(peerBenchmark);
  const rank = rankSummary(peerBenchmark);

  return [
    { label: "절대 등급", value: absoluteGrade.value, desc: absoluteGrade.desc },
    { label: "상대 등급", value: relativeGrade.value, desc: relativeGrade.desc },
    {
      label: "전기",
      value: metricStatusLabel(peerBenchmark?.electricity),
      desc: metricDescription(peerBenchmark?.electricity),
    },
    {
      label: "가스",
      value: metricStatusLabel(peerBenchmark?.gas),
      desc: metricDescription(peerBenchmark?.gas),
    },
    { label: "유사군 순위", value: rank.value, desc: rank.desc },
    {
      label: "신뢰도",
      value: peerBenchmark?.has_data ? peerBenchmark.reliability_label || "산정 불가" : "산정 불가",
      desc:
        peerBenchmark?.reliability_score !== null && peerBenchmark?.reliability_score !== undefined
          ? `${formatNumber(peerBenchmark.reliability_score, 1)}점`
          : peerBenchmark?.message || "유사군 분석 결과 없음",
      title: peerBenchmark?.reliability_reason || undefined,
    },
  ];
}

function buildBenchmarkDetails(peerBenchmark?: PeerBenchmark | null) {
  const absoluteGrade = peerBenchmark?.absolute_grade;
  const absoluteStatus = absoluteGrade?.status || absoluteGrade?.seoul_grade_applicability;
  const relativeGrade = peerBenchmark?.relative_grade;
  const details = [];

  details.push({
    title: "절대 등급",
    value: absoluteGradeSummary(peerBenchmark).value,
    lines: [
      absoluteGrade?.grade_type && absoluteGrade?.area_band
        ? `서울시 기준 ${absoluteGrade.grade_type} / ${absoluteGrade.area_band}㎡ 구간`
        : absoluteGradeSummary(peerBenchmark).desc,
      absoluteGrade?.energy_intensity !== null && absoluteGrade?.energy_intensity !== undefined
        ? `원단위 ${formatNumber(absoluteGrade.energy_intensity, 1)}`
        : "",
      absoluteStatus && absoluteStatus !== "ok" ? `상태 ${absoluteStatus}` : "",
    ].filter((line): line is string => Boolean(line)),
  });

  details.push({
    title: "상대 등급",
    value: relativeGradeSummary(peerBenchmark).value,
    lines: [
      relativeGradeSummary(peerBenchmark).desc,
      relativeGrade?.absolute_relative_grade_match === false ? "절대 등급과 상대 등급이 다릅니다." : "",
    ].filter((line): line is string => Boolean(line)),
  });

  return details;
}

function BuildingPicker({ buildings }: { buildings: BuildingSearchItem[] }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      {buildings.map((item) => (
        <Link
          key={`${item.building_id ?? item.display_address}-${item.plat_plc ?? ""}`}
          href={dashboardHref(item.display_address)}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
        >
          <div className="text-lg font-black text-slate-950">{item.display_address}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.plat_plc}</p>
        </Link>
      ))}
    </div>
  );
}

async function getSuggestions() {
  try {
    const result = await searchBuildings({ district: "서울특별시 송파구", page: 1, limit: 6 });
    return result.items;
  } catch {
    return [];
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    address?: string;
    building?: string;
    query?: string;
    building_id?: string;
    plat_plc?: string;
    road_address?: string;
    bld_nm?: string;
    dong_nm?: string;
    grs_ar?: string;
    agnd_flr?: string;
    energy_mode?: string;
  }>;
}) {
  const params = await searchParams;
  const address = resolveAddressParam(params);

  if (!address) {
    const suggestions = await getSuggestions();

    return (
      <main className="min-h-screen bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <p className="text-sm font-black tracking-[0.25em] text-emerald-600">건물 선택</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              진단할 건물을 먼저 선택해 주세요.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              백엔드에 등록된 건물을 검색한 뒤 선택하면 전기·가스 사용량과 정책 정보를 확인할 수 있습니다.
            </p>
            <Link
              href="/search"
              className="mt-8 inline-flex h-14 items-center justify-center rounded-2xl bg-emerald-600 px-8 text-sm font-black text-white"
            >
              건물 검색하기
            </Link>
          </section>

          <BuildingPicker buildings={suggestions.slice(0, 6)} />
        </div>
      </main>
    );
  }

  if (params.energy_mode === "manual") {
    return <ManualEnergyDashboard address={address} buildingId={params.building_id} />;
  }

  let report: ReportApiResponse | null = null;
  let error = "";

  try {
    report = params.building_id
      ? await fetchReportForParams({
          address,
          building_id: params.building_id,
          plat_plc: params.plat_plc,
          road_address: params.road_address,
          bld_nm: params.bld_nm,
          dong_nm: params.dong_nm,
          grs_ar: params.grs_ar,
          agnd_flr: params.agnd_flr,
        })
      : await fetchReport(address);
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : "진단 리포트를 불러오지 못했습니다.";
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <section className="rounded-[2rem] border border-red-100 bg-white p-8 text-center shadow-sm sm:p-12">
            <p className="text-sm font-black tracking-[0.25em] text-red-600">진단 실패</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              해당 건물의 대시보드를 불러오지 못했습니다.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">{error}</p>
            <Link
              href={`/search?query=${encodeURIComponent(address)}`}
              className="mt-8 inline-flex h-14 items-center justify-center rounded-2xl bg-emerald-600 px-8 text-sm font-black text-white"
            >
              검색 결과로 돌아가기
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const building = report.building;
  const manualEnergyHref = `/search/manual-energy?${new URLSearchParams({
    address: building.display_address || building.road_address || address,
    building_id: String(building.building_id ?? building.id ?? ""),
  }).toString()}`;

  if (report.status === "energy_data_missing" || report.energy?.source === "none") {
    return (
      <main className="min-h-screen bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <section className="rounded-[2rem] border border-amber-100 bg-white p-8 shadow-sm sm:p-12">
            <p className="text-sm font-black tracking-[0.25em] text-amber-600">데이터 없음</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
              공공 에너지 사용량 데이터가 없습니다.
            </h1>
            <p className="mt-4 text-slate-600">
              {report.message || "이 건물은 현재 공공 에너지 사용량 데이터와 직접 매칭되지 않았습니다."}
            </p>
            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <div className="text-lg font-black text-slate-950">{building.display_address || building.road_address}</div>
              <p className="mt-2 text-sm font-semibold text-slate-500">{building.jibun_address}</p>
              {[building.bld_nm, building.dong_nm].filter(Boolean).length > 0 && (
                <p className="mt-2 text-sm font-black text-emerald-700">
                  {[building.bld_nm, building.dong_nm].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <p className="mt-8 text-sm font-semibold leading-6 text-slate-600">
              다음 방법 중 하나를 선택해 진단을 계속할 수 있습니다.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href={manualEnergyHref}
                className="inline-flex h-14 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white"
              >
                내 사용량 직접 입력하기
              </Link>
              <Link
                href={`/dashboard?${new URLSearchParams({ address, energy_mode: "ai_placeholder" }).toString()}`}
                className="inline-flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-700"
              >
                AI 추정값으로 진단 보기
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (params.energy_mode === "ai_placeholder") {
    return (
      <main className="min-h-screen bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <section className="rounded-[2rem] border border-emerald-100 bg-white p-8 shadow-sm sm:p-12">
            <p className="text-sm font-black tracking-[0.25em] text-emerald-600">AI 추정 준비 중</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">AI 기반 사용량 추정 기능은 준비 중입니다.</h1>
            <p className="mt-4 text-slate-600">
              현재 화면은 예시값을 생성하지 않습니다. 실제 고지서나 관리비 명세서 값을 입력하면 임시 진단 흐름으로 이어갈 수 있습니다.
            </p>
            <Link
              href={manualEnergyHref}
              className="mt-8 inline-flex h-14 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white"
            >
              직접 값 입력하기
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const electricityData = buildChartData(report, "electricity");
  const gasData = buildChartData(report, "gas");
  const hasEstimatedData = Boolean(
    report.energy?.is_estimated_included || report.energy?.is_estimated_gas_included,
  );
  const actions = buildActions(report);
  const buildingDescriptor = formatBuildingDescriptor(building);
  const buildingMeta = [
    building.road_address || building.display_address,
    buildingDescriptor,
    formatArea(building.gross_floor_area),
  ].filter(Boolean);
  const summaryCards = buildSummaryCards(report.peer_benchmark);
  const benchmarkDetails = buildBenchmarkDetails(report.peer_benchmark);
  const peerBenchmarkMissing = !report.peer_benchmark?.has_data;

  return (
    <main className="min-h-screen pb-16">
      <section className="border-b border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black tracking-[0.25em] text-emerald-600">진단 대시보드</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">{building.name}</h1>
              <p className="mt-3 text-slate-600">
                {buildingMeta.join(" · ")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {report.energy?.source === "db" && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    공공 데이터 기준
                  </span>
                )}
                {hasEstimatedData && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                    추정 포함
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {summaryCards.map((card) => (
                <div key={card.label} title={card.title} className="rounded-2xl bg-slate-50 p-4 text-center">
                  <div className="text-xs font-black text-slate-400">{card.label}</div>
                  <div className="mt-2 text-2xl font-black text-slate-950">{card.value}</div>
                  {card.desc && (
                    <div className="mt-2 text-[11px] font-bold leading-4 text-slate-400">{card.desc}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-8">
          <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">월별 전기 사용량</h2>
            <p className="mt-1 text-sm text-slate-500">최근 12개월 kWh 기준 비교</p>
            {report.energy?.is_estimated_included && (
              <p className="mt-3 text-xs font-bold text-amber-700">
                일부 월별 사용량은 주소 기반 매칭 및 연면적 비율 분배로 추정된 값입니다.
              </p>
            )}
            <BarChart
              data={electricityData}
              colorClass="bg-emerald-500"
              unit="kWh"
              emptyMessage="전기 사용량 데이터가 부족합니다."
              peerMissingMessage={
                peerBenchmarkMissing
                  ? "유사군 평균 데이터가 아직 연결되지 않았습니다."
                  : "유사군 월별 평균 데이터 없음"
              }
            />
          </div>
          <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">월별 가스 사용량</h2>
            <p className="mt-1 text-sm text-slate-500">최근 12개월 m³ 기준 비교</p>
            {report.energy?.is_estimated_gas_included && (
              <p className="mt-3 text-xs font-bold text-amber-700">
                일부 월별 가스 사용량은 주소 기반 매칭 및 연면적 비율 분배로 추정된 값입니다.
              </p>
            )}
            <BarChart
              data={gasData}
              colorClass="bg-blue-500"
              unit="m³"
              emptyMessage="가스 사용량 데이터가 부족합니다."
              peerMissingMessage={
                peerBenchmarkMissing
                  ? "유사군 평균 데이터가 아직 연결되지 않았습니다."
                  : "유사군 월별 평균 데이터 없음"
              }
            />
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {benchmarkDetails.map((detail) => (
            <section key={detail.title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="text-sm font-black text-slate-400">{detail.title}</div>
              <div className="mt-2 text-3xl font-black text-slate-950">{detail.value}</div>
              <div className="mt-4 space-y-2 text-sm font-semibold leading-6 text-slate-600">
                {detail.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-black text-slate-950">AI 우선 실행 액션</h2>
              <Link href={reportHrefForReportBuilding(building, address)} className="text-sm font-black text-emerald-600 hover:underline">
                전체 리포트
              </Link>
            </div>
            <div className="mt-6 space-y-4">
              {actions.map((action) => (
                <div key={action.title} className="rounded-2xl bg-slate-50 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-black text-slate-950">{action.title}</h3>
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
                      영향도 {action.impact}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{action.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="rounded-3xl bg-slate-950 p-7 text-white shadow-sm">
            <h2 className="text-xl font-black">정책 매칭</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {building.name}의 진단 결과와 건물 용도 기준으로 확인 가능한 지원 사업입니다.
            </p>
            <div className="mt-6 space-y-3">
              {["서울시 건물 에너지효율화(BRP) 융자 지원", "제로에너지건축 컨설팅 지원", "신재생에너지 보급 지원"].map((policy) => (
                <div key={policy} className="rounded-2xl bg-white/10 p-4 text-sm font-bold">
                  {policy}
                </div>
              ))}
            </div>
            <Link
              href={compareHrefForReportBuilding(building, address)}
              className="mt-7 inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-emerald-50"
            >
              유사 건물 상세 비교
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
