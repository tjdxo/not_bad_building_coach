# 세상에 나쁜 건물은 없다 - Backend Starter

실데이터가 아직 없는 Week 1-2 단계에서 사용할 수 있는 FastAPI 백엔드 스타터 프로젝트입니다.  
주소 기반 조회, mock 데이터 기반 동종 건물 비교, 단순 에너지 진단, LLM 보고서 생성까지 한 번에 테스트할 수 있습니다.

## 1. 설치 방법

```bash
cd backend
python -m venv .venv
```

Windows PowerShell:

```bash
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

macOS/Linux:

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

## 2. PostgreSQL 실행

로컬 PostgreSQL이 필요합니다. 예시:

- DB 이름: `building_energy`
- 사용자: `postgres`
- 비밀번호: `postgres`
- 포트: `5432`

먼저 PostgreSQL에서 아래 DB를 만들어 주세요.

```sql
CREATE DATABASE building_energy;
```

## 3. 환경변수 설정

`.env.example`을 참고해서 `.env` 파일을 만듭니다.

```env
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
AI_REPORT_PROVIDER=openai
AI_REPORT_MAX_PROMPT_CHARS=16000
AI_REPORT_MAX_ESTIMATED_TOKENS=4500
AI_REPORT_MAX_OUTPUT_TOKENS=3500
AI_REPORT_CACHE_TTL_SECONDS=300
AI_REPORT_GLOBAL_LIMIT_PER_MINUTE=5
AI_REPORT_BUILDING_LIMIT_PER_10MIN=3
AI_REPORT_DEBUG_DUMP=false
```

Supabase 연결 문자열은 Session Pooler URI를 사용합니다.

1. Supabase Dashboard에서 Project를 선택합니다.
2. `Connect`를 클릭합니다.
3. `Session pooler`를 선택합니다.
4. URI를 복사합니다.
5. `[YOUR-PASSWORD]`를 DB 비밀번호로 교체합니다.
6. `backend/.env`의 `DATABASE_URL`에 저장합니다.

FastAPI 백엔드는 Supabase Postgres에 직접 연결하고, 프론트엔드는 Supabase에 직접 연결하지 않습니다. uvicorn 기반 서버에서는 우선 Session Pooler를 사용합니다.

`OPENAI_API_KEY`가 비어 있어도 앱은 동작하며, 이 경우 fallback 한국어 리포트를 반환합니다.

## 4. Mock 데이터 시드

```bash
python -m app.mock_seed
```

이 명령은 테이블을 생성하고 서울 지역 mock 건물 7개와 12개월 에너지 데이터를 입력합니다.
프론트엔드 샘플로 쓰는 성수 그린타워, 마포 스마트오피스, 강남 메디컬플라자, 잠실 교육문화센터도 함께 등록됩니다.

## 5. FastAPI 실행

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

실행 후:

- API 문서: `http://127.0.0.1:8080/docs`
- 헬스 체크: `http://127.0.0.1:8080/`
- DB 연결 확인: `http://127.0.0.1:8080/api/db-health`

PowerShell 확인:

```powershell
Invoke-RestMethod "http://localhost:8080/api/db-health"
Invoke-RestMethod "http://localhost:8080/api/districts"
Invoke-RestMethod "http://localhost:8080/api/dongs?district=서울특별시 송파구"
Invoke-RestMethod "http://localhost:8080/api/buildings?district=서울특별시 송파구&dong=거여동&query=362&building_keyword=141동&page=1&limit=20"
```

## 6. Supabase `building_master` 주소 검색

주소 자동완성은 Supabase/PostgreSQL의 `building_master` 테이블에서 필요한 주소 컬럼만 조회합니다.

사용 컬럼:

- `plat_plc`: 대지위치 / 지번 주소 계열
- `road_address`: 도로명주소
- `sgg_cd_nm`: 시군구명
- `bjd_cd_nm`: 법정동명

구/동 필터 API:

```bash
curl "http://127.0.0.1:8080/api/districts"
curl "http://127.0.0.1:8080/api/dongs?district=서울특별시 송파구"
```

응답은 `{ "items": [...] }` 형식입니다.

주소 검색 API:

```bash
curl "http://127.0.0.1:8080/api/buildings?district=서울특별시 송파구&dong=거여동&query=362&building_keyword=141동&page=1&limit=20"
```

`district`, `dong`, `query`, `building_keyword`는 선택값입니다. `building_keyword`는 `bld_nm`, `dong_nm`에서 검색합니다. 단, 아무 조건도 없으면 60만 건 전체를 반환하지 않고 빈 결과를 반환합니다. `limit` 기본값은 20이고 최대 50입니다.

응답은 `items`, `page`, `limit`, `total`, `has_next`를 포함합니다. 각 item은 `building_id`, `plat_plc`, `road_address`, `sgg_cd_nm`, `bjd_cd_nm`, `display_address`, `bld_nm`, `dong_nm`, `grs_ar`, `agnd_flr`를 반환합니다.

`display_address`는 `road_address`가 있으면 도로명주소를 사용하고, 없으면 `plat_plc`를 사용합니다.

`plat_plc`, `road_address`의 `ILIKE '%검색어%'` 검색은 기본 B-tree 인덱스를 잘 쓰지 못하므로 `pg_trgm` GIN 인덱스가 필요합니다. `sgg_cd_nm`, `bjd_cd_nm`은 구/동 드롭다운과 exact match 필터를 위해 btree 인덱스를 사용합니다. Supabase SQL Editor에서 [sql/search_indexes.sql](sql/search_indexes.sql)을 실행하세요.

## 7. `/api/report` 호출 예시

### Request

```bash
curl -X POST "http://127.0.0.1:8080/api/report" ^
  -H "Content-Type: application/json" ^
  -d "{\"address\":\"테헤란로\"}"
```

### Request Body

```json
{
  "address": "테헤란로"
}
```

### Response 예시

```json
{
  "building": {
    "id": 2,
    "building_code": "SEOUL-OFFICE-002",
    "name": "강남스마트타워",
    "road_address": "서울특별시 강남구 테헤란로 142",
    "jibun_address": "서울특별시 강남구 역삼동 736-24",
    "building_type": "office",
    "gross_floor_area": 12450.0,
    "approval_year": 2016,
    "floors": 15,
    "elevator_count": 5
  },
  "energy_summary": {
    "target_avg_electricity_kwh": 44041.67,
    "target_avg_gas_m3": 3900.0,
    "peer_avg_electricity_kwh": 43791.67,
    "peer_avg_gas_m3": 4337.5,
    "electricity_ratio": 1.01,
    "gas_ratio": 0.9
  },
  "analysis": {
    "peer_count": 2,
    "energy_waste_index": 95.5,
    "grade": "주의",
    "interpretation": "또래 건물 평균과 유사하거나 약간 높은 수준이므로 추이를 지켜볼 필요가 있습니다."
  },
  "report_text": "..."
}
```

## 8. 프로젝트 구조

```text
backend/
  app/
    main.py
    db.py
    models.py
    schemas.py
    crud.py
    mock_seed.py
    api/
      report.py
    services/
      peer_group.py
      analysis.py
      llm_report.py
  requirements.txt
  .env.example
  README.md
  sql/
    search_indexes.sql
```
