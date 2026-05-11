import type { ReportApiResponse } from "@/lib/building-api";

export type PolicyRecommendation = {
  id: string;
  name: string;
  shortLabel: string;
  status: "검토 가능" | "추가 확인" | "참여 가능" | "참고";
  categories: string[];
  description: string;
  matchReason: string;
  requiredChecks: string[];
};

type PolicyCandidate = PolicyRecommendation & {
  score: number;
};

function textIncludesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function buildingText(report: ReportApiResponse) {
  return [
    report.building.name,
    report.building.building_type,
    report.building.road_address,
    report.building.jibun_address,
    report.building.bld_nm,
    report.building.dong_nm,
  ]
    .filter(Boolean)
    .join(" ");
}

function gradeValue(report: ReportApiResponse) {
  return (
    report.peer_benchmark?.absolute_grade?.grade ||
    report.peer_benchmark?.relative_grade?.grade ||
    ""
  ).toUpperCase();
}

function addCandidate(candidates: PolicyCandidate[], candidate: PolicyCandidate) {
  if (candidate.score <= 0) {
    return;
  }
  candidates.push(candidate);
}

export function buildPolicyRecommendations(report: ReportApiResponse): PolicyRecommendation[] {
  const text = buildingText(report);
  const approvalYear = Number(report.building.approval_year || 0);
  const currentYear = new Date().getFullYear();
  const buildingAge = approvalYear > 0 ? currentYear - approvalYear : null;
  const old15 = buildingAge !== null && buildingAge >= 15;
  const old10 = buildingAge !== null && buildingAge >= 10;
  const area = Number(report.building.gross_floor_area || report.building.grs_ar || 0);
  const largeArea = area >= 3000;
  const electricHigh = report.energy_summary.electricity_ratio > 1.08;
  const gasHigh = report.energy_summary.gas_ratio > 1.08;
  const grade = gradeValue(report);
  const lowGrade = grade === "C" || grade === "D" || grade === "E";
  const veryLowGrade = grade === "D" || grade === "E";
  const reliabilityLow =
    !report.peer_benchmark?.has_data ||
    (report.peer_benchmark?.reliability_score !== null &&
      report.peer_benchmark?.reliability_score !== undefined &&
      report.peer_benchmark.reliability_score < 60);
  const estimatedIncluded = Boolean(report.energy?.is_estimated_included || report.energy?.is_estimated_gas_included);
  const residential = textIncludesAny(text, ["주택", "아파트", "공동주택", "단독", "다가구", "다세대", "연립"]);
  const publicLike = textIncludesAny(text, ["공공", "학교", "교육", "도서관", "보건", "노유자", "어린이집", "복지", "센터"]);

  const candidates: PolicyCandidate[] = [];

  addCandidate(candidates, {
    id: "brp",
    name: "민간건물 에너지효율화사업 BRP 융자",
    shortLabel: "BRP 융자지원",
    status: old15 || lowGrade || electricHigh || gasHigh ? "검토 가능" : "추가 확인",
    categories: [
      old15 ? "노후 건물" : "연식 확인",
      electricHigh ? "LED/공조" : gasHigh ? "단열/난방" : "효율개선",
      lowGrade ? "등급 개선" : "참고 후보",
    ],
    description:
      "노후 건물의 에너지 성능개선 공사비를 융자로 지원하는 사업입니다. 창호, 단열, LED, 고효율 공조설비, BEMS 등과 연결될 수 있습니다.",
    matchReason:
      electricHigh || gasHigh || lowGrade
        ? "유사군 대비 사용량 또는 등급 개선 여지가 있어 LED, 공조, BEMS, 창호 개선 검토와 연결될 수 있습니다."
        : "건물 에너지효율화 공사 항목과 연결 가능한 기본 검토 후보입니다.",
    requiredChecks: ["사용승인일", "소유 관계", "공사 항목", "실제 신청 자격"],
    score: 25 + (old15 ? 24 : 0) + (lowGrade ? 20 : 0) + (electricHigh ? 15 : 0) + (gasHigh ? 15 : 0) + (largeArea ? 8 : 0),
  });

  addCandidate(candidates, {
    id: "saebit_house",
    name: "새빛주택 보조금",
    shortLabel: "새빛주택",
    status: residential && old15 ? "검토 가능" : "추가 확인",
    categories: [residential ? "주거용" : "용도 확인", old15 ? "노후 주택" : "연식 확인", "창호/조명"],
    description:
      "노후 주택의 창호, LED 조명, 차열도장 등 에너지효율 개선 공사를 보조하는 사업입니다. 공시가격, 주택 유형 등 추가 확인이 필요합니다.",
    matchReason:
      residential && old15
        ? "주거용 노후 건물로 추정되어 창호, 조명, 차열도장 개선 항목과 연결될 수 있습니다."
        : "주택 유형, 공시가격, 기존 지원 이력 확인 후 검토할 수 있는 후보입니다.",
    requiredChecks: ["공시가격", "주택 유형", "기존 지원 이력", "소유자 신청 가능 여부"],
    score: (residential ? 45 : 5) + (old15 ? 25 : 0) + (gasHigh ? 10 : 0) + (electricHigh ? 8 : 0),
  });

  addCandidate(candidates, {
    id: "public_green_remodeling",
    name: "공공건축물 그린리모델링",
    shortLabel: "그린리모델링",
    status: publicLike && old10 ? "검토 가능" : "추가 확인",
    categories: [publicLike ? "공공시설 후보" : "공공성 확인", old10 ? "10년 이상" : "연식 확인", "창호/단열"],
    description:
      "공공건축물의 에너지 성능과 실내환경 개선을 지원하는 사업입니다. 고성능 창호, 단열보강, 고효율 냉난방기, 조명 개선 등이 주요 항목입니다.",
    matchReason:
      publicLike
        ? "공공시설 용도에 가까운 건물로 추정되어 단열, 창호, 냉난방기 개선 후보로 볼 수 있습니다."
        : "공공건축물 여부가 확인되면 그린리모델링 항목과 연결해 검토할 수 있습니다.",
    requiredChecks: ["공공건축물 여부", "소유 주체", "사업 대상 시설 여부", "실내환경 개선 항목"],
    score: (publicLike ? 52 : 0) + (old10 ? 20 : 0) + (lowGrade ? 12 : 0) + (gasHigh ? 8 : 0),
  });

  addCandidate(candidates, {
    id: "simple_window",
    name: "고효율 창호 간편시공",
    shortLabel: "창호 간편시공",
    status: residential ? "추가 확인" : "참고",
    categories: [residential ? "주거용" : "대상 확인", "창호/단열", "소득조건"],
    description:
      "취약계층 주택을 대상으로 단열덧유리와 기밀방풍재 등을 지원하는 사업입니다. 소득 조건과 기존 지원 이력 확인이 필요합니다.",
    matchReason:
      gasHigh || veryLowGrade
        ? "난방 손실 또는 외피 성능 점검 필요성이 있어 창호·기밀 개선과 연결될 수 있습니다."
        : "주거용 여부와 소득 조건이 확인되면 창호 개선 후보로 참고할 수 있습니다.",
    requiredChecks: ["차상위 이하 등 소득 조건", "기존 지원 이력", "창호 상태", "주택 유형"],
    score: (residential ? 30 : 0) + (gasHigh ? 18 : 0) + (veryLowGrade ? 15 : 0),
  });

  addCandidate(candidates, {
    id: "eco_mileage",
    name: "에코마일리지",
    shortLabel: "에코마일리지",
    status: "참여 가능",
    categories: ["참여형", estimatedIncluded || reliabilityLow ? "사용량 확인" : "절감 실천", "모니터링"],
    description:
      "에너지 사용량 절감 실적에 따라 인센티브를 제공하는 참여형 제도입니다. 실제 사용량 관리와 절감 실천이 중요합니다.",
    matchReason:
      estimatedIncluded || reliabilityLow
        ? "실측 사용량 확인과 월별 모니터링을 통해 진단 신뢰도를 높이고 절감 실천과 연결할 수 있습니다."
        : "건물 유형과 무관하게 에너지 절감 실천과 사용량 관리에 연결할 수 있습니다.",
    requiredChecks: ["참여 주체", "계량 정보", "절감 기준 기간", "실측 사용량"],
    score: 22 + (estimatedIncluded ? 18 : 0) + (reliabilityLow ? 12 : 0),
  });

  addCandidate(candidates, {
    id: "renewable_energy",
    name: "신재생에너지 보급 지원 / 컨설팅",
    shortLabel: "신재생 컨설팅",
    status: electricHigh || largeArea ? "검토 가능" : "참고",
    categories: [electricHigh ? "전기 사용 높음" : "전기 검토", largeArea ? "대형 건물" : "현장 확인", "태양광"],
    description:
      "태양광 등 신재생에너지 설비 도입 가능성을 검토하는 지원·상담 성격의 정책 후보입니다. 실제 설치 가능 여부는 현장 조건 확인이 필요합니다.",
    matchReason:
      electricHigh || largeArea
        ? "전기 사용량 또는 건물 규모를 고려할 때 태양광, 신재생 설비 검토와 연결될 수 있습니다."
        : "옥상, 외피, 전기 설비 조건 확인 후 참고할 수 있는 후보입니다.",
    requiredChecks: ["옥상/외피 활용 가능성", "구조 안전", "전기 설비 여유", "일조 조건"],
    score: 10 + (electricHigh ? 28 : 0) + (largeArea ? 22 : 0) + (lowGrade ? 8 : 0),
  });

  addCandidate(candidates, {
    id: "zeb",
    name: "ZEB / 제로에너지건축물 컨설팅",
    shortLabel: "ZEB 컨설팅",
    status: veryLowGrade || largeArea ? "검토 가능" : "참고",
    categories: [veryLowGrade ? "등급 개선" : "장기 개선", "BEMS", "고효율 설비"],
    description:
      "제로에너지건축물 수준의 성능 개선을 목표로 고단열, 고효율 설비, BEMS, 신재생에너지 적용 가능성을 검토하는 방향입니다.",
    matchReason:
      veryLowGrade || largeArea
        ? "등급 개선 여지 또는 건물 규모를 고려할 때 설비와 외피 성능을 함께 보는 장기 개선 계획과 연결될 수 있습니다."
        : "장기 리모델링 또는 에너지 성능 개선 계획 수립 시 참고할 수 있습니다.",
    requiredChecks: ["장기 리모델링 계획", "BEMS 적용 가능성", "신재생 설비 조건", "투자 우선순위"],
    score: 8 + (veryLowGrade ? 28 : 0) + (largeArea ? 20 : 0) + (electricHigh && gasHigh ? 12 : 0),
  });

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((candidate) => {
      const item: PolicyRecommendation = {
        id: candidate.id,
        name: candidate.name,
        shortLabel: candidate.shortLabel,
        status: candidate.status,
        categories: candidate.categories,
        description: candidate.description,
        matchReason: candidate.matchReason,
        requiredChecks: candidate.requiredChecks,
      };
      return item;
    });
}
