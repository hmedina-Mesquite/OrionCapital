import { createClient } from "@/lib/supabase/server"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { formatMXN } from "@/lib/money"
import {
  MonthlyCollectionsChart,
  SourceMixChart,
  ScheduleStatusChart,
} from "@/components/admin/dashboard-charts"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = createClient()
  const [
    { data: tranches },
    { data: dispos },
    { data: banks },
    { data: payments },
    { data: schedule },
    { data: reserva },
    { count: investors },
    { count: creditos },
    { count: prestamos },
    { count: inversiones },
  ] = await Promise.all([
    supabase.from("investor_tranches").select("monto, estado"),
    supabase.from("bank_disposiciones").select("monto"),
    supabase.from("banks").select("linea_credito, estado"),
    supabase.from("payments").select("monto_total, monto_capital, monto_interes, fecha_pago"),
    supabase.from("amortization_schedule").select("cuota_esperada, estado, fecha_vencimiento"),
    supabase
      .from("reserva_movements")
      .select("saldo_despues")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("investors").select("*", { count: "exact", head: true }),
    supabase.from("creditos").select("*", { count: "exact", head: true }),
    supabase.from("prestamos").select("*", { count: "exact", head: true }),
    supabase.from("inversiones").select("*", { count: "exact", head: true }),
  ])

  const trancheSum = (tranches ?? [])
    .filter((t) => t.estado === "activo")
    .reduce((s, t) => s + Number(t.monto), 0)
  const dispoSum = (dispos ?? []).reduce((s, d) => s + Number(d.monto), 0)
  const bankLineaActiva = (banks ?? [])
    .filter((b) => b.estado === "activo")
    .reduce((s, b) => s + Number(b.linea_credito), 0)
  const interesCobrado = (payments ?? []).reduce(
    (s, p) => s + Number(p.monto_interes ?? 0),
    0,
  )
  const today = new Date().toISOString().slice(0, 10)
  const enMora = (schedule ?? []).filter(
    (r) =>
      (r.estado === "pendiente" || r.estado === "vencida") &&
      r.fecha_vencimiento < today,
  )
  const moraSum = enMora.reduce((s, r) => s + Number(r.cuota_esperada), 0)
  const reservaSaldo =
    reserva && reserva.length > 0 ? Number(reserva[0].saldo_despues) : 0

  // Monthly collections chart data (last 12 months).
  const monthly = new Map<
    string,
    { total: number; capital: number; interes: number }
  >()
  for (const p of payments ?? []) {
    const month = p.fecha_pago.slice(0, 7)
    const cur = monthly.get(month) ?? { total: 0, capital: 0, interes: 0 }
    cur.total += Number(p.monto_total)
    cur.capital += Number(p.monto_capital ?? 0)
    cur.interes += Number(p.monto_interes ?? 0)
    monthly.set(month, cur)
  }
  const months = Array.from(monthly.keys()).sort().slice(-12)
  const monthlyData = months.map((m) => ({ month: m, ...(monthly.get(m)!) }))

  // Source mix.
  const sourceMix = [
    { name: "Inversionistas", value: trancheSum },
    { name: "Bancos (dispuesto)", value: dispoSum },
    { name: "Reserva", value: Math.max(0, reservaSaldo) },
  ].filter((s) => s.value > 0)

  // Schedule status counts.
  const statusMap = new Map<string, number>()
  for (const r of schedule ?? []) {
    statusMap.set(r.estado, (statusMap.get(r.estado) ?? 0) + 1)
  }
  const statusData = Array.from(statusMap.entries()).map(([estado, cuotas]) => ({
    estado,
    cuotas,
  }))

  const cards = [
    { label: "Capital de inversionistas (activo)", value: formatMXN(trancheSum) },
    { label: "Disposiciones bancarias", value: formatMXN(dispoSum) },
    { label: "Línea bancaria activa", value: formatMXN(bankLineaActiva) },
    { label: "Reserva", value: formatMXN(reservaSaldo) },
    { label: "Interés cobrado (histórico)", value: formatMXN(interesCobrado) },
    {
      label: "Mora vencida",
      value: formatMXN(moraSum),
      sub: `${enMora.length} cuotas`,
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Resumen ejecutivo de Orion Capital.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} size="sm">
            <CardHeader>
              <CardTitle className="text-sm font-normal text-muted-foreground">
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">
                {c.value}
              </div>
              {c.sub && (
                <div className="text-xs text-muted-foreground">{c.sub}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Inversionistas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{investors ?? 0}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Inversiones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{inversiones ?? 0}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Créditos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{creditos ?? 0}</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Préstamos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{prestamos ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MonthlyCollectionsChart data={monthlyData} />
        <SourceMixChart data={sourceMix} />
      </div>
      {statusData.length > 0 && <ScheduleStatusChart data={statusData} />}
    </div>
  )
}
