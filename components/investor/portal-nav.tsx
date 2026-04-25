"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const items = [
  { href: "/inversionista", label: "Resumen" },
  { href: "/inversionista/tranches", label: "Tranches" },
  { href: "/inversionista/pagos", label: "Pagos" },
  { href: "/inversionista/estados", label: "Estados" },
] as const

export function InvestorPortalNav() {
  const pathname = usePathname()
  return (
    <nav className="border-b bg-background">
      <div className="px-6 flex gap-4 text-sm">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/inversionista" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "py-3 border-b-2 -mb-px transition-colors",
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
