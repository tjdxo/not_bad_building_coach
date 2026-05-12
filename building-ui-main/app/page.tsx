"use client";

import Link from "next/link";
import { useState } from "react";

const valuePoints = [
  {
    title: "주소 검색",
    desc: "서울시 건물 주소와 건물명을 기준으로 진단 가능한 건물을 찾고, 필요한 경우 동일 주소 내 후보 중 정확한 건물을 선택합니다.",
  },
  {
    title: "진단 대시보드 확인",
    desc: "선택한 건물의 등급, 온실가스 배출량, 데이터 신뢰도, 월별 전기·가스 사용량을 한눈에 확인합니다.",
  },
  {
    title: "유사 건물 상세 비교",
    desc: "유사한 건물군에서 내 건물이 어느 위치에 있는지 항목별로 비교합니다.",
  },
  {
    title: "AI 리포트",
    desc: "진단 결과를 바탕으로 더 자세한 진단과 원인 가설, 개선 우선순위, 리스크 시나리오, 정책 검토 포인트를 리포트로 정리합니다.",
  },
];

const processSteps = [
  "주소 검색",
  "진단 대시보드 확인",
  "유사 건물 상세 비교",
  "AI 리포트",
];

function HeroTitle() {
  return (
    <h1 className="break-keep font-black leading-[0.95] tracking-normal text-slate-950">
      <span className="block whitespace-nowrap text-[2.65rem] sm:text-6xl md:text-7xl xl:text-8xl">세상에</span>
      <span className="relative my-1 inline-block whitespace-nowrap text-[2.65rem] text-emerald-700 sm:my-2 sm:text-6xl md:text-7xl xl:text-8xl">
        <span className="relative z-10">나쁜 건물은</span>
        <span
          className="absolute inset-x-[-0.12em] bottom-[0.06em] z-0 h-[0.25em] rounded-full bg-emerald-100/90"
          aria-hidden="true"
        />
      </span>
      <span className="block whitespace-nowrap text-[2.65rem] sm:text-6xl md:text-7xl xl:text-8xl">없다</span>
    </h1>
  );
}

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
                <HeroTitle />
                <p className="mt-6 max-w-xl break-keep text-base leading-8 text-slate-600 sm:text-lg">
                  당신의 건물은 나쁜 게 아니라, 아직 제대로 진단받지 못했을 뿐입니다.
                  전기·가스 사용량, 유사 건물 비교, 지원 가능성을 한 흐름에서 확인하세요.
                </p>
              </div>

              <div className="mt-9 max-w-2xl rounded-3xl border border-emerald-100 bg-white p-3 shadow-xl sm:mt-12 lg:mt-auto">
                <div className="rounded-[1.25rem] bg-emerald-50 p-6">
                  <div className="flex flex-col items-center gap-4 text-center">
                    <h2 className="text-2xl font-black tracking-tight text-slate-950">
                      복잡한 회원가입 없이, 주소 검색만으로 건물 에너지 진단을 바로 시작해 보세요.
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      현재까지 서울시 약 60만 개의 건물이 진단 대상에 포함되었습니다.
                    </p>
                    <Link
                      href="/search"
                      className="inline-flex h-14 w-fit items-center justify-center rounded-2xl bg-emerald-600 px-7 text-base font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-500"
                    >
                      내 건물 에너지 진단 바로가기
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl lg:h-full">
              <div className="flex h-full flex-col rounded-3xl bg-white/10 p-6">
                <h2 className="text-3xl font-black leading-tight">
                  내 건물의 모든 궁금증을
                  <span className="block">해결할 수 있습니다</span>
                </h2>
                <div className="mt-8 flex-1 space-y-4">
                  {[
                    ["01", "나와 비슷한 건물 중 내 건물 에너지 사용량은 몇 등일까?", "용도와 규모가 비슷한 건물군 안에서 내 건물의 상대적 위치를 확인합니다."],
                    ["02", "지금 에너지 비용을 얼마나 더 아낄 수 있을까?", "전기·가스 사용 패턴과 절감 가능성을 함께 살펴봅니다."],
                    ["03", "내 건물도 지원사업 혜택을 받을 수 있을까?", "건물 조건과 진단 결과를 바탕으로 검토 가능한 정책·지원사업 후보를 확인합니다."],
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
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              서비스 한눈에 보기
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
                aria-label={point.title}
              >
                <p className="text-sm leading-6 text-slate-600">{point.desc}</p>
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
                <h2 className="text-3xl font-black tracking-tight">탄소 중립, 오늘 우리 건물부터 시작하세요.</h2>
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
