import Image from "next/image";
import type { EnergyGrade } from "@/lib/grade-visual";

const GRADE_SCALE: Array<{ grade: EnergyGrade; label: string; src: string }> = [
  { grade: "A", label: "매우 우수", src: "/grade-icons/grade-a-tree-fruit.png" },
  { grade: "B", label: "양호", src: "/grade-icons/grade-b-tree.png" },
  { grade: "C", label: "평균권", src: "/grade-icons/grade-c-sprout.png" },
  { grade: "D", label: "개선 필요", src: "/grade-icons/grade-d-coin.png" },
  { grade: "E", label: "우선 개선", src: "/grade-icons/grade-e-dryland.png" },
];

export function GradeScaleLegend({ currentGrade }: { currentGrade?: EnergyGrade | null }) {
  return (
    <div className="grid w-full grid-cols-5 gap-2">
      {GRADE_SCALE.map((item) => {
        const active = item.grade === currentGrade;
        return (
          <div
            key={item.grade}
            className={`flex h-24 min-w-0 flex-col items-center justify-between rounded-xl border bg-white px-2 py-2 text-center transition duration-150 hover:-translate-y-0.5 hover:border-emerald-200 sm:h-28 ${
              active
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100"
                : "border-slate-100 text-slate-500"
            }`}
            aria-current={active ? "true" : undefined}
          >
            <span className="text-xs font-black leading-none">{item.grade}</span>
            <div className="relative h-8 w-8 sm:h-10 sm:w-10">
              <Image
                src={item.src}
                alt={`에너지 효율 ${item.grade}등급 이미지`}
                fill
                sizes="40px"
                className="object-contain"
              />
            </div>
            <span className="flex h-8 items-center justify-center break-keep text-[10px] font-black leading-4 sm:text-[11px]">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
