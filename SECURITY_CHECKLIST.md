# Security Checklist

## 점검한 항목

- 환경변수 및 API Key 노출 여부
- FastAPI CORS 설정
- 주소 검색, report, AI report 입력값 검증
- 사용자 응답 에러 메시지의 민감정보 노출 여부
- OpenAI/Gemini AI 리포트 요청 크기, 중복 요청, rate limit
- AI 리포트 HTML/PDF 출력 escaping
- 외부 링크 `target="_blank"` 보안 속성
- Supabase/DB raw SQL 및 bind parameter 사용 여부
- Next.js 보안 헤더
- localStorage/sessionStorage 사용 범위
- 프론트 콘솔 로그의 민감정보 노출 가능성

## 수정한 항목

- CORS 허용 origin을 `ALLOWED_ORIGINS` 환경변수 기반으로 관리하도록 변경했습니다.
- `allow_credentials=True`와 wildcard origin 조합을 사용하지 않도록 유지했습니다.
- `/api/*` 요청에 간단한 in-memory IP 기반 rate limit을 추가했습니다.
- `MAX_API_BODY_BYTES` 기반으로 과도하게 큰 API 요청 본문을 차단하도록 추가했습니다.
- 건물 검색 query/district/dong/building keyword 길이와 제어문자 검증을 추가했습니다.
- report `building_id`, 주소, 면적, 층수 입력 검증을 보강했습니다.
- AI report `building_id`, `report_type`, `report_audience`, `user_answers` 검증과 길이 제한을 추가했습니다.
- AI report `dry_run`은 `AI_REPORT_DRY_RUN_ENABLED=true`일 때만 허용하도록 제한했습니다.
- DB health 및 building table 오류 메시지에서 내부 env/table 힌트 노출을 줄였습니다.
- 데모 HTML의 동적 데이터 삽입에 escaping을 추가했습니다.
- 새 탭 링크에 `noopener noreferrer`를 적용했습니다.
- Next.js 보안 헤더를 추가했습니다.
- 프론트 AI report 오류 로그에서 응답 payload 콘솔 출력을 제거했습니다.
- `.env.example`에 보안 관련 환경변수를 반영했습니다.

## 기능 영향 여부

- 기존 API 응답 schema는 변경하지 않았습니다.
- 정상 범위의 주소 검색, 진단 대시보드, AI 리포트 플로우는 유지됩니다.
- 비정상적으로 긴 검색어, 잘못된 building_id, 과도한 AI 추가 입력, 너무 잦은 요청은 차단될 수 있습니다.
- `dry_run`은 운영 기본값에서 비활성화됩니다.

## 남은 위험

- 실제 결제 연동 전까지 localStorage 잠금은 보안 기능이 아니며, 프로토타입용 UI 제어입니다.
- 무료 Render 환경에서는 첫 요청 지연 가능성이 있습니다.
- in-memory rate limit은 서버 재시작 및 다중 인스턴스 환경에서 공유되지 않습니다.
- 운영 단계에서는 서버 기반 rate limit, 인증, 결제 검증, 감사 로그가 필요합니다.
- AI 모델 출력은 sanitize/escaping을 적용하더라도 정식 상용화 전 별도 보안 검토가 필요합니다.
- Supabase service role key는 프론트에 두면 안 되며, 운영 환경변수 접근 권한 관리가 필요합니다.
- 정식 상용화 전 법률/보안 검토가 필요합니다.

## 운영 전 추가 권장사항

- Vercel/Render의 실제 도메인을 `ALLOWED_ORIGINS`에 명시하고 preview 도메인 허용 범위를 검토하세요.
- Redis 또는 API Gateway 기반 rate limit을 도입하세요.
- 실제 결제/구독 검증은 백엔드에서 수행하세요.
- OpenAI/Gemini 키는 주기적으로 회전하고 사용량 알림을 설정하세요.
- AI debug dump는 운영에서 비활성화하고, 활성화 시 생성 파일을 외부에 노출하지 마세요.
- CSP는 현재 PDF/iframe/API 동작을 확인한 뒤 단계적으로 추가하세요.
