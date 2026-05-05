"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createReportForBuilding,
  dashboardHrefForBuilding,
  searchBuildings,
  type BuildingSearchItem,
} from "@/lib/building-api";
import { SEOUL_DISTRICTS, SEOUL_DONGS_BY_DISTRICT } from "@/lib/seoul-address";

const LIMIT = 20;

type SearchFilters = {
  district: string;
  dong: string;
  query: string;
  buildingKeyword: string;
};

function shortDistrictName(district: string) {
  return district.replace("서울특별시 ", "");
}

function buildingIdentity(building: BuildingSearchItem) {
  return [building.bld_nm, building.dong_nm].filter(Boolean).join(" · ");
}

function buildingScaleParts(building: BuildingSearchItem) {
  const parts: string[] = [];
  if (building.grs_ar && building.grs_ar > 0) {
    parts.push(`연면적 ${building.grs_ar.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡`);
  }
  if (building.agnd_flr && building.agnd_flr > 0) {
    parts.push(`지상 ${building.agnd_flr.toLocaleString("ko-KR")}층`);
  }
  return parts;
}

function buildingScale(building: BuildingSearchItem) {
  const parts = buildingScaleParts(building);
  return parts.join(" · ");
}

export default function SearchPage() {
  const router = useRouter();
  const [district, setDistrict] = useState("");
  const [dong, setDong] = useState("");
  const [query, setQuery] = useState("");
  const [buildingKeyword, setBuildingKeyword] = useState("");
  const [items, setItems] = useState<BuildingSearchItem[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingSearchItem | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / LIMIT)), [total]);
  const dongs = useMemo(() => {
    if (!district) {
      return [];
    }

    return SEOUL_DONGS_BY_DISTRICT[district as keyof typeof SEOUL_DONGS_BY_DISTRICT] ?? [];
  }, [district]);
  const canSearch = Boolean(district || dong || query.trim() || buildingKeyword.trim());

  const resetSearchPage = () => {
    setPage(1);
    setSelectedBuilding(null);
  };

  useEffect(() => {
    setDong("");
    setItems([]);
    setTotal(0);
    setHasNext(false);
    setSearched(false);
    setPage(1);
    setSelectedBuilding(null);
  }, [district]);

  const currentFilters = (): SearchFilters => ({
    district,
    dong,
    query,
    buildingKeyword,
  });

  const runSearch = async (nextPage = 1, filters = currentFilters()) => {
    const hasSearchCondition = Boolean(
      filters.district || filters.dong || filters.query.trim() || filters.buildingKeyword.trim(),
    );

    if (!hasSearchCondition) {
      setError("구, 동, 세부 주소 또는 건물명·동명 중 하나 이상을 입력해주세요.");
      setItems([]);
      setTotal(0);
      setHasNext(false);
      setSearched(true);
      return;
    }

    setLoading(true);
    setError("");
    setSelectedBuilding(null);
    setSearched(true);

    try {
      const result = await searchBuildings({
        district: filters.district,
        dong: filters.dong,
        query: filters.query,
        building_keyword: filters.buildingKeyword,
        page: nextPage,
        limit: LIMIT,
      });
      setItems(result.items);
      setPage(result.page);
      setTotal(result.total);
      setHasNext(result.has_next);
    } catch (err: unknown) {
      setItems([]);
      setTotal(0);
      setHasNext(false);
      setError(err instanceof Error ? err.message : "주소 검색 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextFilters = {
      district: String(formData.get("district") || ""),
      dong: String(formData.get("dong") || ""),
      query: String(formData.get("query") || ""),
      buildingKeyword: String(formData.get("building_keyword") || ""),
    };

    setDistrict(nextFilters.district);
    setDong(nextFilters.dong);
    setQuery(nextFilters.query);
    setBuildingKeyword(nextFilters.buildingKeyword);
    void runSearch(1, nextFilters);
  };

  const handleStartReport = async () => {
    if (!selectedBuilding) {
      return;
    }

    setReportLoading(true);
    setError("");

    try {
      await createReportForBuilding(selectedBuilding);
      router.push(dashboardHrefForBuilding(selectedBuilding));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "진단 요청 중 오류가 발생했습니다.");
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <main className={`min-h-screen bg-slate-50 py-12 ${selectedBuilding ? "pb-32 lg:pb-12" : ""}`}>
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-8">
          <p className="text-sm font-black tracking-[0.25em] text-emerald-600">주소 검색</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">내 건물 주소 찾기</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            서울시 건물 데이터를 기반으로 전기·가스 사용량과 유사 건물 효율을 비교합니다.
            구와 동을 먼저 선택한 뒤 상세 주소를 입력하면 더 정확하게 찾을 수 있습니다.
          </p>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[0.75fr_1fr_1fr_1.35fr_1.35fr_auto] xl:items-end">
              <div className="flex min-h-[112px] flex-col">
                <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">시도</label>
                <div className="mt-2 flex h-14 items-center rounded-2xl bg-emerald-50 px-4 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
                  서울특별시
                </div>
                <p className="mt-2 min-h-5 text-xs font-bold text-slate-400" />
              </div>

              <div className="flex min-h-[112px] flex-col">
                <label htmlFor="district" className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  구 선택
                </label>
                <select
                  id="district"
                  name="district"
                  value={district}
                  onChange={(event) => setDistrict(event.target.value)}
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">전체 구</option>
                  {SEOUL_DISTRICTS.map((item) => (
                    <option key={item} value={item}>
                      {shortDistrictName(item)}
                    </option>
                  ))}
                </select>
                <p className="mt-2 min-h-5 text-xs font-bold text-slate-400" />
              </div>

              <div className="flex min-h-[112px] flex-col">
                <label htmlFor="dong" className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  동 선택
                </label>
                <select
                  id="dong"
                  name="dong"
                  value={dong}
                  onChange={(event) => {
                    setDong(event.target.value);
                    resetSearchPage();
                  }}
                  disabled={!district}
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">{district ? "전체 동" : "구를 먼저 선택하세요"}</option>
                  {dongs.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <p className="mt-2 min-h-5 text-xs font-bold text-slate-400" />
              </div>

              <div className="flex min-h-[112px] flex-col">
                <label htmlFor="query" className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  세부 주소
                </label>
                <input
                  id="query"
                  name="query"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    resetSearchPage();
                  }}
                  placeholder="예: 성내천로, 거여동 362, 33다길 2"
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <p className="mt-2 min-h-5 text-xs font-bold text-slate-400" />
              </div>

              <div className="flex min-h-[112px] flex-col">
                <label htmlFor="buildingKeyword" className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  건물명·동명
                </label>
                <input
                  id="buildingKeyword"
                  name="building_keyword"
                  value={buildingKeyword}
                  onChange={(event) => {
                    setBuildingKeyword(event.target.value);
                    resetSearchPage();
                  }}
                  placeholder="예: 101동, 141동, 경비실20, 상가동"
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <p className="mt-2 min-h-5 text-xs font-bold text-slate-400" />
              </div>

              <button
                type="submit"
                disabled={loading || !canSearch}
                className="h-14 rounded-2xl bg-slate-950 px-7 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2 xl:col-span-1 xl:mb-7"
              >
                {loading ? "검색 중..." : "주소 검색"}
              </button>
            </div>
          </form>
        </section>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-4 flex flex-col gap-2 px-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">검색 결과</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {searched ? `${total.toLocaleString("ko-KR")}건 중 ${items.length}건 표시` : "조건을 선택하고 주소를 검색해 주세요."}
                </p>
              </div>
              {searched && (
                <div className="text-sm font-black text-slate-500">
                  {page} / {totalPages}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {items.map((building) => {
                const selected =
                  selectedBuilding?.building_id === building.building_id &&
                  selectedBuilding?.display_address === building.display_address;
                const labelClass = selected
                  ? "text-xs font-black uppercase tracking-[0.18em] text-emerald-50"
                  : "text-xs font-black uppercase tracking-[0.18em] text-emerald-600";
                const mutedLabelClass = selected
                  ? "mt-4 text-xs font-black uppercase tracking-[0.18em] text-white/70"
                  : "mt-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400";
                const addressClass = selected
                  ? "mt-2 text-lg font-black leading-7 text-white"
                  : "mt-2 text-lg font-black leading-7 text-slate-950";
                const subAddressClass = selected
                  ? "mt-2 text-sm font-semibold leading-6 text-white/90"
                  : "mt-2 text-sm font-semibold leading-6 text-slate-600";
                const identity = buildingIdentity(building);
                const scaleParts = buildingScaleParts(building);

                return (
                  <button
                    key={`${building.building_id ?? building.display_address}-${building.plat_plc ?? ""}`}
                    type="button"
                    onClick={() => setSelectedBuilding(building)}
                    className={`block w-full rounded-3xl border p-6 text-left transition ${
                      selected
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-xl shadow-emerald-600/20"
                        : "border-slate-200 bg-white text-slate-950 shadow-sm hover:border-emerald-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className={labelClass}>도로명주소</div>
                        <h3 className={addressClass}>
                          {building.display_address || building.road_address}
                        </h3>
                        {identity && (
                          <p className={selected ? "mt-2 text-sm font-black text-emerald-50" : "mt-2 text-sm font-black text-slate-700"}>
                            {identity}
                          </p>
                        )}
                        <div className={mutedLabelClass}>지번주소</div>
                        <p className={subAddressClass}>
                          {building.plat_plc || "지번 주소 정보 없음"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 md:max-w-[180px] md:justify-end">
                        {scaleParts.map((item) => (
                          <span
                            key={item}
                            className={`rounded-full px-3 py-1.5 text-xs font-black ${
                              selected ? "bg-white/20 text-white ring-1 ring-white/25" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                            }`}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {searched && !loading && items.length === 0 && (
              <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50 p-8 text-center">
                <h3 className="text-lg font-black text-slate-950">검색 결과가 없습니다.</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  구와 동을 조금 넓히거나 세부 주소를 줄여 다시 검색해 주세요.
                </p>
              </div>
            )}

            {searched && items.length > 0 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={loading || page <= 1}
                  onClick={() => void runSearch(page - 1)}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  이전
                </button>
                <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-500 shadow-sm">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={loading || !hasNext}
                  onClick={() => void runSearch(page + 1)}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            )}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-black tracking-[0.2em] text-emerald-600">선택한 건물</p>
              {selectedBuilding ? (
                <div className="mt-5">
                  <h2 className="text-lg font-black leading-7 text-slate-950">
                    {selectedBuilding.display_address}
                  </h2>
                  {buildingIdentity(selectedBuilding) && (
                    <p className="mt-2 text-sm font-black text-emerald-700">
                      {buildingIdentity(selectedBuilding)}
                    </p>
                  )}
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                    {selectedBuilding.plat_plc}
                  </p>
                  {buildingScale(selectedBuilding) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {buildingScaleParts(selectedBuilding).map((item) => (
                        <span key={item} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-6 text-slate-500">
                  검색 결과 카드 하나를 선택하면 진단을 시작할 수 있습니다.
                </p>
              )}

              <button
                type="button"
                disabled={!selectedBuilding || reportLoading}
                onClick={() => void handleStartReport()}
                className="mt-6 h-14 w-full rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reportLoading ? "진단 요청 중..." : "선택한 건물로 진단 시작"}
              </button>
            </div>
          </aside>
        </section>
      </div>

      {selectedBuilding && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-emerald-100 bg-white/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-emerald-600">선택한 건물</p>
              <p className="truncate text-sm font-black text-slate-950">
                {selectedBuilding.display_address}
              </p>
              {buildingIdentity(selectedBuilding) && (
                <p className="truncate text-xs font-black text-emerald-700">
                  {buildingIdentity(selectedBuilding)}
                </p>
              )}
              <p className="truncate text-xs font-semibold text-slate-500">
                {selectedBuilding.plat_plc}
              </p>
            </div>
            <button
              type="button"
              disabled={reportLoading}
              onClick={() => void handleStartReport()}
              className="shrink-0 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reportLoading ? "요청 중" : "진단 시작"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
