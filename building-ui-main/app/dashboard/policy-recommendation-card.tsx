"use client";

import { useState } from "react";
import type { PolicyRecommendation } from "@/lib/policy-recommendations";

export function PolicyRecommendationCard({
  recommendations,
}: {
  recommendations: PolicyRecommendation[];
}) {
  const [openId, setOpenId] = useState<string | null>(recommendations[0]?.id ?? null);

  return (
    <aside className="rounded-3xl bg-slate-950 p-7 text-white shadow-sm">
      <h2 className="text-xl font-black">정책 매칭</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        진단 결과와 건물 조건을 기준으로 검토 가능한 지원사업 후보입니다.
      </p>

      <div className="mt-6 space-y-3">
        {recommendations.map((policy) => {
          const open = openId === policy.id;
          return (
            <article key={policy.id} className="rounded-2xl bg-white/10 p-4">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : policy.id)}
                className="w-full text-left"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-black text-white">{policy.shortLabel}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-300">{policy.name}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-200">
                    {policy.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {policy.categories.slice(0, 3).map((category) => (
                    <span key={category} className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold text-slate-200">
                      {category}
                    </span>
                  ))}
                </div>
                <div className="mt-3 text-xs font-black text-slate-400">
                  {open ? "접기" : "자세히 보기"} <span aria-hidden>{open ? "⌃" : "⌄"}</span>
                </div>
              </button>

              {open && (
                <div className="mt-4 space-y-3 border-t border-white/10 pt-4 text-sm leading-6 text-slate-300">
                  <div>
                    <div className="text-xs font-black text-emerald-200">사업 설명</div>
                    <p className="mt-1">{policy.description}</p>
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-200">추천 사유</div>
                    <p className="mt-1">{policy.matchReason}</p>
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-200">추가 확인</div>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      {policy.requiredChecks.slice(0, 4).map((check) => (
                        <li key={check}>{check}</li>
                      ))}
                    </ul>
                  </div>
                  {policy.officialUrl && (
                    <a
                      href={policy.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700"
                    >
                      공식 안내 보기
                    </a>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <p className="mt-5 rounded-2xl bg-white/10 p-4 text-xs font-semibold leading-5 text-slate-300">
        실제 신청 가능 여부는 공식 공고에서 확인해야 하며, 공공데이터 기반의 검토 가능 후보입니다.
      </p>
    </aside>
  );
}
