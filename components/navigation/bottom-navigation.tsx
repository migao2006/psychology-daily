"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { saveUserSettings } from "@/lib/db/settings";
const items = [
  { href: "/", label: "今日", icon: "home" },
  { href: "/courses", label: "課程", icon: "courses" },
  { href: "/research", label: "研究", icon: "research" },
  { href: "/progress", label: "進度", icon: "progress" },
] as const;
const navigationPaths = {
  home: <><path d="m3.5 11 8.5-7 8.5 7" /><path d="M5.5 10v10h13V10M9.5 20v-6h5v6" /></>,
  courses: <><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  research: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v18H7.5A3.5 3.5 0 0 0 4 23Z" /><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v18h3.5A3.5 3.5 0 0 1 20 23Z" /></>,
  progress: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
} as const;

export function BottomNavigation() {
  const pathname = usePathname();
  useEffect(() => { void saveUserSettings({ lastPage: pathname }); }, [pathname]);
  return <nav className="bottom-nav" aria-label="主要導覽">{items.map((item) => {
    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    return <Link key={item.href} href={item.href} className="nav-item" aria-current={active ? "page" : undefined}><NavigationIcon name={item.icon} /><span>{item.label}</span></Link>;
  })}</nav>;
}

function NavigationIcon({ name }: { name: (typeof items)[number]["icon"] }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {navigationPaths[name]}
    </svg>
  );
}
