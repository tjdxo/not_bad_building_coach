from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.ai_report.gemini_client import (
    GeminiNotConfigured,
    GeminiRequestError,
    generate_gemini_json_text,
)
from app.services.ai_report.prompt_templates import build_ai_report_prompt
from app.services.ai_report.report_context import build_ai_report_context
from app.services.ai_report.report_schema import extract_json_object

router = APIRouter(tags=["ai-report"])


class AiReportRequest(BaseModel):
    building_id: Optional[int] = None
    report_type: Optional[str] = "basic"
    user_answers: Optional[Dict[str, Any]] = None


@router.post("/ai-report")
def create_ai_report(request: AiReportRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    if request.building_id is None:
        raise HTTPException(status_code=400, detail="building_id가 필요합니다.")

    report_context, error = build_ai_report_context(db, request.building_id, request.user_answers)
    if error == "not_found" or report_context is None:
        raise HTTPException(status_code=404, detail="해당 건물을 찾을 수 없습니다.")

    prompt = build_ai_report_prompt(report_context)
    try:
        raw_text = generate_gemini_json_text(prompt)
    except GeminiNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except GeminiRequestError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    parsed_report = extract_json_object(raw_text)
    return {
        "status": "ok",
        "report_type": request.report_type or "basic",
        "report_context": report_context,
        "report": parsed_report,
        "raw_text": None if parsed_report else raw_text,
        "fallback": parsed_report is None,
    }
