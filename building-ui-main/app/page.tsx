"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const valuePoints = [
  {
    title: "주소 검색",
    desc: "서울특별시·인천광역시 건물 주소와 건물명을 기준으로 진단 가능한 건물을 찾고, 필요한 경우 동일 주소 내 후보 중 정확한 건물을 선택합니다.",
  },
  {
    title: "진단 대시보드 확인",
    desc: (
      <>
        선택한 건물의 등급, 온실가스 배출량, 데이터 신뢰도, 월별{" "}
        <span className="whitespace-nowrap">전기·가스 사용량</span>을 한눈에{" "}
        <span className="whitespace-nowrap">확인합니다.</span>
      </>
    ),
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

function HeroWordmark() {
  return (
    <Image
      src="/hero-wordmark.png"
      alt="세상에 나쁜 건물은 없다"
      width={1448}
      height={1086}
      priority
      className="h-auto w-full max-w-[420px] sm:max-w-[520px] md:max-w-[560px] lg:max-w-[600px] xl:max-w-[640px]"
    />
  );
}

export default function Home() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <main>
      <section className="relative overflow-hidden bg-white pt-7 pb-16 sm:pt-10 sm:pb-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_50%_-10%,#d1fae5,transparent)]" />
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div className="mx-auto flex h-full w-full max-w-xl flex-col lg:mx-0 lg:max-w-none">
              <div className="flex flex-col items-start">
                <HeroWordmark />
                <p className="mt-2 mb-2 max-w-xl break-keep text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                  당신의 건물은 나쁜 게 아니라, 아직 제대로 진단받지 못했을 뿐입니다.
                  <br />
                  <span className="whitespace-nowrap">전기·가스 사용량</span>, 유사 건물 비교, 지원 가능성을 한 흐름에서 확인하세요.
                </p>
              </div>

              <div className="mt-5 w-full rounded-3xl border border-emerald-100 bg-white p-2 shadow-xl sm:mt-6 lg:mt-6 lg:max-w-2xl">
                <div className="rounded-[1.25rem] bg-emerald-50 p-4 sm:p-5">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <h2 className="break-keep text-center text-lg font-black leading-snug tracking-tight text-slate-950 sm:text-xl">
                      복잡한 회원가입 없이, 주소 검색만으로 건물 에너지 진단을 바로 시작해 보세요.
                    </h2>
                    <p className="break-keep text-xs leading-5 text-slate-600 sm:whitespace-nowrap sm:text-sm sm:leading-6">
                      서울특별시·인천광역시 약 80만 개 건물이 진단 대상에 포함되었습니다.
                    </p>
                    <Link
                      href="/search"
                      className="inline-flex h-14 w-full items-center justify-center whitespace-nowrap rounded-2xl bg-emerald-600 px-6 text-base font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-500 sm:w-auto sm:px-7"
                    >
                      내 건물 에너지 진단 바로가기
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-auto w-full max-w-xl rounded-[2rem] border border-slate-200 bg-slate-900 p-6 text-white shadow-2xl lg:h-full lg:max-w-none">
              <div className="flex h-full flex-col justify-center rounded-3xl bg-white/10 p-6">
                <h2 className="break-keep text-center text-3xl font-black leading-tight text-white">
                  내 건물의 모든 궁금증을
                  <span className="block">해결할 수 있습니다</span>
                </h2>
                <div className="mt-7 sm:mt-8">
                  {[
                    ["Q1.", "나와 비슷한 건물 중 내 건물 에너지 사용량은 몇 등일까?", "용도와 규모가 비슷한 건물군 안에서 내 건물의 상대적 위치를 확인합니다."],
                    ["Q2.", "지금 에너지 비용을 얼마나 더 아낄 수 있을까?", "전기·가스 사용 패턴과 절감 가능성을 함께 살펴봅니다."],
                    ["Q3.", "내 건물도 지원사업 혜택을 받을 수 있을까?", "건물 조건과 진단 결과를 바탕으로 검토 가능한 정책·지원사업 후보를 확인합니다."],
                  ].map(([number, title, desc], index) => (
                    <div
                      key={title}
                      className={`flex gap-4 ${index < 2 ? "mb-5 border-b border-white/10 pb-5" : ""}`}
                    >
                      <div className="shrink-0 text-2xl font-black leading-none text-emerald-300">
                        {number}
                      </div>
                      <div>
                        <div className="break-keep font-black leading-snug">{title}</div>
                        <p className="mt-1 break-keep text-sm leading-6 text-slate-300">{desc}</p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-6 flex h-[4.5rem] flex-col items-center justify-center text-2xl font-black leading-none text-emerald-300/80" aria-hidden="true">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white pb-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="border-t border-slate-200 pt-20">
            <div className="max-w-2xl">
              <h2 className="break-keep text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                서비스 한눈에 보기
              </h2>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {processSteps.map((step, index) => {
                const active = activeStep === index;
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setActiveStep(activeStep === index ? null : index)}
                    className="group h-48 [perspective:1000px]"
                    aria-pressed={active}
                  >
                    <span
                      className={`relative block h-full rounded-2xl transition duration-500 [transform-style:preserve-3d] ${
                        active ? "[transform:rotateY(180deg)]" : ""
                      }`}
                    >
                      <span className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm [backface-visibility:hidden] group-hover:border-emerald-200">
                        <span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-sm font-black text-emerald-600">
                          ↻
                        </span>
                        <span className="text-sm font-black text-emerald-600">{index + 1}단계</span>
                        <span className="break-keep text-xl font-black leading-snug text-slate-950">{step}</span>
                      </span>
                      <span className="absolute inset-0 flex rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-left shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]">
                        <span className="self-center break-keep text-sm font-semibold leading-6 text-slate-700">
                          {valuePoints[index].desc}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white pt-0 pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-[2rem] bg-slate-900 p-8 text-white sm:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="break-keep text-3xl font-black tracking-tight text-balance">탄소 중립, 오늘 우리 건물부터 시작하세요.</h2>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-300 sm:text-base">
                  주소만 입력하면 에너지 상태와 개선 방향을 한눈에 확인할 수 있습니다.
                </p>
              </div>
              <Link
                href="/search"
                className="inline-flex h-14 w-full items-center justify-center whitespace-nowrap rounded-2xl bg-emerald-500 px-7 text-sm font-black text-white transition hover:bg-emerald-400 sm:w-auto"
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
