"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { saveUserSettings } from "@/lib/db/settings";
const items = [
  { href: "/", label: "今日", icon: "⌂" },
  { href: "/courses", label: "課程", icon: "▤" },
  { href: "/research", label: "研究", icon: "◫" },
  { href: "/progress", label: "進度", icon: "▥" },
] as const;
export function BottomNavigation() {
  const pathname = usePathname();
  useEffect(() => { void saveUserSettings({ lastPage: pathname }); }, [pathname]);
  return <nav className="bottom-nav" aria-label="主要導覽">{items.map((item) => {
    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    return <Link key={item.href} href={item.href} className="nav-item" aria-current={active ? "page" : undefined}><span style={{ fontSize: "1.25rem", lineHeight: 1 }} aria-hidden="true">{item.icon}</span><span>{item.label}</span></Link>;
  })}</nav>;
}
