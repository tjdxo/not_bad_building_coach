import json
import os
import socket
import urllib.error
import urllib.request
from typing import Any, Dict, Optional


class GeminiNotConfigured(Exception):
    pass


class GeminiRequestError(Exception):
    def __init__(
        self,
        message: str,
        error_code: str = "GEMINI_REQUEST_FAILED",
        status_code: int = 503,
        retry_after_seconds: Optional[int] = None,
    ) -> None:
        super().__init__(message)
        self.error_code = error_code
        self.status_code = status_code
        self.retry_after_seconds = retry_after_seconds


def get_gemini_model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-1.5-flash")


def _retry_after_from_error(exc: urllib.error.HTTPError) -> Optional[int]:
    raw_value = exc.headers.get("Retry-After") if exc.headers else None
    if not raw_value:
        return None
    try:
        return int(raw_value)
    except (TypeError, ValueError):
        return None


def generate_gemini_json_text(prompt: str, timeout_seconds: int = 45) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise GeminiNotConfigured("AI 리포트 기능이 아직 설정되지 않았습니다.")

    model = get_gemini_model_name()
    url = "https://generativelanguage.googleapis.com/v1beta/models/{0}:generateContent?key={1}".format(
        model,
        api_key,
    )
    payload: Dict[str, Any] = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            response_body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        if exc.code == 429:
            raise GeminiRequestError(
                "현재 AI 리포트 요청이 많아 잠시 후 다시 시도해주세요.",
                error_code="GEMINI_RATE_LIMITED",
                status_code=429,
                retry_after_seconds=_retry_after_from_error(exc) or 60,
            ) from exc
        if exc.code in (408, 500, 502, 503, 504):
            raise GeminiRequestError(
                "현재 AI 리포트 요청이 많아 잠시 후 다시 시도해주세요.",
                error_code="GEMINI_TEMPORARILY_UNAVAILABLE",
                status_code=503,
                retry_after_seconds=_retry_after_from_error(exc),
            ) from exc
        raise GeminiRequestError(
            "리포트 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
            status_code=503,
        ) from exc
    except (urllib.error.URLError, socket.timeout) as exc:
        raise GeminiRequestError("리포트 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.") from exc

    try:
        parsed = json.loads(response_body)
        candidates = parsed.get("candidates") or []
        parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
        text = parts[0].get("text") if parts else ""
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise GeminiRequestError("AI 응답을 해석하지 못했습니다. 잠시 후 다시 시도해주세요.") from exc

    if not text:
        raise GeminiRequestError("AI 응답이 비어 있습니다. 잠시 후 다시 시도해주세요.")
    return text
