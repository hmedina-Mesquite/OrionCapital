import { createClient } from "@/lib/supabase/server"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMXN } from "@/lib/money"
import { formatDate } from "@/lib/dates"

export const dynamic = "force-dynamic"

export default async function DeudorHome() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: creditos }, { data: prestamos }] = await Promise.all([
    supabase.from("creditos").select("*").eq("profile_id", user.id),
    supabase.from("prestamos").select("*").eq("profile_id", user.id),
  ])

  const all = [
    ...(creditos ?? []).map((c) => ({
      kind: "credito" as const,
      id: c.id,
      label: c.nombre_proyecto,
      monto: Number(c.presupuesto),
      tasa: Number(c.tasa_anual),
      plazo: c.plazo_meses,
      fecha_inicio: c.fecha_inicio,
      estado: c.estado,
    })),
    ...(prestamos ?? []).map((p) => ({
      kind: "prestamo" as const,
      id: p.id,
      label: p.nombre_persona,
      monto: Number(p.cantidad),
      tasa: Number(p.tasa_anual),
      plazo: p.plazo_meses,
      fecha_inicio: p.fecha_inicio,
      estado: p.estado,
    })),
  ]

  const ids = all.map((a) => a.id)
  const { data: schedule } =
    ids.length > 0
      ? await supabase
          .from("amortization_schedule")
          .select("*")
          .in("destination_id", ids)
          .order("fecha_vencimiento", { ascending: true })
      : { data: [] }

  if (all.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Mis créditos</h1>
        <p className="text-muted-foreground text-sm">
          Aún no tienes créditos ni préstamos vinculados a tu cuenta.
        </p>
      </div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const proximas = (schedule ?? []).filter(
    (r) =>
      r.fecha_vencimiento >= today && r.estado !== "pagada_total",
  ).slice(0, 5)
  const vencidas = (schedule ?? []).filter(
    (r) =>
      r.fecha_vencimiento < today &&
      (r.estado === "pendiente" || r.estado === "vencida" || r.estado === "pagada_parcial"),
  )
  const moraSum = vencidas.reduce((s, r) => s + Number(r.cuota_esperada), 0)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Mis créditos</h1>
        <p className="text-muted-foreground text-sm">
          Resumen de tus obligaciones con Orion Capital.
        </p>
      </div>

      {vencidas.length > 0 && (
        <Card size="sm" className="border-destructive">
          <CardHeader>
            <CardTitle className="text-sm text-destructive">
              Cuotas vencidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold tabular-nums">
              {formatMXN(moraSum)}
            </div>
            <p className="text-xs text-muted-foreground">
              {vencidas.length} cuotas pendientes desde antes de hoy
            </p>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Mis instrumentos</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Tasa</TableHead>
                <TableHead className="text-right">Plazo</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((d) => (
                <TableRow key={`${d.kind}-${d.id}`}>
                  <TableCell>{d.kind}</TableCell>
                  <TableCell>{d.label}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMXN(d.monto)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(d.tasa * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">{d.plazo} m</TableCell>
                  <TableCell>{formatDate(d.fecha_inicio)}</TableCell>
                  <TableCell>{d.estado}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Próximas cuotas</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vence</TableHead>
                <TableHead className="text-right">Cuota</TableHead>
                <TableHead className="text-right">Capital</TableHead>
                <TableHead className="text-right">Interés</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proximas.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-6"
                  >
                    Sin cuotas próximas.
                  </TableCell>
                </TableRow>
              )}
              {proximas.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDate(r.fecha_vencimiento)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMXN(r.cuota_esperada)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMXN(r.capital_esperado)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMXN(r.interes_esperado)}
                  </TableCell>
                  <TableCell>{r.estado}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
