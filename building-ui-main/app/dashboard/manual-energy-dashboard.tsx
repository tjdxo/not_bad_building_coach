"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatNumber } from "@/lib/building-api";

type ManualEnergyRow = {
  month: string;
  electricity: string;
  gas: string;
};

type ManualEnergyDraft = {
  address: string;
  rows: ManualEnergyRow[];
  files: string[];
  savedAt: string;
};

type ChartRow = ManualEnergyRow & {
  electricityValue: number;
  gasValue: number;
};

function readManualEnergyDraft() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem("manualEnergyDraft");
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ManualEnergyDraft;
    if (!Array.isArray(parsed.rows)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function MiniBarChart({
  rows,
  source,
  colorClass,
  unit,
}: {
  rows: ChartRow[];
  source: "electricity" | "gas";
  colorClass: string;
  unit: string;
}) {
  const values = rows.map((row) => (source === "electricity" ? row.electricityValue : row.gasValue));
  const maxValue = Math.max(1, ...values);

  return (
    <div className="mt-8 w-full min-w-0 overflow-x-hidden">
      <div className="flex h-48 w-full min-w-0 items-end gap-1 sm:gap-2">
        {rows.map((row, index) => {
          const value = values[index] || 0;
          return (
            <div key={`${source}-${row.month}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div
                className={`w-4 rounded-t ${colorClass}`}
                style={{ height: `${(value / maxValue) * 160}px` }}
                title={`${row.month}: ${formatNumber(value, 1)} ${unit}`}
              />
              <span className="text-[10px] font-bold text-slate-400">{row.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ManualEnergyDashboard({
  address,
  buildingId,
}: {
  address: string;
  buildingId?: string;
}) {
  const [draft, setDraft] = useState<ManualEnergyDraft | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDraft(readManualEnergyDraft());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const rows = useMemo<ChartRow[]>(
    () =>
      (draft?.rows || []).map((row) => ({
        ...row,
        electricityValue: Number(row.electricity) || 0,
        gasValue: Number(row.gas) || 0,
      })),
    [draft],
  );

  const electricityValues = rows.map((row) => row.electricityValue).filter((value) => value > 0);
  const gasValues = rows.map((row) => row.gasValue).filter((value) => value > 0);
  const electricityAverage =
    electricityValues.length > 0
      ? electricityValues.reduce((sum, value) => sum + value, 0) / electricityValues.length
      : 0;
  const gasAverage =
    gasValues.length > 0 ? gasValues.reduce((sum, value) => sum + value, 0) / gasValues.length : 0;

  const manualEnergyHref = `/search/manual-energy?${new URLSearchParams({
    address: draft?.address || address,
    building_id: buildingId || "",
  }).toString()}`;

  if (!draft) {
    return (
      <main className="min-h-screen bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <section className="rounded-[2rem] border border-amber-100 bg-white p-8 text-center shadow-sm sm:p-12">
            <p className="text-sm font-black tracking-[0.25em] text-amber-600">직접 입력값 없음</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
              현재 세션에 저장된 사용량 입력값이 없습니다.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              직접 입력값은 서버에 저장하지 않고 브라우저 세션에만 보관합니다. 다시 입력하면 이
              화면에서 임시 진단을 확인할 수 있습니다.
            </p>
            <Link
              href={manualEnergyHref}
              className="mt-8 inline-flex h-14 items-center justify-center rounded-2xl bg-emerald-600 px-8 text-sm font-black text-white"
            >
              내 사용량 직접 입력하기
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <section className="border-b border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black tracking-[0.25em] text-emerald-600">
                사용자 직접 입력값 기준
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
                {draft.address || address}
              </h1>
              <p className="mt-3 max-w-3xl text-slate-600">
                이 결과는 공공 DB가 아니라 사용자가 입력한 전기·가스 사용량을 기준으로 한 임시
                진단입니다. 입력값은 서버나 DB에 저장되지 않습니다.
              </p>
            </div>
            <Link
              href={manualEnergyHref}
              className="inline-flex h-14 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white"
            >
              다시 입력하기
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black text-slate-400">전기 월평균</p>
            <p className="mt-3 text-3xl font-black text-slate-950">
              {formatNumber(electricityAverage, 1)} kWh
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black text-slate-400">가스 월평균</p>
            <p className="mt-3 text-3xl font-black text-slate-950">
              {formatNumber(gasAverage, 1)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black text-slate-400">첨부 파일</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{draft.files.length}개</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8">
          <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">월별 전기 사용량</h2>
            <p className="mt-1 text-sm text-slate-500">사용자가 입력한 kWh 기준</p>
            <MiniBarChart rows={rows} source="electricity" colorClass="bg-emerald-500" unit="kWh" />
          </div>
          <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">월별 가스 사용량</h2>
            <p className="mt-1 text-sm text-slate-500">사용자가 입력한 값 기준</p>
            <MiniBarChart rows={rows} source="gas" colorClass="bg-blue-500" unit="" />
          </div>
        </div>

        {draft.files.length > 0 && (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">첨부한 증빙 파일</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {draft.files.map((file) => (
                <div key={file} className="truncate rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                  {file}
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
