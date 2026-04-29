import Link from "next/link";

const links = [
  { href: "/", label: "서비스 소개" },
  { href: "/search", label: "주소 검색" },
  { href: "/dashboard", label: "진단 대시보드" },
  { href: "/report", label: "AI 리포트" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-sm font-black text-white">
            BE
          </div>
          <span className="text-lg font-black tracking-tight text-slate-950">나쁜 건물은 없다 (Building Energy AI)</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-emerald-600">
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/search"
          className="hidden h-10 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-emerald-600 sm:inline-flex"
        >
          진단하기
        </Link>
      </div>
    </header>
  );
}
