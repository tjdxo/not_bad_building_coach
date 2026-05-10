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

function absoluteMissingDescription(status?: string | null) {
  if (hasExcludedAbsoluteStatus(status)) {
    return "서울시 절대등급 적용 대상이 아니거나, 현재 기준에서 공식 절대등급을 산정하지 않는 건물입니다.";
  }
  return "공식 절대등급 산정에 필요한 등급값이 아직 연결되지 않았습니다. 상대등급과 유사군 비교를 함께 확인해 주세요.";
}

function relativeMissingDescription() {
  return "유사군 벤치마크 또는 백분위 등급 데이터가 부족해 상대등급을 산정하지 못했습니다. 사용량 비교와 신뢰도 정보를 함께 확인해 주세요.";
}

export function getAbsoluteGradeVisual(input: {
  absoluteGrade?: string | null;
  absoluteStatus?: string | null;
}): GradeVisual {
  const absoluteGrade = normalizeGrade(input.absoluteGrade);
  if (absoluteGrade) {
    return {
      grade: absoluteGrade,
      source: "absolute",
      imageSrc: GRADE_IMAGE_MAP[absoluteGrade],
      title: ABSOLUTE_GRADE_TEXT[absoluteGrade],
      description: "서울시 건물 에너지 등급 기준을 참고해 산정한 절대 기준의 등급입니다.",
      basisLabel: `절대 등급 ${absoluteGrade} 기준`,
    };
  }

  return {
    grade: null,
    source: "none",
    imageSrc: null,
    title: "절대 등급 미산정",
    description: absoluteMissingDescription(input.absoluteStatus),
    basisLabel: "절대 등급 정보 없음",
  };
}

export function getRelativeGradeVisual(input: {
  relativeGrade?: string | null;
}): GradeVisual {
  const relativeGrade = normalizeGrade(input.relativeGrade);
  if (relativeGrade) {
    return {
      grade: relativeGrade,
      source: "relative",
      imageSrc: GRADE_IMAGE_MAP[relativeGrade],
      title: RELATIVE_GRADE_TEXT[relativeGrade],
      description: "유사한 건물군 안에서의 상대적 위치를 백분위 기반으로 해석한 등급입니다.",
      basisLabel: `상대 등급 ${relativeGrade} 기준`,
    };
  }

  return {
    grade: null,
    source: "none",
    imageSrc: null,
    title: "상대 등급 미산정",
    description: relativeMissingDescription(),
    basisLabel: "상대 등급 정보 없음",
  };
}

export function getGradeVisualPair(input: {
  absoluteGrade?: string | null;
  absoluteStatus?: string | null;
  relativeGrade?: string | null;
}) {
  return {
    absoluteVisual: getAbsoluteGradeVisual(input),
    relativeVisual: getRelativeGradeVisual(input),
  };
}

export function getGradeVisual(input: {
  absoluteGrade?: string | null;
  absoluteStatus?: string | null;
  relativeGrade?: string | null;
}): GradeVisual {
  const absoluteVisual = getAbsoluteGradeVisual(input);
  if (absoluteVisual.grade) {
    return absoluteVisual;
  }
  return getRelativeGradeVisual(input);
}
