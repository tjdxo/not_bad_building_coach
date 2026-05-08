from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from app.services.ai_report.policy_candidates import POLICY_CANDIDATES


SUPPORTIVE_POLICY_IDS = {item["policy_id"] for item in POLICY_CANDIDATES}


def _answer(user_answers: Dict[str, Any], section: str, key: str) -> Any:
    value = (user_answers.get(section) or {}).get(key)
    if value is None:
        value = (user_answers.get("policy") or {}).get(key)
    return value


def _value_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value if item is not None]
    return [str(value)]


def _text(value: Any) -> str:
    return str(value or "").strip()


def _parse_approval_year(raw: Any) -> Optional[int]:
    if raw is None:
        return None
    if isinstance(raw, (date, datetime)):
        return raw.year
    text = str(raw).strip()
    if not text:
        return None
    digits = "".join(ch for ch in text if ch.isdigit())
    if len(digits) >= 4:
        try:
            year = int(digits[:4])
            if 1900 <= year <= date.today().year:
                return year
        except ValueError:
            return None
    try:
        year = int(float(text))
        if 1900 <= year <= date.today().year:
            return year
    except ValueError:
        return None
    return None


def _age_flags(building: Dict[str, Any], user_answers: Dict[str, Any]) -> Tuple[Optional[bool], Optional[bool]]:
    approval_year = _parse_approval_year(
        building.get("use_apr_day") or building.get("approval_year") or building.get("approval_date")
    )
    today_year = date.today().year
    over_15 = (today_year - approval_year >= 15) if approval_year else None
    over_10 = (today_year - approval_year >= 10) if approval_year else None

    answer_15 = _text(_answer(user_answers, "policy", "approval_over_15"))
    answer_10 = _text(_answer(user_answers, "policy", "approval_over_10"))
    if answer_15 == "예":
        over_15 = True
    elif answer_15 == "아니오":
        over_15 = False
    if answer_10 == "예":
        over_10 = True
    elif answer_10 == "아니오":
        over_10 = False
    return over_15, over_10


def _is_residential(building: Dict[str, Any], user_answers: Dict[str, Any]) -> Optional[bool]:
    housing_type = _text(_answer(user_answers, "policy", "housing_type"))
    if housing_type in {"단독주택", "공동주택"}:
        return True
    if housing_type == "주택 아님":
        return False
    purpose = " ".join(
        [
            _text(building.get("purpose")),
            _text(building.get("purp_nm")),
            _text(building.get("main_purpose")),
        ]
    )
    if any(token in purpose for token in ["주택", "아파트", "공동주택", "단독주택", "다가구"]):
        return True
    if purpose:
        return False
    return None


def _is_public(user_answers: Dict[str, Any]) -> Optional[bool]:
    public_type = _text(_answer(user_answers, "policy", "public_private_type"))
    if public_type == "공공건축물":
        return True
    if public_type == "민간건축물":
        return False
    return None


def _energy_overuse(peer_benchmark: Dict[str, Any]) -> Tuple[bool, bool, bool]:
    electric = peer_benchmark.get("electric_vs_peer_pct")
    gas = peer_benchmark.get("gas_vs_peer_pct")
    total = peer_benchmark.get("total_vs_peer_pct")
    electric_high = isinstance(electric, (int, float)) and electric >= 10
    gas_high = isinstance(gas, (int, float)) and gas >= 10
    total_high = isinstance(total, (int, float)) and total >= 10
    return electric_high, gas_high, total_high


def _fit_label(score: int) -> str:
    if score >= 80:
        return "적합도 높음"
    if score >= 60:
        return "검토 가능"
    if score >= 40:
        return "추가 확인 필요"
    return "현재 정보로는 낮음"


def _match_support_items(policy: Dict[str, Any], interests: List[str]) -> List[str]:
    support_items = set(policy.get("support_items") or [])
    return [item for item in interests if item in support_items]


def _summary_match(policy: Dict[str, Any], score: int, reasons: List[str], missing: List[str]) -> Dict[str, Any]:
    return {
        "policy_id": policy["policy_id"],
        "policy_name": policy["policy_name"],
        "category": policy["category"],
        "benefit_type": policy["benefit_type"],
        "fit_score": max(0, min(100, score)),
        "fit_label": _fit_label(max(0, min(100, score))),
        "matched_reasons": reasons[:3],
        "missing_checks": missing[:3],
        "recommended_next_step": "공식 안내와 최신 공고문에서 세부 대상, 한도, 신청 절차를 확인하세요.",
        "official_url": policy.get("official_url"),
        "caution": policy.get("caution"),
    }


def match_policies(
    building: Dict[str, Any],
    energy: Dict[str, Any],
    peer_benchmark: Dict[str, Any],
    ai_estimate: Dict[str, Any],
    user_answers: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    answers = user_answers or {}
    over_15, over_10 = _age_flags(building, answers)
    residential = _is_residential(building, answers)
    public = _is_public(answers)
    electric_high, gas_high, total_high = _energy_overuse(peer_benchmark)
    interests = _value_list(_answer(answers, "policy", "improvement_interests"))
    relation = _text(_answer(answers, "policy", "building_relationship"))
    official_price = _text(_answer(answers, "policy", "official_price_band"))
    vulnerable = _text(_answer(answers, "policy", "vulnerable_group"))
    recent_support = _text(_answer(answers, "policy", "recent_home_repair_support"))
    bems = _text(_answer(answers, "electric", "bems"))
    solar = _text(_answer(answers, "electric", "solar_generation"))
    major_equipment = _value_list(_answer(answers, "electric", "major_electric_equipment"))

    matches = []
    missing_inputs = []
    for policy in POLICY_CANDIDATES:
        score = 20
        reasons: List[str] = []
        missing: List[str] = []
        policy_id = policy["policy_id"]

        if policy_id == "seoul_brp_loan":
            if public is False:
                score += 25
                reasons.append("민간건축물로 입력되어 BRP 융자 기본 방향과 맞습니다.")
            elif public is None:
                score += 10
                missing.append("민간건축물 여부 확인이 필요합니다.")
            if over_15 is True:
                score += 25
                reasons.append("사용승인 후 15년 이상 경과 조건을 충족할 가능성이 있습니다.")
            elif over_15 is None:
                score += 10
                missing.append("사용승인 후 15년 이상 경과 여부 확인이 필요합니다.")
            item_matches = _match_support_items(policy, interests)
            if item_matches:
                score += min(20, 5 * len(item_matches))
                reasons.append("관심 개선 항목이 BRP 지원 항목과 일부 일치합니다: {0}".format(", ".join(item_matches[:3])))
            if total_high or electric_high or gas_high:
                score += 10
                reasons.append("유사군 대비 에너지 사용량이 높아 성능개선 검토 필요성이 있습니다.")

        elif policy_id == "seoul_saebit_housing":
            if residential is True:
                score += 25
                reasons.append("주택으로 판단되어 새빛주택 보조금 검토 대상과 맞습니다.")
            elif residential is None:
                score += 8
                missing.append("주택 해당 여부 확인이 필요합니다.")
            if over_15 is True:
                score += 20
                reasons.append("사용승인 후 15년 이상 경과 조건을 충족할 가능성이 있습니다.")
            elif over_15 is None:
                score += 8
                missing.append("사용승인 후 15년 이상 경과 여부 확인이 필요합니다.")
            if official_price == "3억 원 이하":
                score += 20
                reasons.append("공시가격 3억 원 이하로 입력되어 주요 조건과 맞습니다.")
            elif official_price in {"모름", ""}:
                missing.append("공시가격 구간 확인이 필요합니다.")
            item_matches = _match_support_items(policy, interests)
            if item_matches:
                score += min(15, 5 * len(item_matches))
                reasons.append("관심 개선 항목이 지원 항목과 일치합니다: {0}".format(", ".join(item_matches[:3])))

        elif policy_id == "public_green_remodeling":
            if public is True:
                score += 30
                reasons.append("공공건축물로 입력되어 그린리모델링 사업 검토 대상과 맞습니다.")
            elif public is None:
                score += 8
                missing.append("공공건축물 여부 확인이 필요합니다.")
            if over_10 is True:
                score += 25
                reasons.append("사용승인 후 10년 이상 경과 조건을 충족할 가능성이 있습니다.")
            elif over_10 is None:
                score += 8
                missing.append("사용승인 후 10년 이상 경과 여부 확인이 필요합니다.")
            if _match_support_items(policy, interests):
                score += 15
                reasons.append("관심 개선 항목이 공공건축물 그린리모델링 개선 항목과 맞습니다.")

        elif policy_id == "high_efficiency_window_simple_install":
            if residential is True:
                score += 20
                reasons.append("주택으로 판단되어 창호 간편시공 검토 대상과 관련이 있습니다.")
            elif residential is None:
                missing.append("주택 여부 확인이 필요합니다.")
            if vulnerable == "해당":
                score += 35
                reasons.append("취약계층 또는 차상위 이하 지원 대상이라고 입력했습니다.")
            elif vulnerable in {"모름", "응답하지 않음", ""}:
                missing.append("취약계층 또는 차상위 이하 지원 대상 여부 확인이 필요합니다.")
            if recent_support == "없음":
                score += 15
                reasons.append("최근 3년 유사 지원 이력이 없다고 입력했습니다.")
            elif recent_support in {"모름", ""}:
                missing.append("최근 3년 유사 집수리 지원 여부 확인이 필요합니다.")
            if "창호 교체" in interests or "단열 보강" in interests:
                score += 15
                reasons.append("창호 또는 단열 개선에 관심이 있습니다.")

        elif policy_id == "eco_mileage":
            score += 25
            reasons.append("서울 소재 건물의 에너지 절감 실천과 연결 가능한 참여형 제도입니다.")
            if relation in {"건물 소유자", "건물 세입자", "건물 관리자"}:
                score += 10
                reasons.append("사용자 관계상 에너지 절감 실천 참여를 검토할 수 있습니다.")
            if energy.get("has_measured_data"):
                score += 15
                reasons.append("실측 사용량이 있어 향후 절감 실적 관리에 활용할 수 있습니다.")
            else:
                missing.append("참여 후 절감 실적 확인이 필요합니다.")

        elif policy_id == "zeb_ai_optimization_consulting":
            if total_high or electric_high or gas_high:
                score += 25
                reasons.append("유사군 대비 에너지 사용량이 높아 최적화 컨설팅 검토 필요성이 있습니다.")
            if bems == "없음":
                score += 20
                reasons.append("BEMS/자동제어가 없다고 입력되어 운영 최적화 여지가 있습니다.")
            elif bems in {"모름", ""}:
                missing.append("BEMS/자동제어 여부 확인이 필요합니다.")
            if any(item in interests for item in ["BEMS/자동제어", "고효율 냉난방기", "히트펌프"]):
                score += 20
                reasons.append("자동제어 또는 고효율 설비 개선 관심 항목이 있습니다.")

        elif policy_id == "renewable_energy_consulting":
            if electric_high:
                score += 25
                reasons.append("전기 사용량이 유사군 대비 높아 전기 설비 개선 검토가 필요합니다.")
            if solar == "없음":
                score += 15
                reasons.append("태양광/자가발전이 없다고 입력되어 신재생 검토 여지가 있습니다.")
            elif solar in {"모름", ""}:
                missing.append("태양광/자가발전 여부 확인이 필요합니다.")
            if major_equipment:
                score += 10
                reasons.append("주요 전기 설비 정보가 있어 전기 컨설팅 검토에 활용할 수 있습니다.")
            if any(item in interests for item in ["태양광/신재생에너지", "고효율 냉난방기", "BEMS/자동제어", "LED 조명 교체"]):
                score += 20
                reasons.append("전기·신재생·고효율 설비 개선 관심 항목이 있습니다.")

        if not reasons:
            reasons.append("현재 입력 정보만으로는 일부 조건만 간접적으로 검토할 수 있습니다.")
        matches.append(_summary_match(policy, score, reasons, missing))
        missing_inputs.extend(missing)

    matches = sorted(matches, key=lambda item: item["fit_score"], reverse=True)
    recommended = [item for item in matches if item["fit_score"] >= 60][:3]
    needs_more_info = [item for item in matches if 40 <= item["fit_score"] < 60][:3]
    return {
        "policy_matches": recommended,
        "policy_needs_more_info": needs_more_info,
        "missing_policy_inputs": sorted(set(missing_inputs)),
        "policy_candidates_count": len(POLICY_CANDIDATES),
        "policy_summary": {
            "recommended_count": len(recommended),
            "needs_more_info_count": len(needs_more_info),
            "score_note": "fit_score는 실제 합격률이 아니라 내부 참고용 정책 적합도입니다.",
            "excluded_note": "건물 에너지 신고·등급제와 건물 온실가스 총량제는 직접 지원 혜택이 아니므로 추천 정책에서 제외합니다.",
        },
    }
