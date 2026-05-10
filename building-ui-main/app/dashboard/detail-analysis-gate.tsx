"use client";

import { Children, type ReactNode, useEffect, useState } from "react";
import type { ReportApiResponse } from "@/lib/building-api";

function premiumUnlockStorageKey(report: ReportApiResponse) {
  const building = report.building;
  const id = building.building_id ?? building.id ?? building.building_code ?? building.display_address ?? building.road_address;
  return `building-coach:premium-unlocked:${String(id)}`;
}

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
    <section className="relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-white/45 to-white/95" />
      <div className="relative min-h-[150px] blur-[2px]">
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
      <div className="relative mt-auto rounded-2xl bg-slate-950 p-5 text-white shadow-xl">
        <h3 className="text-base font-black">{title}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">{teaser}</p>
      </div>
    </section>
  );
}

function LockedNextStepPreview() {
  return (
    <section className="mt-6 rounded-[2rem] border border-emerald-100 bg-emerald-50/50 p-6">
      <p className="text-sm font-black tracking-[0.2em] text-emerald-700">다음 분석 단계</p>
      <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
        유사 건물 상세 비교와 AI 리포트는 상세 분석에서 제공합니다
      </h3>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-white p-5">
          <div className="text-sm font-black text-slate-950">유사 건물 상세 비교</div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            유사 건물 상세 비교에서는 내 건물이 유사군 평균 대비 어느 항목에서 차이가 큰지 확인할 수 있습니다.
          </p>
          <span className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
            결제 후 확인 가능
          </span>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-5">
          <div className="text-sm font-black text-slate-950">AI 리포트</div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            AI 리포트에서는 원인 가설, 개선 우선순위, 리스크 시나리오를 확인할 수 있습니다.
          </p>
          <span className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
            결제 후 확인 가능
          </span>
        </div>
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
      <LockedNextStepPreview />
    </section>
  );
}

export function DetailAnalysisGate({
  report,
  lockedChildren,
  children,
}: {
  report: ReportApiResponse;
  lockedChildren?: ReactNode;
  children: ReactNode;
}) {
  const storageKey = premiumUnlockStorageKey(report);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);

  useEffect(() => {
    setIsPremiumUnlocked(window.localStorage.getItem(storageKey) === "true");
  }, [storageKey]);

  function unlockPremium() {
    window.localStorage.setItem(storageKey, "true");
    setIsPremiumUnlocked(true);
  }

  if (isPremiumUnlocked) {
    return <div>{Children.toArray(children)}</div>;
  }

  return (
    <div className="space-y-10">
      {lockedChildren ? <div>{lockedChildren}</div> : null}
      <LockedDetailAnalysis
        report={report}
        onUnlock={() => {
          // TODO: 실제 결제 승인 결과로 잠금 해제하도록 교체합니다.
          unlockPremium();
        }}
      />
    </div>
  );
}
