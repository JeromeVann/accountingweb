"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Landmark,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "sales", icon: Receipt },
  { href: "/bills", label: "expenses", icon: Wallet },
  { href: "/payroll", label: "payroll", icon: Users },
  { href: "/banking", label: "banking", icon: Landmark },
  { href: "/reports", label: "reports", icon: BarChart3 },
  { href: "/settings", label: "settings", icon: Settings },
];

export function Sidebar({ companyName }: { companyName: string }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <aside className="sticky top-0 h-screen w-60 shrink-0 bg-[#0F172A] text-slate-300 flex flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500 font-bold text-white">
          L
        </div>
        <span className="truncate font-semibold text-white">{companyName}</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <item.icon className="h-4 w-4" />
              {t(item.label)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
