import Link from "next/link";
import {
  compareHrefForReportBuilding,
  dashboardHref,
  estimateCurrentCarbonEmission,
  CARBON_EMISSION_FACTORS_GCO2,
  fetchReport,
  fetchReportForParams,
  formatArea,
  formatBuildingDescriptor,
  getMonthlyEnergy,
  formatNumber,
  formatRatioGap,
  resolveAddressParam,
  searchBuildings,
  type BuildingSearchItem,
  type EnergyAiLiteDiagnosis,
  type EnergyUsageMonthlyPoint,
  type PeerBenchmark,
  type ReportApiResponse,
  type SavingEstimate,
  type SavingEstimateEnergy,
} from "@/lib/building-api";
import { buildContractorRecommendations } from "@/lib/contractor-recommendations";
import { getGradeVisualPair } from "@/lib/grade-visual";
import { buildPolicyRecommendations } from "@/lib/policy-recommendations";
import { AiReportPanel } from "./ai-report-panel";
import { ContractorRecommendationCard } from "./contractor-recommendation-card";
import { DetailAnalysisGate } from "./detail-analysis-gate";
import { GradeVisualCard } from "./grade-visual-card";
import { ManualEnergyDashboard } from "./manual-energy-dashboard";
import { PolicyRecommendationCard } from "./policy-recommendation-card";

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

function formatOptionalNumber(value?: number | null, unit = "") {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "산정 불가";
  }
  return `${formatNumber(value, 1)}${unit ? ` ${unit}` : ""}`;
}

function BarChart({
  data,
  colorClass,
  unit,
  emptyMessage,
  peerMissingMessage,
  showPeer = true,
}: {
  data: ChartPoint[];
  colorClass: string;
  unit: string;
  emptyMessage?: string;
  peerMissingMessage?: string;
  showPeer?: boolean;
}) {
  const maxValue = Math.max(
    1,
    ...data.map((item) => Math.max(item.value ?? 0, showPeer ? item.avg ?? 0 : 0)),
  );
  const hasData = data.some((item) => item.value !== null);
  const hasPeerData = showPeer && data.some((item) => item.avg !== null);

  if (!hasData && emptyMessage) {
    return (
      <div className="mt-8 flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 text-center text-sm font-bold leading-6 text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="mt-8 w-full min-w-0 overflow-visible pt-14">
      <div className="flex h-48 w-full min-w-0 items-end gap-1 overflow-visible sm:gap-2">
        {data.map((item, index) => {
          const value = item.value ?? 0;
          const avg = showPeer ? item.avg ?? 0 : 0;
          const valueLabel = formatChartValue(item.value, unit);
          const avgLabel = showPeer ? formatChartValue(item.avg, unit) : "";
          const tooltipPosition =
            index === 0
              ? "left-0 translate-x-0"
              : index === data.length - 1
                ? "right-0 translate-x-0"
                : "left-1/2 -translate-x-1/2";

          return (
            <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center gap-2 overflow-visible">
              <div className="flex w-full items-end justify-center gap-1 overflow-visible">
                {hasPeerData && (
                  <div
                    className={`energy-bar-rise w-2 rounded-t ${item.avg === null ? "bg-transparent" : "bg-slate-200"}`}
                    style={{ height: `${(avg / maxValue) * 160}px` }}
                  />
                )}
                <div className="group relative flex items-end justify-center overflow-visible">
                  <div
                    className={`energy-bar-rise w-3 rounded-t ${colorClass}`}
                    style={{ height: `${(value / maxValue) * 160}px` }}
                  />
                  <div
                    className={`pointer-events-none absolute bottom-full z-50 mb-3 hidden w-48 rounded-xl bg-slate-950 px-3 py-2 text-left text-[11px] font-bold leading-5 text-white shadow-2xl ring-1 ring-white/10 group-hover:block ${tooltipPosition}`}
                  >
                    <div className="font-black">{item.tooltipMonth}</div>
                    <div>
                      대상 건물: {valueLabel}
                      {item.isEstimated ? " (추정)" : ""}
                    </div>
                    {showPeer && item.avg !== null && <div>유사 건물 평균: {avgLabel}</div>}
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

function MonthlyUsageCharts({
  electricityData,
  gasData,
  isEstimatedIncluded,
  isEstimatedGasIncluded,
  peerBenchmarkMissing,
  showPeer,
}: {
  electricityData: ChartPoint[];
  gasData: ChartPoint[];
  isEstimatedIncluded?: boolean;
  isEstimatedGasIncluded?: boolean;
  peerBenchmarkMissing: boolean;
  showPeer: boolean;
}) {
  const peerMessage = showPeer
    ? peerBenchmarkMissing
      ? "유사군 평균 데이터가 아직 연결되지 않았습니다."
      : "유사군 월별 평균 데이터 없음"
    : "결제 후 유사 건물 평균을 함께 비교할 수 있습니다.";

  return (
    <>
      <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">월별 전기 사용량</h2>
            <p className="mt-1 text-sm text-slate-500">
              {showPeer ? "최근 12개월 kWh 기준 내 건물과 유사 건물 평균 비교" : "최근 12개월 kWh 기준 내 건물 사용량"}
            </p>
          </div>
          {!showPeer && (
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
              유사군 평균 잠금
            </span>
          )}
        </div>
        {isEstimatedIncluded && (
          <p className="mt-3 text-xs font-bold text-amber-700">
            일부 월별 사용량은 주소 기반 매칭 및 연면적 비율 분배로 추정된 값입니다.
          </p>
        )}
        <BarChart
          data={electricityData}
          colorClass="bg-emerald-500"
          unit="kWh"
          emptyMessage="전기 사용량 데이터가 부족합니다."
          peerMissingMessage={peerMessage}
          showPeer={showPeer}
        />
      </div>

      <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">월별 가스 사용량</h2>
            <p className="mt-1 text-sm text-slate-500">
              {showPeer ? "최근 12개월 m³ 기준 내 건물과 유사 건물 평균 비교" : "최근 12개월 m³ 기준 내 건물 사용량"}
            </p>
          </div>
          {!showPeer && (
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
              유사군 평균 잠금
            </span>
          )}
        </div>
        {isEstimatedGasIncluded && (
          <p className="mt-3 text-xs font-bold text-amber-700">
            일부 월별 가스 사용량은 주소 기반 매칭 및 연면적 비율 분배로 추정된 값입니다.
          </p>
        )}
        <BarChart
          data={gasData}
          colorClass="bg-blue-500"
          unit="m³"
          emptyMessage="가스 사용량 데이터가 부족합니다."
          peerMissingMessage={peerMessage}
          showPeer={showPeer}
        />
      </div>
    </>
  );
}

type SummaryCard = {
  label: string;
  value: string;
  desc?: string;
  title?: string;
};

function formatKrw(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return "0원";
  }
  return `${new Intl.NumberFormat("ko-KR").format(Math.round(value))}원`;
}

function formatApproxKrw(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return "0원";
  }
  const rounded = Math.round(value);
  if (rounded >= 100_000_000) {
    const eok = rounded / 100_000_000;
    return `약 ${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: eok >= 10 ? 0 : 1 }).format(eok)}억 원`;
  }
  if (rounded >= 10_000) {
    return `약 ${new Intl.NumberFormat("ko-KR").format(Math.round(rounded / 10_000))}만 원`;
  }
  return `약 ${new Intl.NumberFormat("ko-KR").format(rounded)}원`;
}

function savingBenchmarkLabel(type?: string | null) {
  if (type === "peer_top10_exact") {
    return "유사군 상위 10% 실제 기준";
  }
  if (type === "estimated_from_best_and_mean") {
    return "유사군 우수건물 기반 상위 10% 근사 기준";
  }
  if (type === "estimated_from_peer_mean") {
    return "유사군 평균 기반 상위권 근사 기준";
  }
  return "산정 기준 부족";
}

function formatSavingUsage(item?: SavingEstimateEnergy | null) {
  if (!item?.available || !isDisplayNumber(item.saving_usage)) {
    return "산정 불가";
  }
  return `${formatNumber(item.saving_usage, 0)} ${item.unit === "m3" ? "m³" : item.unit || ""}`;
}

function SavingEstimateCard({ estimate }: { estimate?: SavingEstimate | null }) {
  if (!estimate) {
    return null;
  }

  const totalSaving = estimate.total?.saving_krw ?? 0;
  const hasSaving = estimate.available && totalSaving > 0;
  const electricitySaving = estimate.electricity?.saving_krw ?? 0;
  const gasSaving = estimate.gas?.saving_krw ?? 0;
  const noSavingMessage = estimate.available
    ? "이미 유사군 상위 10% 기준 이내 수준입니다."
    : estimate.reason || "예상 절약액을 산정하기 위한 비교 데이터가 부족합니다.";
  const formatEnergySavingValue = (value: number) => (value > 0 ? formatApproxKrw(value) : "상위권 기준 이하");

  return (
    <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black tracking-[0.18em] text-emerald-700">SAVING ESTIMATE</p>
          <h2 className="mt-2 text-xl font-black text-slate-950">
            {estimate.title || "유사군 상위 10% 기준 예상 절약액"}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-emerald-900">
            {hasSaving
              ? "유사군 상위권 수준까지 줄였을 때의 연간 에너지 비용 절감 여지입니다."
              : noSavingMessage}
          </p>
        </div>
        <div className="rounded-3xl bg-white px-6 py-5 text-right shadow-sm ring-1 ring-emerald-100">
          <div className="text-xs font-black text-slate-400">{hasSaving ? "연간 예상 절약액" : "현재 절감 상태"}</div>
          <div className={`mt-2 font-black text-emerald-700 ${hasSaving ? "text-3xl" : "text-xl leading-7"}`}>
            {hasSaving ? formatApproxKrw(totalSaving) : "상위 10% 이내"}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-emerald-100">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black text-slate-950">전기</div>
            <div className="text-lg font-black text-slate-950">{formatEnergySavingValue(electricitySaving)}</div>
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            절감 가능량 {formatSavingUsage(estimate.electricity)} · 단가{" "}
            {formatKrw(estimate.unit_price?.electricity_krw_per_kwh)}/kWh
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-emerald-100">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-black text-slate-950">가스</div>
            <div className="text-lg font-black text-slate-950">{formatEnergySavingValue(gasSaving)}</div>
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500">
            절감 가능량 {formatSavingUsage(estimate.gas)} · 단가{" "}
            {formatKrw(estimate.unit_price?.gas_krw_per_m3)}/m³
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-1 text-xs font-semibold leading-5 text-slate-500">
        <p>기준: {savingBenchmarkLabel(estimate.benchmark_type)}</p>
        <p>{estimate.caution || "실제 고지서 금액이 아닌 참고용 추정액입니다."}</p>
      </div>
    </section>
  );
}

function isDisplayNumber(value?: number | null): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

function absoluteGradeSummary(peerBenchmark?: PeerBenchmark | null) {
  const absoluteGrade = peerBenchmark?.absolute_grade;
  const status = absoluteGrade?.status || absoluteGrade?.seoul_grade_applicability;

  if (!peerBenchmark?.has_data || !absoluteGrade) {
    return { value: "산정 불가", desc: "유사군 분석 결과 없음" };
  }

  if (status === "under_3000_out_of_scope") {
    return { value: "적용 제외", desc: "연면적 기준 적용 제외" };
  }

  if (status === "excluded_residential") {
    return { value: "적용 제외", desc: "주거용 건물 기준 적용 제외" };
  }

  if (!absoluteGrade.grade) {
    return { value: "산정 불가", desc: "절대등급 산정 기준 확인 불가" };
  }

  return {
    value: absoluteGrade.grade,
    desc: "서울시 및 공공 데이터 기반 자체 산정",
  };
}

function absoluteGradeReason(status?: string | null) {
  if (!status) {
    return "원인: 절대등급 산정 기준을 확인할 수 없습니다.";
  }

  const labels: Record<string, string> = {
    excluded_residential: "원인: 주거용 건물은 현재 절대등급 산정 기준 적용 대상이 아닙니다.",
    under_3000_out_of_scope: "원인: 연면적 3,000㎡ 미만 건물은 현재 절대등급 산정 기준 적용 대상이 아닙니다.",
    ok: "서울시 및 공공 데이터 기반 자체 기준으로 절대등급을 산정했습니다.",
  };

  return labels[status] || "원인: 절대등급 산정 기준을 확인할 수 없습니다.";
}

function shouldShowAbsoluteGrade(peerBenchmark?: PeerBenchmark | null) {
  const absoluteGrade = peerBenchmark?.absolute_grade;
  return Boolean(peerBenchmark?.has_data && absoluteGrade?.grade);
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
        ? "현재 유사군 분포 기준 보정"
        : "서울시 내 유사 건물군 분포 기준",
  };
}

function buildSummaryCards(peerBenchmark?: PeerBenchmark | null, currentCarbonEmissionTons?: number): SummaryCard[] {
  const absoluteGrade = absoluteGradeSummary(peerBenchmark);
  const relativeGrade = relativeGradeSummary(peerBenchmark);
  const carbonCard: SummaryCard = {
    label: "온실가스 배출량",
    value:
      currentCarbonEmissionTons !== null && currentCarbonEmissionTons !== undefined
        ? `${formatNumber(currentCarbonEmissionTons, 1)}tCO₂`
        : "산정 불가",
    desc: "현재 사용량 연간 환산",
    title: `온실가스 배출량 = 에너지 사용량 × 탄소배출계수. 전기 1kWh=${CARBON_EMISSION_FACTORS_GCO2.electricityKwh}gCO₂, 수도 1㎥=${CARBON_EMISSION_FACTORS_GCO2.waterM3}gCO₂, 가스 1㎥=${CARBON_EMISSION_FACTORS_GCO2.gasM3}gCO₂`,
  };

  return [
    { label: "절대 등급", value: absoluteGrade.value, desc: absoluteGrade.desc },
    { label: "상대 등급", value: relativeGrade.value, desc: relativeGrade.desc },
    carbonCard,
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
  const absoluteEnergyIntensity = absoluteGrade?.energy_intensity;
  const relativeGrade = peerBenchmark?.relative_grade;
  const details = [];

  details.push({
    title: "절대 등급",
    value: absoluteGradeSummary(peerBenchmark).value,
    lines: [
      absoluteGrade?.grade_type && absoluteGrade?.area_band
        ? `서울시 기준 ${absoluteGrade.grade_type} / ${absoluteGrade.area_band}㎡ 구간`
        : absoluteGradeSummary(peerBenchmark).desc,
      isDisplayNumber(absoluteEnergyIntensity)
        ? `원단위 ${formatNumber(absoluteEnergyIntensity, 1)}`
        : "원단위 산정 불가",
      absoluteGradeReason(absoluteStatus),
    ].filter((line): line is string => Boolean(line)),
  });

  details.push({
    title: "상대 등급",
    value: relativeGradeSummary(peerBenchmark).value,
    lines: [
      relativeGradeSummary(peerBenchmark).desc,
      "서울시 건물 데이터에서 용도·연면적·층수·구조 등 조건이 유사한 건물군을 구성하고, 그 유사군 내 에너지 사용량 분포를 기준으로 산정한 참고용 상대등급입니다.",
      relativeGrade?.absolute_relative_grade_match === false ? "절대 등급과 상대 등급이 다릅니다." : "",
    ].filter((line): line is string => Boolean(line)),
  });

  details.push({
    title: "분석 기준 안내",
    value: "참고용",
    lines: [
      "절대 등급: 서울시 건물 에너지 신고·등급제 및 기후동행건물 프로젝트의 취지와 건물 유형별·규모별 에너지원단위 등급 체계를 참고합니다.",
      "상대 등급: 서울시 건물 데이터에서 용도·연면적·층수·구조 등 조건이 유사한 건물군을 구성하고, 그 유사군 내 에너지 사용량 분포를 기준으로 산정한 참고용 상대등급입니다.",
      "비교군: 용도, 연면적, 층수, 구조, 세대/호수, 지역지구 등 사용 가능한 건물 속성을 기반으로 구성합니다.",
      "AI 추정 진단: 실측 에너지 데이터가 부족한 건물은 CatBoost/XGBoost 기반 AI 모델과 유사건물 baseline을 활용해 참고용 사용량을 추정합니다.",
      "본 서비스의 등급과 진단 결과는 공공데이터 및 자체 분석 로직을 기반으로 한 참고용 결과이며, 서울시 공식 등급 또는 법적 효력을 갖는 인증 결과가 아닙니다.",
    ],
  });

  return details;
}

function AnalysisCriteriaAccordion({ details }: { details: ReturnType<typeof buildBenchmarkDetails> }) {
  return (
    <details className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <summary className="cursor-pointer list-none text-lg font-black text-slate-950">
        분석 기준 보기
        <span className="ml-2 text-sm font-bold text-slate-400">∨</span>
      </summary>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {details.map((detail) => (
          <section key={detail.title} className="rounded-2xl bg-slate-50 p-5">
            <div className="text-xs font-black text-slate-400">{detail.title}</div>
            <div className="mt-2 text-2xl font-black text-slate-950">{detail.value}</div>
            <div className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-600">
              {detail.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-4 text-xs font-semibold leading-5 text-slate-400">
        본 제공 데이터는 공공데이터 기반의 추정·분석 결과이며 법적 효력을 가지지 않습니다. 단순 참고용으로만 활용해 주세요.
      </p>
    </details>
  );
}

function aiMainValue(diagnosis?: EnergyAiLiteDiagnosis | null) {
  return (
    diagnosis?.display_main_kwh ??
    diagnosis?.service_reference_kwh ??
    diagnosis?.ai_pred_kwh ??
    diagnosis?.baseline_kwh ??
    null
  );
}

function AiSummaryCard({ label, value, desc }: { label: string; value: string; desc?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="text-xs font-black text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
      {desc && <div className="mt-2 text-xs font-bold leading-5 text-slate-500">{desc}</div>}
    </div>
  );
}

function AiEnergyCard({
  title,
  diagnosis,
  missingMessage,
  gasCaution,
}: {
  title: string;
  diagnosis?: EnergyAiLiteDiagnosis | null;
  missingMessage: string;
  gasCaution?: boolean;
}) {
  if (!diagnosis?.backend_has_result) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-200 bg-white p-7 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{missingMessage}</p>
      </section>
    );
  }

  const badges = [
    diagnosis.diagnosis_label,
    diagnosis.confidence_label ? `신뢰도 ${diagnosis.confidence_label}` : "",
    diagnosis.front_badge,
    diagnosis.quality_flag,
  ].filter(Boolean);
  const metricRows = [
    ["핵심 표시값", formatOptionalNumber(aiMainValue(diagnosis), "kWh")],
    ["AI 예측값", formatOptionalNumber(diagnosis.ai_pred_kwh, "kWh")],
    ["유사건물 baseline", formatOptionalNumber(diagnosis.baseline_kwh, "kWh")],
    ["서비스 기준값", formatOptionalNumber(diagnosis.service_reference_kwh, "kWh")],
    ["예측 원단위", formatOptionalNumber(diagnosis.estimated_per_area_year, "kWh/㎡·년")],
    ["유사군 중앙값 대비", formatOptionalNumber(diagnosis.vs_peer_median_pct, "%")],
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">{title}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span key={badge} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                {badge}
              </span>
            ))}
          </div>
        </div>
        {diagnosis.backend_needs_user_input && (
          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
            실제 고지서 확인 권장
          </span>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {metricRows.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-black text-slate-400">{label}</div>
            <div className="mt-2 text-lg font-black text-slate-950">{value}</div>
          </div>
        ))}
      </div>

      {(diagnosis.quality_reason || diagnosis.service_strategy) && (
        <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
          {diagnosis.quality_reason || "추정 품질과 비교군 기준을 함께 확인해 주세요."}
          {diagnosis.service_strategy && <span> 서비스 전략: {diagnosis.service_strategy}</span>}
        </div>
      )}
      {gasCaution && (
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
          가스 사용량은 난방방식, 지역난방 여부, 온수·취사 방식에 따라 차이가 커 실제 고지서 확인이 필요합니다.
        </p>
      )}
      {diagnosis.summary && (
        <div className="mt-5">
          <div className="text-sm font-black text-slate-400">AI 요약</div>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">{diagnosis.summary}</p>
        </div>
      )}
      {diagnosis.recommendation && (
        <div className="mt-5">
          <div className="text-sm font-black text-slate-400">권고 사항</div>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">{diagnosis.recommendation}</p>
        </div>
      )}
    </section>
  );
}

function AiEstimatedDashboard({
  report,
  address,
  defaultOpenAiReport = false,
}: {
  report: ReportApiResponse;
  address: string;
  defaultOpenAiReport?: boolean;
}) {
  const building = report.building;
  const aiDiagnosis = report.ai_diagnosis;
  const electric = aiDiagnosis?.electric;
  const gas = aiDiagnosis?.gas;
  const needsUserInput = Boolean(aiDiagnosis?.needs_user_input);
  const absoluteGrade = absoluteGradeSummary(report.peer_benchmark);
  const showAbsoluteGrade = shouldShowAbsoluteGrade(report.peer_benchmark);
  const gradeVisuals = getGradeVisualPair({
    absoluteGrade: report.peer_benchmark?.absolute_grade?.grade,
    absoluteStatus:
      report.peer_benchmark?.absolute_grade?.status ||
      report.peer_benchmark?.absolute_grade?.seoul_grade_applicability,
    relativeGrade:
      report.peer_benchmark?.relative_grade?.grade ||
      report.peer_benchmark?.relative_grade?.relative_grade_by_seoul_percentile ||
      report.peer_benchmark?.relative_grade?.appendix1_proxy_grade_by_current_peer_percentile,
  });
  const manualEnergyHref = `/search/manual-energy?${new URLSearchParams({
    address: building.display_address || building.road_address || address,
    building_id: String(building.building_id ?? building.id ?? ""),
  }).toString()}`;
  const buildingDescriptor = formatBuildingDescriptor(building);
  const buildingMeta = [
    building.road_address || building.display_address,
    buildingDescriptor,
    formatArea(building.gross_floor_area),
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <section className="border-b border-amber-100 bg-white py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black tracking-[0.25em] text-amber-600">AI 추정 진단 대시보드</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">{building.name}</h1>
              <p className="mt-3 text-slate-600">{buildingMeta.join(" · ")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  showAbsoluteGrade ? `절대 등급 ${absoluteGrade.value}` : "",
                  "AI 추정 기반",
                  "참고용 진단",
                  needsUserInput ? "데이터 확인 필요" : "추정 결과 확인",
                ].filter(Boolean).map((badge) => (
                  <span key={badge} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-5">
          <GradeVisualCard
            absoluteVisual={gradeVisuals.absoluteVisual}
            relativeVisual={gradeVisuals.relativeVisual}
            className="w-full"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {showAbsoluteGrade && (
            <AiSummaryCard label="절대 등급" value={absoluteGrade.value} desc={absoluteGrade.desc} />
          )}
          <AiSummaryCard label="진단 방식" value="AI 추정 기반" desc="실측 사용량 부족 시 참고용으로 표시" />
          <AiSummaryCard label="전기 추정 사용량" value={formatOptionalNumber(aiMainValue(electric), "kWh")} desc="display_main 우선" />
          <AiSummaryCard label="가스 추정 사용량" value={formatOptionalNumber(aiMainValue(gas), "kWh")} desc="display_main 우선" />
          <AiSummaryCard label="전기 신뢰도" value={electric?.confidence_label || "산정 불가"} desc={electric?.front_badge || electric?.quality_flag || ""} />
          <AiSummaryCard label="가스 신뢰도" value={gas?.confidence_label || "산정 불가"} desc={gas?.front_badge || gas?.quality_flag || ""} />
        </div>

        </div>

        <div className="mt-8">
          <SavingEstimateCard estimate={report.saving_estimate} />
        </div>

        <div className="mt-8 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">AI 리포트</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                AI 추정값, baseline, 서비스 기준값, 유사군 정보를 종합해 참고용 리포트를 생성합니다.
              </p>
            </div>
            <AiReportPanel report={report} address={address} defaultOpen={defaultOpenAiReport} />
          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-amber-100 bg-amber-50 p-6">
          <h2 className="text-lg font-black text-slate-950">정확한 진단을 위해 실제 사용량 입력을 권장합니다.</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-amber-800">
            AI 추정값과 유사건물 기준값 차이가 크거나 신뢰도가 낮은 경우, 전기·가스 고지서 기반 사용량을 입력하면 더 현실적인 진단 흐름으로 이어갈 수 있습니다.
          </p>
          <Link
            href={manualEnergyHref}
            className="mt-5 inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white"
          >
            실제 사용량 입력하기
          </Link>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <AiEnergyCard title="전기 AI 진단" diagnosis={electric} missingMessage="전기 추정 결과가 아직 없습니다." />
          <AiEnergyCard title="가스 AI 진단" diagnosis={gas} missingMessage="가스 추정 결과가 아직 없습니다." gasCaution />
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">분석 기준 안내</h2>
          <div className="mt-4 space-y-3 text-sm font-semibold leading-7 text-slate-600">
            <p>절대 등급은 서울시 건물 에너지 신고·등급제 및 기후동행건물 프로젝트의 취지와 건물 유형별·규모별 에너지원단위 등급 체계를 참고합니다.</p>
            <p>AI 추정 진단은 CatBoost/XGBoost 기반 AI 모델, 유사건물 baseline, 서비스 기준값을 함께 활용한 참고용 결과입니다.</p>
            <p>가스는 난방방식, 지역난방 여부, 온수·취사 방식에 따라 오차가 커질 수 있으므로 실제 고지서 확인이 필요합니다.</p>
            <p>본 서비스의 등급과 진단 결과는 공공데이터 및 자체 분석 로직을 기반으로 한 참고용 결과이며, 서울시 공식 등급 또는 법적 효력을 갖는 인증 결과가 아닙니다.</p>
          </div>
        </section>

        <p className="mt-4 text-xs font-semibold leading-5 text-slate-400">
          ※ 본 제공 데이터는 법적 효력을 가지지 않으며, 단순 참고용으로만 활용해 주세요.
        </p>
      </section>
    </main>
  );
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
    open_ai_report?: string;
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
  const shouldOpenAiReport = params.open_ai_report === "1" || params.open_ai_report === "true";
  const manualEnergyHref = `/search/manual-energy?${new URLSearchParams({
    address: building.display_address || building.road_address || address,
    building_id: String(building.building_id ?? building.id ?? ""),
  }).toString()}`;

  if (report.report_mode === "estimated") {
    return <AiEstimatedDashboard report={report} address={address} defaultOpenAiReport={shouldOpenAiReport} />;
  }

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
  const currentCarbonEmissionTons = estimateCurrentCarbonEmission(report);
  const summaryCards = buildSummaryCards(report.peer_benchmark, currentCarbonEmissionTons);
  const benchmarkDetails = buildBenchmarkDetails(report.peer_benchmark);
  const peerBenchmarkMissing = !report.peer_benchmark?.has_data;
  const gradeVisuals = getGradeVisualPair({
    absoluteGrade: report.peer_benchmark?.absolute_grade?.grade,
    absoluteStatus:
      report.peer_benchmark?.absolute_grade?.status ||
      report.peer_benchmark?.absolute_grade?.seoul_grade_applicability,
    relativeGrade:
      report.peer_benchmark?.relative_grade?.grade ||
      report.peer_benchmark?.relative_grade?.relative_grade_by_seoul_percentile ||
      report.peer_benchmark?.relative_grade?.appendix1_proxy_grade_by_current_peer_percentile,
  });
  const policyRecommendations = buildPolicyRecommendations(report);
  const contractorRecommendations = buildContractorRecommendations(report, policyRecommendations);
  return (
    <main className="min-h-screen pb-16">
      <section className="border-b border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="space-y-8">
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
            <div className="w-full space-y-5">
              <GradeVisualCard
                absoluteVisual={gradeVisuals.absoluteVisual}
                relativeVisual={gradeVisuals.relativeVisual}
                className="mx-auto w-full max-w-5xl"
              />
              <div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {summaryCards.map((card) => (
                    <div key={card.label} title={card.title} className="min-w-0 rounded-2xl bg-slate-50 p-4 text-center">
                      <div className="text-xs font-black leading-4 text-slate-400">{card.label}</div>
                      <div className="mt-2 break-keep text-2xl font-black leading-tight text-slate-950">{card.value}</div>
                      {card.desc && (
                        <div className="mt-2 break-keep text-[11px] font-bold leading-4 text-slate-400">{card.desc}</div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] font-semibold leading-5 text-slate-400">
                  ※ 온실가스 배출량 = 현재 에너지 사용량 × 탄소배출계수. 전기 1kWh = 424gCO₂,
                  수도 1㎥ = 332gCO₂, 가스 1㎥ = 2,240gCO₂ 기준입니다. 현재 진단 데이터에는 수도 사용량이 없어 전기와 가스 기준으로 산정합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <AnalysisCriteriaAccordion details={benchmarkDetails} />

        <div className="mt-8">
          <DetailAnalysisGate
            report={report}
            lockedChildren={
              <div className="grid grid-cols-1 gap-8">
                <MonthlyUsageCharts
                  electricityData={electricityData}
                  gasData={gasData}
                  isEstimatedIncluded={report.energy?.is_estimated_included}
                  isEstimatedGasIncluded={report.energy?.is_estimated_gas_included}
                  peerBenchmarkMissing={peerBenchmarkMissing}
                  showPeer={false}
                />
              </div>
            }
          >
            <div className="grid grid-cols-1 gap-8">
              <SavingEstimateCard estimate={report.saving_estimate} />
              <MonthlyUsageCharts
                electricityData={electricityData}
                gasData={gasData}
                isEstimatedIncluded={report.energy?.is_estimated_included}
                isEstimatedGasIncluded={report.energy?.is_estimated_gas_included}
                peerBenchmarkMissing={peerBenchmarkMissing}
                showPeer
              />
            </div>

            <section className="mt-10 grid gap-8">
              <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">AI 우선 실행 액션</h2>
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

              <div className="grid gap-8">
                <PolicyRecommendationCard recommendations={policyRecommendations} />
                <ContractorRecommendationCard recommendations={contractorRecommendations} />
              </div>
            </section>

            <section className="mt-8 rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-black tracking-[0.2em] text-emerald-600">다음 분석 단계</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                    유사 건물 비교와 리포트 생성을 이어서 확인하세요
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                    유사 건물 상세 비교에서는 내 건물이 유사군 평균 대비 어느 항목에서 차이가 큰지 확인할 수 있습니다. AI 리포트에서는 원인 가설, 개선 우선순위, 리스크 시나리오를 확인할 수 있습니다.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[430px]">
                  <Link
                    href={compareHrefForReportBuilding(building, address)}
                    className="inline-flex h-14 items-center justify-center rounded-2xl bg-emerald-500 px-5 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-600"
                  >
                    유사 건물 상세 비교
                  </Link>
                  <AiReportPanel
                    report={report}
                    address={address}
                    defaultOpen={shouldOpenAiReport}
                    buttonClassName="inline-flex h-14 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-500"
                  />
                </div>
              </div>
            </section>
          </DetailAnalysisGate>
        </div>
      </section>
    </main>
  );
}
