"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "서비스 소개" },
  { href: "/search", label: "에너지 진단" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-3 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-6 md:px-6 md:py-4">
        <Link href="/" className="flex min-w-0 items-center gap-2 md:gap-3">
          <Image
            src="/site-icon.ico"
            alt=""
            width={36}
            height={36}
            unoptimized
            className="h-8 w-8 rounded-xl object-cover ring-1 ring-emerald-100 md:h-9 md:w-9"
          />
          <span className="truncate text-base font-black tracking-tight text-slate-950 md:text-lg">세상에 나쁜 건물은 없다</span>
        </Link>

        <nav className="flex w-full items-center justify-center gap-2 text-sm font-black text-slate-600 md:w-auto md:gap-5 md:text-base">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap border-b-2 px-3 py-2 transition md:px-4 ${
                  active
                    ? "border-emerald-500 text-emerald-700"
                    : "border-transparent hover:border-emerald-200 hover:text-emerald-600"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:block" />
      </div>
    </header>
  );
}
