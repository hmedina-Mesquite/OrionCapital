import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// GET-based disconnect to allow a simple link from the settings page. The
// action is user-scoped (only deletes the caller's own row) so CSRF risk is
// minimal.
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse("Unauthorized", { status: 401 })

  await supabase.from("admin_google_tokens").delete().eq("admin_id", user.id)
  return NextResponse.redirect(
    new URL("/admin/settings?google=disconnected", req.url),
  )
}
