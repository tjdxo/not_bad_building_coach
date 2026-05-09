import hashlib
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.ai_report.provider import (
    AiReportProviderError,
    generate_ai_report_text,
    get_ai_report_provider_name,
    get_provider_model_name,
    get_provider_output_token_limit,
)
from app.services.ai_report.prompt_templates import build_ai_report_prompt, build_ai_report_prompt_parts
from app.services.ai_report.report_context import build_ai_report_context
from app.services.ai_report.report_schema import extract_json_object
from app.services.ai_report.usage_guard import (
    AI_REPORT_RUNNING_RETRY_AFTER_SECONDS,
    build_prompt_metrics,
    cache_get,
    cache_set,
    check_and_record_rate_limit,
    claim_running,
    is_input_too_large,
    release_running,
)

router = APIRouter(tags=["ai-report"])
logger = logging.getLogger("app.ai_report")

DEBUG_DUMP_DIR = Path(__file__).resolve().parents[2] / "debug_ai_report_payloads"


class AiReportRequest(BaseModel):
    building_id: Optional[int] = None
    report_type: Optional[str] = "basic"
    report_audience: Optional[str] = "building_owner"
    user_answers: Optional[Dict[str, Any]] = None
    dry_run: Optional[bool] = False


def _json_string(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)


def _request_key(request: AiReportRequest) -> str:
    key_payload = {
        "building_id": request.building_id,
        "report_type": request.report_type or "basic",
        "report_audience": request.report_audience or "building_owner",
        "user_answers": request.user_answers or {},
    }
    return hashlib.sha256(_json_string(key_payload).encode("utf-8")).hexdigest()


def _debug_dump_enabled() -> bool:
    return os.getenv("AI_REPORT_DEBUG_DUMP", "").strip().lower() in {"1", "true", "yes", "on"}


def _log_prompt_metrics(
    request: AiReportRequest,
    request_hash: str,
    provider: str,
    model: str,
    output_token_limit: Optional[int],
    metrics: Dict[str, Any],
) -> None:
    logger.warning(
        "[ai-report] provider=%s model=%s building_id=%s report_type=%s request_hash=%s user_answers=%s",
        provider,
        model,
        request.building_id,
        request.report_type or "basic",
        request_hash[:12],
        bool(request.user_answers),
    )
    logger.warning("[ai-report] context_keys=%s", metrics["context_keys"])
    logger.warning(
        "[ai-report] context_chars=%s prompt_chars=%s estimated_tokens=%s output_token_limit=%s monthly_data_count=%s included_peer_monthly_count=%s included_raw_rows=%s",
        metrics["context_chars"],
        metrics["prompt_chars"],
        metrics["estimated_tokens"],
        output_token_limit,
        metrics["monthly_data_count"],
        metrics["included_peer_monthly_count"],
        metrics["included_raw_rows"],
    )


def _dump_debug_payload(
    request: AiReportRequest,
    provider: str,
    model: str,
    report_context: Dict[str, Any],
    prompt_parts: Dict[str, str],
    metrics: Dict[str, Any],
    output_token_limit: Optional[int],
) -> Optional[str]:
    if not _debug_dump_enabled():
        return None

    DEBUG_DUMP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = DEBUG_DUMP_DIR / "ai_report_building_{0}_{1}.json".format(request.building_id, timestamp)
    payload = {
        "debug_note": "Local debug payload only. User survey answers may be included. Do not commit this file.",
        "building_id": request.building_id,
        "report_type": request.report_type or "basic",
        "report_audience": request.report_audience or "building_owner",
        "provider": provider,
        "model": model,
        "output_token_limit": output_token_limit,
        "report_context": report_context,
        "system_prompt": prompt_parts["system_prompt"],
        "user_prompt": prompt_parts["user_prompt"],
        "prompt_chars": metrics["prompt_chars"],
        "context_chars": metrics["context_chars"],
        "estimated_tokens": metrics["estimated_tokens"],
        "monthly_data_count": metrics["monthly_data_count"],
        "included_peer_monthly_count": metrics["included_peer_monthly_count"],
        "included_raw_rows": metrics["included_raw_rows"],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    logger.warning("[ai-report] debug_dump=%s", str(path))
    return str(path)


def _error_detail(message: str, error_code: str, retry_after_seconds: Optional[int] = None, debug: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "detail": message,
        "error_code": error_code,
    }
    if retry_after_seconds is not None:
        payload["retry_after_seconds"] = retry_after_seconds
    if debug is not None:
        payload["debug"] = debug
    return payload


@router.post("/ai-report")
def create_ai_report(request: AiReportRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    if request.building_id is None:
        raise HTTPException(status_code=400, detail="building_id가 필요합니다.")

    report_context, error = build_ai_report_context(
        db,
        request.building_id,
        request.user_answers,
        request.report_audience or "building_owner",
    )
    if error == "not_found" or report_context is None:
        raise HTTPException(status_code=404, detail="해당 건물을 찾을 수 없습니다.")

    request_hash = _request_key(request)
    provider = get_ai_report_provider_name()
    model = get_provider_model_name(provider)
    output_token_limit = get_provider_output_token_limit(provider)
    prompt_parts = build_ai_report_prompt_parts(report_context)
    prompt = build_ai_report_prompt(report_context)
    metrics = build_prompt_metrics(report_context, prompt)
    _log_prompt_metrics(request, request_hash, provider, model, output_token_limit, metrics)
    debug_dump_path = _dump_debug_payload(
        request,
        provider,
        model,
        report_context,
        prompt_parts,
        metrics,
        output_token_limit,
    )

    if request.dry_run:
        return {
            "ok": True,
            "dry_run": True,
            "provider": provider,
            "model": model,
            "report_audience": request.report_audience or "building_owner",
            "context_preview": report_context,
            "context_chars": metrics["context_chars"],
            "prompt_chars": metrics["prompt_chars"],
            "estimated_tokens": metrics["estimated_tokens"],
            "monthly_data_count": metrics["monthly_data_count"],
            "included_peer_monthly_count": metrics["included_peer_monthly_count"],
            "included_raw_rows": metrics["included_raw_rows"],
            "policy_matches": report_context.get("policy_matches", []),
            "missing_policy_inputs": report_context.get("missing_policy_inputs", []),
            "policy_candidates_count": report_context.get("policy_candidates_count", 0),
            "output_token_limit": output_token_limit,
            "input_too_large": is_input_too_large(metrics),
            "debug_dump_path": debug_dump_path,
        }

    if is_input_too_large(metrics):
        logger.warning(
            "[ai-report] input too large provider=%s model=%s request_hash=%s prompt_chars=%s estimated_tokens=%s",
            provider,
            model,
            request_hash[:12],
            metrics["prompt_chars"],
            metrics["estimated_tokens"],
        )
        raise HTTPException(
            status_code=413,
            detail=_error_detail(
                "리포트 입력 데이터가 너무 커서 생성할 수 없습니다.",
                "AI_REPORT_INPUT_TOO_LARGE",
                debug={
                    "provider": provider,
                    "model": model,
                    "prompt_chars": metrics["prompt_chars"],
                    "estimated_tokens": metrics["estimated_tokens"],
                },
            ),
        )

    cached_payload = cache_get(request_hash)
    if cached_payload:
        logger.warning("[ai-report] cache hit provider=%s request_hash=%s", provider, request_hash[:12])
        return cached_payload

    if not claim_running(request_hash):
        logger.warning("[ai-report] lock hit provider=%s request_hash=%s", provider, request_hash[:12])
        raise HTTPException(
            status_code=409,
            detail=_error_detail(
                "이미 같은 리포트를 생성 중입니다. 잠시만 기다려주세요.",
                "AI_REPORT_ALREADY_RUNNING",
                retry_after_seconds=AI_REPORT_RUNNING_RETRY_AFTER_SECONDS,
            ),
        )

    rate_ok, rate_scope, retry_after = check_and_record_rate_limit(request.building_id)
    if not rate_ok:
        release_running(request_hash)
        logger.warning(
            "[ai-report] rate limit hit provider=%s scope=%s request_hash=%s",
            provider,
            rate_scope,
            request_hash[:12],
        )
        raise HTTPException(
            status_code=429,
            detail=_error_detail(
                "AI 리포트 요청이 잠시 많습니다. 잠시 후 다시 시도해주세요.",
                "AI_REPORT_RATE_LIMITED",
                retry_after_seconds=retry_after,
            ),
        )

    try:
        try:
            raw_text = generate_ai_report_text(prompt_parts["system_prompt"], prompt_parts["user_prompt"])
        except AiReportProviderError as exc:
            logger.warning(
                "[ai-report] provider error provider=%s model=%s request_hash=%s error_code=%s prompt_chars=%s estimated_tokens=%s output_token_limit=%s",
                provider,
                model,
                request_hash[:12],
                exc.error_code,
                metrics["prompt_chars"],
                metrics["estimated_tokens"],
                output_token_limit,
            )
            raise HTTPException(
                status_code=exc.status_code,
                detail=_error_detail(
                    str(exc),
                    exc.error_code,
                    retry_after_seconds=exc.retry_after_seconds,
                    debug={
                        "provider": provider,
                        "model": model,
                        "estimated_tokens": metrics["estimated_tokens"],
                        "prompt_chars": metrics["prompt_chars"],
                    },
                ),
            ) from exc

        parsed_report = extract_json_object(raw_text)
        payload = {
            "status": "ok",
            "provider": provider,
            "model": model,
            "report_type": request.report_type or "basic",
            "report_audience": request.report_audience or "building_owner",
            "report_context": report_context,
            "report": parsed_report,
            "raw_text": None if parsed_report else raw_text,
            "fallback": parsed_report is None,
            "cached": False,
        }
        cache_set(request_hash, payload)
        return payload
    finally:
        release_running(request_hash)
