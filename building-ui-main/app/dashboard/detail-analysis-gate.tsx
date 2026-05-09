"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { ReportApiResponse } from "@/lib/building-api";

function formatMaskedSaving(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return "상위 10% 이내";
  }
  const manWon = Math.round(value / 10_000);
  if (manWon >= 10_000) {
    return `연간 약 ${Math.floor(manWon / 10_000)}억****만원`;
  }
  if (manWon >= 1_000) {
    return `연간 약 ${Math.floor(manWon / 1_000)},***만원`;
  }
  if (manWon >= 100) {
    return `연간 약 ${Math.floor(manWon / 100)}**만원`;
  }
  return "연간 절약 가능성 감지";
}

function LockedPreviewCard({
  title,
  teaser,
  children,
}: {
  title: string;
  teaser: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-white/45 to-white/95" />
      <div className="relative blur-[2px]">
        {children || (
          <div className="space-y-3">
            <div className="h-4 w-2/3 rounded-full bg-slate-200" />
            <div className="h-28 rounded-2xl bg-slate-100" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-12 rounded-xl bg-slate-100" />
              <div className="h-12 rounded-xl bg-slate-100" />
              <div className="h-12 rounded-xl bg-slate-100" />
            </div>
          </div>
        )}
      </div>
      <div className="relative mt-5 rounded-2xl bg-slate-950 p-5 text-white shadow-xl">
        <h3 className="text-base font-black">{title}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">{teaser}</p>
      </div>
    </section>
  );
}

function LockedDetailAnalysis({
  report,
  onUnlock,
}: {
  report: ReportApiResponse;
  onUnlock: () => void;
}) {
  const maskedSaving = formatMaskedSaving(report.saving_estimate?.total?.saving_krw);
  const hasPolicyHint = (report.raw_analysis_json?.policy_matches as unknown[] | undefined)?.length;

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black tracking-[0.2em] text-emerald-600">DETAIL ANALYSIS</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">상세 분석</h2>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
            상세 분석과 AI 리포트는 결제 후 확인할 수 있습니다. 유사군 대비 소비 지표, 상위권 기준 예상 절약액,
            지원사업 검토 가능성, AI 리포트와 PDF까지 한 번에 확인할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onUnlock}
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 px-6 text-sm font-black text-white transition hover:bg-slate-800"
        >
          결제하기
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <LockedPreviewCard
          title="월별 사용량과 유사군 비교"
          teaser="유사군 대비 소비가 높은 월과 전기·가스 사용 패턴을 확인할 수 있습니다."
        />
        <LockedPreviewCard
          title="예상 절약액"
          teaser={
            report.saving_estimate?.available
              ? `${maskedSaving} · 상세 금액과 산정 근거는 결제 후 확인할 수 있습니다.`
              : "상세 분석에서 절약 가능성과 산정 가능 여부를 확인할 수 있습니다."
          }
        >
          <div className="rounded-2xl bg-emerald-50 p-5">
            <div className="text-xs font-black text-emerald-700">유사군 상위 10% 기준</div>
            <div className="mt-3 h-8 w-3/4 rounded-full bg-emerald-200" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="h-14 rounded-xl bg-white" />
              <div className="h-14 rounded-xl bg-white" />
            </div>
          </div>
        </LockedPreviewCard>
        <LockedPreviewCard
          title="정책 매칭과 AI 실행 액션"
          teaser={
            hasPolicyHint
              ? "이 건물에 적용 가능성이 있는 지원사업과 실행 우선순위를 확인할 수 있습니다."
              : "지원사업 검토 가능성과 신청 전 확인사항을 볼 수 있습니다."
          }
        />
      </div>
    </section>
  );
}

export function DetailAnalysisGate({
  report,
  children,
}: {
  report: ReportApiResponse;
  children: ReactNode;
}) {
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);

  if (isPremiumUnlocked) {
    return <>{children}</>;
  }

  return (
    <LockedDetailAnalysis
      report={report}
      onUnlock={() => {
        // TODO: 실제 결제 승인 결과로 잠금 해제하도록 교체합니다.
        setIsPremiumUnlocked(true);
      }}
    />
  );
}
