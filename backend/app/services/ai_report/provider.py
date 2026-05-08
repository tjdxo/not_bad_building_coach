import os
from typing import Optional

from app.services.ai_report.gemini_client import (
    GeminiNotConfigured,
    GeminiRequestError,
    generate_gemini_json_text,
    get_gemini_model_name,
)
from app.services.ai_report.openai_client import (
    OpenAiReportError,
    generate_openai_json_text,
    get_max_output_tokens,
    get_openai_model_name,
)


class AiReportProviderError(Exception):
    def __init__(
        self,
        message: str,
        error_code: str,
        status_code: int = 503,
        retry_after_seconds: Optional[int] = None,
    ) -> None:
        super().__init__(message)
        self.error_code = error_code
        self.status_code = status_code
        self.retry_after_seconds = retry_after_seconds


def get_ai_report_provider_name() -> str:
    return os.getenv("AI_REPORT_PROVIDER", "openai").strip().lower() or "openai"


def get_provider_model_name(provider: Optional[str] = None) -> str:
    selected_provider = provider or get_ai_report_provider_name()
    if selected_provider == "gemini":
        return get_gemini_model_name()
    return get_openai_model_name()


def get_provider_output_token_limit(provider: Optional[str] = None) -> Optional[int]:
    selected_provider = provider or get_ai_report_provider_name()
    if selected_provider == "openai":
        return get_max_output_tokens()
    return None


def generate_ai_report_text(system_prompt: str, user_prompt: str) -> str:
    provider = get_ai_report_provider_name()
    if provider == "gemini":
        try:
            return generate_gemini_json_text("\n\n".join([system_prompt, user_prompt]))
        except GeminiNotConfigured as exc:
            raise AiReportProviderError(
                str(exc),
                error_code="GEMINI_CONFIG_MISSING",
                status_code=503,
            ) from exc
        except GeminiRequestError as exc:
            raise AiReportProviderError(
                str(exc),
                error_code=exc.error_code,
                status_code=exc.status_code,
                retry_after_seconds=exc.retry_after_seconds,
            ) from exc

    if provider != "openai":
        raise AiReportProviderError(
            "지원하지 않는 AI 리포트 provider입니다.",
            error_code="AI_REPORT_PROVIDER_UNSUPPORTED",
            status_code=500,
        )

    try:
        return generate_openai_json_text(system_prompt, user_prompt)
    except OpenAiReportError as exc:
        raise AiReportProviderError(
            str(exc),
            error_code=exc.error_code,
            status_code=exc.status_code,
            retry_after_seconds=exc.retry_after_seconds,
        ) from exc
