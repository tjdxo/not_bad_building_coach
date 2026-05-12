import math
import re
from typing import Any, Dict

from fastapi import HTTPException

MAX_QUERY_LENGTH = 120
MAX_TEXT_LENGTH = 240
MAX_USER_ANSWERS_JSON_CHARS = 6000
MAX_BUILDING_ID = 2_147_483_647
CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
HTML_TAG_RE = re.compile(r"<[^>]*>")


def clean_text(value: Any, *, max_length: int = MAX_QUERY_LENGTH, field_name: str = "입력값") -> str:
    text_value = CONTROL_CHARS_RE.sub("", str(value or "")).strip()
    if len(text_value) > max_length:
        raise HTTPException(status_code=400, detail=f"{field_name}이 너무 깁니다.")
    return text_value


def clean_optional_text(value: Any, *, max_length: int = MAX_QUERY_LENGTH, field_name: str = "입력값") -> str:
    if value is None:
        return ""
    return clean_text(value, max_length=max_length, field_name=field_name)


def validate_positive_int(value: Any, *, field_name: str = "id") -> int:
    try:
        number = int(str(value).strip())
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail=f"{field_name}는 올바른 숫자여야 합니다.")
    if number <= 0 or number > MAX_BUILDING_ID:
        raise HTTPException(status_code=400, detail=f"{field_name} 범위가 올바르지 않습니다.")
    return number


def validate_finite_number(value: Any, *, field_name: str, minimum: float = 0, maximum: float = 10_000_000) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail=f"{field_name}는 숫자여야 합니다.")
    if math.isnan(number) or math.isinf(number) or number < minimum or number > maximum:
        raise HTTPException(status_code=400, detail=f"{field_name} 범위가 올바르지 않습니다.")
    return number


def sanitize_user_answers(value: Any, *, depth: int = 0) -> Any:
    if depth > 6:
        raise HTTPException(status_code=400, detail="추가 입력 구조가 너무 복잡합니다.")
    if value is None:
        return None
    if isinstance(value, str):
        cleaned = CONTROL_CHARS_RE.sub("", value).strip()
        cleaned = HTML_TAG_RE.sub("", cleaned)
        if len(cleaned) > MAX_TEXT_LENGTH:
            raise HTTPException(status_code=400, detail="추가 입력 문장이 너무 깁니다.")
        return cleaned
    if isinstance(value, list):
        if len(value) > 30:
            raise HTTPException(status_code=400, detail="추가 입력 항목이 너무 많습니다.")
        return [sanitize_user_answers(item, depth=depth + 1) for item in value]
    if isinstance(value, dict):
        if len(value) > 80:
            raise HTTPException(status_code=400, detail="추가 입력 항목이 너무 많습니다.")
        result: Dict[str, Any] = {}
        for key, item in value.items():
            clean_key = clean_text(key, max_length=60, field_name="추가 입력 키")
            result[clean_key] = sanitize_user_answers(item, depth=depth + 1)
        return result
    if isinstance(value, (int, float, bool)):
        return value
    return clean_text(value, max_length=MAX_TEXT_LENGTH, field_name="추가 입력")
