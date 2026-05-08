export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-14">
      <section className="mx-auto max-w-4xl px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <p className="text-sm font-black tracking-[0.25em] text-emerald-600">PRIVACY</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">개인정보 처리방침</h1>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            본 페이지는 현재 프론트엔드에서 제공하는 개인정보 처리 안내 초안입니다. 실제 수집 항목과 보관 정책이 확정되면 운영 정책에 맞게 갱신해야 합니다.
          </p>

          <div className="mt-8 space-y-7 text-sm font-semibold leading-7 text-slate-600">
            <section>
              <h2 className="text-lg font-black text-slate-950">1. 처리하는 정보</h2>
              <p className="mt-2">
                서비스는 건물 주소 검색, 건물 식별자, 사용자가 직접 입력한 에너지 사용량 등 진단에 필요한 정보를 화면 흐름에서 사용할 수 있습니다.
                현재 직접 입력값은 별도 서버 저장 없이 브라우저 세션에서 임시로 활용되는 구조입니다.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-black text-slate-950">2. 이용 목적</h2>
              <p className="mt-2">
                입력 또는 선택된 정보는 건물 에너지 진단, 유사군 비교, AI 추정 결과 표시, 문의 응대 화면 구성 목적으로 사용됩니다.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-black text-slate-950">3. 보관 및 파기</h2>
              <p className="mt-2">
                서버 저장 기능이 추가되는 경우 보관 기간, 파기 절차, 제3자 제공 여부를 별도로 고지합니다.
                브라우저 세션에 저장된 임시 값은 세션 종료 또는 사용자의 브라우저 설정에 따라 삭제될 수 있습니다.
              </p>
            </section>
            <section>
              <h2 className="text-lg font-black text-slate-950">4. 문의</h2>
              <p className="mt-2">
                개인정보 관련 요청은 문의사항 페이지를 통해 접수하는 흐름을 준비 중입니다. 실제 메일 발송 기능은 아직 연결되어 있지 않습니다.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
