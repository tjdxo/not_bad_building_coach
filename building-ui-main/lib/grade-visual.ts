export type EnergyGrade = "A" | "B" | "C" | "D" | "E";

export type GradeVisualSource = "absolute" | "relative" | "none";

export type GradeVisual = {
  grade: EnergyGrade | null;
  source: GradeVisualSource;
  imageSrc: string | null;
  title: string;
  description: string;
  basisLabel: string;
};

const GRADE_IMAGE_MAP: Record<EnergyGrade, string> = {
  A: "/grade-icons/grade-a-tree-fruit.png",
  B: "/grade-icons/grade-b-tree.png",
  C: "/grade-icons/grade-c-sprout.png",
  D: "/grade-icons/grade-d-coin.png",
  E: "/grade-icons/grade-e-dryland.png",
};

const ABSOLUTE_GRADE_TEXT: Record<EnergyGrade, string> = {
  A: "에너지 효율 우수",
  B: "양호한 수준",
  C: "평균권",
  D: "개선 검토 필요",
  E: "우선 개선 필요",
};

const RELATIVE_GRADE_TEXT: Record<EnergyGrade, string> = {
  A: "유사군 대비 매우 우수",
  B: "유사군 대비 양호",
  C: "유사군 평균권",
  D: "유사군 대비 개선 필요",
  E: "유사군 대비 우선 개선 필요",
};

const EXCLUDED_ABSOLUTE_STATUSES = new Set([
  "excluded_residential",
  "under_3000_out_of_scope",
  "excluded",
  "산정 예정",
  "적용 제외",
]);

function normalizeGrade(value?: string | null): EnergyGrade | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "A" || normalized === "B" || normalized === "C" || normalized === "D" || normalized === "E"
    ? normalized
    : null;
}

function hasExcludedAbsoluteStatus(value?: string | null) {
  return EXCLUDED_ABSOLUTE_STATUSES.has(String(value ?? "").trim());
}

export function getGradeVisual(input: {
  absoluteGrade?: string | null;
  absoluteStatus?: string | null;
  relativeGrade?: string | null;
}): GradeVisual {
  const absoluteGrade = normalizeGrade(input.absoluteGrade);
  if (absoluteGrade) {
    return {
      grade: absoluteGrade,
      source: "absolute",
      imageSrc: GRADE_IMAGE_MAP[absoluteGrade],
      title: ABSOLUTE_GRADE_TEXT[absoluteGrade],
      description: "서울시 건물 에너지 등급제 취지를 참고한 절대등급 기준입니다.",
      basisLabel: `절대등급 ${absoluteGrade} 기준`,
    };
  }

  const relativeGrade = normalizeGrade(input.relativeGrade);
  if (relativeGrade) {
    const absoluteExcluded = hasExcludedAbsoluteStatus(input.absoluteStatus) || Boolean(input.absoluteGrade);

    return {
      grade: relativeGrade,
      source: "relative",
      imageSrc: GRADE_IMAGE_MAP[relativeGrade],
      title: RELATIVE_GRADE_TEXT[relativeGrade],
      description: "유사 건물군과의 상대 비교를 기준으로 표시합니다.",
      basisLabel: absoluteExcluded
        ? "절대등급 적용 제외 · 상대등급 기준 표시"
        : `상대등급 ${relativeGrade} 기준`,
    };
  }

  return {
    grade: null,
    source: "none",
    imageSrc: null,
    title: "등급 산정 정보 부족",
    description: "에너지 사용량 또는 비교군 정보가 부족해 등급 이미지를 표시할 수 없습니다.",
    basisLabel: "등급 정보 없음",
  };
}
