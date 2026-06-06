"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

function AddBuildingForm() {
  const searchParams = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const region = searchParams.get("region") === "incheon" ? "인천광역시" : "서울특별시";
  const searchedAddress = searchParams.get("address") || "";
  const searchedDistrict = searchParams.get("district") || "";
  const searchedDong = searchParams.get("dong") || "";
  const searchedKeyword = searchParams.get("building_keyword") || "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-5xl px-6">
        <div>
          <p className="text-sm font-black tracking-[0.25em] text-emerald-600">건물 직접 입력</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            검색되지 않는 건물 정보 입력
          </h1>
          <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-slate-600">
            정보를 입력하여 공공데이터 검색 결과에 없는 건물을 추가해 주세요.
          </p>
        </div>

        <section className="mt-8 rounded-[2rem] border border-amber-100 bg-amber-50 p-5">
          <h2 className="text-sm font-black text-slate-950">이전 검색 조건</h2>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-amber-900 sm:grid-cols-2">
            <p>지역: {region}</p>
            <p>주소: {searchedAddress || "입력 없음"}</p>
            <p>구/동: {[searchedDistrict, searchedDong].filter(Boolean).join(" ") || "입력 없음"}</p>
            <p>건물명·동명: {searchedKeyword || "입력 없음"}</p>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-black text-slate-950">기본 정보</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">시도</span>
                <select
                  name="region"
                  defaultValue={searchParams.get("region") === "incheon" ? "incheon" : "seoul"}
                  className="mt-2 h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="incheon">인천광역시</option>
                  <option value="seoul">서울특별시</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">건물명</span>
                <input
                  name="building_name"
                  defaultValue={searchedKeyword}
                  placeholder="예: 세나건빌딩"
                  className="mt-2 h-13 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">도로명 주소</span>
                <input
                  name="road_address"
                  defaultValue={searchedAddress}
                  placeholder="예: 인천광역시 미추홀구 ..."
                  className="mt-2 h-13 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">지번 주소</span>
                <input
                  name="jibun_address"
                  placeholder="예: 인천광역시 미추홀구 주안동 000-0"
                  className="mt-2 h-13 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">주용도</span>
                <select
                  name="purpose"
                  className="mt-2 h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">선택</option>
                  <option>업무시설</option>
                  <option>제1종근린생활시설</option>
                  <option>제2종근린생활시설</option>
                  <option>판매및영업시설</option>
                  <option>공동주택</option>
                  <option>교육연구시설</option>
                  <option>기타</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">사용승인일</span>
                <input
                  name="approval_date"
                  type="date"
                  className="mt-2 h-13 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">연면적</span>
                <input
                  name="gross_floor_area"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="㎡"
                  className="mt-2 h-13 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">지상층</span>
                  <input
                    name="above_ground_floor"
                    type="number"
                    min="0"
                    className="mt-2 h-13 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">지하층</span>
                  <input
                    name="underground_floor"
                    type="number"
                    min="0"
                    className="mt-2 h-13 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
              </div>
            </div>
          </section>

          <aside className="h-fit rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">추가 입력</h2>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">난방 방식</span>
                <select
                  name="heating_type"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option>모름</option>
                  <option>개별난방</option>
                  <option>중앙난방</option>
                  <option>지역난방</option>
                  <option>전기식</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">월 전기 사용량</span>
                <input
                  name="monthly_electricity"
                  type="number"
                  min="0"
                  placeholder="kWh, 선택"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">월 가스 사용량</span>
                <input
                  name="monthly_gas"
                  type="number"
                  min="0"
                  placeholder="kWh 또는 m3, 선택"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">메모</span>
                <textarea
                  name="memo"
                  rows={4}
                  placeholder="관리비 고지서 보유 여부, 공실 여부, 특이사항 등"
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>
            <button
              type="submit"
              className="mt-6 h-13 w-full rounded-2xl bg-slate-950 px-6 text-sm font-black text-white transition hover:bg-emerald-600"
            >
              건물 추가하기
            </button>
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
              현재는 시연용 버튼입니다. 입력값은 서버나 DB에 저장되지 않습니다.
            </p>
          </aside>
        </form>

        {submitted && (
          <section className="mt-8 rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6">
            <p className="text-sm font-black text-emerald-700">입력 내용이 확인되었습니다.</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">건물 추가 기능은 아직 준비 중입니다.</h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              실제 서비스에서는 입력된 건물 기본 정보와 전기·가스 사용량을 검증한 뒤,
              <br />
              유사 건물군 비교와 AI 참고 진단으로 연결할 예정입니다.
            </p>
            <Link
              href="/search"
              className="mt-5 inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white"
            >
              검색 화면으로 돌아가기
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}

export default function AddBuildingPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50 py-12" />}>
      <AddBuildingForm />
    </Suspense>
  );
}
