export type BuildingId = "seongsu-green" | "mapo-smart" | "gangnam-medical" | "jamsil-school";

export type Building = {
  id: BuildingId;
  name: string;
  address: string;
  type: string;
  area: string;
  year: string;
  status: "진단 가능" | "데이터 확인 중";
  score: "주의" | "보통" | "대기";
  grade: string;
  electricityGap: string;
  gasGap: string;
  carbonSaving: string;
  summary: string;
  reportId: string;
};

export const buildings: Building[] = [
  {
    id: "seongsu-green",
    name: "성수 그린타워",
    address: "서울특별시 성동구 성수이로 123",
    type: "업무시설",
    area: "8,520㎡",
    year: "2014년",
    status: "진단 가능",
    score: "주의",
    grade: "C",
    electricityGap: "+18%",
    gasGap: "+24%",
    carbonSaving: "15.4t",
    summary: "야간 기준 부하와 겨울철 난방 사용량이 유사 업무시설보다 높습니다.",
    reportId: "RPT-2026-00412",
  },
  {
    id: "mapo-smart",
    name: "마포 스마트오피스",
    address: "서울특별시 마포구 월드컵북로 55",
    type: "업무시설",
    area: "6,980㎡",
    year: "2011년",
    status: "진단 가능",
    score: "보통",
    grade: "B",
    electricityGap: "+9%",
    gasGap: "+7%",
    carbonSaving: "8.2t",
    summary: "전기 사용량은 평균보다 약간 높고, 냉방 피크 시간대 조정 여지가 있습니다.",
    reportId: "RPT-2026-00418",
  },
  {
    id: "gangnam-medical",
    name: "강남 메디컬플라자",
    address: "서울특별시 강남구 테헤란로 221",
    type: "의료시설",
    area: "5,430㎡",
    year: "2017년",
    status: "진단 가능",
    score: "주의",
    grade: "C",
    electricityGap: "+21%",
    gasGap: "+12%",
    carbonSaving: "12.7t",
    summary: "의료 장비와 공조 상시 가동으로 전력 기준 부하 관리가 중요합니다.",
    reportId: "RPT-2026-00421",
  },
  {
    id: "jamsil-school",
    name: "잠실 교육문화센터",
    address: "서울특별시 송파구 올림픽로 214",
    type: "교육연구시설",
    area: "4,870㎡",
    year: "2010년",
    status: "데이터 확인 중",
    score: "대기",
    grade: "-",
    electricityGap: "확인 중",
    gasGap: "확인 중",
    carbonSaving: "확인 중",
    summary: "에너지 사용 데이터 확인 후 진단 결과를 제공합니다.",
    reportId: "RPT-PENDING",
  },
];

export function getBuilding(id?: string): Building | undefined {
  return buildings.find((building) => building.id === id);
}

export function buildingHref(path: string, id: string) {
  return `${path}?building=${encodeURIComponent(id)}`;
}
