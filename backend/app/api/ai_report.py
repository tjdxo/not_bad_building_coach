import hashlib
import json
import logging
import os
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.ai_report.gemini_client import (
    GeminiNotConfigured,
    GeminiRequestError,
    generate_gemini_json_text,
    get_gemini_model_name,
)
from app.services.ai_report.prompt_templates import build_ai_report_prompt, build_ai_report_prompt_parts
from app.services.ai_report.report_context import build_ai_report_context
from app.services.ai_report.report_schema import extract_json_object

router = APIRouter(tags=["ai-report"])
logger = logging.getLogger("app.ai_report")

AI_REPORT_CACHE_TTL_SECONDS = int(os.getenv("AI_REPORT_CACHE_TTL_SECONDS", "300"))
AI_REPORT_RUNNING_RETRY_AFTER_SECONDS = int(os.getenv("AI_REPORT_RUNNING_RETRY_AFTER_SECONDS", "15"))
DEBUG_DUMP_DIR = Path(__file__).resolve().parents[2] / "debug_ai_report_payloads"

_running_lock = threading.Lock()
_running_requests: Dict[str, float] = {}
_response_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}


class AiReportRequest(BaseModel):
    building_id: Optional[int] = None
    report_type: Optional[str] = "basic"
    user_answers: Optional[Dict[str, Any]] = None
    dry_run: Optional[bool] = False


def _json_string(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)


def _request_key(request: AiReportRequest) -> str:
    key_payload = {
        "building_id": request.building_id,
        "report_type": request.report_type or "basic",
        "user_answers": request.user_answers or {},
    }
    return hashlib.sha256(_json_string(key_payload).encode("utf-8")).hexdigest()


def _debug_dump_enabled() -> bool:
    return os.getenv("AI_REPORT_DEBUG_DUMP", "").strip().lower() in {"1", "true", "yes", "on"}


def _build_prompt_metrics(report_context: Dict[str, Any], prompt: str) -> Dict[str, Any]:
    context_text = json.dumps(report_context, ensure_ascii=False, default=str)
    energy = report_context.get("energy") or {}
    peer_benchmark = report_context.get("peer_benchmark") or {}
    monthly_data_count = len(energy.get("electricity_monthly") or []) + len(energy.get("gas_monthly") or [])
    return {
        "context_keys": list(report_context.keys()),
        "context_chars": len(context_text),
        "prompt_chars": len(prompt),
        "estimated_tokens": int(len(prompt) / 4),
        "monthly_data_count": monthly_data_count,
        "included_peer_monthly_count": 0,
        "included_raw_rows": False,
        "peer_has_data": bool(peer_benchmark.get("has_data")),
    }


def _log_prompt_metrics(request: AiReportRequest, model: str, metrics: Dict[str, Any]) -> None:
    logger.warning(
        "[ai-report] building_id=%s report_type=%s user_answers=%s",
        request.building_id,
        request.report_type or "basic",
        bool(request.user_answers),
    )
    logger.warning("[ai-report] model=%s", model)
    logger.warning("[ai-report] context_keys=%s", metrics["context_keys"])
    logger.warning(
        "[ai-report] context_chars=%s prompt_chars=%s estimated_tokens=%s monthly_data_count=%s included_peer_monthly_count=%s included_raw_rows=%s",
        metrics["context_chars"],
        metrics["prompt_chars"],
        metrics["estimated_tokens"],
        metrics["monthly_data_count"],
        metrics["included_peer_monthly_count"],
        metrics["included_raw_rows"],
    )


def _dump_debug_payload(
    request: AiReportRequest,
    model: str,
    report_context: Dict[str, Any],
    prompt_parts: Dict[str, str],
    metrics: Dict[str, Any],
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
        "model": model,
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


def _cache_get(key: str) -> Optional[Dict[str, Any]]:
    now = time.time()
    with _running_lock:
        cached = _response_cache.get(key)
        if not cached:
            return None
        created_at, payload = cached
        if now - created_at > AI_REPORT_CACHE_TTL_SECONDS:
            _response_cache.pop(key, None)
            return None
        result = dict(payload)
        result["cached"] = True
        return result


def _cache_set(key: str, payload: Dict[str, Any]) -> None:
    with _running_lock:
        _response_cache[key] = (time.time(), dict(payload))


def _claim_running(key: str) -> bool:
    with _running_lock:
        if key in _running_requests:
            return False
        _running_requests[key] = time.time()
        return True


def _release_running(key: str) -> None:
    with _running_lock:
        _running_requests.pop(key, None)


@router.post("/ai-report")
def create_ai_report(request: AiReportRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    if request.building_id is None:
        raise HTTPException(status_code=400, detail="building_id가 필요합니다.")

    report_context, error = build_ai_report_context(db, request.building_id, request.user_answers)
    if error == "not_found" or report_context is None:
        raise HTTPException(status_code=404, detail="해당 건물을 찾을 수 없습니다.")

    model = get_gemini_model_name()
    prompt_parts = build_ai_report_prompt_parts(report_context)
    prompt = build_ai_report_prompt(report_context)
    metrics = _build_prompt_metrics(report_context, prompt)
    _log_prompt_metrics(request, model, metrics)
    debug_dump_path = _dump_debug_payload(request, model, report_context, prompt_parts, metrics)

    if request.dry_run:
        return {
            "ok": True,
            "dry_run": True,
            "model": model,
            "context_preview": report_context,
            "context_chars": metrics["context_chars"],
            "prompt_chars": metrics["prompt_chars"],
            "estimated_tokens": metrics["estimated_tokens"],
            "monthly_data_count": metrics["monthly_data_count"],
            "included_peer_monthly_count": metrics["included_peer_monthly_count"],
            "included_raw_rows": metrics["included_raw_rows"],
            "debug_dump_path": debug_dump_path,
        }

    cache_key = _request_key(request)
    cached_payload = _cache_get(cache_key)
    if cached_payload:
        return cached_payload

    if not _claim_running(cache_key):
        raise HTTPException(
            status_code=409,
            detail={
                "detail": "이미 같은 건물의 AI 리포트를 생성 중입니다. 잠시만 기다려주세요.",
                "error_code": "AI_REPORT_ALREADY_RUNNING",
                "retry_after_seconds": AI_REPORT_RUNNING_RETRY_AFTER_SECONDS,
            },
        )

    try:
        try:
            raw_text = generate_gemini_json_text(prompt)
        except GeminiNotConfigured as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except GeminiRequestError as exc:
            if exc.error_code == "GEMINI_RATE_LIMITED":
                logger.warning(
                    "[ai-report] Gemini rate limited model=%s estimated_tokens=%s prompt_chars=%s retry_after=%s",
                    model,
                    metrics["estimated_tokens"],
                    metrics["prompt_chars"],
                    exc.retry_after_seconds,
                )
            raise HTTPException(
                status_code=exc.status_code,
                detail={
                    "detail": str(exc),
                    "error_code": exc.error_code,
                    "retry_after_seconds": exc.retry_after_seconds,
                    "debug": {
                        "model": model,
                        "estimated_tokens": metrics["estimated_tokens"],
                        "prompt_chars": metrics["prompt_chars"],
                    },
                },
            ) from exc

        parsed_report = extract_json_object(raw_text)
        payload = {
            "status": "ok",
            "report_type": request.report_type or "basic",
            "report_context": report_context,
            "report": parsed_report,
            "raw_text": None if parsed_report else raw_text,
            "fallback": parsed_report is None,
            "cached": False,
        }
        _cache_set(cache_key, payload)
        return payload
    finally:
        _release_running(cache_key)
