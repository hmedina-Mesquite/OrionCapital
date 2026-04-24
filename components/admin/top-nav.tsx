import { UserMenu } from "@/components/admin/user-menu"

type Props = {
  profile: { full_name?: string | null; email?: string | null }
}

export function TopNav({ profile }: Props) {
  return (
    <header className="h-14 border-b px-6 flex items-center justify-between bg-background">
      <div className="md:hidden font-semibold">Orion Capital</div>
      <div className="hidden md:block" />
      <UserMenu profile={profile} />
    </header>
  )
}
