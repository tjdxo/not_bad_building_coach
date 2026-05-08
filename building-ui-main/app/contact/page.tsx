export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-14">
      <section className="mx-auto max-w-3xl px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <p className="text-sm font-black tracking-[0.25em] text-emerald-600">CONTACT</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">문의사항</h1>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            서비스 이용 중 궁금한 점이나 데이터 확인 요청이 있으면 아래 양식에 내용을 정리해 주세요.
            현재는 프론트엔드 화면만 준비되어 있어 실제 메일 발송은 아직 연결되어 있지 않습니다.
          </p>

          <form className="mt-8 space-y-5">
            <div>
              <label htmlFor="name" className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                이름
              </label>
              <input
                id="name"
                type="text"
                placeholder="홍길동"
                className="mt-2 h-13 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label htmlFor="email" className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                이메일
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="mt-2 h-13 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label htmlFor="subject" className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                제목
              </label>
              <input
                id="subject"
                type="text"
                placeholder="문의 제목을 입력해 주세요"
                className="mt-2 h-13 w-full rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label htmlFor="message" className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                문의 내용
              </label>
              <textarea
                id="message"
                rows={7}
                placeholder="확인이 필요한 주소, 건물명, 진단 화면에서 궁금했던 내용을 적어 주세요."
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <button
              type="button"
              disabled
              className="h-13 w-full rounded-2xl bg-slate-300 px-6 text-sm font-black text-white"
            >
              메일 발송 기능 준비 중
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
