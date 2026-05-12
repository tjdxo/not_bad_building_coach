import os
import threading
import time
from typing import Dict, List, Tuple, Union

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.buildings import router as buildings_router
from app.api.ai_report import router as ai_report_router
from app.api.report import router as report_router
from app.db import engine

app = FastAPI(
    title="세상에 나쁜 건물은 없다 - Backend Starter",
    version="0.1.0",
    description="서울 건물 에너지 진단 서비스용 FastAPI 백엔드 스타터 프로젝트",
)

def _allowed_origins() -> List[str]:
    raw_value = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:5173,http://127.0.0.1:5173,https://not-bad-building-coach.vercel.app",
    )
    return [origin.strip() for origin in raw_value.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_origin_regex=os.getenv("ALLOWED_ORIGIN_REGEX", r"https://not-bad-building-coach.*\.vercel\.app"),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

_rate_limit_lock = threading.Lock()
_request_times_by_ip: Dict[str, List[float]] = {}


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()[:64]
    return request.client.host if request.client else "unknown"


@app.middleware("http")
async def basic_rate_limit(request: Request, call_next):
    if request.url.path.startswith("/api/") and request.method in {"GET", "POST"}:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > int(os.getenv("MAX_API_BODY_BYTES", "1048576")):
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "요청 본문이 너무 큽니다."},
                    )
            except ValueError:
                return JSONResponse(status_code=400, content={"detail": "요청 헤더가 올바르지 않습니다."})
        now = time.time()
        client_ip = _client_ip(request)
        limit = 3 if request.url.path == "/api/ai-report" else 60
        window = 60.0
        with _rate_limit_lock:
            recent_times = [item for item in _request_times_by_ip.get(client_ip, []) if now - item < window]
            if len(recent_times) >= limit:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "요청이 잠시 많습니다. 잠시 후 다시 시도해주세요."},
                )
            recent_times.append(now)
            _request_times_by_ip[client_ip] = recent_times
    return await call_next(request)

app.include_router(report_router, prefix="/api")
app.include_router(ai_report_router, prefix="/api")
app.include_router(buildings_router, prefix="/api")


@app.get("/")
def read_root() -> Dict[str, str]:
    return {"message": "Building energy diagnosis backend is running."}


@app.get("/api/db-health")
def db_health() -> Dict[str, Union[int, str]]:
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="데이터베이스 연결에 실패했습니다.",
        ) from exc
    return {"db": "connected", "result": result}


@app.get("/demo")
def demo_page():
    from fastapi.responses import HTMLResponse

    html = """
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>세상에 나쁜 건물은 없다</title>
      <style>
        :root {
          --bg: #f5f1e8;
          --panel: #fffdf8;
          --ink: #1f2937;
          --sub: #5b6472;
          --line: #ddd3c2;
          --accent: #1f6f5f;
          --accent-2: #d97706;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: "Segoe UI", "Apple SD Gothic Neo", sans-serif;
          background:
            radial-gradient(circle at top right, rgba(217, 119, 6, 0.10), transparent 24%),
            linear-gradient(180deg, #f8f4eb 0%, var(--bg) 100%);
          color: var(--ink);
        }
        .wrap {
          max-width: 960px;
          margin: 0 auto;
          padding: 40px 20px 80px;
        }
        .hero {
          margin-bottom: 24px;
        }
        .eyebrow {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(31, 111, 95, 0.10);
          color: var(--accent);
          font-size: 13px;
          font-weight: 700;
        }
        h1 {
          margin: 14px 0 8px;
          font-size: 36px;
          line-height: 1.2;
        }
        p {
          margin: 0;
          color: var(--sub);
          line-height: 1.6;
        }
        .card {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
        }
        .form {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          margin-top: 20px;
        }
        input {
          width: 100%;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid var(--line);
          font-size: 16px;
          background: white;
        }
        button {
          border: 0;
          border-radius: 12px;
          padding: 14px 18px;
          background: var(--accent);
          color: white;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.7;
          cursor: wait;
        }
        .hint {
          margin-top: 10px;
          font-size: 14px;
          color: var(--sub);
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-top: 20px;
        }
        .block-title {
          margin: 0 0 12px;
          font-size: 18px;
        }
        .stat {
          display: grid;
          gap: 8px;
        }
        .stat-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #eee5d7;
        }
        .label {
          color: var(--sub);
        }
        .value {
          font-weight: 700;
          text-align: right;
        }
        .report-box, pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
        }
        pre {
          max-height: 420px;
          overflow: auto;
          padding: 14px;
          border-radius: 12px;
          background: #fcfaf5;
          border: 1px solid #eee5d7;
          font-size: 13px;
          line-height: 1.5;
        }
        .status {
          margin-top: 16px;
          min-height: 24px;
          font-size: 14px;
          color: var(--accent-2);
          font-weight: 700;
        }
        .footer-links {
          margin-top: 18px;
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          font-size: 14px;
        }
        .footer-links a {
          color: var(--accent);
          text-decoration: none;
          font-weight: 600;
        }
        @media (max-width: 820px) {
          .form, .grid {
            grid-template-columns: 1fr;
          }
          h1 {
            font-size: 28px;
          }
        }
      </style>
    </head>
    <body>
      <div class="wrap">
        <section class="hero">
          <span class="eyebrow">Mock Backend Demo</span>
          <h1>세상에 나쁜 건물은 없다</h1>
          <p>주소 일부를 입력하면 mock 건물 검색, peer 비교, 에너지 진단, 한국어 리포트까지 바로 확인할 수 있습니다.</p>
        </section>

        <section class="card">
          <form id="report-form" class="form">
            <input
              id="address"
              name="address"
              value="테헤란로"
              placeholder="예: 테헤란로, 서초대로, 법원로"
            />
            <button id="submit-btn" type="submit">진단 실행</button>
          </form>
          <div class="hint">샘플 주소 키워드: 테헤란로 / 서초대로 / 법원로</div>
          <div id="status" class="status"></div>
        </section>

        <section class="grid">
          <div class="card">
            <h2 class="block-title">요약 결과</h2>
            <div id="summary" class="stat">
              <div class="stat-row"><span class="label">상태</span><span class="value">아직 조회 전</span></div>
            </div>
          </div>

          <div class="card">
            <h2 class="block-title">한국어 리포트</h2>
            <div id="report-text" class="report-box">여기에 진단 문장이 표시됩니다.</div>
          </div>
        </section>

        <section class="card" style="margin-top: 18px;">
          <h2 class="block-title">원본 JSON 응답</h2>
          <pre id="json-output">{}</pre>
          <div class="footer-links">
            <a href="/docs" target="_blank" rel="noopener noreferrer">Swagger Docs</a>
            <a href="/openapi.json" target="_blank" rel="noopener noreferrer">OpenAPI JSON</a>
          </div>
        </section>
      </div>

      <script>
        const form = document.getElementById("report-form");
        const addressInput = document.getElementById("address");
        const submitBtn = document.getElementById("submit-btn");
        const status = document.getElementById("status");
        const summary = document.getElementById("summary");
        const reportText = document.getElementById("report-text");
        const jsonOutput = document.getElementById("json-output");

        function escapeHtml(value) {
          return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        }

        function renderSummary(data) {
          summary.innerHTML = `
            <div class="stat-row"><span class="label">건물명</span><span class="value">${escapeHtml(data.building.name)}</span></div>
            <div class="stat-row"><span class="label">주소</span><span class="value">${escapeHtml(data.building.road_address)}</span></div>
            <div class="stat-row"><span class="label">건물 유형</span><span class="value">${escapeHtml(data.building.building_type)}</span></div>
            <div class="stat-row"><span class="label">Peer 수</span><span class="value">${escapeHtml(data.analysis.peer_count)}</span></div>
            <div class="stat-row"><span class="label">전기 비율</span><span class="value">${escapeHtml(data.energy_summary.electricity_ratio)}</span></div>
            <div class="stat-row"><span class="label">가스 비율</span><span class="value">${escapeHtml(data.energy_summary.gas_ratio)}</span></div>
            <div class="stat-row"><span class="label">낭비 지수</span><span class="value">${escapeHtml(data.analysis.energy_waste_index)}</span></div>
            <div class="stat-row"><span class="label">등급</span><span class="value">${escapeHtml(data.analysis.grade)}</span></div>
          `;
        }

        form.addEventListener("submit", async (event) => {
          event.preventDefault();

          const address = addressInput.value.trim();
          if (!address) {
            status.textContent = "주소를 입력해주세요.";
            return;
          }

          submitBtn.disabled = true;
          status.textContent = "진단을 요청하고 있습니다...";
          reportText.textContent = "불러오는 중...";
          jsonOutput.textContent = "{}";

          try {
            const response = await fetch("/api/report", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ address }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.detail || "요청 처리 중 오류가 발생했습니다.");
            }

            renderSummary(data);
            reportText.textContent = data.report_text;
            jsonOutput.textContent = JSON.stringify(data, null, 2);
            status.textContent = "진단이 완료되었습니다.";
          } catch (error) {
            summary.innerHTML = '<div class="stat-row"><span class="label">오류</span><span class="value">조회 실패</span></div>';
            reportText.textContent = "결과를 불러오지 못했습니다.";
            jsonOutput.textContent = String(error.message || error);
            status.textContent = String(error.message || error);
          } finally {
            submitBtn.disabled = false;
          }
        });
      </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)
