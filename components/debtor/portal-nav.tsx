"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const items = [
  { href: "/deudor", label: "Resumen" },
  { href: "/deudor/tabla", label: "Cronograma" },
  { href: "/deudor/pagar", label: "Subir comprobante" },
  { href: "/deudor/historial", label: "Historial" },
] as const

export function DebtorPortalNav() {
  const pathname = usePathname()
  return (
    <nav className="border-b bg-background">
      <div className="px-6 flex gap-4 text-sm">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/deudor" && pathname.startsWith(item.href))
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
