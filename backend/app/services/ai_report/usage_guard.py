import json
import os
import threading
import time
from typing import Any, Dict, List, Optional, Tuple


def env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


AI_REPORT_CACHE_TTL_SECONDS = env_int("AI_REPORT_CACHE_TTL_SECONDS", 300)
AI_REPORT_RUNNING_RETRY_AFTER_SECONDS = env_int("AI_REPORT_RUNNING_RETRY_AFTER_SECONDS", 15)
AI_REPORT_MAX_PROMPT_CHARS = env_int("AI_REPORT_MAX_PROMPT_CHARS", 16000)
AI_REPORT_MAX_ESTIMATED_TOKENS = env_int("AI_REPORT_MAX_ESTIMATED_TOKENS", 4500)
AI_REPORT_GLOBAL_LIMIT_PER_MINUTE = env_int("AI_REPORT_GLOBAL_LIMIT_PER_MINUTE", 5)
AI_REPORT_BUILDING_LIMIT_PER_10MIN = env_int("AI_REPORT_BUILDING_LIMIT_PER_10MIN", 3)

_guard_lock = threading.Lock()
_running_requests: Dict[str, float] = {}
_response_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}
_global_request_times: List[float] = []
_building_request_times: Dict[str, List[float]] = {}


def build_prompt_metrics(report_context: Dict[str, Any], prompt: str) -> Dict[str, Any]:
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
        "max_prompt_chars": AI_REPORT_MAX_PROMPT_CHARS,
        "max_estimated_tokens": AI_REPORT_MAX_ESTIMATED_TOKENS,
    }


def is_input_too_large(metrics: Dict[str, Any]) -> bool:
    return (
        int(metrics.get("prompt_chars") or 0) > AI_REPORT_MAX_PROMPT_CHARS
        or int(metrics.get("estimated_tokens") or 0) > AI_REPORT_MAX_ESTIMATED_TOKENS
    )


def cache_get(key: str) -> Optional[Dict[str, Any]]:
    now = time.time()
    with _guard_lock:
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


def cache_set(key: str, payload: Dict[str, Any]) -> None:
    with _guard_lock:
        _response_cache[key] = (time.time(), dict(payload))


def claim_running(key: str) -> bool:
    with _guard_lock:
        if key in _running_requests:
            return False
        _running_requests[key] = time.time()
        return True


def release_running(key: str) -> None:
    with _guard_lock:
        _running_requests.pop(key, None)


def check_and_record_rate_limit(building_id: Any) -> Tuple[bool, Optional[str], int]:
    now = time.time()
    building_key = str(building_id)
    with _guard_lock:
        del _global_request_times[:]
        _global_request_times.extend([item for item in _global_request_times if now - item < 60])
        building_times = [
            item for item in _building_request_times.get(building_key, []) if now - item < 600
        ]
        _building_request_times[building_key] = building_times

        if len(_global_request_times) >= AI_REPORT_GLOBAL_LIMIT_PER_MINUTE:
            return False, "global", 60
        if len(building_times) >= AI_REPORT_BUILDING_LIMIT_PER_10MIN:
            return False, "building", 600

        _global_request_times.append(now)
        building_times.append(now)
        _building_request_times[building_key] = building_times
        return True, None, 0
