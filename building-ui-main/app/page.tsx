"use client";

import Link from "next/link";
import { useState } from "react";

const valuePoints = [
  {
    title: "주소 검색",
    desc: "서울시 건물 주소와 건물명을 기준으로 진단 가능한 건물을 찾고, 동일 주소 내 후보 중 정확한 건물을 선택합니다.",
    icon: "01",
  },
  {
    title: "진단 대시보드 확인",
    desc: "선택한 건물의 등급, 온실가스 배출량, 신뢰도, 월별 전기·가스 사용량을 한눈에 확인합니다.",
    icon: "02",
  },
  {
    title: "유사 건물 상세 비교",
    desc: "용도·규모·층수 등 조건이 유사한 건물군과 비교해 내 건물이 어느 항목에서 높거나 낮은지 확인합니다.",
    icon: "03",
  },
  {
    title: "AI 리포트",
    desc: "진단 결과를 바탕으로 원인 가설, 개선 우선순위, 리스크 시나리오, 정책 검토 포인트를 리포트로 정리합니다.",
    icon: "04",
  },
];

const processSteps = [
  "주소 검색",
  "진단 대시보드 확인",
  "유사 건물 상세 비교",
  "AI 리포트",
];

export default function Home() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  function stepCardClass(index: number) {
    const active = activeStep === index;
    return `rounded-3xl border p-6 shadow-sm transition ${
      active
        ? "border-emerald-400 bg-emerald-50/50 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
        : "border-slate-200 bg-white hover:border-emerald-200"
    }`;
  }

  function detailCardClass(index: number) {
    const active = activeStep === index;
    return `rounded-3xl border p-7 shadow-sm transition ${
      active
        ? "border-emerald-400 bg-emerald-50/50 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
        : "border-slate-200 bg-white hover:border-emerald-200"
    }`;
  }

  return (
    <main>
      <section className="relative overflow-hidden bg-white py-20 sm:py-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_50%_-10%,#d1fae5,transparent)]" />
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-stretch gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex h-full flex-col">
              <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
                  내 건물 주소를 찾고
                  <span className="block text-emerald-600">에너지 개선 방향을 확인하세요</span>
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                  주소를 검색해 내 건물의 전기·가스 사용량과 유사 건물 대비 효율을 확인하고,
                  실행 가능한 절감 액션과 정책 매칭 정보를 리포트로 이어갑니다.
                </p>
              </div>

              <div className="mt-10 max-w-2xl rounded-3xl border border-emerald-100 bg-white p-3 shadow-xl lg:mt-auto">
                <div className="rounded-[1.25rem] bg-emerald-50 p-6">
                  <div className="flex flex-col gap-4">
                    <h2 className="text-2xl font-black tracking-tight text-slate-950">
                      서울시 건물 주소 검색부터 시작합니다
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      구와 동을 고르고 상세 주소나 건물명을 입력하면, 서울시 건물 후보를 페이지 단위로 확인할 수 있습니다.
                    </p>
                    <Link
                      href="/search"
                      className="inline-flex h-14 w-fit items-center justify-center rounded-2xl bg-emerald-600 px-7 text-base font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-500"
                    >
                      내 건물 에너지 진단 바로가기
                      <span className="ml-2">-&gt;</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl lg:h-full">
              <div className="flex h-full flex-col rounded-3xl bg-white/10 p-6">
                <p className="text-sm font-bold text-emerald-300">주소 선택 이후 이어지는 진단 흐름</p>
                <h2 className="mt-4 text-3xl font-black leading-tight">
                  검색부터 리포트까지
                  <span className="block">하나의 흐름으로 이어집니다</span>
                </h2>
                <div className="mt-8 flex-1 space-y-4">
                  {[
                    ["01", "구·동 필터 선택", "서울시 안에서 구와 법정동을 단계적으로 좁혀 검색 범위를 줄입니다."],
                    ["02", "건물 후보 확인", "도로명주소와 지번주소, 건물 규모 정보를 함께 보고 정확한 건물을 선택합니다."],
                    ["03", "진단과 리포트 확장", "선택한 건물 정보를 기준으로 대시보드, 유사건물 비교, AI 리포트로 이어갑니다."],
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
              건물 선택 이후 필요한 진단 화면으로 자연스럽게 이어집니다.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {processSteps.map((step, index) => (
              <button
                key={step}
                type="button"
                onMouseEnter={() => setActiveStep(index)}
                onMouseLeave={() => setActiveStep(null)}
                onClick={() => setActiveStep(activeStep === index ? null : index)}
                className={`${stepCardClass(index)} text-left`}
              >
                <div className="text-sm font-black text-emerald-600">{index + 1}단계</div>
                <div className="mt-4 text-xl font-black text-slate-950">{step}</div>
              </button>
            ))}
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {valuePoints.map((point, index) => (
              <button
                key={point.title}
                type="button"
                onMouseEnter={() => setActiveStep(index)}
                onMouseLeave={() => setActiveStep(null)}
                onClick={() => setActiveStep(activeStep === index ? null : index)}
                className={`${detailCardClass(index)} text-left`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-black text-emerald-700">
                  {point.icon}
                </div>
                <h3 className="mt-6 text-lg font-black text-slate-950">{point.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{point.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-[2rem] bg-slate-950 p-8 text-white sm:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-3xl font-black tracking-tight">정확한 주소 선택이 진단의 시작입니다</h2>
                <p className="mt-4 max-w-3xl text-slate-300">
                  도로명주소와 지번주소를 함께 확인하고 선택한 건물을 기준으로 대시보드와 리포트를 생성합니다.
                </p>
              </div>
              <Link
                href="/search"
                className="inline-flex h-14 items-center justify-center rounded-2xl bg-emerald-500 px-7 text-sm font-black text-white transition hover:bg-emerald-400"
              >
                주소 검색하고 진단 시작하기
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
