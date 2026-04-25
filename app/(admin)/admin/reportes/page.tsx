import { createClient } from "@/lib/supabase/server"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { formatMXN } from "@/lib/money"
import { MoraButton } from "@/components/admin/mora-button"
import { markPastDue } from "../_lib/funding-actions"

export const dynamic = "force-dynamic"

type Bucket = { label: string; cuotas: number; importe: number }

export default async function ReportesPage() {
  const supabase = createClient()
  const [
    { data: tranches },
    { data: dispos },
    { data: schedule },
    { data: payments },
  ] = await Promise.all([
    supabase.from("investor_tranches").select("monto, estado, investor_id"),
    supabase.from("bank_disposiciones").select("monto, bank_id"),
    supabase
      .from("amortization_schedule")
      .select("cuota_esperada, estado, fecha_vencimiento"),
    supabase
      .from("payments")
      .select("monto_capital, monto_interes, monto_total, fecha_pago"),
  ])

  const trancheActivo = (tranches ?? [])
    .filter((t) => t.estado === "activo")
    .reduce((s, t) => s + Number(t.monto), 0)
  const dispoSum = (dispos ?? []).reduce((s, d) => s + Number(d.monto), 0)
  const totalSrcs = trancheActivo + dispoSum

  // Concentración por fuente.
  const investorMap = new Map<string, number>()
  for (const t of tranches ?? []) {
    if (t.estado !== "activo") continue
    investorMap.set(
      t.investor_id,
      (investorMap.get(t.investor_id) ?? 0) + Number(t.monto),
    )
  }
  const investorIds = Array.from(investorMap.keys())
  const { data: investors } = investorIds.length
    ? await supabase.from("investors").select("id, nombre").in("id", investorIds)
    : { data: [] }
  const investorName = new Map(
    (investors ?? []).map((i) => [i.id, i.nombre] as const),
  )

  const concentracion = Array.from(investorMap.entries())
    .map(([id, monto]) => ({
      id,
      label: investorName.get(id) ?? id,
      monto,
      pct: totalSrcs > 0 ? (monto / totalSrcs) * 100 : 0,
    }))
    .sort((a, b) => b.monto - a.monto)

  // Aging buckets sobre cuotas no pagadas totales.
  const today = new Date()
  const todayISO = today.toISOString().slice(0, 10)
  const buckets: Bucket[] = [
    { label: "Por vencer ≤ 30d", cuotas: 0, importe: 0 },
    { label: "Vencido 1–30d", cuotas: 0, importe: 0 },
    { label: "Vencido 31–60d", cuotas: 0, importe: 0 },
    { label: "Vencido 61–90d", cuotas: 0, importe: 0 },
    { label: "Vencido > 90d", cuotas: 0, importe: 0 },
  ]
  for (const r of schedule ?? []) {
    if (r.estado === "pagada_total") continue
    const due = new Date(r.fecha_vencimiento + "T00:00:00Z")
    const diff = Math.floor(
      (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
    )
    let bIdx = 0
    if (diff < 0 && Math.abs(diff) <= 30) bIdx = 0
    else if (diff <= 0) continue
    else if (diff <= 30) bIdx = 1
    else if (diff <= 60) bIdx = 2
    else if (diff <= 90) bIdx = 3
    else bIdx = 4
    buckets[bIdx].cuotas += 1
    buckets[bIdx].importe += Number(r.cuota_esperada)
  }

  const totalCobrado = (payments ?? []).reduce(
    (s, p) => s + Number(p.monto_total),
    0,
  )
  const interesCobrado = (payments ?? []).reduce(
    (s, p) => s + Number(p.monto_interes ?? 0),
    0,
  )
  const capitalCobrado = (payments ?? []).reduce(
    (s, p) => s + Number(p.monto_capital ?? 0),
    0,
  )

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <p className="text-muted-foreground text-sm">
          Concentración de fuentes y aging de cuotas.{" "}
          <span className="text-xs">(Snapshot al {todayISO})</span>
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Concentración de fuentes</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fuente</TableHead>
                <TableHead className="text-right">Monto activo</TableHead>
                <TableHead className="text-right">% del total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {concentracion.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground py-6"
                  >
                    Sin tranches activos.
                  </TableCell>
                </TableRow>
              )}
              {concentracion.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.label}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMXN(c.monto)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.pct.toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-medium">Bancos (todos)</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMXN(dispoSum)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {totalSrcs > 0
                    ? ((dispoSum / totalSrcs) * 100).toFixed(2)
                    : "0.00"}
                  %
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Aging de cuotas</h2>
          <MoraButton action={markPastDue} />
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bucket</TableHead>
                <TableHead className="text-right">Cuotas</TableHead>
                <TableHead className="text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buckets.map((b) => (
                <TableRow key={b.label}>
                  <TableCell>{b.label}</TableCell>
                  <TableCell className="text-right">{b.cuotas}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMXN(b.importe)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Cobranza histórica</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Total cobrado" value={formatMXN(totalCobrado)} />
          <Stat label="Capital" value={formatMXN(capitalCobrado)} />
          <Stat label="Interés" value={formatMXN(interesCobrado)} />
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}
