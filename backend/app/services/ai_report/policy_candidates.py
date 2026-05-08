from typing import Any, Dict, List


POLICY_CANDIDATES: List[Dict[str, Any]] = [
    {
        "policy_name": "에너지 효율 개선 지원사업 검토",
        "fit_score": 70,
        "fit_label": "검토 가능",
        "reason": "건물 에너지 사용량과 설비 개선 여지가 있는 경우 관련 지원사업 공고를 확인해볼 수 있습니다.",
        "caution": "실제 신청 가능 여부는 최신 공고문과 담당 기관 확인이 필요합니다.",
    },
    {
        "policy_name": "노후 설비 개선 지원 검토",
        "fit_score": 62,
        "fit_label": "우선 확인 필요",
        "reason": "냉난방기, 보일러, 조명 등 설비 상태에 따라 개선 지원 대상이 될 수 있습니다.",
        "caution": "본 서비스는 지원사업 선정 가능성을 보장하지 않습니다.",
    },
    {
        "policy_name": "서울시 기후동행건물 프로젝트 관련 안내",
        "fit_score": 60,
        "fit_label": "안내 참고",
        "reason": "건물 에너지 신고·등급제와 에너지 효율화 취지를 참고해 개선 방향을 검토할 수 있습니다.",
        "caution": "서울시 공식 등급 또는 공식 인증 결과를 의미하지 않습니다.",
    },
]


CONTRACTOR_CATEGORIES: List[Dict[str, str]] = [
    {
        "category": "조명/전기 설비",
        "cta_label": "조명·전기 설비 상담 연결 준비 중",
    },
    {
        "category": "냉난방기 점검",
        "cta_label": "냉난방 설비 상담 연결 준비 중",
    },
    {
        "category": "보일러/난방 설비",
        "cta_label": "난방 설비 상담 연결 준비 중",
    },
    {
        "category": "단열/창호",
        "cta_label": "단열·창호 상담 연결 준비 중",
    },
    {
        "category": "BEMS/자동제어",
        "cta_label": "자동제어 상담 연결 준비 중",
    },
]
