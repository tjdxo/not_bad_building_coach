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
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/building_energy
OPENAI_API_KEY=
```

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

## 6. `/api/buildings` 검색 예시

```bash
curl "http://127.0.0.1:8080/api/buildings?query=성수"
```

건물명, 도로명 주소, 지번 주소 일부로 검색할 수 있습니다. 예를 들어 `성수`, `테헤란로`, `서초대로`, `강남 메디컬플라자`로 조회할 수 있습니다.

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
```
