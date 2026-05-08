import Link from "next/link";
import {
  dashboardHrefForReportBuilding,
  fetchReport,
  fetchReportForParams,
  formatBuildingType,
  formatNumber,
  formatRatioGap,
  getMonthlyEnergy,
  reportHrefForReportBuilding,
  resolveAddressParam,
  type ReportApiResponse,
} from "@/lib/building-api";

function safePerArea(value: number, area: number) {
  return area > 0 ? value / area : 0;
}

function energyStatus(target: number, peer: number) {
  if (!Number.isFinite(target) || !Number.isFinite(peer) || peer <= 0) {
    return "산정 불가";
  }

  const ratio = target / peer;
  if (ratio <= 0.7) {
    return "아주 좋음";
  }
  if (ratio <= 0.9) {
    return "좋음";
  }
  if (ratio < 1.1) {
    return "평균권";
  }
  if (ratio < 1.3) {
    return "나쁨";
  }
  return "아주 나쁨";
}

function statusClass(status: string) {
  const classes: Record<string, string> = {
    "아주 좋음": "bg-emerald-50 text-emerald-700",
    좋음: "bg-teal-50 text-teal-700",
    평균권: "bg-amber-50 text-amber-700",
    나쁨: "bg-orange-50 text-orange-700",
    "아주 나쁨": "bg-rose-50 text-rose-700",
  };

  return classes[status] || "bg-slate-100 text-slate-500";
}

function buildComparisonMetrics(report: ReportApiResponse) {
  const monthlyEnergy = getMonthlyEnergy(report);
  const peakElectricity = Math.max(
    0,
    ...monthlyEnergy.map((item) => item.target_electricity_kwh),
  );
  const peerPeakElectricity = Math.max(
    0,
    ...monthlyEnergy.map((item) => item.peer_avg_electricity_kwh),
  );
  const peakGas = Math.max(0, ...monthlyEnergy.map((item) => item.target_gas_m3));
  const peerPeakGas = Math.max(0, ...monthlyEnergy.map((item) => item.peer_avg_gas_m3));
  const electricityPerArea =
    report.peer_benchmark?.electricity?.target_per_area ??
    safePerArea(report.energy_summary.target_avg_electricity_kwh, report.building.gross_floor_area);
  const peerElectricityPerArea =
    report.peer_benchmark?.electricity?.peer_mean_per_area ??
    safePerArea(report.energy_summary.peer_avg_electricity_kwh, report.building.gross_floor_area);
  const gasPerArea =
    report.peer_benchmark?.gas?.target_per_area ??
    safePerArea(report.energy_summary.target_avg_gas_m3, report.building.gross_floor_area);
  const peerGasPerArea =
    report.peer_benchmark?.gas?.peer_mean_per_area ??
    safePerArea(report.energy_summary.peer_avg_gas_m3, report.building.gross_floor_area);
  const totalPerArea = report.peer_benchmark?.total?.target_per_area;
  const peerTotalPerArea = report.peer_benchmark?.total?.peer_mean_per_area;

  return [
    {
      label: "월 평균 전기 사용량",
      unit: "kWh",
      target: report.energy_summary.target_avg_electricity_kwh,
      peer: report.energy_summary.peer_avg_electricity_kwh,
      status: energyStatus(report.energy_summary.target_avg_electricity_kwh, report.energy_summary.peer_avg_electricity_kwh),
    },
    {
      label: "월 평균 가스 사용량",
      unit: "m³",
      target: report.energy_summary.target_avg_gas_m3,
      peer: report.energy_summary.peer_avg_gas_m3,
      status: energyStatus(report.energy_summary.target_avg_gas_m3, report.energy_summary.peer_avg_gas_m3),
    },
    {
      label: "단위 면적당 전력 소비",
      unit: "kWh/㎡",
      target: electricityPerArea,
      peer: peerElectricityPerArea,
      status: energyStatus(electricityPerArea, peerElectricityPerArea),
    },
    {
      label: "단위 면적당 가스 소비",
      unit: "m³/㎡",
      target: gasPerArea,
      peer: peerGasPerArea,
      status: energyStatus(gasPerArea, peerGasPerArea),
    },
    ...(totalPerArea !== null &&
    totalPerArea !== undefined &&
    peerTotalPerArea !== null &&
    peerTotalPerArea !== undefined
      ? [
          {
            label: "총 에너지 원단위",
            unit: "유사군 산정 단위",
            target: totalPerArea,
            peer: peerTotalPerArea,
            status: energyStatus(totalPerArea, peerTotalPerArea),
          },
        ]
      : []),
    {
      label: "월 최대 전기 사용량",
      unit: "kWh",
      target: peakElectricity,
      peer: peerPeakElectricity,
      status: energyStatus(peakElectricity, peerPeakElectricity),
    },
    {
      label: "월 최대 가스 사용량",
      unit: "m³",
      target: peakGas,
      peer: peerPeakGas,
      status: energyStatus(peakGas, peerPeakGas),
    },
    {
      label: "에너지 낭비 지수",
      unit: "점",
      target: report.analysis.energy_waste_index,
      peer: 100,
      status: energyStatus(report.analysis.energy_waste_index, 100),
    },
  ];
}

export default async function ComparePage({
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
  }>;
}) {
  const params = await searchParams;
  const address = resolveAddressParam(params);

  if (!address) {
    return (
      <main className="min-h-screen bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <p className="text-sm font-black tracking-[0.25em] text-emerald-600">건물 선택</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              비교할 건물을 먼저 선택해 주세요.
            </h1>
            <p className="mx-auto mt-4 text-slate-600">
              건물을 선택하면 유사 건물 평균 대비 전기·가스 사용 지표를 비교할 수 있습니다.
            </p>
            <Link
              href="/search"
              className="mt-8 inline-flex h-14 items-center justify-center rounded-2xl bg-emerald-600 px-8 text-sm font-black text-white"
            >
              건물 검색하기
            </Link>
          </section>
        </div>
      </main>
    );
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
    error = err instanceof Error ? err.message : "비교 데이터를 불러오지 못했습니다.";
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <section className="rounded-[2rem] border border-red-100 bg-white p-8 text-center shadow-sm sm:p-12">
            <p className="text-sm font-black tracking-[0.25em] text-red-600">비교 오류</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              유사 건물 비교 데이터를 불러오지 못했습니다.
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
  const comparisonMetrics = buildComparisonMetrics(report);
  const peerBenchmark = report.peer_benchmark;
  const peerSummary = [
    ["유사군 순위", report.peer_group?.label || peerBenchmark?.peer_rank_label || "산정 불가"],
    ["유사군 수", peerBenchmark?.peer_count ? `${formatNumber(peerBenchmark.peer_count)}개` : "산정 불가"],
    ["상대 등급", peerBenchmark?.relative_grade?.grade || "산정 불가"],
    ["절대 등급", peerBenchmark?.absolute_grade?.grade || "산정 불가"],
    ["신뢰도", peerBenchmark?.reliability_label || "산정 불가"],
  ];

  return (
    <main className="min-h-screen py-12">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black tracking-[0.25em] text-emerald-600">유사 건물 비교</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">유사 건물 상세 비교</h1>
            <p className="mt-3 text-slate-600">
              {building.name}와 {peerBenchmark?.has_data ? "매핑된 유사군" : `서울권 ${formatBuildingType(building.building_type)}`} 평균 데이터를 비교합니다.
            </p>
          </div>
          <Link
            href={dashboardHrefForReportBuilding(building, address)}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700"
          >
            대시보드로 돌아가기
          </Link>
        </div>

        <section className="mb-8 grid gap-4 sm:grid-cols-5">
          {peerSummary.map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <div className="text-xs font-black text-slate-400">{label}</div>
              <div className="mt-2 text-xl font-black text-slate-950">{value}</div>
            </div>
          ))}
        </section>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-12 gap-4 bg-slate-950 px-6 py-5 text-xs font-black uppercase tracking-wider text-white">
            <div className="col-span-5">비교 항목</div>
            <div className="col-span-3 text-center text-emerald-300">{building.name}</div>
            <div className="col-span-3 text-center text-slate-300">유사 평균</div>
            <div className="col-span-1 text-center">상태</div>
          </div>
          <div className="divide-y divide-slate-100">
            {comparisonMetrics.map((metric) => (
              <div key={metric.label} className="grid grid-cols-12 items-center gap-4 px-6 py-5">
                <div className="col-span-5">
                  <div className="font-black text-slate-950">{metric.label}</div>
                  <div className="mt-1 text-xs font-bold text-slate-400">{metric.unit}</div>
                </div>
                <div className="col-span-3 text-center text-xl font-black text-slate-950">
                  {formatNumber(metric.target, 2)}
                </div>
                <div className="col-span-3 text-center text-xl font-black text-slate-400">
                  {formatNumber(metric.peer, 2)}
                </div>
                <div className="col-span-1 text-center">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusClass(metric.status)}`}
                  >
                    {metric.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">비교 해석</h2>
            <div className="mt-6 space-y-5">
              {peerBenchmark?.peer_overuse_type && (
                <div>
                  <h3 className="font-black text-slate-950">유사군 과다사용 유형: {peerBenchmark.peer_overuse_type}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    진단 유형은 {peerBenchmark.diagnosis_type || "유사군 비교"}이며, 신뢰도는 {peerBenchmark.reliability_label || "산정 불가"}입니다.
                  </p>
                </div>
              )}
              <div>
                <h3 className="font-black text-slate-950">전기 사용량은 {formatRatioGap(report.energy_summary.electricity_ratio)}입니다.</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  월별 전력 사용량과 유사 건물 평균을 함께 보며 피크가 큰 달의 운영 조건을 확인하는 것이 좋습니다.
                </p>
              </div>
              <div>
                <h3 className="font-black text-slate-950">가스 사용량은 {formatRatioGap(report.energy_summary.gas_ratio)}입니다.</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  난방 사용이 집중되는 달의 스케줄과 환기 손실을 함께 보면 개선 우선순위를 정하기 쉽습니다.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-sm">
            <h2 className="text-xl font-black text-emerald-300">개선 우선순위</h2>
            <div className="mt-6 space-y-4">
              {[
                ["1", "야간 자동 소등 및 대기전력 차단", "전력 기준 부하 관리"],
                ["2", "냉난방 스케줄 제어 최적화", "가스 피크 완화"],
                ["3", "월별 사용량 이상치 점검", "운영 패턴 보정"],
              ].map(([rank, title, effect]) => (
                <div key={rank} className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-black text-slate-500">{rank}</span>
                    <span className="text-sm font-bold">{title}</span>
                  </div>
                  <span className="text-xs font-black text-emerald-300">{effect}</span>
                </div>
              ))}
            </div>
            <Link
              href={reportHrefForReportBuilding(building, address)}
              className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white transition hover:bg-emerald-500"
            >
              AI 리포트 확인
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
