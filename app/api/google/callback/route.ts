import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"
import {
  exchangeCode,
  getUserInfo,
  isGoogleConfigured,
} from "@/lib/google"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(
      new URL("/admin/settings?google=not_configured", req.url),
    )
  }
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse("Unauthorized", { status: 401 })

  const params = req.nextUrl.searchParams
  const code = params.get("code")
  const state = params.get("state")
  const cookieJar = cookies()
  const stateCookie = cookieJar.get("google_oauth_state")?.value
  if (!code || !state || state !== stateCookie) {
    return new NextResponse("Invalid OAuth state", { status: 400 })
  }
  cookieJar.delete("google_oauth_state")

  try {
    const tokens = await exchangeCode(code, req.nextUrl.origin)
    const info = await getUserInfo(tokens.access_token)
    const expires_at = new Date(
      Date.now() + tokens.expires_in * 1000,
    ).toISOString()

    await supabase.from("admin_google_tokens").upsert(
      {
        admin_id: user.id,
        google_email: info.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at,
        scope: tokens.scope,
      },
      { onConflict: "admin_id" },
    )
    return NextResponse.redirect(
      new URL("/admin/settings?google=connected", req.url),
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown"
    return NextResponse.redirect(
      new URL(
        `/admin/settings?google=error&msg=${encodeURIComponent(msg)}`,
        req.url,
      ),
    )
  }
}
