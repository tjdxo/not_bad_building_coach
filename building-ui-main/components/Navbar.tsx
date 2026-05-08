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
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/site-icon.ico"
            alt=""
            width={36}
            height={36}
            unoptimized
            className="h-9 w-9 rounded-xl object-cover ring-1 ring-emerald-100"
          />
          <span className="text-lg font-black tracking-tight text-slate-950">세상에 나쁜 건물은 없다</span>
        </Link>

        <nav className="hidden items-center justify-center gap-5 text-base font-black text-slate-600 md:flex">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`border-b-2 px-4 py-2 transition ${
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
