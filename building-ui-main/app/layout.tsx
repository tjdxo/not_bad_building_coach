import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import Navbar from "@/components/Navbar";
import "./globals.css";

const notoSansKr = localFont({
  src: "../public/fonts/noto-sans-kr/NotoSansKR-VariableFont_wght.woff2",
  display: "swap",
  weight: "100 900",
  variable: "--font-noto-sans-kr",
});

export const metadata: Metadata = {
  title: "세상에 나쁜 건물은 없다 | 건물 에너지 효율 진단",
  description: "주소 기반 건물 에너지 사용량 분석, 탄소 절감 피드백, 정책 매칭 UI",
  icons: {
    icon: "/site-icon.ico",
    shortcut: "/site-icon.ico",
    apple: "/site-icon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className={`${notoSansKr.variable} flex min-h-full flex-col bg-slate-50 font-sans text-slate-950`}>
        <Navbar />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-slate-200 bg-white py-8">
          <div className="mx-auto flex max-w-6xl justify-center px-6">
            <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold text-slate-500">
              <Link href="/terms" className="hover:text-emerald-600">
                이용약관
              </Link>
              <Link href="/privacy" className="hover:text-emerald-600">
                개인정보 처리방침
              </Link>
              <Link href="/contact" className="hover:text-emerald-600">
                문의사항
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
