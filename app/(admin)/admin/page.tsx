import Link from "next/link"
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
import { Badge } from "@/components/ui/badge"
import { formatMXN } from "@/lib/money"
import { formatDate, formatDateTime, todayISO, addMonthsISO, daysBetweenISO } from "@/lib/dates"
import {
  MonthlyCollectionsChart,
  SourceMixChart,
  ScheduleStatusChart,
  CashFlow30Chart,
} from "@/components/admin/dashboard-charts"

export const dynamic = "force-dynamic"

const today = todayISO()
const in30 = addMonthsISO(today, 1) // approx 1 month for the cash-flow window
const in90 = addMonthsISO(today, 3)

export default async function DashboardPage() {
  const supabase = createClient()
  const [
    { data: tranches },
    { data: dispos },
    { data: banks },
    { data: payments },
    { data: schedule },
    { data: reserva },
    { data: maturingTranches },
    { data: auditEntries },
    { count: investors },
    { count: creditos },
    { count: prestamos },
    { count: inversiones },
    { count: pendingApproval },
  ] = await Promise.all([
    supabase.from("investor_tranches").select("monto, tasa_anual, estado, fecha_vencimiento"),
    supabase.from("bank_disposiciones").select("monto, bank_id"),
    supabase.from("banks").select("id, nombre, linea_credito, tasa_anual, estado"),
    supabase
      .from("payments")
      .select("monto_total, monto_capital, monto_interes, fecha_pago"),
    supabase
      .from("amortization_schedule")
      .select("cuota_esperada, estado, fecha_vencimiento"),
    supabase
      .from("reserva_movements")
      .select("saldo_despues")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("investor_tranches")
      .select("id, monto, tasa_anual, fecha_vencimiento, estado, investor_id")
      .eq("estado", "activo")
      .lte("fecha_vencimiento", in90)
      .order("fecha_vencimiento", { ascending: true }),
    supabase
      .from("audit_log")
      .select("id, table_name, op, at, actor")
      .order("at", { ascending: false })
      .limit(20),
    supabase.from("investors").select("*", { count: "exact", head: true }),
    supabase.from("creditos").select("*", { count: "exact", head: true }),
    supabase.from("prestamos").select("*", { count: "exact", head: true }),
    supabase.from("inversiones").select("*", { count: "exact", head: true }),
    supabase
      .from("pending_payments")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pending"),
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
  const reservaSaldo =
    reserva && reserva.length > 0 ? Number(reserva[0].saldo_despues) : 0

  // ---- Aging buckets (unpaid schedule rows by overdue days) ---------------
  const buckets = {
    al_corriente: { count: 0, sum: 0 },
    "1_30": { count: 0, sum: 0 },
    "31_60": { count: 0, sum: 0 },
    "61_90": { count: 0, sum: 0 },
    "90_plus": { count: 0, sum: 0 },
  }
  for (const r of schedule ?? []) {
    if (r.estado === "pagada_total") continue
    const days = daysBetweenISO(r.fecha_vencimiento, today) // positive when overdue
    const monto = Number(r.cuota_esperada)
    if (days <= 0) {
      buckets.al_corriente.count++
      buckets.al_corriente.sum += monto
    } else if (days <= 30) {
      buckets["1_30"].count++
      buckets["1_30"].sum += monto
    } else if (days <= 60) {
      buckets["31_60"].count++
      buckets["31_60"].sum += monto
    } else if (days <= 90) {
      buckets["61_90"].count++
      buckets["61_90"].sum += monto
    } else {
      buckets["90_plus"].count++
      buckets["90_plus"].sum += monto
    }
  }
  const totalEnMoraSum =
    buckets["1_30"].sum +
    buckets["31_60"].sum +
    buckets["61_90"].sum +
    buckets["90_plus"].sum

  // ---- 30-day cash flow ----------------------------------------------------
  // Inflow per day: schedule rows due in [today, today+30] not pagada_total.
  const inflowByDay = new Map<string, number>()
  for (const r of schedule ?? []) {
    if (r.estado === "pagada_total") continue
    if (r.fecha_vencimiento >= today && r.fecha_vencimiento <= in30) {
      inflowByDay.set(
        r.fecha_vencimiento,
        (inflowByDay.get(r.fecha_vencimiento) ?? 0) + Number(r.cuota_esperada),
      )
    }
  }
  // Outflow estimate: investor monthly interest + bank monthly interest spread
  // evenly across the 30-day window.
  const monthlyInvestorInterest = (tranches ?? [])
    .filter((t) => t.estado === "activo")
    .reduce((s, t) => s + (Number(t.monto) * Number(t.tasa_anual)) / 12, 0)
  // For banks: monthly cost = drawn * tasa_anual / 12 (drawn = bank_disposiciones sum per bank).
  const drawnByBank = new Map<string, number>()
  for (const d of dispos ?? []) {
    drawnByBank.set(d.bank_id, (drawnByBank.get(d.bank_id) ?? 0) + Number(d.monto))
  }
  const monthlyBankInterest = (banks ?? [])
    .filter((b) => b.estado === "activo")
    .reduce(
      (s, b) =>
        s + ((drawnByBank.get(b.id) ?? 0) * Number(b.tasa_anual)) / 12,
      0,
    )
  const totalOutflowMonthly = monthlyInvestorInterest + monthlyBankInterest
  const dailyOutflow = totalOutflowMonthly / 30

  // Build a 30-row series, one per day.
  const cashFlowData: { date: string; inflow: number; outflow: number }[] = []
  for (let i = 0; i < 30; i++) {
    const d = addMonthsISO(today, 0).slice(0, 10) // anchor
    const day = new Date(`${today}T00:00:00Z`)
    day.setUTCDate(day.getUTCDate() + i)
    const iso = day.toISOString().slice(0, 10)
    cashFlowData.push({
      date: iso.slice(5), // MM-DD
      inflow: Math.round((inflowByDay.get(iso) ?? 0) * 100) / 100,
      outflow: Math.round(dailyOutflow * 100) / 100,
    })
    void d
  }
  const totalInflow30 = cashFlowData.reduce((s, x) => s + x.inflow, 0)
  const totalOutflow30 = cashFlowData.reduce((s, x) => s + x.outflow, 0)

  // ---- Investor maturities (next 90 days) ----------------------------------
  const maturingInvestorIds = Array.from(
    new Set((maturingTranches ?? []).map((t) => t.investor_id)),
  )
  const { data: maturingInvestors } = maturingInvestorIds.length
    ? await supabase
        .from("investors")
        .select("id, nombre")
        .in("id", maturingInvestorIds)
    : { data: [] as { id: string; nombre: string }[] }
  const investorNameMap = new Map(
    (maturingInvestors ?? []).map((i) => [i.id, i.nombre]),
  )

  const maturityRows = (maturingTranches ?? []).map((t) => {
    const days = daysBetweenISO(today, t.fecha_vencimiento)
    let bucket: "30" | "60" | "90"
    if (days <= 30) bucket = "30"
    else if (days <= 60) bucket = "60"
    else bucket = "90"
    return {
      id: t.id,
      investor_id: t.investor_id,
      nombre: investorNameMap.get(t.investor_id) ?? "—",
      monto: Number(t.monto),
      tasa: Number(t.tasa_anual),
      fecha_vencimiento: t.fecha_vencimiento,
      days,
      bucket,
    }
  })

  // ---- Monthly collections + source mix + status (existing charts) --------
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

  const sourceMix = [
    { name: "Inversionistas", value: trancheSum },
    { name: "Bancos (dispuesto)", value: dispoSum },
    { name: "Reserva", value: Math.max(0, reservaSaldo) },
  ].filter((s) => s.value > 0)

  const statusMap = new Map<string, number>()
  for (const r of schedule ?? []) {
    statusMap.set(r.estado, (statusMap.get(r.estado) ?? 0) + 1)
  }
  const statusData = Array.from(statusMap.entries()).map(([estado, cuotas]) => ({
    estado,
    cuotas,
  }))

  // ---- Audit feed: resolve actor → display name --------------------------
  const actorIds = Array.from(
    new Set((auditEntries ?? []).map((e) => e.actor).filter(Boolean)),
  ) as string[]
  const { data: actors } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", actorIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] }
  const actorMap = new Map(
    (actors ?? []).map((a) => [a.id, a.full_name ?? a.email ?? a.id.slice(0, 8)]),
  )

  // ---- KPI cards ---------------------------------------------------------
  const cards = [
    { label: "Capital de inversionistas (activo)", value: formatMXN(trancheSum) },
    { label: "Disposiciones bancarias", value: formatMXN(dispoSum) },
    { label: "Línea bancaria activa", value: formatMXN(bankLineaActiva) },
    { label: "Reserva", value: formatMXN(reservaSaldo) },
    { label: "Interés cobrado (histórico)", value: formatMXN(interesCobrado) },
    {
      label: "Mora total",
      value: formatMXN(totalEnMoraSum),
      sub: `${
        buckets["1_30"].count + buckets["31_60"].count + buckets["61_90"].count + buckets["90_plus"].count
      } cuotas`,
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Resumen ejecutivo de Orion Capital.
          </p>
        </div>
        {(pendingApproval ?? 0) > 0 && (
          <Link
            href="/admin/pagos/pendientes"
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200"
          >
            {pendingApproval} comprobante{pendingApproval === 1 ? "" : "s"} por aprobar →
          </Link>
        )}
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

      {/* Aging buckets */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Cartera por antigüedad</h2>
        <div className="grid gap-3 md:grid-cols-5">
          <BucketCard label="Al corriente" tone="ok" {...buckets.al_corriente} />
          <BucketCard label="1–30 días" tone="warn" {...buckets["1_30"]} />
          <BucketCard label="31–60 días" tone="warn" {...buckets["31_60"]} />
          <BucketCard label="61–90 días" tone="bad" {...buckets["61_90"]} />
          <BucketCard label="90+ días" tone="bad" {...buckets["90_plus"]} />
        </div>
      </section>

      {/* Cash flow + maturities */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <CashFlow30Chart data={cashFlowData} />
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border p-2">
              <div className="text-muted-foreground">Entrada 30d</div>
              <div className="tabular-nums">{formatMXN(totalInflow30)}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-muted-foreground">Salida 30d</div>
              <div className="tabular-nums">{formatMXN(totalOutflow30)}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-muted-foreground">Neto</div>
              <div className="tabular-nums">
                {formatMXN(totalInflow30 - totalOutflow30)}
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vencimientos próximos · 90 días</CardTitle>
          </CardHeader>
          <CardContent>
            {maturityRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin tranches venciendo en los próximos 90 días.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inversionista</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Vence</TableHead>
                    <TableHead className="text-right">Días</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maturityRows.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Link
                          className="hover:underline"
                          href={`/admin/inversionistas/${m.investor_id}`}
                        >
                          {m.nombre}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMXN(m.monto)}
                      </TableCell>
                      <TableCell>{formatDate(m.fecha_vencimiento)}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            m.bucket === "30"
                              ? "destructive"
                              : m.bucket === "60"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {m.days < 0 ? `vencido ${-m.days}d` : `${m.days}d`}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Counts & misc */}
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

      {/* Activity feed */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {(!auditEntries || auditEntries.length === 0) ? (
            <p className="text-sm text-muted-foreground">Sin actividad reciente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuándo</TableHead>
                  <TableHead>Tabla</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditEntries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(e.at)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.table_name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          e.op === "DELETE"
                            ? "destructive"
                            : e.op === "INSERT"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {e.op}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {e.actor ? actorMap.get(e.actor) ?? "—" : "sistema"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function BucketCard({
  label,
  count,
  sum,
  tone,
}: {
  label: string
  count: number
  sum: number
  tone: "ok" | "warn" | "bad"
}) {
  const toneClass =
    tone === "bad"
      ? "border-destructive/40"
      : tone === "warn"
        ? "border-amber-300/60"
        : "border-emerald-300/60"
  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{formatMXN(sum)}</div>
      <div className="text-xs text-muted-foreground">{count} cuotas</div>
    </div>
  )
}
