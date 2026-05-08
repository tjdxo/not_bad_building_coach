import Link from "next/link";

const valuePoints = [
  {
    title: "주소 기반 진단",
    desc: "서울시 건물 주소를 기준으로 진단 가능한 건물 후보를 찾고 리포트 흐름을 시작합니다.",
    icon: "01",
  },
  {
    title: "전기·가스 사용 분석",
    desc: "월별 사용량과 유사 건물 평균을 비교해 과소비 구간과 피크 시간을 한눈에 보여줍니다.",
    icon: "02",
  },
  {
    title: "AI 개선 피드백",
    desc: "조명, 냉난방, 피크 전력, 설비 운영 관점에서 실행 우선순위를 제안합니다.",
    icon: "03",
  },
  {
    title: "정책 매칭",
    desc: "탄소 절감, 에너지 효율화, 지자체 지원 사업과 연결 가능한 정책 정보를 제공합니다.",
    icon: "04",
  },
];

const processSteps = [
  "주소 검색",
  "건물 후보 선택",
  "전기·가스 사용량 비교",
  "AI 리포트 및 정책 추천",
];

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden bg-white py-20 sm:py-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_50%_-10%,#d1fae5,transparent)]" />
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
                내 건물 주소를 찾고
                <span className="block text-emerald-600">에너지 개선 방향을 확인하세요.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                주소를 검색해 내 건물의 전기·가스 사용량과 유사 건물 대비 효율을 확인하고,
                실행 가능한 절감 액션과 정책 매칭 정보를 리포트로 이어갑니다.
              </p>

              <div className="mt-10 max-w-2xl rounded-3xl border border-emerald-100 bg-white p-3 shadow-xl">
                <div className="rounded-[1.25rem] bg-emerald-50 p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-slate-950">
                        서울시 건물 주소 검색부터 시작합니다.
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        구와 동을 고르고 상세 주소를 입력하면 60만 건 규모의 건물 주소 후보를 20개씩 확인할 수 있습니다.
                      </p>
                    </div>
                    <Link
                      href="/search"
                      className="inline-flex h-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 px-7 text-base font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-500"
                    >
                      내 건물 에너지 진단 바로가기
                      <span className="ml-2">-&gt;</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl lg:h-full">
              <div className="flex h-full flex-col rounded-3xl bg-white/10 p-6">
                <p className="text-sm font-bold text-emerald-300">주소 선택 후 이어지는 진단 흐름</p>
                <h2 className="mt-4 text-3xl font-black leading-tight">
                  검색, 선택, 비교, 리포트까지 한 화면 흐름으로 이어집니다.
                </h2>
                <div className="mt-8 flex-1 space-y-4">
                  {[
                    ["01", "구·동 필터 선택", "서울특별시 안에서 구와 법정동을 단계적으로 좁힙니다."],
                    ["02", "건물 후보 확인", "도로명주소와 지번주소를 함께 보고 정확한 건물을 선택합니다."],
                    ["03", "진단 리포트 이동", "선택한 건물 후보를 기준으로 진단 리포트 요청을 시작합니다."],
                  ].map(([number, title, desc]) => (
                    <div key={title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-sm font-black">
                        {number}
                      </div>
                      <div>
                        <div className="font-black">{title}</div>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-black tracking-[0.25em] text-emerald-600">진행 흐름</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              큰 데이터는 검색 페이지에서 단계적으로 좁힙니다.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {processSteps.map((step, index) => (
              <div key={step} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-black text-emerald-600">{index + 1}단계</div>
                <div className="mt-4 text-xl font-black text-slate-950">{step}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {valuePoints.map((point) => (
              <div key={point.title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-black text-emerald-700">
                  {point.icon}
                </div>
                <h3 className="mt-6 text-lg font-black text-slate-950">{point.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{point.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-[2rem] bg-slate-950 p-8 text-white sm:p-12">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-3xl font-black tracking-tight">정확한 주소 선택이 진단 품질의 시작입니다.</h2>
                <p className="mt-4 max-w-3xl text-slate-300">
                  도로명주소와 지번주소를 함께 확인한 뒤 선택한 건물을 기준으로 리포트를 생성합니다.
                </p>
              </div>
              <Link
                href="/search"
                className="inline-flex h-14 items-center justify-center rounded-2xl bg-emerald-500 px-7 text-sm font-black text-white transition hover:bg-emerald-400"
              >
                주소 검색하고 진단 시작하기
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
