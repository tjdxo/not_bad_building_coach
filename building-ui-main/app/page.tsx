"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { BuildingSearchItem, BuildingSearchResponse, ReportApiResponse } from "@/lib/building-api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const valuePoints = [
  {
    title: "주소 기반 진단",
    desc: "주소만 입력하면 건물 규모, 용도, 에너지 사용 패턴을 바탕으로 진단 흐름을 시작합니다.",
    icon: "01",
  },
  {
    title: "전기·가스 사용 분석",
    desc: "월별 사용량과 유사 건물 평균을 비교해 과소비 구간과 피크 시간을 한눈에 보여줍니다.",
    icon: "02",
  },
  {
    title: "AI 개선 피드백",
    desc: "조명, 냉난방, 피크 전력, 설비 운영 관점에서 실행 우선순위를 제안합니다.",
    icon: "03",
  },
  {
    title: "정책 매칭",
    desc: "탄소 절감, 에너지 효율화, 지자체 지원 사업과 연결 가능한 정책 정보를 제공합니다.",
    icon: "04",
  },
];

const processSteps = [
  "주소 입력",
  "건물 데이터 확인",
  "전기·가스 사용량 비교",
  "AI 리포트 및 정책 추천",
];

export default function Home() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [, setResult] = useState<ReportApiResponse | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingSearchItem | null>(null);
  const [addressCandidates, setAddressCandidates] = useState<BuildingSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = address.trim();
    if (query.length < 2 || selectedBuilding?.display_address === address) {
      setAddressCandidates([]);
      setSearchLoading(false);
      setSearchError("");
      setHasSearched(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");
      setHasSearched(true);
      setSuggestionsOpen(true);

      try {
        const params = new URLSearchParams({
          query,
          page: "1",
          limit: "20",
        });
        const response = await fetch(`${API_BASE_URL}/api/buildings?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`주소 검색 오류: ${response.status}`);
        }

        const data = (await response.json()) as BuildingSearchResponse;
        setAddressCandidates(data.items.slice(0, 20));
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setAddressCandidates([]);
        setSearchError("주소 검색 중 오류가 발생했습니다.");
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [address, selectedBuilding]);

  const handleAddressChange = (value: string) => {
    setAddress(value);
    setSelectedBuilding(null);
    setSuggestionsOpen(value.trim().length >= 2);
  };

  const handleSelectBuilding = (building: BuildingSearchItem) => {
    const displayAddress = building.display_address || building.road_address || building.plat_plc || "";
    setSelectedBuilding({
      ...building,
      display_address: displayAddress,
    });
    setAddress(displayAddress);
    setAddressCandidates([]);
    setSearchError("");
    setSuggestionsOpen(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          selectedBuilding
            ? {
                building_id: selectedBuilding.building_id,
                address: selectedBuilding.display_address,
                plat_plc: selectedBuilding.plat_plc,
                road_address: selectedBuilding.road_address,
              }
            : { address },
        ),
      });

      if (!response.ok) {
        throw new Error(`백엔드 오류: ${response.status}`);
      }

      const data = (await response.json()) as ReportApiResponse;
      console.log("백엔드 응답:", data);
      setResult(data);
      router.push(`/dashboard?address=${encodeURIComponent(data.building.road_address || selectedBuilding?.display_address || address)}`);
    } catch (err: unknown) {
      console.error("리포트 요청 실패:", err);
      setError(err instanceof Error ? err.message : "요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <section className="relative overflow-hidden bg-white py-20 sm:py-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_50%_-10%,#d1fae5,transparent)]" />
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                나쁜 건물은 없다 (Building Energy AI)
              </div>
              <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
                주소만 입력하면
                <span className="block text-emerald-600">건물 에너지 개선 방향이 보입니다.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                전기와 가스 사용 데이터를 분석해 유사 건물 대비 효율, 탄소 절감 가능성, 적용 가능한 정책과
                구체적인 실행 피드백을 한눈에 확인할 수 있습니다.
              </p>

              <form onSubmit={handleSubmit} className="mt-10 max-w-2xl rounded-3xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="sr-only" htmlFor="query">
                    건물 주소
                  </label>
                  <div className="relative flex-1">
                    <input
                      id="query"
                      name="address"
                      type="text"
                      value={address}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      onFocus={() => setSuggestionsOpen(address.trim().length >= 2)}
                      placeholder="예: 서울시 성동구 성수이로 123"
                      className="h-14 w-full rounded-2xl px-5 text-base outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
                      autoComplete="off"
                    />

                    {suggestionsOpen && address.trim().length >= 2 && (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-80 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                        {searchLoading && (
                          <div className="px-4 py-3 text-sm font-semibold text-slate-500">주소 검색 중...</div>
                        )}

                        {!searchLoading && searchError && (
                          <div className="px-4 py-3 text-sm font-semibold text-red-600">{searchError}</div>
                        )}

                        {!searchLoading && !searchError && hasSearched && addressCandidates.length === 0 && (
                          <div className="px-4 py-3 text-sm font-semibold text-slate-500">검색 결과가 없습니다.</div>
                        )}

                        {!searchLoading &&
                          !searchError &&
                          addressCandidates.map((candidate) => (
                            <button
                              key={`${candidate.building_id ?? candidate.display_address}-${candidate.plat_plc ?? ""}`}
                              type="button"
                              onClick={() => handleSelectBuilding(candidate)}
                              className="block w-full rounded-xl px-4 py-3 text-left transition hover:bg-emerald-50"
                            >
                              <span className="block text-sm font-black text-slate-950">
                                {candidate.display_address || candidate.road_address || candidate.plat_plc}
                              </span>
                              <span className="mt-1 block text-xs font-semibold text-slate-500">
                                {[candidate.plat_plc, candidate.sgg_cd_nm, candidate.bjd_cd_nm].filter(Boolean).join(" · ")}
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !address.trim()}
                    className="h-14 rounded-2xl bg-emerald-600 px-7 text-base font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "진단 중..." : "진단 시작"}
                  </button>
                </div>
              </form>

              {error && (
                <div className="mt-4 max-w-2xl rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2 text-sm">
                {["성수 그린타워", "서초대로", "테헤란로", "마포 스마트오피스"].map((item) => (
                  <Link
                    key={item}
                    href={`/search?query=${encodeURIComponent(item)}`}
                    className="rounded-full bg-slate-100 px-4 py-2 font-semibold text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl">
              <div className="rounded-3xl bg-white/10 p-6">
                <p className="text-sm font-bold text-emerald-300">주소 하나로 확인하는 건물 에너지 방향</p>
                <h2 className="mt-4 text-3xl font-black leading-tight">
                  전기·가스 사용량부터 탄소 절감 정책까지 한 번에 확인하세요.
                </h2>
                <div className="mt-8 space-y-4">
                  {[
                    ["01", "건물 정보 확인", "주소를 기준으로 건물 용도와 규모를 확인합니다."],
                    ["02", "사용량 비교", "유사 건물 대비 전기·가스 사용 수준을 비교합니다."],
                    ["03", "개선 방향 제안", "실행할 수 있는 절감 방법과 정책 정보를 함께 보여줍니다."],
                  ].map(([number, title, desc]) => (
                    <div key={title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-sm font-black">
                        {number}
                      </div>
                      <div>
                        <div className="font-black">{title}</div>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-black tracking-[0.25em] text-emerald-600">진행 흐름</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              주소 입력부터 정책 확인까지 자연스럽게 이어집니다.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {processSteps.map((step, index) => (
              <div key={step} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-black text-emerald-600">{index + 1}단계</div>
                <div className="mt-4 text-xl font-black text-slate-950">{step}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {valuePoints.map((point) => (
              <div key={point.title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-black text-emerald-700">
                  {point.icon}
                </div>
                <h3 className="mt-6 text-lg font-black text-slate-950">{point.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{point.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-[2rem] bg-slate-950 p-8 text-white sm:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-3xl font-black tracking-tight">정부·지자체와 개인 사용자 모두 쉽게 확인할 수 있습니다.</h2>
                <p className="mt-4 max-w-3xl text-slate-300">
                  공공 정책 매칭, 탄소 절감 효과, 실행 우선순위가 리포트에서 함께 정리됩니다.
                </p>
              </div>
              <Link
                href="/search"
                className="inline-flex h-14 items-center justify-center rounded-2xl bg-emerald-500 px-7 text-sm font-black text-white transition hover:bg-emerald-400"
              >
                대시보드 보기
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
