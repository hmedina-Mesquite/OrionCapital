import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"
import { buildAuthUrl, isGoogleConfigured } from "@/lib/google"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse("Unauthorized", { status: 401 })
  const { data: isAdmin } = await supabase.rpc("is_admin")
  if (!isAdmin) return new NextResponse("Forbidden", { status: 403 })

  if (!isGoogleConfigured()) {
    return NextResponse.redirect(
      new URL("/admin/settings?google=not_configured", req.url),
    )
  }

  const state = crypto.randomUUID()
  cookies().set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  })
  const authUrl = buildAuthUrl(req.nextUrl.origin, state)!
  return NextResponse.redirect(authUrl)
}
