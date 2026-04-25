import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { buttonVariants } from "@/components/ui/button"
import { todayISO } from "@/lib/dates"

export const dynamic = "force-dynamic"

export default async function EstadosPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: investor } = await supabase
    .from("investors")
    .select("id, nombre, rfc")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!investor) {
    return (
      <p className="text-muted-foreground text-sm">
        Aún no estás vinculado como inversionista.
      </p>
    )
  }

  const { data: tranches } = await supabase
    .from("investor_tranches")
    .select("id, monto, fecha_inicio, tasa_anual")
    .eq("investor_id", investor.id)
    .order("fecha_inicio", { ascending: true })

  const today = todayISO()
  const yearStart = today.slice(0, 4) + "-01-01"

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Estados de cuenta</h1>
        <p className="text-muted-foreground text-sm">
          Genera un PDF con el detalle de tus tranches y distribuciones.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estado completo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Incluye todos los tranches y distribuciones recibidas hasta hoy.
          </p>
          <a
            href="/inversionista/statement"
            target="_blank"
            rel="noreferrer"
            className={buttonVariants()}
          >
            Descargar PDF
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Por rango de fechas</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            method="GET"
            action="/inversionista/statement"
            target="_blank"
            className="grid gap-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="from">Desde</Label>
                <Input
                  id="from"
                  name="from"
                  type="date"
                  defaultValue={yearStart}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="to">Hasta</Label>
                <Input
                  id="to"
                  name="to"
                  type="date"
                  defaultValue={today}
                  required
                />
              </div>
            </div>
            {(tranches ?? []).length > 1 && (
              <div className="grid gap-2">
                <Label htmlFor="tranche_id">Tranche (opcional)</Label>
                <select
                  id="tranche_id"
                  name="tranche_id"
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                  defaultValue=""
                >
                  <option value="">Todos</option>
                  {(tranches ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {new Intl.NumberFormat("es-MX", {
                        style: "currency",
                        currency: "MXN",
                      }).format(Number(t.monto))}
                      {" · "}
                      {(Number(t.tasa_anual) * 100).toFixed(2)}%
                      {" · "}
                      {t.fecha_inicio}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" className={buttonVariants()}>
              Descargar PDF
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
