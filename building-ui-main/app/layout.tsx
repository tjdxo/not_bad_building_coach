import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

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
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-950">
        <Navbar />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-slate-200 bg-white py-10">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-base font-black text-slate-950">세상에 나쁜 건물은 없다</div>
              <p className="mt-2 text-sm text-slate-500">
                주소 기반으로 건물 에너지 효율과 탄소 절감 방향을 확인할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-5 text-sm font-semibold text-slate-500">
              <a href="#" className="hover:text-emerald-600">
                이용약관
              </a>
              <a href="#" className="hover:text-emerald-600">
                개인정보 처리방침
              </a>
              <a href="#" className="hover:text-emerald-600">
                정책 문의
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
