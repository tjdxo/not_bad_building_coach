"use client";

import { Suspense, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const MONTHS = [
  "2024.11",
  "2024.12",
  "2025.01",
  "2025.02",
  "2025.03",
  "2025.04",
  "2025.05",
  "2025.06",
  "2025.07",
  "2025.08",
  "2025.09",
  "2025.10",
];

type ManualEnergyRow = {
  month: string;
  electricity: string;
  gas: string;
};

function ManualEnergyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const address = searchParams.get("address") || "선택 건물";
  const buildingId = searchParams.get("building_id") || "";
  const [rows, setRows] = useState<ManualEnergyRow[]>(
    MONTHS.map((month) => ({ month, electricity: "", gas: "" })),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const chartRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        electricityValue: Number(row.electricity) || 0,
        gasValue: Number(row.gas) || 0,
      })),
    [rows],
  );
  const maxElectricity = Math.max(1, ...chartRows.map((row) => row.electricityValue));

  const updateRow = (index: number, key: "electricity" | "gas", value: string) => {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sessionStorage.setItem(
      "manualEnergyDraft",
      JSON.stringify({
        address,
        rows,
        files: files.map((file) => file.name),
        savedAt: new Date().toISOString(),
      }),
    );
    setSubmitted(true);
    const params = new URLSearchParams({
      address,
      energy_mode: "manual",
    });
    if (buildingId) {
      params.set("building_id", buildingId);
    }
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div>
          <p className="text-sm font-black tracking-[0.25em] text-emerald-600">직접 입력</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            월별 사용량 입력
          </h1>
          <p className="mt-4 max-w-3xl text-slate-600">
            입력값은 현재 브라우저 세션에만 임시 저장되며 서버나 DB에 저장하지 않습니다.
          </p>
        </div>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">{address}</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            전기·가스 고지서 또는 관리비 명세서를 참고해 12개월 사용량을 입력하세요.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 text-xs font-black text-slate-500">
              <div>월</div>
              <div>전기 사용량(kWh)</div>
              <div>가스 사용량(선택)</div>
            </div>
            <div className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <div key={row.month} className="grid grid-cols-[1fr_1fr_1fr] gap-3 px-5 py-3">
                  <div className="flex items-center text-sm font-black text-slate-700">
                    {row.month}
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={row.electricity}
                    onChange={(event) => updateRow(index, "electricity", event.target.value)}
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                  <input
                    type="number"
                    min="0"
                    value={row.gas}
                    onChange={(event) => updateRow(index, "gas", event.target.value)}
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              ))}
            </div>
          </section>

          <aside className="h-fit rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-950">증빙 자료</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              전기·가스 고지서 또는 관리비 명세서를 첨부할 수 있습니다. 현재 버전에서는 파일을
              서버에 저장하지 않습니다.
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files || []))}
              className="mt-5 block w-full text-sm font-semibold text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-50 file:px-4 file:py-3 file:font-black file:text-emerald-700"
            />
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file) => (
                  <div
                    key={file.name}
                    className="truncate rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600"
                  >
                    {file.name}
                  </div>
                ))}
              </div>
            )}
            <button
              type="submit"
              className="mt-6 h-14 w-full rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
            >
              입력값으로 임시 진단 보기
            </button>
            {submitted && (
              <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                입력값을 현재 세션에 임시 저장했습니다.
              </p>
            )}
          </aside>
        </form>

        {submitted && (
          <section className="mt-8 rounded-[2rem] border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  사용자 직접 입력값 기준
                </span>
                <h2 className="mt-4 text-xl font-black text-slate-950">
                  월별 전기 사용량 미리보기
                </h2>
              </div>
              <Link href="/search" className="text-sm font-black text-emerald-600 hover:underline">
                건물 다시 선택
              </Link>
            </div>
            <div className="mt-8 flex h-52 items-end gap-2">
              {chartRows.map((row) => (
                <div key={row.month} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-4 rounded-t bg-emerald-500"
                    style={{ height: `${(row.electricityValue / maxElectricity) * 170}px` }}
                  />
                  <span className="text-[10px] font-bold text-slate-400">{row.month}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function ManualEnergyPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50 py-12" />}>
      <ManualEnergyForm />
    </Suspense>
  );
}
