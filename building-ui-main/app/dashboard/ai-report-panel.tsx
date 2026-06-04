"use client";

import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import {
  createAiReport,
  isIncheonReport,
  type AiGeneratedReport,
  type AiReportApiResponse,
  type AiReportAudience,
  type AiReportUserAnswers,
  type ReportApiResponse,
} from "@/lib/building-api";

type ChoiceQuestion = {
  key: string;
  label: string;
  options: string[];
  multiple?: boolean;
  optional?: boolean;
};

type EnergySummaryBlock = NonNullable<NonNullable<AiGeneratedReport["energy_summary"]>["electricity"]>;

const audienceOptions: Array<{ value: AiReportAudience; title: string; desc: string; badge: string }> = [
  {
    value: "building_owner",
    title: "건물주/소유자용",
    desc: "비용 절감과 지원사업 중심으로 쉽게 설명합니다.",
    badge: "건물주/소유자용 리포트",
  },
  {
    value: "facility_manager",
    title: "관리자/시설관리자용",
    desc: "운영 점검과 설비 관리 포인트를 중심으로 정리합니다.",
    badge: "관리자용 리포트",
  },
  {
    value: "contractor",
    title: "시공·컨설팅 업체용",
    desc: "현장 점검 항목과 개선 공사 제안 포인트를 정리합니다.",
    badge: "시공·컨설팅용 리포트",
  },
  {
    value: "policy_reviewer",
    title: "지원사업 검토용",
    desc: "정책 적합도와 신청 전 확인자료를 중심으로 정리합니다.",
    badge: "지원사업 검토용 리포트",
  },
];

function audienceLabel(value?: string | null) {
  return audienceOptions.find((item) => item.value === value)?.badge || "건물주/소유자용 리포트";
}

const electricQuestions: ChoiceQuestion[] = [
  { key: "vacancy", label: "공실 여부", options: ["공실 없음", "일부 공실", "장기 공실", "리모델링·휴업", "모름"] },
  { key: "operation_hours", label: "운영시간", options: ["주간만", "야간까지", "24시간", "계절·요일별 변동", "모름"] },
  { key: "cooling_type", label: "냉방 방식", options: ["개별 에어컨", "시스템 에어컨", "중앙 냉방", "EHP", "냉방 없음", "모름"] },
  {
    key: "major_electric_equipment",
    label: "주요 전기 설비",
    options: ["냉동·냉장", "서버·전산실", "엘리베이터 많음", "전기차 충전기", "대형 간판·조명", "없음", "모름"],
    multiple: true,
  },
  { key: "lighting_status", label: "조명 상태", options: ["대부분 LED", "일부 LED", "형광등·할로겐 많음", "모름"] },
  { key: "cooling_temperature", label: "냉방 설정온도", options: ["24도 이하", "25~26도", "27도 이상", "모름"], optional: true },
  { key: "solar_generation", label: "태양광/자가발전", options: ["있음", "없음", "모름"], optional: true },
  { key: "bems", label: "자동제어/BEMS", options: ["있음", "없음", "모름"], optional: true },
  { key: "peak_time", label: "피크 사용 시간대", options: ["주간", "야간", "주말", "불규칙", "모름"], optional: true },
];

const gasQuestions: ChoiceQuestion[] = [
  { key: "vacancy", label: "공실 여부", options: ["공실 없음", "일부 공실", "장기 공실", "리모델링·휴업", "모름"] },
  {
    key: "heating_type",
    label: "난방 방식",
    options: ["도시가스 개별난방", "도시가스 중앙난방", "지역난방", "전기식 냉난방", "가스+전기 혼합", "기름·LPG·기타", "모름"],
  },
  { key: "hot_water_usage", label: "온수 사용", options: ["많음", "보통", "적음", "거의 없음", "모름"] },
  { key: "cooking_gas", label: "조리/취사용 가스", options: ["있음", "없음", "일부 있음", "모름"] },
  { key: "winter_operation", label: "겨울철 운영", options: ["평소와 같음", "겨울에 사용 증가", "겨울 휴업·공실", "모름"] },
  { key: "boiler_age", label: "보일러 노후도", options: ["10년 미만", "10~15년", "15년 이상", "모름"], optional: true },
  { key: "heating_temperature", label: "난방 설정온도", options: ["22도 이상", "20~21도", "19도 이하", "모름"], optional: true },
  { key: "insulation_status", label: "단열 상태", options: ["좋음", "보통", "나쁨", "모름"], optional: true },
  { key: "pipe_valve_issue", label: "배관/밸브 이상 여부", options: ["이상 없음", "누수·소음·불균형 있음", "모름"], optional: true },
  { key: "district_heating_bill_data", label: "지역난방 열요금 데이터", options: ["있음", "없음", "모름"], optional: true },
  { key: "bath_sauna_facility", label: "목욕·사우나 시설", options: ["있음", "없음", "모름"], optional: true },
];

const policyQuestions: ChoiceQuestion[] = [
  {
    key: "building_relationship",
    label: "이 건물과의 관계는 무엇인가요?",
    options: ["건물 소유자", "건물 세입자", "건물 관리자", "ESCO/시공·관리업체", "기타", "모름"],
    optional: true,
  },
  {
    key: "public_private_type",
    label: "이 건물은 공공건축물인가요?",
    options: ["공공건축물", "민간건축물", "모름"],
    optional: true,
  },
  {
    key: "housing_type",
    label: "이 건물은 주택에 해당하나요?",
    options: ["단독주택", "공동주택", "주택 아님", "복합건물", "모름"],
    optional: true,
  },
  { key: "approval_over_15", label: "사용승인 후 15년 이상 지났나요?", options: ["예", "아니오", "모름"], optional: true },
  { key: "approval_over_10", label: "사용승인 후 10년 이상 지났나요?", options: ["예", "아니오", "모름"], optional: true },
  {
    key: "official_price_band",
    label: "주택 공시가격을 알고 있나요?",
    options: ["3억 원 이하", "3억 원 초과 12억 원 이하", "12억 원 초과", "모름", "해당 없음"],
    optional: true,
  },
  {
    key: "vulnerable_group",
    label: "취약계층 또는 차상위 이하 지원 대상에 해당하나요?",
    options: ["해당", "해당 없음", "모름", "응답하지 않음"],
    optional: true,
  },
  {
    key: "recent_home_repair_support",
    label: "최근 3년 이내 국가 또는 서울시 집수리·에너지 개선 지원을 받은 적이 있나요?",
    options: ["있음", "없음", "모름"],
    optional: true,
  },
  {
    key: "improvement_interests",
    label: "관심 있는 개선 항목을 선택해주세요.",
    options: ["창호 교체", "단열 보강", "LED 조명 교체", "고효율 냉난방기", "히트펌프", "BEMS/자동제어", "태양광/신재생에너지", "보일러/난방설비", "아직 모름"],
    multiple: true,
    optional: true,
  },
];

function valueList(value?: string | string[]) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function hasBuildingId(report: ReportApiResponse) {
  return report.building.building_id ?? report.building.id;
}

function ReportCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <h3 className="text-base font-black text-slate-950">{title}</h3>
      <div className="mt-4 text-sm font-semibold leading-6 text-slate-600">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items?: string[] }) {
  const visibleItems = (items ?? []).map(sanitizeDisplayText).filter(Boolean);
  if (!visibleItems.length) {
    return <p className="text-slate-400">표시할 항목이 없습니다.</p>;
  }
  return (
    <ul className="space-y-2">
      {visibleItems.map((item) => (
        <li key={item} className="rounded-xl bg-slate-50 px-3 py-2">
          {item}
        </li>
      ))}
    </ul>
  );
}

function escapeHtml(value: unknown) {
  return sanitizeDisplayText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeDisplayText(value: unknown) {
  const text = String(value ?? "");
  if (text.includes("report_context.policy_matches")) {
    return "지원사업 추천은 건물 정보와 진단 결과를 기준으로 제공되며, 실제 신청 가능 여부는 최신 공고문 확인이 필요합니다.";
  }
  return text
    .replaceAll("CatBoost+XGBoost", "CatBoost 기반 AI 모델")
    .replaceAll("XGBoost", "")
    .replaceAll("report_context.policy_matches", "지원사업 후보")
    .replaceAll("policy_matches", "지원사업 후보")
    .replaceAll("report_context", "진단 데이터")
    .replaceAll("service_strategy", "진단 기준")
    .replaceAll("display_main", "서비스 표시 기준값")
    .replaceAll("service reference", "서비스 표시 기준값")
    .replaceAll("service_reference", "서비스 표시 기준값")
    .replaceAll("baseline", "유사건물 중앙값")
    .replaceAll("backend", "시스템");
}

function sanitizeReportValue<T>(value: T): T {
  if (typeof value === "string") {
    return sanitizeDisplayText(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeReportValue(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeReportValue(item)]),
    ) as T;
  }
  return value;
}

function officialPolicyUrl(policy?: { policy_name?: string; official_url?: string | null; policy_id?: string }) {
  const name = policy?.policy_name || "";
  const id = policy?.policy_id || "";
  if (
    id.includes("brp") ||
    name.includes("BRP") ||
    name.includes("민간건물 에너지효율화") ||
    name.includes("건물 에너지효율화")
  ) {
    return "https://brp.eseoul.go.kr/FUND/A_01_01_000.aspx";
  }
  if (name.includes("새빛주택") || name.includes("주택 에너지 개선")) {
    return "https://brp.eseoul.go.kr/FUND/A_01_01_000.aspx";
  }
  if (id.includes("eco_mileage") || name.includes("에코마일리지") || name.includes("에너지 절감 인센티브")) {
    return "https://ecomileage.seoul.go.kr/itf/adt/eco/energy/join.do";
  }
  if (id.includes("building_energy_reporting") || name.includes("건물 에너지 신고") || name.includes("건물에너지 신고") || name.includes("건물 에너지 등급제")) {
    return "https://ecobuilding.seoul.go.kr/";
  }
  return policy?.official_url || "";
}

function listHtml(items?: string[]) {
  const visibleItems = (items ?? []).filter(Boolean);
  if (!visibleItems.length) {
    return '<p class="muted">표시할 항목이 없습니다.</p>';
  }
  return `<ul>${visibleItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function sectionHtml(title: string, body: string) {
  return `<section class="card"><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function aiPayloadIsIncheon(payload: AiReportApiResponse) {
  return String(payload.report_context?.region || "").trim() === "incheon";
}

function emptyPolicyMessage(isIncheon: boolean) {
  return isIncheon
    ? "현재 등록된 지원사업 후보는 서울 기준이므로 인천 건물에는 표시하지 않습니다. 인천 지원사업 데이터가 연결되기 전까지 정책 추천은 비워둡니다."
    : "현재 입력 정보만으로는 높은 적합도의 지원사업을 찾기 어렵습니다. 추가 정보를 입력하면 더 정확한 정책 검토가 가능합니다.";
}

function policyCautionMessage(isIncheon: boolean) {
  return isIncheon
    ? "인천 지원사업 데이터가 연결되기 전까지 정책 추천은 표시하지 않습니다."
    : "지원사업 추천은 건물 정보와 진단 결과를 기준으로 제공되며, 실제 신청 가능 여부는 최신 공고문 확인이 필요합니다.";
}

function buildPrintableReportHtml(payload: AiReportApiResponse) {
  const report = payload.report;
  if (!report && payload.raw_text) {
    return `<!doctype html>
<html lang="ko">
<head><meta charset="utf-8" /><title>건물 에너지 AI 진단 리포트</title>${printStyleHtml()}</head>
<body><main class="report"><h1>건물 에너지 AI 진단 리포트</h1><p class="muted">구조화된 JSON 파싱에 실패해 원문 리포트를 표시합니다.</p><pre>${escapeHtml(payload.raw_text)}</pre></main></body>
</html>`;
  }

  const actions = report?.recommended_actions ?? [];
  const priorities = report?.priority_actions ?? [];
  const hypotheses = report?.cause_hypotheses ?? [];
  const risks = report?.risk_scenarios ?? [];
  const policies = report?.policy_recommendations ?? [];
  const isIncheon = aiPayloadIsIncheon(payload);
  return `<!doctype html>
<html lang="ko">
<head><meta charset="utf-8" /><title>${escapeHtml(report?.title || "건물 에너지 AI 진단 리포트")}</title>${printStyleHtml()}</head>
<body>
  <main class="report">
    <header class="cover">
      <p class="eyebrow">${escapeHtml(report?.subtitle || "공공데이터와 유사군 비교 기반 참고용 진단")}</p>
      <p class="tag">${escapeHtml(audienceLabel(report?.audience))}</p>
      <h1>${escapeHtml(report?.title || "건물 에너지 AI 진단 리포트")}</h1>
      <p class="summary">${escapeHtml(report?.executive_summary || report?.one_line_summary || "건물 에너지 데이터를 기반으로 참고용 리포트를 생성했습니다.")}</p>
      <p class="caution">${escapeHtml(report?.overall_assessment?.caution || "본 결과는 참고용이며 법적 효력을 갖지 않습니다.")}</p>
    </header>

    <div class="grid two">
      ${sectionHtml(
        "총정리",
        `<p><strong>${escapeHtml(report?.overall_assessment?.grade_label || "참고용")}</strong></p><p>${escapeHtml(report?.overall_assessment?.summary || "확인 가능한 데이터 중심으로 진단했습니다.")}</p><p class="muted">신뢰도: ${escapeHtml(report?.overall_assessment?.confidence_label || "확인 필요")}</p>`,
      )}
      ${sectionHtml(
        "유사군 비교",
        `<p>${escapeHtml(report?.peer_comparison?.summary || "유사군 비교 데이터를 함께 검토했습니다.")}</p><p>${escapeHtml(report?.peer_comparison?.rank_text || "")}</p><p class="muted">${escapeHtml(report?.peer_comparison?.interpretation || "")}</p>`,
      )}
    </div>

    ${sectionHtml(
      "전기 핵심 진단",
      `<p><strong>${escapeHtml(report?.energy_summary?.electricity?.status || "데이터 확인 필요")}</strong></p><p>${escapeHtml(report?.energy_summary?.electricity?.summary || "")}</p><h3>원인 후보</h3>${listHtml(report?.energy_summary?.electricity?.main_reason_candidates)}<h3>확인할 항목</h3>${listHtml(report?.energy_summary?.electricity?.recommended_checks)}`,
    )}

    ${sectionHtml(
      "가스 핵심 진단",
      `<p><strong>${escapeHtml(report?.energy_summary?.gas?.status || "데이터 확인 필요")}</strong></p><p>${escapeHtml(report?.energy_summary?.gas?.summary || "")}</p><h3>원인 후보</h3>${listHtml(report?.energy_summary?.gas?.main_reason_candidates)}<h3>확인할 항목</h3>${listHtml(report?.energy_summary?.gas?.recommended_checks)}`,
    )}

    ${sectionHtml(
      "등급 해석",
      `<p>${escapeHtml(report?.grade_interpretation?.absolute_grade || "절대 등급은 산정 가능한 경우에만 참고합니다.")}</p><p>${escapeHtml(report?.grade_interpretation?.relative_grade || "상대 등급은 유사군/분포 기반 참고 지표입니다.")}</p><p class="caution">${escapeHtml(report?.grade_interpretation?.caution || "공식 등급 또는 인증 결과가 아닙니다.")}</p>`,
    )}

    ${sectionHtml(
      "AI 원인 가설",
      hypotheses.length
        ? hypotheses
            .map(
              (item) => `<article class="item"><h3>${escapeHtml(item.title || "원인 후보")}</h3><p class="tag">신뢰도: ${escapeHtml(item.confidence || "확인 필요")}</p><p>${escapeHtml(item.reason || "")}</p><p class="muted">확인할 것: ${escapeHtml(item.check_next || "")}</p></article>`,
            )
            .join("")
        : '<p class="muted">표시할 원인 가설이 없습니다.</p>',
    )}

    ${sectionHtml(
      "개선 우선순위 TOP 3",
      priorities.length
        ? priorities
            .map(
              (item, index) => `<article class="item"><h3>${escapeHtml(item.rank || index + 1)}. ${escapeHtml(item.title || "우선 실행 항목")}</h3><p class="tag">기대효과 ${escapeHtml(item.impact || "-")} · 난이도 ${escapeHtml(item.difficulty || "-")}</p><p>${escapeHtml(item.reason || "")}</p><p class="muted">다음 행동: ${escapeHtml(item.next_step || "")}</p>${item.related_policy_or_service ? `<p class="tag">${escapeHtml(item.related_policy_or_service)}</p>` : ""}</article>`,
            )
            .join("")
        : '<p class="muted">표시할 우선순위가 없습니다.</p>',
    )}

    ${sectionHtml(
      "리스크 시나리오",
      risks.length
        ? risks
            .map(
              (item) => `<article class="item"><h3>${escapeHtml(item.horizon || "리스크")} · ${escapeHtml(item.title || "")}</h3><p>${escapeHtml(item.description || "")}</p><p class="muted">완화 방안: ${escapeHtml(item.mitigation || "")}</p></article>`,
            )
            .join("")
        : '<p class="muted">표시할 리스크 시나리오가 없습니다.</p>',
    )}

    ${sectionHtml(
      "시공·운영 추천",
      actions.length
        ? actions
            .map(
              (action, index) => `<article class="item"><h3>${escapeHtml(action.priority || index + 1)}. ${escapeHtml(action.title || "개선 행동")}</h3><p>${escapeHtml(action.reason || "")}</p><p class="muted">${escapeHtml(action.expected_effect || "")}</p><p class="tag">추천 시공 분야: ${escapeHtml(action.contractor_category || "상담 연결 준비 중")} · ${escapeHtml(action.contractor_cta_label || "상담 연결 준비 중")}</p></article>`,
            )
            .join("")
        : '<p class="muted">표시할 추천 행동이 없습니다.</p>',
    )}

    ${sectionHtml(
      "맞춤형 지원사업 검토",
      policies.length
        ? policies
            .map(
              (policy) => `<article class="item"><h3>${escapeHtml(policy.policy_name || "정책 후보")}</h3><p class="tag">${escapeHtml(policy.category || "")} · ${escapeHtml(policy.benefit_type || "")} · 정책 적합도 ${escapeHtml(policy.fit_score || "-")}점 · ${escapeHtml(policy.fit_label || "검토 가능")}</p><h4>추천 이유</h4>${listHtml(policy.matched_reasons)}<h4>추가 확인 필요</h4>${listHtml(policy.missing_checks)}<p>${escapeHtml(policy.recommended_next_step || "")}</p>${officialPolicyUrl(policy) ? `<p><strong>공식 안내:</strong> ${escapeHtml(officialPolicyUrl(policy))}</p>` : ""}<p class="caution">${escapeHtml(policy.caution || "정확한 신청 가능 여부는 관련 기관 확인이 필요합니다.")}</p></article>`,
            )
            .join("")
        : `<p class="muted">${escapeHtml(emptyPolicyMessage(isIncheon))}</p>`,
    )}

    ${sectionHtml(
      "사용자 입력 반영 및 주의사항",
      `<p>${escapeHtml(report?.user_answer_reflection?.summary || "추가 입력이 없는 경우 DB 데이터만으로 리포트를 생성했습니다.")}</p>${listHtml([...(report?.user_answer_reflection?.important_answers ?? []), ...(report?.limitations ?? []), policyCautionMessage(isIncheon)])}`,
    )}
  </main>
</body>
</html>`;
}

function printStyleHtml() {
  return `<style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #111827; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; }
    .report { width: 100%; margin: 0; padding: 0; }
    .cover { border-bottom: 2px solid #111827; padding-bottom: 18px; margin-bottom: 18px; }
    .eyebrow { margin: 0 0 8px; color: #047857; font-size: 12px; font-weight: 800; }
    h1 { margin: 0; font-size: 28px; line-height: 1.25; letter-spacing: 0; }
    h2 { margin: 0 0 10px; font-size: 17px; line-height: 1.35; }
    h3 { margin: 10px 0 6px; font-size: 13px; line-height: 1.4; }
    h4 { margin: 10px 0 4px; font-size: 12px; line-height: 1.4; }
    p { margin: 6px 0; font-size: 11.5px; line-height: 1.65; }
    ul { margin: 6px 0 0; padding-left: 18px; }
    li { margin: 3px 0; font-size: 11px; line-height: 1.55; }
    pre { white-space: pre-wrap; word-break: break-word; font-size: 10.5px; line-height: 1.5; }
    .summary { margin-top: 10px; font-size: 14px; font-weight: 700; }
    .muted { color: #64748b; }
    .caution { color: #92400e; font-size: 10.5px; }
    .grid.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin: 10px 0; break-inside: avoid; page-break-inside: avoid; }
    .item { border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px; break-inside: avoid; page-break-inside: avoid; }
    .item:first-child { border-top: 0; padding-top: 0; margin-top: 0; }
    .tag { display: inline-block; border-radius: 999px; background: #ecfdf5; color: #047857; padding: 3px 7px; font-size: 10px; font-weight: 800; }
  </style>`;
}

function printAiReport(payload: AiReportApiResponse) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const iframeWindow = iframe.contentWindow;
  const iframeDocument = iframe.contentDocument || iframeWindow?.document;
  if (!iframeWindow || !iframeDocument) {
    iframe.remove();
    window.print();
    return;
  }

  iframeDocument.open();
  iframeDocument.write(buildPrintableReportHtml(payload));
  iframeDocument.close();

  const cleanup = () => {
    setTimeout(() => iframe.remove(), 250);
  };
  iframeWindow.onafterprint = cleanup;
  setTimeout(() => {
    iframeWindow.focus();
    iframeWindow.print();
    setTimeout(cleanup, 60000);
  }, 250);
}

function EnergyReportCard({
  title,
  data,
}: {
  title: string;
  data?: EnergySummaryBlock;
}) {
  return (
    <ReportCard title={title}>
      <div className="mb-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
        {data?.status || "데이터 확인 필요"}
      </div>
      <p>{data?.summary || "AI가 확인 가능한 데이터 범위 안에서 해석했습니다."}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-black text-slate-400">원인 후보</div>
          <BulletList items={data?.main_reason_candidates} />
        </div>
        <div>
          <div className="mb-2 text-xs font-black text-slate-400">확인할 항목</div>
          <BulletList items={data?.recommended_checks} />
        </div>
      </div>
    </ReportCard>
  );
}

function GeneratedReportView({ payload }: { payload: AiReportApiResponse }) {
  const report = sanitizeReportValue(payload.report);
  const rawText = sanitizeDisplayText(payload.raw_text);
  const isIncheon = aiPayloadIsIncheon(payload);

  if (!report && rawText) {
    return (
      <section className="ai-report-document rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-2xl font-black text-slate-950">건물 에너지 AI 진단 리포트</h2>
        <p className="mt-2 text-sm font-semibold text-amber-700">구조화된 JSON 파싱에 실패해 원문 리포트를 표시합니다.</p>
        <pre className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">
          {rawText}
        </pre>
      </section>
    );
  }

  return (
    <section className="ai-report-document rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-slate-200 pb-6">
        <div className="text-sm font-black text-emerald-600">{report?.subtitle || "공공데이터와 유사군 비교 기반 참고용 진단"}</div>
        <div className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
          {audienceLabel(report?.audience)}
        </div>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{report?.title || "건물 에너지 AI 진단 리포트"}</h2>
        <p className="mt-3 text-lg font-bold leading-7 text-slate-700">{report?.executive_summary || report?.one_line_summary || "건물 에너지 데이터를 기반으로 참고용 리포트를 생성했습니다."}</p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <ReportCard title="총정리">
          <div className="mb-2 inline-flex rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
            {report?.overall_assessment?.grade_label || "참고용"}
          </div>
          <p>{report?.overall_assessment?.summary || "확인 가능한 데이터 중심으로 진단했습니다."}</p>
          <p className="mt-3 text-xs text-slate-400">{report?.overall_assessment?.caution || "본 결과는 참고용이며 법적 효력을 갖지 않습니다."}</p>
        </ReportCard>
        <ReportCard title="유사군 비교">
          <p>{report?.peer_comparison?.summary || "유사군 비교 데이터를 함께 검토했습니다."}</p>
          {report?.peer_comparison?.rank_text && <p className="mt-2 text-slate-950">{report.peer_comparison.rank_text}</p>}
          {report?.peer_comparison?.interpretation && <p className="mt-2">{report.peer_comparison.interpretation}</p>}
        </ReportCard>
        <ReportCard title="등급 해석">
          <p>{report?.grade_interpretation?.absolute_grade || "절대 등급은 산정 가능한 경우에만 참고합니다."}</p>
          <p className="mt-2">{report?.grade_interpretation?.relative_grade || "상대 등급은 유사군/분포 기반 참고 지표입니다."}</p>
          <p className="mt-3 text-xs text-slate-400">{report?.grade_interpretation?.caution || "공식 등급 또는 인증 결과가 아닙니다."}</p>
        </ReportCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <EnergyReportCard title="전기 핵심 진단" data={report?.energy_summary?.electricity} />
        <EnergyReportCard title="가스 핵심 진단" data={report?.energy_summary?.gas} />
      </div>

      <ReportCard title="AI 원인 가설" className="mt-4">
        <div className="grid gap-3 lg:grid-cols-3">
          {(report?.cause_hypotheses ?? []).map((item, index) => (
            <div key={`${item.title}-${index}`} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-black text-slate-950">{item.title || "원인 후보"}</h4>
                <span className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-center text-[11px] font-black leading-none text-slate-500">
                  신뢰도 {item.confidence || "확인 필요"}
                </span>
              </div>
              <p className="mt-2">{item.reason}</p>
              <p className="mt-2 text-xs font-bold text-emerald-700">확인할 것: {item.check_next}</p>
            </div>
          ))}
          {(report?.cause_hypotheses ?? []).length === 0 && <p className="text-slate-500">표시할 원인 가설이 없습니다.</p>}
        </div>
      </ReportCard>

      <ReportCard title="개선 우선순위 TOP 3" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-separate border-spacing-y-2 text-left text-sm">
            <thead className="text-xs font-black text-slate-400">
              <tr>
                <th className="px-3 py-2">순위</th>
                <th className="px-3 py-2">실행 항목</th>
                <th className="px-3 py-2">효과</th>
                <th className="px-3 py-2">난이도</th>
                <th className="px-3 py-2">다음 행동</th>
              </tr>
            </thead>
            <tbody>
              {(report?.priority_actions ?? []).map((item, index) => (
                <tr key={`${item.title}-${index}`} className="bg-slate-50 align-top">
                  <td className="rounded-l-2xl px-3 py-3 font-black text-emerald-700">{item.rank || index + 1}</td>
                  <td className="px-3 py-3">
                    <div className="font-black text-slate-950">{item.title}</div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.reason}</p>
                    {item.related_policy_or_service && <p className="mt-2 text-xs font-black text-amber-700">{item.related_policy_or_service}</p>}
                  </td>
                  <td className="px-3 py-3 font-bold text-slate-700">{item.impact || "-"}</td>
                  <td className="px-3 py-3 font-bold text-slate-700">{item.difficulty || "-"}</td>
                  <td className="rounded-r-2xl px-3 py-3 text-slate-600">{item.next_step}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(report?.priority_actions ?? []).length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-slate-500">표시할 우선순위가 없습니다.</p>}
        </div>
      </ReportCard>

      <ReportCard title="리스크 시나리오" className="mt-4">
        <div className="grid gap-3 md:grid-cols-3">
          {(report?.risk_scenarios ?? []).map((item, index) => (
            <div key={`${item.horizon}-${index}`} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">{item.horizon || "리스크"}</span>
              <h4 className="mt-3 font-black text-slate-950">{item.title}</h4>
              <p className="mt-2 text-slate-600">{item.description}</p>
              <p className="mt-3 text-xs font-bold text-emerald-700">완화 방안: {item.mitigation}</p>
            </div>
          ))}
          {(report?.risk_scenarios ?? []).length === 0 && <p className="text-slate-500">표시할 리스크 시나리오가 없습니다.</p>}
        </div>
      </ReportCard>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ReportCard title="시공·운영 추천">
          <div className="space-y-3">
            {(report?.recommended_actions ?? []).map((action, index) => (
              <div key={`${action.title}-${index}`} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-600 px-2 py-1 text-xs font-black text-white">{action.priority || index + 1}</span>
                  <h4 className="font-black text-slate-950">{action.title || "개선 행동"}</h4>
                </div>
                <p className="mt-2">{action.reason}</p>
                <p className="mt-1 text-slate-500">{action.expected_effect}</p>
                <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-600">
                  추천 시공 분야: {action.contractor_category || "상담 연결 준비 중"} · {action.contractor_cta_label || "상담 연결 준비 중"}
                </div>
              </div>
            ))}
          </div>
        </ReportCard>
        <ReportCard title="맞춤형 지원사업 검토">
          <div className="space-y-3">
            {(report?.policy_recommendations ?? []).length === 0 && (
              <p className="rounded-2xl bg-slate-50 p-4 text-slate-500">
                {emptyPolicyMessage(isIncheon)}
              </p>
            )}
            {(report?.policy_recommendations ?? []).map((policy, index) => (
              <div key={`${policy.policy_name}-${index}`} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-black text-slate-950">{policy.policy_name || "정책 후보"}</h4>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-black text-amber-700">
                    {policy.fit_label || "검토 가능"} {policy.fit_score ? `정책 적합도 ${policy.fit_score}점` : ""}
                  </span>
                </div>
                {(policy.category || policy.benefit_type) && (
                  <p className="mt-2 text-xs font-black text-slate-500">
                    {[policy.category, policy.benefit_type].filter(Boolean).join(" · ")}
                  </p>
                )}
                {policy.reason && <p className="mt-2">{policy.reason}</p>}
                <BulletList items={policy.matched_reasons} />
                {policy.missing_checks && policy.missing_checks.length > 0 && (
                  <div className="mt-3 rounded-xl bg-white p-3">
                    <div className="mb-2 text-xs font-black text-slate-400">추가 확인 필요</div>
                    <BulletList items={policy.missing_checks} />
                  </div>
                )}
                {policy.recommended_next_step && <p className="mt-3 font-bold text-slate-700">{policy.recommended_next_step}</p>}
                {officialPolicyUrl(policy) && (
                  <a
                    href={officialPolicyUrl(policy)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100"
                  >
                    공식 안내 보기
                  </a>
                )}
                <p className="mt-2 text-xs text-slate-400">{policy.caution || "정확한 신청 가능 여부는 관련 기관 확인이 필요합니다."}</p>
              </div>
            ))}
          </div>
        </ReportCard>
      </div>

      <ReportCard title="사용자 입력 반영 및 주의사항" className="mt-6">
        <p>{report?.user_answer_reflection?.summary || "추가 입력이 없는 경우 DB 데이터만으로 리포트를 생성했습니다."}</p>
        <div className="mt-3">
          <BulletList
            items={[
              ...(report?.user_answer_reflection?.important_answers ?? []),
              ...(report?.limitations ?? []),
              policyCautionMessage(isIncheon),
            ]}
          />
        </div>
      </ReportCard>
    </section>
  );
}

export function AiReportPanel({
  report,
  defaultOpen = false,
  buttonClassName = "inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white transition hover:bg-emerald-700",
  buttonLabel = "AI 리포트 확인",
}: {
  report: ReportApiResponse;
  address: string;
  defaultOpen?: boolean;
  buttonClassName?: string;
  buttonLabel?: string;
}) {
  const buildingId = hasBuildingId(report);
  const incheonReport = isIncheonReport(report);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [step, setStep] = useState<"choice" | "electric" | "gas" | "policy" | "review" | "result">("choice");
  const [electricAnswers, setElectricAnswers] = useState<Record<string, string | string[]>>({});
  const [gasAnswers, setGasAnswers] = useState<Record<string, string | string[]>>({});
  const [policyAnswers, setPolicyAnswers] = useState<Record<string, string | string[]>>({});
  const [reportAudience, setReportAudience] = useState<AiReportAudience>("building_owner");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AiReportApiResponse | null>(null);
  const generatingRef = useRef(false);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const answerPayload = useMemo<AiReportUserAnswers>(
    () => ({
      electric: electricAnswers,
      gas: gasAnswers,
      policy: incheonReport ? {} : policyAnswers,
    }),
    [electricAnswers, gasAnswers, incheonReport, policyAnswers],
  );

  function setAnswer(section: "electric" | "gas" | "policy", question: ChoiceQuestion, option: string) {
    const setter = section === "electric" ? setElectricAnswers : section === "gas" ? setGasAnswers : setPolicyAnswers;
    setter((current) => {
      if (!question.multiple) {
        if (current[question.key] === option) {
          const next = { ...current };
          delete next[question.key];
          return next;
        }
        return { ...current, [question.key]: option };
      }

      const values = valueList(current[question.key]);
      const nextValues = values.includes(option)
        ? values.filter((item) => item !== option)
        : [...values, option];
      return { ...current, [question.key]: nextValues };
    });
  }

  function answerText(value?: string | string[]) {
    const values = valueList(value).filter(Boolean);
    return values.length ? values.join(", ") : "입력하지 않음";
  }

  function AnswerSummarySection({
    title,
    questions,
    answers,
  }: {
    title: string;
    questions: ChoiceQuestion[];
    answers: Record<string, string | string[]>;
  }) {
    return (
      <section className="rounded-2xl bg-slate-50 p-4">
        <h3 className="text-sm font-black text-slate-950">{title}</h3>
        <dl className="mt-3 space-y-2">
          {questions.map((question) => (
            <div key={question.key} className="text-xs leading-5">
              <dt className="font-black text-slate-500">{question.label}</dt>
              <dd className="mt-0.5 font-semibold text-slate-800">{answerText(answers[question.key])}</dd>
            </div>
          ))}
        </dl>
      </section>
    );
  }

  async function generate(withAnswers: boolean) {
    if (generatingRef.current) {
      return;
    }
    if (!buildingId) {
      setError("건물 ID를 확인할 수 없어 리포트를 생성할 수 없습니다.");
      return;
    }

    generatingRef.current = true;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError("");
    try {
      const payload = await createAiReport({
        building_id: buildingId,
        report_type: withAnswers ? "detailed" : "basic",
        report_audience: reportAudience,
        user_answers: withAnswers ? answerPayload : undefined,
        signal: controller.signal,
      });
      if (requestId !== requestIdRef.current) {
        return;
      }
      setResult(payload);
      setStep("result");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      console.error(err);
      setError(err instanceof Error ? err.message : "리포트 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      generatingRef.current = false;
    }
  }

  function closeModal() {
    abortControllerRef.current?.abort();
    requestIdRef.current += 1;
    generatingRef.current = false;
    setIsLoading(false);
    setIsOpen(false);
  }

  function renderQuestions(section: "electric" | "gas" | "policy", questions: ChoiceQuestion[]) {
    const answers = section === "electric" ? electricAnswers : section === "gas" ? gasAnswers : policyAnswers;
    return (
      <div className="space-y-5">
        {questions.map((question) => (
          <div key={question.key}>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-950">{question.label}</h3>
              {question.multiple && <span className="text-xs font-bold text-emerald-600">중복</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {question.options.map((option) => {
                const selected = valueList(answers[question.key]).includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAnswer(section, question, option)}
                    className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                      selected
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={buttonLabel}
        onClick={() => {
          setIsOpen(true);
          setError("");
        }}
        className={buttonClassName}
      >
        {buttonLabel}
      </button>

      {isOpen && (
        <div className="ai-report-print-modal fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-6">
          <div className="ai-report-print-container mx-auto max-w-5xl rounded-3xl bg-slate-50 p-5 shadow-2xl sm:p-7">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black text-emerald-600">AI 리포트</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  더 정확한 AI 리포트를 위해 추가 정보를 입력하시겠습니까?
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  바로 생성하면 DB의 건물·에너지·유사군·AI 추정 데이터만 사용합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600"
              >
                닫기
              </button>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            {isLoading && (
              <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-5">
                <div className="text-base font-black text-slate-950">AI가 건물 에너지 데이터를 분석하고 있습니다...</div>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  유사군 비교, 등급, 추가 입력 정보를 종합하는 중입니다.
                </p>
              </div>
            )}

            {step !== "result" && (
              <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h3 className="text-base font-black text-slate-950">어떤 관점의 리포트가 필요하신가요?</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {audienceOptions.map((option) => {
                    const selected = reportAudience === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setReportAudience(option.value)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                            : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                        }`}
                      >
                        <div className="text-sm font-black">{option.title}</div>
                        <p className="mt-1 text-xs font-semibold leading-5">{option.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {step === "choice" && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => generate(false)}
                  className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-emerald-200 disabled:opacity-60"
                >
                  <div className="text-lg font-black text-slate-950">바로 생성</div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    현재 DB에 있는 진단 결과만으로 빠르게 리포트를 만듭니다.
                  </p>
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setStep("electric")}
                  className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-left shadow-sm transition hover:border-emerald-300 disabled:opacity-60"
                >
                  <div className="text-lg font-black text-emerald-900">상세 기입</div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">
                    운영시간, 냉난방 방식, 공실 여부를 반영해 원인과 추천 행동을 더 구체화합니다.
                  </p>
                </button>
              </div>
            )}

            {step === "electric" && (
              <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="mb-5">
                  <p className="text-sm font-black text-emerald-600">Step 1</p>
                  <h2 className="text-xl font-black text-slate-950">전기 사용 패턴</h2>
                </div>
                {renderQuestions("electric", electricQuestions)}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={() => setStep("choice")} className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600">
                    선택으로 돌아가기
                  </button>
                  <button type="button" onClick={() => setStep("gas")} className="h-12 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white">
                    다음
                  </button>
                </div>
              </div>
            )}

            {step === "gas" && (
              <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="mb-5">
                  <p className="text-sm font-black text-emerald-600">Step 2</p>
                  <h2 className="text-xl font-black text-slate-950">가스/난방 사용 패턴</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    가스는 난방방식, 지역난방 여부, 온수·취사 방식에 따라 오차가 커질 수 있습니다.
                  </p>
                </div>
                {renderQuestions("gas", gasQuestions)}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={() => setStep("electric")} className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600">
                    이전
                  </button>
                  <button type="button" onClick={() => setStep(incheonReport ? "review" : "policy")} className="h-12 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white">
                    다음
                  </button>
                </div>
              </div>
            )}

            {!incheonReport && step === "policy" && (
              <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="mb-5">
                  <p className="text-sm font-black text-emerald-600">Step 3</p>
                  <h2 className="text-xl font-black text-slate-950">정책 매칭 정보</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    지원사업 추천에 필요한 선택 정보입니다. 민감하거나 모르는 항목은 건너뛰거나 응답하지 않음을 선택해도 됩니다.
                  </p>
                </div>
                {renderQuestions("policy", policyQuestions)}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={() => setStep("gas")} className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600">
                    이전
                  </button>
                  <button type="button" onClick={() => setStep("review")} className="h-12 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white">
                    입력 확인
                  </button>
                </div>
              </div>
            )}

            {step === "review" && (
              <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm font-black text-emerald-600">Step 4</p>
                <h2 className="text-xl font-black text-slate-950">확인 후 리포트 생성</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  선택하지 않은 항목은 모름으로 해석하지 않고, 리포트에서 데이터 부족으로 다룹니다.
                </p>
                <div className={`mt-5 grid gap-4 ${incheonReport ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
                  <AnswerSummarySection title="전기 사용 패턴" questions={electricQuestions} answers={electricAnswers} />
                  <AnswerSummarySection title="가스/난방 사용 패턴" questions={gasQuestions} answers={gasAnswers} />
                  {!incheonReport && (
                    <AnswerSummarySection title="정책 매칭 정보" questions={policyQuestions} answers={policyAnswers} />
                  )}
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={() => setStep(incheonReport ? "gas" : "policy")} className="h-12 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600">
                    이전
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => generate(true)}
                    className="h-12 rounded-2xl bg-emerald-600 px-5 text-sm font-black text-white disabled:opacity-60"
                  >
                    리포트 생성
                  </button>
                </div>
              </div>
            )}

            {step === "result" && result && (
              <div className="mt-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-bold text-slate-500">
                    리포트는 DB에 저장하지 않으며, 현재 화면에서만 확인할 수 있습니다.
                  </div>
                  <button
                    type="button"
                    onClick={() => printAiReport(result)}
                    className="no-print h-12 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white"
                  >
                    PDF 다운로드/인쇄
                  </button>
                </div>
                <GeneratedReportView payload={result} />
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            margin: 12mm;
          }
          body * {
            visibility: hidden !important;
          }
          html,
          body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }
          .ai-report-print-modal {
            position: static !important;
            inset: auto !important;
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .ai-report-print-container {
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }
          .ai-report-document,
          .ai-report-document * {
            visibility: visible !important;
          }
          .ai-report-document {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            box-shadow: none !important;
            background: white !important;
            break-inside: auto !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
