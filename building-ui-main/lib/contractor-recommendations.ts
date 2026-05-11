import type { ReportApiResponse } from "@/lib/building-api";
import type { PolicyRecommendation } from "@/lib/policy-recommendations";

export type ContractorRecommendation = {
  name: string;
  category: string;
  matchReason: string;
  relatedPolicy: string;
  tags: string[];
  status: string;
};

type PolicyMatch = {
  policy_name?: string;
  policy_id?: string;
  matched_reasons?: string[];
  reason?: string;
};

type ContractorPolicy = {
  name?: string;
  id?: string;
  reason?: string;
  categories?: string[];
};

const CONTRACTORS: Record<string, ContractorRecommendation> = {
  window: {
    name: "그린창호 파트너스",
    category: "단열창호 · 기밀성 문",
    matchReason: "창호와 기밀성 개선 항목과 연결 가능한 예시 시공 분야입니다.",
    relatedPolicy: "BRP 융자지원 · 새빛주택 보조금",
    tags: ["창호", "단열", "기밀"],
    status: "제휴 준비중",
  },
  insulation: {
    name: "에코단열 컨설팅",
    category: "내외부 단열 · 바닥 단열",
    matchReason: "단열 보강과 난방 손실 점검 항목과 연결 가능한 예시 시공 분야입니다.",
    relatedPolicy: "공공건축물 그린리모델링",
    tags: ["단열", "외피", "난방"],
    status: "제휴 준비중",
  },
  hvac: {
    name: "고효율 공조 솔루션",
    category: "고효율 냉난방기 · 공조시스템",
    matchReason: "냉난방 효율과 공조 운영 개선 항목과 연결 가능한 예시 시공 분야입니다.",
    relatedPolicy: "BRP 융자지원 · ZEB",
    tags: ["공조", "냉난방", "설비"],
    status: "제휴 준비중",
  },
  led: {
    name: "서울 LED 리뉴얼",
    category: "고효율 LED 조명",
    matchReason: "전기 사용량 개선과 조명 교체 항목에 연결 가능한 예시 시공 분야입니다.",
    relatedPolicy: "BRP 융자지원 · 새빛주택 보조금",
    tags: ["LED", "조명", "전기"],
    status: "제휴 준비중",
  },
  bems: {
    name: "BEMS 운영 파트너",
    category: "BEMS · 자동제어 · 운영관리",
    matchReason: "피크 관리와 에너지 절약형 운영 항목에 연결 가능한 예시 관리 분야입니다.",
    relatedPolicy: "BRP 융자지원 · ZEB",
    tags: ["BEMS", "운영관리", "자동제어"],
    status: "제휴 준비중",
  },
  renewable: {
    name: "신재생 설비 커넥트",
    category: "태양광 · 신재생에너지 설비",
    matchReason: "전기 설비 개선과 신재생에너지 검토 항목에 연결 가능한 예시 시공 분야입니다.",
    relatedPolicy: "신재생에너지 보급 지원",
    tags: ["태양광", "신재생", "전기"],
    status: "제휴 준비중",
  },
  zeroEnergy: {
    name: "제로에너지 설비랩",
    category: "제로에너지 설비 · 에너지 진단",
    matchReason: "고단열, 고효율 설비, 에너지 진단을 함께 검토하는 예시 분야입니다.",
    relatedPolicy: "제로에너지건축물 ZEB",
    tags: ["ZEB", "에너지진단", "설비"],
    status: "제휴 준비중",
  },
  heatPaint: {
    name: "차열도장 시공랩",
    category: "차열도장 · 옥상/외벽 도장",
    matchReason: "차열도장과 외피 개선 항목에 연결 가능한 예시 시공 분야입니다.",
    relatedPolicy: "새빛주택 보조금",
    tags: ["차열도장", "외벽", "옥상"],
    status: "제휴 준비중",
  },
  monitoring: {
    name: "월별 사용량 모니터링",
    category: "에너지 사용량 관리 컨설팅",
    matchReason: "실측 데이터 확인과 사용량 모니터링을 통해 진단 신뢰도를 높일 수 있습니다.",
    relatedPolicy: "에코마일리지",
    tags: ["모니터링", "사용량관리", "진단"],
    status: "제휴 준비중",
  },
};

const POLICY_CONTRACTOR_KEYS: Array<{ keywords: string[]; keys: string[] }> = [
  { keywords: ["brp", "에너지효율화"], keys: ["window", "hvac", "led", "bems", "renewable"] },
  { keywords: ["그린리모델링"], keys: ["insulation", "window", "hvac", "bems"] },
  { keywords: ["새빛주택"], keys: ["window", "led", "heatPaint"] },
  { keywords: ["고효율 창호", "간편시공", "창호"], keys: ["window", "insulation"] },
  { keywords: ["에코마일리지"], keys: ["monitoring", "bems"] },
  { keywords: ["신재생", "태양광"], keys: ["renewable", "zeroEnergy"] },
  { keywords: ["zeb", "제로에너지"], keys: ["zeroEnergy", "bems", "renewable"] },
];

function asPolicyMatches(value: unknown): PolicyMatch[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is PolicyMatch => Boolean(item && typeof item === "object"));
}

function policyText(policy: ContractorPolicy) {
  return [
    policy.name,
    policy.id,
    policy.reason,
    ...(policy.categories ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function addRecommendation(
  target: ContractorRecommendation[],
  source: ContractorRecommendation,
  matchReason?: string,
  relatedPolicy?: string,
) {
  if (target.some((item) => item.name === source.name) || target.length >= 3) {
    return;
  }

  target.push({
    ...source,
    matchReason: matchReason || source.matchReason,
    relatedPolicy: relatedPolicy || source.relatedPolicy,
  });
}

function normalizeRawPolicies(policies: PolicyMatch[]): ContractorPolicy[] {
  return policies.map((policy) => ({
    name: policy.policy_name,
    id: policy.policy_id,
    reason: policy.reason,
    categories: policy.matched_reasons,
  }));
}

function normalizePolicyRecommendations(policies: PolicyRecommendation[]): ContractorPolicy[] {
  return policies.map((policy) => ({
    name: policy.name,
    id: policy.id,
    reason: policy.matchReason,
    categories: policy.categories,
  }));
}

function addPolicyBasedRecommendations(target: ContractorRecommendation[], policies: ContractorPolicy[]) {
  policies.forEach((policy) => {
    const text = policyText(policy);
    const match = POLICY_CONTRACTOR_KEYS.find((item) =>
      item.keywords.some((keyword) => text.includes(keyword.toLowerCase())),
    );

    match?.keys.forEach((key) => {
      addRecommendation(
        target,
        CONTRACTORS[key],
        `${policy.name || "정책 후보"}의 지원 항목과 연결 가능한 예시 시공 분야입니다.`,
        policy.name || CONTRACTORS[key].relatedPolicy,
      );
    });
  });
}

function addDiagnosisBasedRecommendations(target: ContractorRecommendation[], report: ReportApiResponse) {
  const electricityHigh = report.energy_summary.electricity_ratio > 1.08;
  const gasHigh = report.energy_summary.gas_ratio > 1.08;
  const grade = (
    report.peer_benchmark?.absolute_grade?.grade ||
    report.peer_benchmark?.relative_grade?.grade ||
    ""
  ).toUpperCase();
  const lowGrade = grade === "D" || grade === "E";
  const hasEstimatedData = Boolean(report.energy?.is_estimated_included || report.energy?.is_estimated_gas_included);

  if (electricityHigh) {
    ["led", "bems", "hvac"].forEach((key) =>
      addRecommendation(
        target,
        CONTRACTORS[key],
        "전기 사용량이 유사군 대비 높아 조명, 공조, 운영제어 항목을 우선 점검할 수 있습니다.",
      ),
    );
  }

  if (gasHigh) {
    ["hvac", "insulation", "window"].forEach((key) =>
      addRecommendation(
        target,
        CONTRACTORS[key],
        "가스 사용량이 높아 난방 설정, 단열, 창호 성능 점검과 연결될 수 있습니다.",
      ),
    );
  }

  if (lowGrade) {
    ["insulation", "bems", "zeroEnergy"].forEach((key) =>
      addRecommendation(
        target,
        CONTRACTORS[key],
        "개선 검토가 필요한 등급으로 분석되어 설비와 외피 성능을 함께 점검하는 것이 좋습니다.",
      ),
    );
  }

  if (hasEstimatedData || report.report_mode === "estimated") {
    ["monitoring", "bems", "zeroEnergy"].forEach((key) => addRecommendation(target, CONTRACTORS[key]));
  }
}

export function buildContractorRecommendations(
  report: ReportApiResponse,
  policyRecommendations: PolicyRecommendation[] = [],
): ContractorRecommendation[] {
  const recommendations: ContractorRecommendation[] = [];
  const policies =
    policyRecommendations.length > 0
      ? normalizePolicyRecommendations(policyRecommendations)
      : normalizeRawPolicies(asPolicyMatches(report.raw_analysis_json?.policy_matches));

  addPolicyBasedRecommendations(recommendations, policies);
  addDiagnosisBasedRecommendations(recommendations, report);

  ["window", "led", "bems"].forEach((key) => addRecommendation(recommendations, CONTRACTORS[key]));

  return recommendations.slice(0, 3);
}
