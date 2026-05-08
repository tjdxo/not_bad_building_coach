import json
import re
from typing import Any, Dict, Optional


REPORT_JSON_SCHEMA: Dict[str, Any] = {
    "title": "건물 에너지 AI 진단 리포트",
    "subtitle": "공공데이터와 유사군 비교 기반 참고용 진단",
    "report_mode_label": "실측 기반 진단 | AI 추정 기반 진단 | 데이터 부족 진단",
    "one_line_summary": "한 문장 요약",
    "overall_assessment": {
        "grade_label": "양호 | 보통 | 주의 | 데이터 부족",
        "summary": "총정리",
        "confidence_label": "높음 | 중간 | 낮음",
        "caution": "본 결과는 참고용이며 법적 효력을 갖지 않습니다.",
    },
    "energy_summary": {
        "electricity": {
            "status": "낮음 | 평균권 | 높음 | 주의 필요 | 데이터 부족",
            "summary": "전기 진단 요약",
            "main_reason_candidates": ["원인 후보"],
            "recommended_checks": ["확인 항목"],
        },
        "gas": {
            "status": "낮음 | 평균권 | 높음 | 주의 필요 | 데이터 부족",
            "summary": "가스 진단 요약",
            "main_reason_candidates": ["원인 후보"],
            "recommended_checks": ["확인 항목"],
        },
    },
    "peer_comparison": {
        "summary": "유사군 비교 요약",
        "rank_text": "순위 텍스트",
        "interpretation": "해석",
    },
    "grade_interpretation": {
        "absolute_grade": "절대 등급 해석",
        "relative_grade": "상대 등급 해석",
        "caution": "공식 등급 또는 법적 인증이 아님",
    },
    "recommended_actions": [
        {
            "priority": 1,
            "title": "추천 행동",
            "reason": "추천 이유",
            "expected_effect": "기대 효과",
            "contractor_category": "시공 분야",
            "contractor_cta_label": "상담 연결 준비 중",
        }
    ],
    "policy_recommendations": [
        {
            "policy_name": "정책 후보",
            "fit_score": 60,
            "fit_label": "검토 가능",
            "reason": "추천 이유",
            "caution": "공고문 확인 필요",
        }
    ],
    "user_answer_reflection": {
        "summary": "사용자 입력 반영 요약",
        "important_answers": ["중요 답변"],
    },
    "limitations": ["주의사항"],
}


def extract_json_object(text: str) -> Optional[Dict[str, Any]]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else None
    except ValueError:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start < 0 or end <= start:
        return None

    try:
        parsed = json.loads(cleaned[start : end + 1])
    except ValueError:
        return None
    return parsed if isinstance(parsed, dict) else None
