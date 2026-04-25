import { requireRole } from "@/lib/auth"
import { UserMenu } from "@/components/admin/user-menu"
import { InvestorPortalNav } from "@/components/investor/portal-nav"

export default async function InvestorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireRole(["investor", "admin"])
  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b px-6 flex items-center justify-between bg-background">
        <span className="font-semibold">Orion Capital · Inversionista</span>
        <UserMenu profile={profile} />
      </header>
      <InvestorPortalNav />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
