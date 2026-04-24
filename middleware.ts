import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const publicPaths = ["/login", "/auth/callback"]

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request)
  const path = request.nextUrl.pathname
  const isPublic = publicPaths.some((p) => path === p || path.startsWith(`${p}/`))

  if (!user) {
    if (isPublic) return response
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Logged in and visiting /login or /: route to their role home.
  if (path === "/login" || path === "/") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const home =
      profile?.role === "admin"
        ? "/admin"
        : profile?.role === "investor"
        ? "/inversionista"
        : "/deudor"

    return NextResponse.redirect(new URL(home, request.url))
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
