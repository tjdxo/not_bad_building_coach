import Link from "next/link";

type ReportApiResponse = {
  building: {
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
  report_text: string;
};

function getBackendBaseUrl() {
  return (
    process.env.BACKEND_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ||
    "http://127.0.0.1:8000"
  );
}

async function fetchReport(address: string) {
  const response = await fetch(`${getBackendBaseUrl()}/api/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ address }),
    cache: "no-store",
  });

  const payload = await response.json();

  if (!response.ok) {
    return {
      ok: false as const,
      error: payload?.detail || "리포트를 불러오지 못했습니다.",
    };
  }

  return {
    ok: true as const,
    data: payload as ReportApiResponse,
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(value);
}

function splitReport(reportText: string) {
  return reportText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default async function ApiReportPage({
  searchParams,
}: {
  searchParams: Promise<{ address?: string }>;
}) {
  const { address } = await searchParams;
  const targetAddress = address?.trim() || "";

  if (!targetAddress) {
    return (
      <main className="min-h-screen bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
            <p className="text-sm font-black tracking-[0.25em] text-emerald-600">LIVE API REPORT</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              백엔드와 연결된 리포트 화면
            </h1>
            <p className="mt-4 max-w-2xl text-slate-600">
              주소를 입력하면 FastAPI 백엔드의 <code>/api/report</code>를 직접 호출해서 결과를 보여줍니다.
            </p>

            <form action="/api-report" className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-2">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  name="address"
                  type="text"
                  placeholder="예: 테헤란로"
                  className="h-14 flex-1 rounded-2xl bg-white px-5 text-base outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="h-14 rounded-2xl bg-emerald-600 px-7 text-sm font-black text-white transition hover:bg-emerald-700"
                >
                  리포트 불러오기
                </button>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              {["테헤란로", "서초대로", "법원로", "역삼동 736-24"].map((sample) => (
                <Link
                  key={sample}
                  href={`/api-report?address=${encodeURIComponent(sample)}`}
                  className="rounded-full bg-slate-100 px-4 py-2 font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                >
                  {sample}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  const result = await fetchReport(targetAddress);

  if (!result.ok) {
    return (
      <main className="min-h-screen bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <section className="rounded-[2rem] border border-rose-200 bg-white p-8 shadow-sm sm:p-12">
            <p className="text-sm font-black tracking-[0.25em] text-rose-600">API ERROR</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              백엔드 리포트를 불러오지 못했습니다
            </h1>
            <p className="mt-4 text-slate-600">
              요청 주소: <span className="font-bold text-slate-900">{targetAddress}</span>
            </p>
            <p className="mt-2 text-slate-600">
              오류 메시지: <span className="font-bold text-rose-700">{result.error}</span>
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/api-report"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-6 text-sm font-black text-white"
              >
                다시 시도
              </Link>
              <Link
                href="/api-report?address=%ED%85%8C%ED%97%A4%EB%9E%80%EB%A1%9C"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white"
              >
                샘플 주소 사용
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const { building, analysis, energy_summary, report_text } = result.data;
  const reportLines = splitReport(report_text);

  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-5xl px-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white">
                Backend Report
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">{building.name}</h1>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold text-slate-500">
                <span>{building.road_address}</span>
                <span>{building.building_type}</span>
                <span>{formatNumber(building.gross_floor_area)} m2</span>
              </div>
            </div>
            <div className="rounded-3xl bg-slate-950 px-6 py-5 text-white">
              <div className="text-xs font-black tracking-[0.2em] text-slate-400">GRADE</div>
              <div className="mt-2 text-4xl font-black text-emerald-400">{analysis.grade}</div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] bg-emerald-600 p-8 text-white shadow-sm">
          <p className="text-sm font-black tracking-[0.25em] text-emerald-100">한줄 해석</p>
          <p className="mt-4 text-2xl font-black leading-relaxed">{analysis.interpretation}</p>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">요약 지표</h2>
            <div className="mt-6 space-y-4">
              {[
                ["전력 평균", `${formatNumber(energy_summary.target_avg_electricity_kwh)} kWh`],
                ["가스 평균", `${formatNumber(energy_summary.target_avg_gas_m3)} m3`],
                ["비교군 수", `${analysis.peer_count}개`],
                ["낭비 지수", formatNumber(analysis.energy_waste_index)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <span className="text-sm font-bold text-slate-500">{label}</span>
                  <span className="text-lg font-black text-slate-950">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">비교 기준</h2>
            <div className="mt-6 space-y-4">
              {[
                ["전력 비율", formatNumber(energy_summary.electricity_ratio)],
                ["가스 비율", formatNumber(energy_summary.gas_ratio)],
                ["비교군 전력 평균", `${formatNumber(energy_summary.peer_avg_electricity_kwh)} kWh`],
                ["비교군 가스 평균", `${formatNumber(energy_summary.peer_avg_gas_m3)} m3`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <span className="text-sm font-bold text-slate-500">{label}</span>
                  <span className="text-lg font-black text-slate-950">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">리포트 본문</h2>
          <div className="mt-6 space-y-4">
            {reportLines.map((line) => (
              <p key={line} className="text-base leading-8 text-slate-700">
                {line}
              </p>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-dashed border-emerald-200 bg-emerald-50 p-8">
          <h2 className="text-xl font-black text-slate-950">건물 정보</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white p-5">
              <div className="text-sm font-bold text-slate-500">지번 주소</div>
              <div className="mt-2 text-lg font-black text-slate-950">{building.jibun_address}</div>
            </div>
            <div className="rounded-2xl bg-white p-5">
              <div className="text-sm font-bold text-slate-500">사용승인 연도</div>
              <div className="mt-2 text-lg font-black text-slate-950">{building.approval_year}</div>
            </div>
            <div className="rounded-2xl bg-white p-5">
              <div className="text-sm font-bold text-slate-500">층수</div>
              <div className="mt-2 text-lg font-black text-slate-950">{building.floors}</div>
            </div>
            <div className="rounded-2xl bg-white p-5">
              <div className="text-sm font-bold text-slate-500">승강기 수</div>
              <div className="mt-2 text-lg font-black text-slate-950">{building.elevator_count}</div>
            </div>
          </div>
        </section>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Link href="/api-report" className="rounded-2xl bg-slate-100 px-6 py-4 text-center text-sm font-black text-slate-700">
            다른 주소로 다시 조회
          </Link>
          <Link
            href={`/api-report?address=${encodeURIComponent(targetAddress)}`}
            className="rounded-2xl bg-emerald-600 px-6 py-4 text-center text-sm font-black text-white"
          >
            현재 주소 유지
          </Link>
        </div>
      </div>
    </main>
  );
}
