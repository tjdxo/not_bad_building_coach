import Image from "next/image";
import type { GradeVisual } from "@/lib/grade-visual";
import { GradeScaleLegend } from "./grade-scale-legend";

function GradePanel({
  heading,
  visual,
}: {
  heading: string;
  visual: GradeVisual;
}) {
  const statusMessage = visual.grade
    ? `${heading}은 ${visual.grade}등급, ${visual.title} 상태로 분석되었습니다.`
    : `${heading}은 현재 산정되지 않았습니다.`;

  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
      <div className="text-xs font-black tracking-[0.18em] text-emerald-600">{heading}</div>
      <div className="mt-3">
        <GradeScaleLegend currentGrade={visual.grade} />
      </div>

      <div className="mt-5 flex flex-1 flex-col items-center justify-center">
        {visual.imageSrc ? (
          <div className="relative h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32">
            <Image
              src={visual.imageSrc}
              alt={`에너지 효율 ${visual.grade}등급 이미지`}
              fill
              sizes="(max-width: 640px) 96px, (max-width: 1024px) 112px, 128px"
              className="object-contain"
              priority
            />
          </div>
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-4xl font-black text-slate-300 ring-1 ring-slate-200 sm:h-28 sm:w-28">
            -
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {visual.grade && (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-lg font-black text-white">
              {visual.grade}
            </span>
          )}
          <span className="text-base font-black text-slate-950">{visual.title}</span>
        </div>
        <div className="mt-2 text-xs font-black text-emerald-700">{visual.basisLabel}</div>
        <p className="mt-3 max-w-[22rem] text-sm font-black leading-6 text-slate-950">{statusMessage}</p>
        <p className="mt-2 max-w-[22rem] text-xs font-semibold leading-5 text-slate-500">{visual.description}</p>
      </div>
    </div>
  );
}

export function GradeVisualCard({
  visual,
  absoluteVisual,
  relativeVisual,
  className = "",
}: {
  visual?: GradeVisual;
  absoluteVisual?: GradeVisual;
  relativeVisual?: GradeVisual;
  className?: string;
}) {
  const panels = absoluteVisual || relativeVisual
    ? [
        { heading: "절대등급", visual: absoluteVisual },
        { heading: "상대등급", visual: relativeVisual },
      ].filter((item): item is { heading: string; visual: GradeVisual } => Boolean(item.visual))
    : [{ heading: visual?.source === "relative" ? "상대등급" : "절대등급", visual }].filter(
        (item): item is { heading: string; visual: GradeVisual } => Boolean(item.visual),
      );

  return (
    <section className={`rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-5 text-center">
        <h2 className="text-lg font-black text-slate-950">에너지 등급 진단</h2>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
          절대등급은 기준표 기반의 등급, 상대등급은 유사 건물군 안에서의 위치를 의미합니다.
        </p>
      </div>
      <div className={`grid gap-4 ${panels.length > 1 ? "lg:grid-cols-2" : ""}`}>
        {panels.map((item) => (
          <GradePanel key={item.heading} heading={item.heading} visual={item.visual} />
        ))}
      </div>
    </section>
  );
}
