import json
from typing import Any, Dict

from app.services.ai_report.report_schema import REPORT_JSON_SCHEMA


SYSTEM_INSTRUCTIONS = """
너는 서울시 건물 에너지 진단 리포트를 작성하는 AI다.
사용자는 건물주 또는 건물 관리자다.
전문 용어를 줄이고 이해하기 쉬운 한국어로 설명한다.
제공된 데이터만 근거로 사용하고, 없는 데이터를 만들어내지 않는다.
실측 데이터와 AI 추정 데이터를 명확히 구분한다.
지역난방 가능성이 있거나 사용자가 난방방식을 입력했다면 가스 사용량 해석에 반영한다.
사용자가 추가 설문 답변을 입력한 경우 공실, 운영시간, 냉난방 방식, 조명, 설비 정보를 원인 해석과 추천 행동에 반영한다.
정책 추천은 placeholder이며 실제 지원사업 선정 가능성이나 합격을 보장하지 않는다.
시공사 추천은 카테고리와 상담 연결 준비 중 placeholder로만 표시하고, 실제 업체명이나 전화번호를 임의로 만들지 않는다.
서울시 공식 등급, 법적 인증, 지원사업 선정 결과처럼 단정하지 않는다.
모든 결과는 공공데이터 및 자체 분석 로직 기반 참고용이며 법적 효력이 없다고 명시한다.
LLM이 입력된 계산값을 임의로 바꾸지 말고, 해석과 추천에 집중한다.
반드시 JSON 객체 하나만 출력한다.
""".strip()


def build_ai_report_prompt_parts(report_context: Dict[str, Any]) -> Dict[str, str]:
    user_prompt = "\n\n".join(
        [
            "아래 JSON 스키마와 같은 필드 구조로 응답하라.",
            json.dumps(REPORT_JSON_SCHEMA, ensure_ascii=False, indent=2),
            "아래 report_context만 근거로 리포트를 작성하라.",
            json.dumps(report_context, ensure_ascii=False, indent=2, default=str),
        ]
    )
    return {
        "system_prompt": SYSTEM_INSTRUCTIONS,
        "user_prompt": user_prompt,
    }


def build_ai_report_prompt(report_context: Dict[str, Any]) -> str:
    prompt_parts = build_ai_report_prompt_parts(report_context)
    return "\n\n".join([prompt_parts["system_prompt"], prompt_parts["user_prompt"]])
