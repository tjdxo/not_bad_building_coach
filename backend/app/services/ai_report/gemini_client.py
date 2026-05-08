import json
import os
import socket
import urllib.error
import urllib.request
from typing import Any, Dict


class GeminiNotConfigured(Exception):
    pass


class GeminiRequestError(Exception):
    pass


def generate_gemini_json_text(prompt: str, timeout_seconds: int = 45) -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise GeminiNotConfigured("AI 리포트 기능이 아직 설정되지 않았습니다.")

    model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
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
        if exc.code in (408, 429, 500, 502, 503, 504):
            raise GeminiRequestError("현재 AI 리포트 요청이 많아 잠시 후 다시 시도해주세요.") from exc
        raise GeminiRequestError("리포트 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.") from exc
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
