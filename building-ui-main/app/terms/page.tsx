export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-14">
      <section className="mx-auto max-w-4xl px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <p className="text-sm font-black tracking-[0.25em] text-emerald-600">TERMS</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">이용약관</h1>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            본 약관은 세상에 나쁜 건물은 없다 서비스 이용을 위한 기본 조건을 설명하는 초안입니다.
            실제 운영 정책에 따라 내용은 변경될 수 있습니다.
          </p>

          <div className="mt-8 space-y-7 text-sm font-semibold leading-7 text-slate-600">
            <section>
              <h2 className="text-lg font-black text-slate-950">1. 서비스 목적</h2>
              <p className="mt-2">
                본 서비스는 건물 주소와 공공데이터, 유사군 분석, AI 추정 결과를 활용해 건물 에너지 사용 현황을 쉽게 이해할 수 있도록 돕는 참고용 진단 정보를 제공합니다.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-black text-slate-950">2. 제공 정보의 성격</h2>
              <p className="mt-2">
                서비스에서 제공하는 등급, 절감 가능성, 비교 결과, AI 추정값은 공식 인증이나 법적 효력을 갖는 결과가 아닙니다.
                지원사업 신청, 시공, 계약, 법적 판단에는 관련 기관 또는 전문가의 확인이 필요합니다.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-black text-slate-950">3. 이용자의 책임</h2>
              <p className="mt-2">
                이용자는 검색한 건물 정보와 입력한 사용량이 실제와 맞는지 확인해야 합니다. 잘못 입력된 정보나 추정 결과를 근거로 한 의사결정의 책임은 이용자에게 있습니다.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-black text-slate-950">4. 서비스 변경</h2>
              <p className="mt-2">
                데이터 출처, 분석 기준, 화면 구성은 서비스 개선 또는 정책 변화에 따라 변경될 수 있습니다.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
