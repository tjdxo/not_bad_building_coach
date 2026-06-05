import { isIncheonReport, type ReportApiResponse } from "@/lib/building-api";

export type PolicyRecommendation = {
  id: string;
  name: string;
  shortLabel: string;
  status: "검토 가능" | "대상 여부 확인" | "추가 확인" | "참여 가능" | "참고" | "참고용";
  regionLabel?: "인천" | "전국 공통" | "서울";
  categories: string[];
  description: string;
  matchReason: string;
  requiredChecks: string[];
  officialUrl?: string | null;
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
    report.building.purp_nm,
    report.building.main_purpose,
    report.building.sgg_cd_nm,
    report.building.bjd_cd_nm,
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

function numberValue(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function incheonElectricOveruse(report: ReportApiResponse) {
  const electric = report.ai_diagnosis?.electric;
  const comparePct = numberValue(electric?.compare_pct);
  const percentile = numberValue(electric?.percentile ?? report.peer_benchmark?.electricity?.percentile);
  const peerPct = numberValue(report.peer_benchmark?.electricity?.vs_peer_pct);
  const overuseType = report.peer_benchmark?.peer_overuse_type || "";
  return Boolean(
    (comparePct !== null && comparePct > 0) ||
      (percentile !== null && percentile >= 60) ||
      (peerPct !== null && peerPct > 0) ||
      overuseType.includes("전기"),
  );
}

function incheonReceptionNote(report: ReportApiResponse) {
  const text = buildingText(report);
  return text.includes("옹진군") || text.includes("계양구")
    ? "접수처는 시 신재생에너지과 확인이 필요합니다."
    : "접수처는 각 구청 담당부서 확인이 필요합니다.";
}

function buildIncheonPolicyRecommendations(report: ReportApiResponse): PolicyRecommendation[] {
  const text = buildingText(report);
  const approvalYear = Number(report.building.approval_year || 0);
  const currentYear = new Date().getFullYear();
  const buildingAge = approvalYear > 0 ? currentYear - approvalYear : null;
  const old10 = buildingAge !== null && buildingAge >= 10;
  const electricOveruse = incheonElectricOveruse(report);
  const residential = textIncludesAny(text, ["단독주택", "공동주택", "다가구", "다가구주택", "다세대", "다세대주택", "아파트", "연립주택", "주택"]);
  const multiFamily = textIncludesAny(text, ["공동주택", "아파트", "다세대", "다세대주택", "연립주택"]);
  const detached = textIncludesAny(text, ["단독주택", "다가구", "다가구주택"]);
  const neighborhood = textIncludesAny(text, ["근린생활시설", "상가주택", "제1종근린생활시설", "제2종근린생활시설"]);
  const singleHouse = textIncludesAny(text, ["단독주택", "다가구주택", "다가구", "주택"]);
  const publicLike = textIncludesAny(text, ["도서관", "보건소", "노유자시설", "교육연구시설", "공공업무시설", "수련시설", "문화 및 집회시설"]);
  const nonResidentialEers = textIncludesAny(text, ["근린생활시설", "업무시설", "판매시설", "공장", "교육연구시설", "노유자시설"]);
  const michuhol = text.includes("미추홀구");
  const candidates: PolicyCandidate[] = [];

  addCandidate(candidates, {
    id: "incheon_2026_mini_solar",
    name: "2026년 인천광역시 미니태양광 보급사업",
    shortLabel: "인천 미니태양광",
    status: residential ? "검토 가능" : "추가 확인",
    regionLabel: "인천",
    categories: ["신재생에너지", residential ? "주택성 건물" : neighborhood ? "기타 건축물" : "용도 확인", "공고 확인"],
    description:
      "인천 소재 건축물은 미니태양광 445W 또는 890W 설비 설치비 지원사업을 검토할 수 있습니다. 일반 신청은 시비 60%, 구비 20%, 자부담 20% 구조이며, 공동주택 단체신청 또는 경비실은 별도 지원비율이 적용될 수 있습니다.",
    matchReason:
      residential || neighborhood
        ? `인천 소재 건축물이고 건물 용도상 설치 지원 검토 후보입니다. ${incheonReceptionNote(report)}`
        : `인천 소재 건축물로 대상 지역에는 해당하지만, 실제 설치 가능 용도와 현장 조건 확인이 필요합니다. ${incheonReceptionNote(report)}`,
    requiredChecks: [
      "과거 5년 이내 동일 건축물·소유주 기준 보조금 지급 여부",
      "소유권 분쟁 여부",
      "설치 공간과 일조량",
      "안전 확보 여부",
      "공동주택 관리주체 동의 여부",
      "불법 건축물 여부",
    ],
    officialUrl: "https://www.gov.kr/portal/rcvfvrSvc/dtlEx/352000000103",
    score:
      30 +
      (residential ? 30 : 0) +
      (multiFamily ? 25 : 0) +
      (detached ? 25 : 0) +
      (neighborhood ? 10 : 0) +
      (electricOveruse ? 20 : 0) -
      5,
  });

  if (singleHouse) {
    addCandidate(candidates, {
      id: "incheon_renewable_home_support",
      name: "인천 신재생에너지 설비 지원",
      shortLabel: "신재생 설비 지원",
      status: "검토 가능",
      regionLabel: "인천",
      categories: ["신재생에너지", "단독주택", "공고 확인"],
      description:
        "인천광역시 단독주택은 태양광·태양열·지열 등 신재생에너지 설비 설치비 지원사업을 검토할 수 있습니다.",
      matchReason:
        electricOveruse
          ? "전기 사용량이 큰 주택성 건물로 신재생에너지 설비 검토 필요성이 있습니다."
          : "단독주택 또는 주택성 건물로 설치 가능 면적과 소유관계 확인 후 검토할 수 있습니다.",
      requiredChecks: ["소유관계", "설치 가능 면적", "한국에너지공단 접수 조건", "최신 공고"],
      officialUrl: "https://www.gov.kr/portal/rcvfvrSvc/dtlEx/628000000134",
      score: 55 + (electricOveruse ? 20 : 0),
    });
  }

  if (michuhol && singleHouse) {
    addCandidate(candidates, {
      id: "michuhol_renewable_home_support",
      name: "미추홀구 신재생에너지 주택지원사업",
      shortLabel: "미추홀 주택지원",
      status: "추가 확인",
      regionLabel: "인천",
      categories: ["신재생에너지", "미추홀구", "참고용"],
      description:
        "미추홀구 소재 단독주택은 신재생에너지 주택지원사업을 참고할 수 있습니다. 다만 예산 소진 또는 접수 종료 가능성이 있습니다.",
      matchReason: "미추홀구 소재 주택성 건물이므로 참고 후보이나, 최신 공고 확인이 우선입니다.",
      requiredChecks: ["예산 소진 여부", "접수 종료 여부", "한국에너지공단 주택지원사업 연계 여부", "최신 공고"],
      officialUrl: "https://www.gov.kr/portal/rcvfvrSvc/dtlEx/351050000114",
      score: 48 + (electricOveruse ? 10 : 0),
    });
  }

  if (publicLike || old10) {
    addCandidate(candidates, {
      id: "public_green_remodeling",
      name: "공공건축물 그린리모델링",
      shortLabel: "그린리모델링",
      status: "추가 확인",
      regionLabel: "전국 공통",
      categories: ["그린리모델링", publicLike ? "공공시설 후보" : "공공성 확인", old10 ? "10년 이상" : "연식 확인"],
      description:
        "사용승인 후 10년 이상 경과한 공공건축물은 그린리모델링 지원사업 검토 대상이 될 수 있습니다.",
      matchReason:
        publicLike && old10
          ? "용도와 연식상 노후 공공건축물 후보로 볼 수 있으나, 공공건축물 여부 확인이 필요합니다."
          : "공공건축물 여부와 사용승인일 확인 후 검토할 수 있습니다.",
      requiredChecks: ["공공건축물 여부", "세부 용도", "사용승인 후 10년 이상 경과 여부", "해당 연도 공고"],
      officialUrl: "https://www.greenremodeling.or.kr",
      score: 35 + (publicLike ? 25 : 0) + (old10 ? 20 : 0),
    });
  }

  if (electricOveruse) {
    addCandidate(candidates, {
      id: "kepco_eers",
      name: "한전 에너지효율향상사업 / EERS",
      shortLabel: "한전 EERS",
      status: "검토 가능",
      regionLabel: "전국 공통",
      categories: ["고효율기기", nonResidentialEers ? "비주거 가산" : "설비 확인", "공고 확인"],
      description:
        "전기 사용량이 유사 건물보다 높은 건물은 LED, 인버터, 변압기 등 고효율기기 교체 지원사업을 검토할 수 있습니다.",
      matchReason:
        nonResidentialEers
          ? "전기 사용량이 높고 비주거 용도로 보여 고효율기기 교체 검토와 연결될 수 있습니다."
          : "전기 사용량이 유사 건물보다 높아 지원 품목과 설비 보유 여부 확인이 필요합니다.",
      requiredChecks: ["지원 품목", "설비 보유 현황", "해당 연도 한전 공고", "신청 한도"],
      score: 55 + (nonResidentialEers ? 20 : 0),
    });
  }

  if (residential) {
    addCandidate(candidates, {
      id: "carbon_neutral_point_energy",
      name: "탄소중립포인트 에너지",
      shortLabel: "탄소중립포인트",
      status: "참고용",
      regionLabel: "전국 공통",
      categories: ["인센티브", "주택", "사용량 절감"],
      description:
        "전기·가스 사용량을 지속적으로 줄이면 탄소중립포인트 에너지 분야 인센티브를 검토할 수 있습니다.",
      matchReason: "주택 또는 공동주택 계열은 에너지 절감 실천 인센티브를 참고할 수 있습니다.",
      requiredChecks: ["가입 여부", "과거 사용량 대비 절감률", "제도 기준", "실제 사용자 정보"],
      score: 42 + (electricOveruse ? 8 : 0),
    });
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      shortLabel: candidate.shortLabel,
      status: candidate.status,
      regionLabel: candidate.regionLabel,
      categories: candidate.categories,
      description: candidate.description,
      matchReason: candidate.matchReason,
      requiredChecks: candidate.requiredChecks,
      officialUrl: candidate.officialUrl,
    }));
}

export function buildPolicyRecommendations(report: ReportApiResponse): PolicyRecommendation[] {
  if (isIncheonReport(report)) {
    return buildIncheonPolicyRecommendations(report);
  }

  const text = buildingText(report);
  const approvalYear = Number(report.building.approval_year || 0);
  const currentYear = new Date().getFullYear();
  const buildingAge = approvalYear > 0 ? currentYear - approvalYear : null;
  const old15 = buildingAge !== null && buildingAge >= 15;
  const old10 = buildingAge !== null && buildingAge >= 10;
  const area = Number(report.building.gross_floor_area || report.building.grs_ar || 0);
  const largeArea = area >= 3000;
  const publicReportingArea = area >= 1000;
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
    officialUrl: "https://brp.eseoul.go.kr/FUND/A_01_01_000.aspx",
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
    officialUrl: "https://brp.eseoul.go.kr/FUND/A_01_01_000.aspx",
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
    officialUrl: "https://ecomileage.seoul.go.kr/itf/adt/eco/energy/join.do",
    score: 22 + (estimatedIncluded ? 18 : 0) + (reliabilityLow ? 12 : 0),
  });

  addCandidate(candidates, {
    id: "building_energy_reporting_grade",
    name: "건물 에너지 신고·등급제",
    shortLabel: "신고·등급제",
    status: largeArea || (publicLike && publicReportingArea) ? "대상 여부 확인" : "추가 확인",
    categories: [
      largeArea ? "민간 기준 검토" : publicLike && publicReportingArea ? "공공 기준 검토" : "대상 여부 확인",
      "제도 안내",
      "공식 공고 확인 필요",
    ],
    description:
      "건물의 전년도 에너지 사용량을 신고하고, 건물 유형별 목표 에너지 원단위 대비 등급을 안내하는 제도입니다. 공공건물은 연면적 1,000㎡ 이상, 민간건물은 연면적 3,000㎡ 이상인 경우 대상 여부를 확인할 필요가 있습니다.",
    matchReason:
      largeArea || (publicLike && publicReportingArea)
        ? "이 건물은 연면적 기준상 건물 에너지 신고·등급제 대상 여부를 확인할 필요가 있습니다."
        : "공공·민간 구분과 연면적 기준을 확인해 대상 여부를 검토할 수 있습니다.",
    requiredChecks: ["공공·민간 구분", "실제 신고 대상 여부", "건물 소유/운영 주체", "최신 공식 안내"],
    officialUrl: "https://ecobuilding.seoul.go.kr/",
    score: 18 + (largeArea ? 42 : 0) + (publicLike && publicReportingArea ? 38 : 0),
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
        officialUrl: candidate.officialUrl,
      };
      return item;
    });
}
