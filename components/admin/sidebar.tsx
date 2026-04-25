"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Landmark,
  TrendingUp,
  Briefcase,
  HandCoins,
  Receipt,
  Shield,
  FileBarChart,
  Settings,
  History,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/inversionistas", label: "Inversionistas", icon: Users },
  { href: "/admin/bancos", label: "Bancos", icon: Landmark },
  { href: "/admin/inversiones", label: "Inversiones", icon: TrendingUp },
  { href: "/admin/creditos", label: "Créditos", icon: Briefcase },
  { href: "/admin/prestamos", label: "Préstamos", icon: HandCoins },
  { href: "/admin/pagos", label: "Pagos", icon: Receipt },
  { href: "/admin/reserva", label: "Reserva", icon: Shield },
  { href: "/admin/reportes", label: "Reportes", icon: FileBarChart },
  { href: "/admin/audit", label: "Auditoría", icon: History },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const

export function AdminSidebar() {
  const pathname = usePathname()
  return (
    <aside className="hidden md:flex flex-col border-r bg-muted/30">
      <div className="h-14 flex items-center px-6 border-b">
        <span className="font-semibold">Orion Capital</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
