"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createReportForBuilding,
  dashboardHrefForBuilding,
  searchBuildings,
  type BuildingSearchItem,
  type SearchRegion,
} from "@/lib/building-api";
import { DISTRICTS_BY_REGION, DONGS_BY_REGION_AND_DISTRICT } from "@/lib/seoul-address";

const LIMIT = 20;
const PREMIUM_UNLOCK_STORAGE_PREFIX = "building-coach:premium-unlocked:";
const REGION_OPTIONS: Array<{ value: SearchRegion; label: string }> = [
  { value: "seoul", label: "서울특별시" },
  { value: "incheon", label: "인천광역시" },
];

type SearchFilters = {
  region: SearchRegion;
  district: string;
  dong: string;
  query: string;
  buildingKeyword: string;
};

function shortDistrictName(district: string) {
  return district.replace(/^서울특별시\s*/, "").replace(/^인천광역시\s*/, "");
}

function normalizeSearchRegion(value: FormDataEntryValue | null): SearchRegion {
  return value === "incheon" ? "incheon" : "seoul";
}

function buildingIdentity(building: BuildingSearchItem) {
  return [building.bld_nm, building.dong_nm].filter(Boolean).join(" · ");
}

function buildingScaleParts(building: BuildingSearchItem) {
  const parts: string[] = [];
  if (building.purp_nm) {
    parts.push(building.purp_nm);
  }
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

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function friendlySearchError(error: unknown) {
  console.error(error);
  if (error instanceof TypeError && error.message.toLowerCase().includes("fetch")) {
    return "서버와 연결하지 못했습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도해 주세요.";
  }
  return "건물 검색 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

function SearchLoadingState({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="mb-4 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-black text-slate-950">검색 중입니다...</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            조건에 맞는 건물을 불러오고 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"
        >
          검색 취소
        </button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-2xl bg-slate-50 p-4">
            <div className="h-3 w-20 rounded-full bg-slate-200" />
            <div className="mt-4 h-4 w-full rounded-full bg-slate-200" />
            <div className="mt-2 h-4 w-3/4 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const [region, setRegion] = useState<SearchRegion>("seoul");
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
  const [statusMessage, setStatusMessage] = useState("");
  const [estimatedChoiceReady, setEstimatedChoiceReady] = useState(false);
  const [searched, setSearched] = useState(false);
  const searchControllerRef = useRef<AbortController | null>(null);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(PREMIUM_UNLOCK_STORAGE_PREFIX))
      .forEach((key) => window.localStorage.removeItem(key));
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / LIMIT)), [total]);
  const districtOptions = [...DISTRICTS_BY_REGION[region]];
  const dongs = district
    ? [
        ...(
          DONGS_BY_REGION_AND_DISTRICT[region][
            district as keyof (typeof DONGS_BY_REGION_AND_DISTRICT)[typeof region]
          ] ?? []
        ),
      ]
    : [];
  const canSearch = Boolean(region || district || dong || query.trim() || buildingKeyword.trim());
  const searchControlsDisabled = loading;
  const queryPlaceholder = region === "incheon"
    ? "예: 봉재산로 10, 부평동 10-394"
    : "예: 성내천로, 거여동 362, 33다길 2";

  const resetSearchPage = () => {
    setPage(1);
    setSelectedBuilding(null);
    setEstimatedChoiceReady(false);
  };

  const resetSearchResults = () => {
    latestRequestIdRef.current += 1;
    searchControllerRef.current?.abort();
    setItems([]);
    setTotal(0);
    setHasNext(false);
    setSearched(false);
    setPage(1);
    setSelectedBuilding(null);
    setEstimatedChoiceReady(false);
    setLoading(false);
    setError("");
    setStatusMessage("");
  };

  useEffect(() => {
    setDistrict("");
    setDong("");
    resetSearchResults();
  }, [region]);

  useEffect(() => {
    setDong("");
    resetSearchResults();
  }, [district, region]);

  useEffect(() => {
    return () => {
      searchControllerRef.current?.abort();
    };
  }, []);

  const currentFilters = (): SearchFilters => ({
    region,
    district,
    dong,
    query,
    buildingKeyword,
  });

  const runSearch = async (nextPage = 1, filters = currentFilters()) => {
    const cleanFilters = {
      region: filters.region,
      district: filters.district.trim(),
      dong: filters.dong.trim(),
      query: filters.query.trim(),
      buildingKeyword: filters.buildingKeyword.trim(),
    };
    const hasSearchCondition = Boolean(
      cleanFilters.region || cleanFilters.district || cleanFilters.dong || cleanFilters.query || cleanFilters.buildingKeyword,
    );

    if (!hasSearchCondition) {
      setError("시도, 구, 동, 세부 주소 또는 건물명·동명 중 하나 이상을 입력해주세요.");
      setStatusMessage("");
      setItems([]);
      setTotal(0);
      setHasNext(false);
      setSearched(true);
      return;
    }

    searchControllerRef.current?.abort();
    const controller = new AbortController();
    searchControllerRef.current = controller;
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    setLoading(true);
    setError("");
    setStatusMessage("");
    setSelectedBuilding(null);
    setEstimatedChoiceReady(false);
    setSearched(true);

    try {
      const result = await searchBuildings({
        region: cleanFilters.region,
        district: cleanFilters.district,
        dong: cleanFilters.dong,
        query: cleanFilters.query,
        building_keyword: cleanFilters.buildingKeyword,
        page: Math.max(1, nextPage),
        limit: LIMIT,
        signal: controller.signal,
      });
      if (latestRequestIdRef.current !== requestId) {
        return;
      }
      setItems(result.items);
      setPage(result.page);
      setTotal(result.total);
      setHasNext(result.has_next);
    } catch (err: unknown) {
      if (latestRequestIdRef.current !== requestId) {
        return;
      }
      if (isAbortError(err)) {
        setStatusMessage("검색이 취소되었습니다.");
        return;
      }
      setItems([]);
      setTotal(0);
      setHasNext(false);
      setError(friendlySearchError(err));
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setLoading(false);
        if (searchControllerRef.current === controller) {
          searchControllerRef.current = null;
        }
      }
    }
  };

  const handleCancelSearch = () => {
    latestRequestIdRef.current += 1;
    searchControllerRef.current?.abort();
    searchControllerRef.current = null;
    setLoading(false);
    setStatusMessage("검색이 취소되었습니다.");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextFilters = {
      region: normalizeSearchRegion(formData.get("region")),
      district: String(formData.get("district") || "").trim(),
      dong: String(formData.get("dong") || "").trim(),
      query: String(formData.get("query") || "").trim(),
      buildingKeyword: String(formData.get("building_keyword") || "").trim(),
    };

    setRegion(nextFilters.region);
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
      const report = await createReportForBuilding(selectedBuilding);
      if (report.report_mode === "estimated") {
        setEstimatedChoiceReady(true);
        setStatusMessage("실측 사용량이 없어 AI 추정 진단을 준비했습니다. 진행 방식을 선택해 주세요.");
        return;
      }
      router.push(dashboardHrefForBuilding(selectedBuilding));
    } catch (err: unknown) {
      console.error(err);
      setError("진단 요청 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setReportLoading(false);
    }
  };

  const selectedManualEnergyHref = selectedBuilding
    ? `/search/manual-energy?${new URLSearchParams({
        address: selectedBuilding.display_address || selectedBuilding.road_address || selectedBuilding.plat_plc || "",
        building_id: String(selectedBuilding.building_id ?? ""),
      }).toString()}`
    : "";

  return (
    <main className={`min-h-screen bg-slate-50 py-12 ${selectedBuilding ? "pb-32 lg:pb-12" : ""}`}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8">
          <p className="text-sm font-black tracking-[0.25em] text-emerald-600">주소 검색</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">내 건물 주소 찾기</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            서울·인천 건물 데이터를 기반으로 전기·가스 사용량과 유사 건물 효율을 비교합니다.
            시도를 고른 뒤 해당 지역의 구와 동을 단계적으로 선택하면 더 정확하게 찾을 수 있습니다.
          </p>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1.15fr_1.25fr_1.35fr_1.35fr_auto] xl:items-end">
              <div className="flex min-h-[112px] flex-col">
                <label htmlFor="region" className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">시도</label>
                <select
                  id="region"
                  name="region"
                  value={region}
                  onChange={(event) => setRegion(normalizeSearchRegion(event.target.value))}
                  disabled={searchControlsDisabled}
                  className="mt-2 h-14 w-full rounded-2xl border border-emerald-100 bg-emerald-50 px-4 pr-12 text-sm font-black text-emerald-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {REGION_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
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
                  disabled={searchControlsDisabled}
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">전체 구</option>
                  {districtOptions.map((item) => (
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
                  disabled={!district || searchControlsDisabled}
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
                  disabled={searchControlsDisabled}
                  placeholder={queryPlaceholder}
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
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
                  disabled={searchControlsDisabled}
                  placeholder="예: 101동, 141동, 경비실20, 상가동"
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
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
        {statusMessage && !error && (
          <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-600">
            {statusMessage}
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

            {loading && <SearchLoadingState onCancel={handleCancelSearch} />}

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
                    onClick={() => {
                      setSelectedBuilding(building);
                      setEstimatedChoiceReady(false);
                      setStatusMessage("");
                    }}
                    className={`block w-full rounded-3xl border p-6 text-left transition ${
                      selected
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-xl shadow-emerald-600/20"
                        : "border-slate-200 bg-white text-slate-950 shadow-sm hover:border-emerald-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className={labelClass}>도로명주소</div>
                          {building.region_name && (
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                                selected ? "bg-white/20 text-white ring-1 ring-white/25" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {building.region_name}
                            </span>
                          )}
                        </div>
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
                      <div className="flex flex-col items-start gap-2 md:min-w-[120px] md:items-end">
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
                  건물명·동명을 비우거나, 구와 동을 조금 넓히고 세부 주소를 짧게 줄여 다시 검색해 주세요.
                  그래도 건물이 보이지 않는다면 직접 건물 정보를 입력해 임시 진단 요청 화면을 확인할 수 있습니다.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams({
                      region,
                      address: query.trim(),
                      district: district.trim(),
                      dong: dong.trim(),
                      building_keyword: buildingKeyword.trim(),
                    });
                    router.push(`/search/add-building?${params.toString()}`);
                  }}
                  className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
                >
                  직접 건물 입력하기
                </button>
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
                  {selectedBuilding.region_name && (
                    <div className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                      {selectedBuilding.region_name}
                    </div>
                  )}
                  {buildingScale(selectedBuilding) && (
                    <div className="mt-4 flex flex-col items-start gap-2">
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
              {selectedBuilding && estimatedChoiceReady && (
                <div className="mt-5 rounded-2xl bg-amber-50 p-4">
                  <h3 className="text-sm font-black text-slate-950">실측 사용량이 없는 건물입니다.</h3>
                  <p className="mt-2 text-xs font-semibold leading-5 text-amber-800">
                    정확한 진단을 위해 실제 고지서 기반 사용량 입력을 권장합니다. AI 추정값은 참고용으로 확인할 수 있습니다.
                  </p>
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(selectedManualEnergyHref)}
                      className="h-11 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white"
                    >
                      실제 사용량 입력하기
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(dashboardHrefForBuilding(selectedBuilding))}
                      className="h-11 rounded-2xl border border-amber-200 bg-white px-4 text-sm font-black text-slate-700"
                    >
                      AI 기반 추정치 확인
                    </button>
                    <p className="text-[11px] font-semibold leading-4 text-amber-700">
                      AI 추정 진단은 실제 사용량과 다를 수 있어 참고용으로만 활용해 주세요.
                    </p>
                  </div>
                </div>
              )}
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
              {selectedBuilding.region_name && (
                <p className="truncate text-xs font-black text-slate-500">
                  {selectedBuilding.region_name}
                </p>
              )}
              {buildingIdentity(selectedBuilding) && (
                <p className="truncate text-xs font-black text-emerald-700">
                  {buildingIdentity(selectedBuilding)}
                </p>
              )}
              <p className="truncate text-xs font-semibold text-slate-500">
                {selectedBuilding.plat_plc}
              </p>
            </div>
            {estimatedChoiceReady ? (
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => router.push(selectedManualEnergyHref)}
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black text-white"
                >
                  실제 입력
                </button>
                <button
                  type="button"
                  onClick={() => router.push(dashboardHrefForBuilding(selectedBuilding))}
                  className="rounded-2xl border border-amber-200 bg-white px-4 py-2 text-xs font-black text-slate-700"
                >
                  AI 추정
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={reportLoading}
                onClick={() => void handleStartReport()}
                className="shrink-0 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reportLoading ? "요청 중" : "진단 시작"}
              </button>
            )}
          </div>
          {estimatedChoiceReady && (
            <p className="mx-auto mt-2 max-w-6xl px-1 text-[11px] font-semibold leading-4 text-amber-700">
              AI 추정 진단은 실제 사용량과 다를 수 있어 참고용으로만 활용해 주세요.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
