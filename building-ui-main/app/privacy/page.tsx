import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보 처리방침 | 세나건",
  description: "세나건 개인정보 처리방침입니다.",
};

const sections = [
  {
    title: "제1조 (개인정보의 처리목적)",
    body: [
      "'세나건'은 다음의 목적을 위하여 최소한의 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.",
    ],
    list: [
      "에너지 진단 서비스 제공: 건물 주소 검색, 실측 및 추정 데이터 기반 에너지 등급 산정 및 리더보드 서비스 제공을 목적으로 합니다.",
      "유료 AI 리포트 서비스: 데이터 분석을 통한 정밀 리포트 생성, 결제 처리 및 콘텐츠 제공을 목적으로 합니다.",
      "데이터 정합성 검증: 이용자가 직접 제출한 증빙 자료를 통한 데이터 확인, 수동 승인 처리 및 서비스의 정확도 향상을 위한 DB 관리를 목적으로 합니다.",
    ],
  },
  {
    title: "제2조 (개인정보의 처리 및 보유기간)",
    body: [
      "① '세나건'은 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보 수집 시에 동의받은 보유·이용기간 내에서 개인정보를 처리·보유합니다.",
      "② 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다.",
    ],
    list: [
      "일반 진단 데이터: 비회원제 서비스 특성상 사용자가 직접 입력한 사용량 데이터는 서버나 DB에 저장하지 않고 브라우저 세션 종료 시 즉시 파기합니다.",
      "증빙 자료 및 승인 데이터: 이용자가 데이터 정합성 확인을 위해 직접 첨부한 증빙 자료(이미지, PDF 등) 및 승인된 데이터는 서비스 운영 및 증빙의 목적으로 5년간 보유합니다. (근거: 전자상거래 등에서의 소비자 보호에 관한 법률)",
      "대금 결제 및 재화 공급 기록: 결제와 관련된 행정 기록은 관련 법령에 따라 5년간 보유합니다.",
    ],
  },
  {
    title: "제3조 (개인정보의 제3자 제공)",
    body: [
      "① '세나건'은 정보주체의 개인정보를 명시한 범위 내에서만 처리하며, 정보주체의 동의 또는 법률의 특별한 규정에 해당하는 경우 외에는 개인정보를 제3자에게 제공하지 않습니다.",
    ],
  },
  {
    title: "제4조 (처리하는 개인정보 항목)",
    body: ["'세나건'은 서비스 제공을 위해 다음의 개인정보 항목을 처리하고 있습니다."],
    list: [
      "기본 서비스 이용: 건물 주소, 월별 에너지 사용량(전기/도시가스).",
      "데이터 검증 요청 시(수동 승인 절차): 에너지 사용 실측 증빙 자료(이미지 또는 PDF 파일), 승인 결과 안내를 위한 연락처(필요 시).",
      "결제 처리 시: 결제 정보(카드사명, 승인번호 등 PG사 제공 데이터).",
      "자동 수집 항목: IP 주소, 쿠키, 서비스 이용 기록, 방문 기록 등.",
    ],
  },
  {
    title: "제5조 (개인정보의 파기절차 및 방법)",
    body: [
      "① '세나건'은 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.",
      "② 파기방법: 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 파기하며, 종이 문서에 출력된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.",
    ],
  },
  {
    title: "제6조 (정보주체의 의무 및 서비스 이용 특이사항)",
    list: [
      "비회원 서비스: 본 서비스는 회원가입 및 이메일 수집 절차가 없으므로, 이용자는 결제 후 출력되는 리포트 화면을 즉시 PDF로 저장해야 합니다. 창을 닫을 경우 재열람이 불가능할 수 있음을 고지합니다.",
      "데이터 정확성: 이용자는 정확한 주소 및 증빙 자료를 제출해야 하며, 허위 정보를 입력하여 발생하는 불이익에 대해 '세나건'은 책임을 지지 않습니다.",
    ],
  },
  {
    title: "제7조 (개인정보의 안전성 확보조치)",
    body: ["'세나건'은 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다."],
    list: [
      "관리적 조치: 내부관리계획 수립 및 시행, 정기적 직원 교육 등.",
      "기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 보안프로그램 설치, 데이터 전송 시 암호화 등.",
    ],
  },
  {
    title: "제8조 (개인정보 보호책임자)",
    body: [
      "'세나건'은 개인정보 처리에 관한 업무를 총괄해서 책임지고, 정보주체의 불만처리 및 피해구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.",
    ],
    bullets: [
      "개인정보 보호책임자: NBLB(No Building Left Behind) 팀",
      "연락처: 010-****-****",
    ],
  },
  {
    title: "제9조 (개인정보 처리방침 변경)",
    body: ["이 개인정보 처리방침은 2026. 05. 10.부터 적용됩니다."],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-14">
      <section className="mx-auto max-w-4xl px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <p className="text-sm font-black tracking-[0.25em] text-emerald-600">PRIVACY</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">개인정보 처리방침</h1>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            세나건은 개인정보 보호법에 따라 이용자의 개인정보를 보호하고 관련 고충을 원활하게 처리하기 위해 다음과 같은 처리방침을 공개합니다.
          </p>
          <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm font-semibold leading-7 text-slate-600">
            <p>서비스명: 세상에 나쁜 건물은 없다(세나건)</p>
            <p>운영팀: NBLB(No Building Left Behind)</p>
            <p>적용일: 2026. 05. 10.</p>
            <p>개인정보 보호책임자: NBLB(No Building Left Behind) 팀</p>
            <p>연락처: 010-****-****</p>
            <p>이메일: [공식 이메일 기재 예정]</p>
          </div>
          <p className="mt-4 text-xs font-semibold leading-5 text-amber-700">
            본 문서는 서비스 제공을 위한 기본 고지 문안이며, 정식 운영 전 법률 검토가 필요합니다.
          </p>

          <div className="mt-8 space-y-8 text-sm font-semibold leading-7 text-slate-600">
            <p>
              세상에 나쁜 건물은 없다(이하 “세나건”)는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
            </p>
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-black text-slate-950">{section.title}</h2>
                {section.body?.map((paragraph) => (
                  <p key={paragraph} className="mt-2">
                    {paragraph}
                  </p>
                ))}
                {section.list && (
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                )}
                {section.bullets && (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {section.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
