import Link from "next/link";
import {
  dashboardHref,
  searchBuildings,
  type BuildingSearchItem,
} from "@/lib/building-api";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const { query } = await searchParams;
  const keyword = query?.trim() || "";
  let buildings: BuildingSearchItem[] = [];
  let total = 0;
  let error = "";

  try {
    const result = await searchBuildings(keyword, 1, 20);
    buildings = result.items;
    total = result.total;
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : "건물 검색 중 오류가 발생했습니다.";
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-8">
          <p className="text-sm font-black tracking-[0.25em] text-emerald-600">주소 검색</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">건물 검색 결과</h1>
          <p className="mt-4 text-lg text-slate-600">
            등록된 건물을 주소나 건물명 기준으로 검색합니다.
          </p>
        </div>

        <form action="/search" className="mb-10 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              name="query"
              type="text"
              defaultValue={keyword}
              placeholder="예: 성수 그린타워, 테헤란로, 서초대로"
              className="h-14 flex-1 rounded-2xl px-5 text-base outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="h-14 rounded-2xl bg-slate-950 px-7 text-sm font-black text-white transition hover:bg-emerald-600"
            >
              다시 검색
            </button>
          </div>
        </form>

        <div className="mb-4 flex items-center justify-between px-2 text-sm font-bold text-slate-500">
          <span>{keyword ? `검색어: ${keyword}` : "전체 건물"}</span>
          <span>{total.toLocaleString("ko-KR")}건</span>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {buildings.map((building) => (
            <article
              key={`${building.building_id ?? building.display_address}-${building.plat_plc ?? ""}`}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-black text-slate-950">{building.display_address}</h2>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                      진단 가능
                    </span>
                    {building.building_id && (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        {String(building.building_id)}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-slate-600">{building.plat_plc || "지번 주소 정보 없음"}</p>
                  <div className="mt-5 flex flex-wrap gap-3 text-sm">
                    {[
                      building.sgg_cd_nm || "시군구 정보 없음",
                      building.bjd_cd_nm || "법정동 정보 없음",
                      building.road_address ? "도로명주소" : "지번주소",
                    ].map((item) => (
                      <span key={item} className="rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-600">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <Link
                  href={dashboardHref(building.display_address)}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-7 text-sm font-black text-white transition hover:bg-emerald-700"
                >
                  진단 대시보드 보기
                </Link>
              </div>
            </article>
          ))}
        </div>

        {!error && buildings.length === 0 && (
          <div className="mt-10 rounded-3xl border border-dashed border-emerald-200 bg-emerald-50 p-7 text-center">
            <h2 className="text-lg font-black text-slate-950">검색 결과가 없습니다.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              성수 그린타워, 테헤란로, 서초대로처럼 건물명이나 도로명 일부로 다시 검색해 주세요.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
