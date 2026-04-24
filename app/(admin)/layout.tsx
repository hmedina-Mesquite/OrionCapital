import { requireRole } from "@/lib/auth"
import { AdminSidebar } from "@/components/admin/sidebar"
import { TopNav } from "@/components/admin/top-nav"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireRole(["admin"])
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[240px_1fr]">
      <AdminSidebar />
      <div className="flex flex-col">
        <TopNav profile={profile} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
