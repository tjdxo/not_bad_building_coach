"use client";

import { useState } from "react";
import type { ContractorRecommendation } from "@/lib/contractor-recommendations";

export function ContractorRecommendationCard({
  recommendations,
}: {
  recommendations: ContractorRecommendation[];
}) {
  const [openName, setOpenName] = useState<string | null>(recommendations[0]?.name ?? null);

  return (
    <aside className="rounded-3xl bg-slate-950 p-7 text-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-black">시공사 추천</h2>
        <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-200">
          프로토타입 추천
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        선택된 정책과 개선 항목을 기준으로 연결 가능한 예시 시공 분야입니다.
      </p>

      <div className="mt-6 space-y-3">
        {recommendations.length > 0 ? (
          recommendations.map((item) => {
            const open = openName === item.name;
            return (
              <article key={item.name} className="rounded-2xl bg-white/10 p-4">
                <button
                  type="button"
                  onClick={() => setOpenName(open ? null : item.name)}
                  className="w-full text-left"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] font-black text-white">
                          예시 업체
                        </span>
                        <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[11px] font-black text-emerald-200">
                          {item.status}
                        </span>
                      </div>
                      <h3 className="mt-3 text-base font-black text-white">{item.name}</h3>
                      <p className="mt-1 text-sm font-bold text-emerald-200">{item.category}</p>
                    </div>
                    <span className="shrink-0 text-xs font-black text-slate-400">
                      {open ? "접기 ⌃" : "상세 보기 ⌄"}
                    </span>
                  </div>
                </button>

                {open && (
                  <div className="mt-4 space-y-3 border-t border-white/10 pt-4 text-sm leading-6 text-slate-300">
                    <div>
                      <div className="text-xs font-black text-emerald-200">추천 사유</div>
                      <p className="mt-1">{item.matchReason}</p>
                    </div>
                    <div>
                      <div className="text-xs font-black text-emerald-200">연결 정책</div>
                      <p className="mt-1">{item.relatedPolicy}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold text-slate-200">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl bg-white/10 p-4 text-sm font-semibold text-slate-300">
            추천 준비중입니다. 정책 매칭과 실측 사용량이 연결되면 예시 시공 분야를 표시합니다.
          </div>
        )}
      </div>

      <p className="mt-5 rounded-2xl bg-white/10 p-4 text-xs font-semibold leading-5 text-slate-300">
        현재는 실제 제휴 업체가 아닌 프로토타입용 예시 추천입니다.
      </p>
      <button
        type="button"
        disabled
        className="mt-4 h-12 w-full cursor-not-allowed rounded-2xl bg-white/10 px-5 text-sm font-black text-slate-300"
      >
        상담 연결 준비중
      </button>
    </aside>
  );
}
