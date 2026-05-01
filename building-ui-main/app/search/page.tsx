"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createReportForBuilding,
  dashboardHref,
  getDistricts,
  getDongs,
  searchBuildings,
  type BuildingSearchItem,
} from "@/lib/building-api";

const SEOUL_DISTRICTS = [
  "서울특별시 강남구",
  "서울특별시 강동구",
  "서울특별시 강북구",
  "서울특별시 강서구",
  "서울특별시 관악구",
  "서울특별시 광진구",
  "서울특별시 구로구",
  "서울특별시 금천구",
  "서울특별시 노원구",
  "서울특별시 도봉구",
  "서울특별시 동대문구",
  "서울특별시 동작구",
  "서울특별시 마포구",
  "서울특별시 서대문구",
  "서울특별시 서초구",
  "서울특별시 성동구",
  "서울특별시 성북구",
  "서울특별시 송파구",
  "서울특별시 양천구",
  "서울특별시 영등포구",
  "서울특별시 용산구",
  "서울특별시 은평구",
  "서울특별시 종로구",
  "서울특별시 중구",
  "서울특별시 중랑구",
];

const LIMIT = 20;

function shortDistrictName(district: string) {
  return district.replace("서울특별시 ", "");
}

export default function SearchPage() {
  const router = useRouter();
  const [districts, setDistricts] = useState<string[]>(SEOUL_DISTRICTS);
  const [dongs, setDongs] = useState<string[]>([]);
  const [district, setDistrict] = useState("");
  const [dong, setDong] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<BuildingSearchItem[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingSearchItem | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dongsLoading, setDongsLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / LIMIT)), [total]);
  const canSearch = Boolean(district || dong || query.trim());

  useEffect(() => {
    getDistricts()
      .then((data) => {
        const seoulOnly = data.filter((item) => item.startsWith("서울특별시 "));
        setDistricts(seoulOnly.length ? seoulOnly : SEOUL_DISTRICTS);
      })
      .catch(() => {
        setDistricts(SEOUL_DISTRICTS);
      });
  }, []);

  useEffect(() => {
    setDong("");
    setDongs([]);
    setItems([]);
    setTotal(0);
    setHasNext(false);
    setSearched(false);
    setPage(1);
    setSelectedBuilding(null);
    if (!district) {
      return;
    }

    setDongsLoading(true);
    getDongs(district)
      .then(setDongs)
      .catch(() => setDongs([]))
      .finally(() => setDongsLoading(false));
  }, [district]);

  const runSearch = async (nextPage = 1) => {
    if (!canSearch) {
      setError("구, 동 또는 상세 검색어 중 하나 이상을 입력해주세요.");
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
        district,
        dong,
        query,
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
    void runSearch(1);
  };

  const handleStartReport = async () => {
    if (!selectedBuilding) {
      return;
    }

    setReportLoading(true);
    setError("");

    try {
      const report = await createReportForBuilding(selectedBuilding);
      router.push(dashboardHref(report.building.road_address || selectedBuilding.display_address));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "진단 요청 중 오류가 발생했습니다.");
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12">
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
            <div className="grid gap-4 lg:grid-cols-[0.8fr_1fr_1fr_1.4fr_auto] lg:items-end">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">시도</label>
                <div className="mt-2 flex h-14 items-center rounded-2xl bg-emerald-50 px-4 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
                  서울특별시
                </div>
              </div>

              <div>
                <label htmlFor="district" className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  구 선택
                </label>
                <select
                  id="district"
                  value={district}
                  onChange={(event) => setDistrict(event.target.value)}
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">전체 구</option>
                  {districts.map((item) => (
                    <option key={item} value={item}>
                      {shortDistrictName(item)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="dong" className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  동 선택
                </label>
                <select
                  id="dong"
                  value={dong}
                  onChange={(event) => {
                    setDong(event.target.value);
                    setSelectedBuilding(null);
                  }}
                  disabled={!district || dongsLoading}
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">{dongsLoading ? "동 불러오는 중" : "전체 동"}</option>
                  {dongs.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="query" className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  상세 검색어
                </label>
                <input
                  id="query"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSelectedBuilding(null);
                  }}
                  placeholder="예: 성내천로, 거여동 362, 33다길 2"
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !canSearch}
                className="h-14 rounded-2xl bg-slate-950 px-7 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
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

                return (
                  <button
                    key={`${building.building_id ?? building.display_address}-${building.plat_plc ?? ""}`}
                    type="button"
                    onClick={() => setSelectedBuilding(building)}
                    className={`block w-full rounded-3xl border bg-white p-6 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md ${
                      selected ? "border-emerald-500 ring-4 ring-emerald-100" : "border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">도로명주소</div>
                        <h3 className="mt-2 text-lg font-black leading-7 text-slate-950">
                          {building.road_address || building.display_address}
                        </h3>
                        <div className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">지번주소</div>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                          {building.plat_plc || "지번 주소 정보 없음"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {[building.sgg_cd_nm, building.bjd_cd_nm].filter(Boolean).map((item) => (
                          <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
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
                  구와 동을 조금 넓히거나 상세 검색어를 줄여 다시 검색해 주세요.
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

          <aside className="h-fit rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-black tracking-[0.2em] text-emerald-600">선택한 건물</p>
            {selectedBuilding ? (
              <div className="mt-5">
                <h2 className="text-lg font-black leading-7 text-slate-950">
                  {selectedBuilding.display_address}
                </h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                  {selectedBuilding.plat_plc}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[selectedBuilding.sgg_cd_nm, selectedBuilding.bjd_cd_nm].filter(Boolean).map((item) => (
                    <span key={item} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                      {item}
                    </span>
                  ))}
                </div>
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
          </aside>
        </section>
      </div>
    </main>
  );
}
