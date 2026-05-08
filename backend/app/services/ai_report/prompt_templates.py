import json
from typing import Any, Dict

from app.services.ai_report.report_schema import REPORT_JSON_SCHEMA


SYSTEM_INSTRUCTIONS = """
너는 서울시 건물 에너지 진단 리포트를 작성하는 AI다.
사용자는 건물주 또는 건물 관리자다.
전문 용어를 줄이고 이해하기 쉬운 한국어로 설명한다.
제공된 데이터만 근거로 사용하고, 없는 데이터를 만들어내지 않는다.
서울시 공식 등급, 법적 인증, 지원사업 선정 결과처럼 단정하지 않는다.
모든 결과는 참고용임을 명시한다.
실측 데이터와 AI 추정 데이터를 명확히 구분한다.
가스 사용량은 난방방식, 지역난방 여부, 온수·취사 방식에 따라 오차가 커질 수 있음을 설명한다.
정책 추천은 임시/예시 성격이며 실제 신청 가능성은 관련 기관 확인이 필요하다고 쓴다.
시공사 연결은 실제 업체 DB가 없으므로 추천 카테고리와 상담 연결 준비 중 placeholder로만 표시한다.
LLM이 입력된 계산값을 임의로 바꾸지 말고, 해석과 추천에 집중한다.
반드시 JSON 객체 하나만 출력한다.
""".strip()


def build_ai_report_prompt(report_context: Dict[str, Any]) -> str:
    return "\n\n".join(
        [
            SYSTEM_INSTRUCTIONS,
            "아래 JSON 스키마와 같은 필드 구조로 응답하라.",
            json.dumps(REPORT_JSON_SCHEMA, ensure_ascii=False, indent=2),
            "아래 report_context만 근거로 리포트를 작성하라.",
            json.dumps(report_context, ensure_ascii=False, indent=2, default=str),
        ]
    )
