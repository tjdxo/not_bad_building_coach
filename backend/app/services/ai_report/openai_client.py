import logging
import os
from typing import Optional

from openai import APIConnectionError, APIStatusError, APITimeoutError, AuthenticationError, OpenAI, RateLimitError


DEFAULT_OPENAI_MODEL = "gpt-5.4-mini"
logger = logging.getLogger("app.ai_report.openai")


class OpenAiReportError(Exception):
    def __init__(
        self,
        message: str,
        error_code: str = "OPENAI_REQUEST_FAILED",
        status_code: int = 503,
        retry_after_seconds: Optional[int] = None,
    ) -> None:
        super().__init__(message)
        self.error_code = error_code
        self.status_code = status_code
        self.retry_after_seconds = retry_after_seconds


def get_openai_model_name() -> str:
    return os.getenv("OPENAI_MODEL", DEFAULT_OPENAI_MODEL)


def get_max_output_tokens() -> int:
    try:
        return int(os.getenv("AI_REPORT_MAX_OUTPUT_TOKENS", "2000"))
    except (TypeError, ValueError):
        return 2000


def _retry_after_from_exception(exc: Exception) -> Optional[int]:
    response = getattr(exc, "response", None)
    headers = getattr(response, "headers", None)
    if not headers:
        return None
    raw_value = headers.get("retry-after")
    if not raw_value:
        return None
    try:
        return int(raw_value)
    except (TypeError, ValueError):
        return None


def generate_openai_json_text(system_prompt: str, user_prompt: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise OpenAiReportError(
            "AI 리포트 기능 설정을 확인해야 합니다.",
            error_code="OPENAI_CONFIG_MISSING",
            status_code=503,
        )

    model = get_openai_model_name()
    max_output_tokens = get_max_output_tokens()

    try:
        client = OpenAI(api_key=api_key)
    except Exception as exc:
        logger.warning(
            "[ai-report] provider=openai model=%s client_init_error=%s message=%s",
            model,
            type(exc).__name__,
            str(exc)[:240],
        )
        raise OpenAiReportError(
            "AI API 클라이언트 초기화 중 문제가 발생했습니다. 서버 의존성 설정을 확인해야 합니다.",
            error_code="OPENAI_CLIENT_INIT_ERROR",
            status_code=503,
        ) from exc

    try:
        response = client.responses.create(
            model=model,
            input=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            text={"format": {"type": "json_object"}},
            max_output_tokens=max_output_tokens,
        )
    except AuthenticationError as exc:
        raise OpenAiReportError(
            "AI API 인증 설정을 확인해야 합니다.",
            error_code="OPENAI_AUTH_ERROR",
            status_code=503,
        ) from exc
    except RateLimitError as exc:
        raise OpenAiReportError(
            "현재 AI 리포트 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.",
            error_code="OPENAI_RATE_LIMITED",
            status_code=429,
            retry_after_seconds=_retry_after_from_exception(exc) or 60,
        ) from exc
    except APIStatusError as exc:
        status_code = getattr(exc, "status_code", None)
        error_code = "OPENAI_REQUEST_FAILED"
        message = "리포트 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
        if status_code == 402:
            error_code = "OPENAI_BILLING_LIMIT"
            message = "AI 리포트 사용량 한도에 도달했습니다."
        elif status_code == 429:
            error_code = "OPENAI_RATE_LIMITED"
            message = "현재 AI 리포트 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요."
        raise OpenAiReportError(
            message,
            error_code=error_code,
            status_code=429 if status_code == 429 else 503,
            retry_after_seconds=_retry_after_from_exception(exc),
        ) from exc
    except (APIConnectionError, APITimeoutError) as exc:
        raise OpenAiReportError(
            "리포트 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
            error_code="OPENAI_TEMPORARILY_UNAVAILABLE",
            status_code=503,
        ) from exc

    output_text = getattr(response, "output_text", None)
    if output_text:
        return str(output_text)

    try:
        for item in response.output:
            for content in item.content:
                text = getattr(content, "text", None)
                if text:
                    return str(text)
    except (AttributeError, TypeError):
        pass

    raise OpenAiReportError(
        "AI 리포트 응답 형식을 처리하지 못했습니다.",
        error_code="AI_REPORT_PARSE_ERROR",
        status_code=503,
    )
