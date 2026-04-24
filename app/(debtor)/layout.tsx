import { requireRole } from "@/lib/auth"
import { UserMenu } from "@/components/admin/user-menu"

export default async function DebtorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireRole(["debtor", "admin"])
  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b px-6 flex items-center justify-between bg-background">
        <span className="font-semibold">Orion Capital · Deudor</span>
        <UserMenu profile={profile} />
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
