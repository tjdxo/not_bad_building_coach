import Image from "next/image";
import type { GradeVisual } from "@/lib/grade-visual";
import { GradeScaleLegend } from "./grade-scale-legend";

export function GradeVisualCard({
  visual,
  className = "",
}: {
  visual: GradeVisual;
  className?: string;
}) {
  const sourceLabel =
    visual.source === "absolute" ? "절대등급 기준" : visual.source === "relative" ? "상대등급 기준" : "등급 정보";
  const statusMessage = visual.grade
    ? `이 건물은 ${visual.grade}등급, ${visual.title} 상태로 분석되었습니다.`
    : "이 건물은 등급 산정 정보가 부족한 상태입니다.";

  return (
    <section
      className={`relative flex h-full flex-col items-center justify-center rounded-3xl border border-emerald-100 bg-white p-5 text-center shadow-sm ${className}`}
    >
      <div className="mb-4 w-full">
        <GradeScaleLegend currentGrade={visual.grade} />
      </div>

      {visual.imageSrc ? (
        <div className="relative h-28 w-28 sm:h-32 sm:w-32 lg:h-36 lg:w-36">
          <Image
            src={visual.imageSrc}
            alt={`에너지 효율 ${visual.grade}등급 이미지`}
            fill
            sizes="(max-width: 640px) 112px, (max-width: 1024px) 128px, 144px"
            className="object-contain"
            priority
          />
        </div>
      ) : (
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-100 text-4xl font-black text-slate-300 sm:h-32 sm:w-32">
          -
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        {visual.grade && (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-lg font-black text-white">
            {visual.grade}
          </span>
        )}
        <span className="text-base font-black text-slate-950">{visual.title}</span>
      </div>
      <div className="mt-2 text-xs font-black text-emerald-700">{visual.basisLabel || sourceLabel}</div>
      <p className="mt-3 max-w-[22rem] text-sm font-black leading-6 text-slate-950">{statusMessage}</p>
      <p className="mt-2 max-w-[20rem] text-xs font-semibold leading-5 text-slate-500">{visual.description}</p>
    </section>
  );
}
