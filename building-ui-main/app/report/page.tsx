import Link from "next/link";
import {
  compareHref,
  dashboardHref,
  estimateCarbonSaving,
  fetchReport,
  formatArea,
  formatBuildingType,
  formatNumber,
  formatRatioGap,
  resolveAddressParam,
  searchBuildings,
  type ApiBuilding,
  type ReportApiResponse,
} from "@/lib/building-api";

function splitReport(reportText: string) {
  return reportText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildAnalysisPoints(report: ReportApiResponse) {
  return [
    {
      title: "전기 사용량 비교",
      content: `월평균 전기 사용량은 ${formatNumber(report.energy_summary.target_avg_electricity_kwh)}kWh이고, 유사 건물 평균 대비 ${formatRatioGap(report.energy_summary.electricity_ratio)} 수준입니다.`,
    },
    {
      title: "가스 사용량 비교",
      content: `월평균 가스 사용량은 ${formatNumber(report.energy_summary.target_avg_gas_m3)}m³이고, 유사 건물 평균 대비 ${formatRatioGap(report.energy_summary.gas_ratio)} 수준입니다.`,
    },
    {
      title: "진단 해석",
      content: report.analysis.interpretation,
    },
  ];
}

function BuildingPicker({ buildings }: { buildings: ApiBuilding[] }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      {buildings.map((item) => (
        <Link
          key={item.id}
          href={`/report?address=${encodeURIComponent(item.road_address)}`}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
        >
          <div className="text-lg font-black text-slate-950">{item.name}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.road_address}</p>
        </Link>
      ))}
    </div>
  );
}

async function getSuggestions() {
  try {
    return await searchBuildings("");
  } catch {
    return [];
  }
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ address?: string; building?: string; query?: string }>;
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
              AI 리포트를 볼 건물을 먼저 선택해 주세요.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              검색 결과에서 건물을 선택하면 해당 건물의 진단 요약, 개선 방안, 정책 정보를 확인할 수 있습니다.
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

  let report: ReportApiResponse | null = null;
  let error = "";

  try {
    report = await fetchReport(address);
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : "AI 리포트를 불러오지 못했습니다.";
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <section className="rounded-[2rem] border border-red-100 bg-white p-8 text-center shadow-sm sm:p-12">
            <p className="text-sm font-black tracking-[0.25em] text-red-600">리포트 오류</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              해당 건물의 AI 리포트를 불러오지 못했습니다.
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
  const analysisPoints = buildAnalysisPoints(report);
  const reportLines = splitReport(report.report_text);
  const carbonSaving = estimateCarbonSaving(report);
  const effects = [
    ["효율 등급", report.analysis.grade],
    ["전기 격차", formatRatioGap(report.energy_summary.electricity_ratio)],
    ["가스 격차", formatRatioGap(report.energy_summary.gas_ratio)],
    ["탄소 절감 여지", `${formatNumber(carbonSaving, 1)}tCO₂e`],
  ];

  return (
    <main className="min-h-screen py-12">
      <div className="mx-auto max-w-4xl px-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white">
                AI 리포트
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">에너지 진단 분석 리포트</h1>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold text-slate-500">
                <span>{building.name}</span>
                <span>{building.building_code}</span>
                <span>{formatBuildingType(building.building_type)}</span>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {building.road_address} · {formatArea(building.gross_floor_area)} · {building.approval_year}년
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-6 text-sm font-black text-white"
            >
              PDF 다운로드
            </button>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] bg-emerald-600 p-8 text-white shadow-sm">
          <p className="text-sm font-black tracking-[0.25em] text-emerald-100">진단 요약</p>
          <p className="mt-4 text-2xl font-black leading-relaxed">
            {building.name}의 에너지 낭비 지수는 {formatNumber(report.analysis.energy_waste_index, 1)}이며, 진단 등급은 {report.analysis.grade}입니다.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-black text-slate-950">핵심 분석</h2>
          <div className="mt-6 grid gap-5">
            {analysisPoints.map((point, index) => (
              <article key={point.title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                <h3 className="text-lg font-black text-slate-950">
                  {index + 1}. {point.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{point.content}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-black text-slate-950">AI 리포트 원문</h2>
          <div className="mt-6 space-y-5">
            {reportLines.map((line) => (
              <article key={line} className="rounded-3xl border border-slate-200 bg-slate-50 p-7">
                <p className="text-sm font-bold leading-7 text-slate-700">{line}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-[2rem] bg-slate-950 p-8 text-white">
          <h2 className="text-center text-sm font-black tracking-[0.25em] text-slate-400">예상 효과</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-4">
            {effects.map(([label, value]) => (
              <div key={label} className="text-center">
                <div className="text-sm font-bold text-slate-400">{label}</div>
                <div className="mt-3 text-2xl font-black text-emerald-400">{value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-[2rem] border-2 border-dashed border-emerald-200 bg-emerald-50 p-8 text-center">
          <h2 className="text-xl font-black text-slate-950">연계 가능한 정책</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            {building.name}의 지역과 용도 기준으로 서울시 건물 에너지효율화(BRP) 융자 지원, 제로에너지건축 컨설팅,
            신재생에너지 보급 지원을 우선 확인해볼 수 있습니다.
          </p>
        </section>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Link href={dashboardHref(building.road_address)} className="rounded-2xl bg-slate-100 px-6 py-4 text-center text-sm font-black text-slate-700">
            대시보드로 돌아가기
          </Link>
          <Link href={compareHref(building.road_address)} className="rounded-2xl bg-emerald-600 px-6 py-4 text-center text-sm font-black text-white">
            상세 비교 보기
          </Link>
        </div>
      </div>
    </main>
  );
}
