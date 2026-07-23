import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { BottomNavigation } from "@/components/navigation/bottom-navigation";
import { PreferencesLoader } from "@/components/accessibility/preferences-loader";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "每日心理學", template: "%s｜每日心理學" },
  description: "每天 10 分鐘，學一個心理學概念、讀一篇近期英文研究。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant-TW" data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <PreferencesLoader />
        <a className="skip-link" href="#main-content">跳至主要內容</a>
        <div className="site-shell">
          <header className="topbar">
            <Link href="/" className="brand" aria-label="每日心理學首頁">
              <span className="brand-mark" aria-hidden="true">心</span>
              <span>每日心理學</span>
            </Link>
            <span className="privacy-pill">免登入・只存本機</span>
          </header>
          {children}
        </div>
        <BottomNavigation />
      </body>
    </html>
  );
}
