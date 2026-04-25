import "server-only"

const SCOPES = "https://www.googleapis.com/auth/drive.file"

/** Returns true once both OAuth env vars are present. The connect flow is a
 *  no-op until that's the case; the settings page surfaces a friendly
 *  "not configured" message in the meantime. */
export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  )
}

export function getRedirectUri(origin: string): string {
  return (
    process.env.GOOGLE_OAUTH_REDIRECT_URI ??
    `${origin}/api/google/callback`
  )
}

export function buildAuthUrl(origin: string, state: string): string | null {
  if (!isGoogleConfigured()) return null
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  u.searchParams.set("client_id", process.env.GOOGLE_OAUTH_CLIENT_ID!)
  u.searchParams.set("redirect_uri", getRedirectUri(origin))
  u.searchParams.set("response_type", "code")
  u.searchParams.set("scope", SCOPES)
  // access_type=offline + prompt=consent guarantees a refresh_token on first
  // auth and on reconnect.
  u.searchParams.set("access_type", "offline")
  u.searchParams.set("prompt", "consent")
  u.searchParams.set("state", state)
  return u.toString()
}

export type GoogleTokens = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
}

export async function exchangeCode(
  code: string,
  origin: string,
): Promise<GoogleTokens> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: getRedirectUri(origin),
      grant_type: "authorization_code",
    }).toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google token exchange failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<GoogleTokens>
}

export async function getUserInfo(
  accessToken: string,
): Promise<{ email: string; name?: string }> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`userinfo failed: ${res.status}`)
  return res.json()
}
