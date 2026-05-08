import json
import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


def _fallback_report(analysis_json: dict) -> str:
    building_name = analysis_json["building"]["name"]
    grade = analysis_json["analysis"]["grade"]
    waste_index = analysis_json["analysis"]["energy_waste_index"]
    electricity_ratio = analysis_json["energy_summary"]["electricity_ratio"]
    gas_ratio = analysis_json["energy_summary"]["gas_ratio"]

    return (
        f"1. 한줄 진단: {building_name}의 에너지 사용 상태는 '{grade}' 수준으로 판단됩니다.\n"
        f"2. 왜 이렇게 분석되었는지: 전력 사용 비율은 {electricity_ratio}, 가스 사용 비율은 {gas_ratio}이며 "
        f"에너지 낭비 지수는 {waste_index}입니다. 유사 건물 평균과 비교해 상대 수준을 단순 진단했습니다.\n"
        "3. 우선 실행 액션 3가지: 공용부 조명 점등 시간 확인, 냉난방 운영 스케줄 점검, 최근 3개월 요금 및 사용량 추이 비교.\n"
        "4. 예상 관리 포인트: 계절별 사용량 편차, 설비 운영시간, 공실 여부와 실제 운영패턴 차이를 함께 확인하세요."
    )


def generate_report_text(analysis_json: dict) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return _fallback_report(analysis_json)

    try:
        client = OpenAI(api_key=api_key)
        response = client.responses.create(
            model=os.getenv("OPENAI_MODEL", "gpt-5.4-mini"),
            input=[
                {
                    "role": "system",
                    "content": (
                        "당신은 건물 에너지 진단 보조 어시스턴트입니다. "
                        "입력된 분석 JSON을 바탕으로 한국어로 짧고 실무적으로 작성하세요. "
                        "반드시 다음 4개 항목을 포함하세요: "
                        "1. 한줄 진단 2. 왜 이렇게 분석되었는지 3. 우선 실행 액션 3가지 4. 예상 관리 포인트"
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "다음 건물 에너지 분석 결과를 보고 짧은 진단 보고서를 작성해주세요.\n"
                        f"{json.dumps(analysis_json, ensure_ascii=False, indent=2)}"
                    ),
                },
            ],
        )
        return response.output_text.strip()
    except Exception:
        return _fallback_report(analysis_json)
