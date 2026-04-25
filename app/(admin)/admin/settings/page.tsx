import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { SettingsForm } from "@/components/admin/settings-form"
import { isGoogleConfigured } from "@/lib/google"
import { updateSettings } from "./actions"
import { formatDateTime } from "@/lib/dates"

export const dynamic = "force-dynamic"

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { google?: string; msg?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: settings }, googleTokenResp] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).single(),
    user
      ? supabase
          .from("admin_google_tokens")
          .select("google_email, expires_at, updated_at")
          .eq("admin_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const googleToken = googleTokenResp.data
  const googleConfigured = isGoogleConfigured()

  // Banner state from query params after callback redirects.
  const banner = (() => {
    switch (searchParams.google) {
      case "connected":
        return { tone: "ok", text: "Google Drive conectado correctamente." }
      case "disconnected":
        return { tone: "ok", text: "Google Drive desconectado." }
      case "not_configured":
        return {
          tone: "warn",
          text: "Faltan las variables de entorno de Google. Pide al equipo técnico configurar GOOGLE_OAUTH_CLIENT_ID y GOOGLE_OAUTH_CLIENT_SECRET.",
        }
      case "error":
        return {
          tone: "bad",
          text: `Error al conectar: ${searchParams.msg ?? "desconocido"}`,
        }
      default:
        return null
    }
  })()

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Parámetros globales de Orion Capital.
        </p>
      </div>

      {banner && (
        <div
          className={
            banner.tone === "ok"
              ? "rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900/40 dark:text-emerald-200"
              : banner.tone === "warn"
                ? "rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/40 dark:text-amber-200"
                : "rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          }
        >
          {banner.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Parámetros del sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm
            action={updateSettings}
            defaults={{
              reserva_percentage: Number(settings?.reserva_percentage ?? 0.1),
              default_investor_term_months:
                settings?.default_investor_term_months ?? 24,
              default_mora_multiplier: Number(
                settings?.default_mora_multiplier ?? 1.5,
              ),
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Google Drive</CardTitle>
            {googleConfigured ? (
              googleToken ? (
                <Badge variant="default">Conectado</Badge>
              ) : (
                <Badge variant="secondary">No conectado</Badge>
              )
            ) : (
              <Badge variant="outline">Sin configurar</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!googleConfigured && (
            <div className="text-sm space-y-2">
              <p>
                Google Drive aún no está conectado al sistema. Para activarlo,
                el equipo técnico debe configurar las variables de entorno:
              </p>
              <pre className="bg-muted/50 p-3 rounded text-xs overflow-x-auto">
{`GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...`}
              </pre>
              <p className="text-muted-foreground text-xs">
                Una vez configuradas (en{" "}
                <code className="text-xs">web/.env.local</code> o en Vercel),
                cada admin podrá conectar su propia cuenta de Google desde
                aquí. La integración usa el scope{" "}
                <code className="text-xs">drive.file</code> — Orion solo verá
                las carpetas que el admin enlace explícitamente.
              </p>
            </div>
          )}

          {googleConfigured && !googleToken && (
            <div className="space-y-3">
              <p className="text-sm">
                Conecta tu cuenta de Google para enlazar carpetas de Drive a
                inversiones, créditos y préstamos.
              </p>
              <a
                href="/api/google/authorize"
                className={buttonVariants({ size: "sm" })}
              >
                Conectar Google Drive
              </a>
            </div>
          )}

          {googleConfigured && googleToken && (
            <div className="space-y-3 text-sm">
              <p>
                Conectado como{" "}
                <span className="font-medium">{googleToken.google_email}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Última actualización:{" "}
                {googleToken.updated_at
                  ? formatDateTime(googleToken.updated_at)
                  : "—"}
              </p>
              <div className="flex gap-2">
                <a
                  href="/api/google/authorize"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Reconectar
                </a>
                <a
                  href="/api/google/disconnect"
                  className={buttonVariants({ variant: "destructive", size: "sm" })}
                >
                  Desconectar
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
