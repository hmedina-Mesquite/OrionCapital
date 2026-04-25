import { createClient } from "@/lib/supabase/server"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { formatMXN } from "@/lib/money"
import { formatDate } from "@/lib/dates"

export const dynamic = "force-dynamic"

export default async function PagosInvestorPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: investor } = await supabase
    .from("investors")
    .select("id")
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
    .select("id, monto, fecha_inicio")
    .eq("investor_id", investor.id)
  const trancheIds = (tranches ?? []).map((t) => t.id)

  const { data: distributions } = trancheIds.length
    ? await supabase
        .from("payment_distributions")
        .select("id, payment_id, recipient_id, tipo, monto")
        .eq("recipient_type", "investor_tranche")
        .in("recipient_id", trancheIds)
    : { data: [] }

  const paymentIds = Array.from(
    new Set((distributions ?? []).map((d) => d.payment_id)),
  )
  const { data: payments } = paymentIds.length
    ? await supabase
        .from("payments")
        .select("id, fecha_pago, destination_type, destination_id")
        .in("id", paymentIds)
    : { data: [] }
  const paymentMap = new Map((payments ?? []).map((p) => [p.id, p]))

  // Resolve destination labels.
  const creditoIds = Array.from(
    new Set(
      (payments ?? [])
        .filter((p) => p.destination_type === "credito")
        .map((p) => p.destination_id),
    ),
  )
  const prestamoIds = Array.from(
    new Set(
      (payments ?? [])
        .filter((p) => p.destination_type === "prestamo")
        .map((p) => p.destination_id),
    ),
  )
  const [{ data: creditos }, { data: prestamos }] = await Promise.all([
    creditoIds.length
      ? supabase.from("creditos").select("id, nombre_proyecto").in("id", creditoIds)
      : Promise.resolve({ data: [] as { id: string; nombre_proyecto: string }[] }),
    prestamoIds.length
      ? supabase.from("prestamos").select("id, nombre_persona").in("id", prestamoIds)
      : Promise.resolve({ data: [] as { id: string; nombre_persona: string }[] }),
  ])
  const creditoMap = new Map((creditos ?? []).map((c) => [c.id, c.nombre_proyecto]))
  const prestamoMap = new Map((prestamos ?? []).map((p) => [p.id, p.nombre_persona]))

  // Sort distributions by payment fecha_pago descending.
  const rows = (distributions ?? [])
    .map((d) => {
      const p = paymentMap.get(d.payment_id)
      const destLabel =
        p?.destination_type === "credito"
          ? creditoMap.get(p.destination_id) ?? p.destination_id.slice(0, 8)
          : p?.destination_type === "prestamo"
            ? prestamoMap.get(p.destination_id) ?? p.destination_id.slice(0, 8)
            : "—"
      return {
        id: d.id,
        fecha: p?.fecha_pago ?? null,
        destLabel,
        destType: p?.destination_type ?? "—",
        tipo: d.tipo,
        monto: Number(d.monto),
      }
    })
    .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""))

  const totalCobrado = rows.reduce((s, r) => s + r.monto, 0)
  const totalCapital = rows
    .filter((r) => r.tipo === "capital")
    .reduce((s, r) => s + r.monto, 0)
  const totalInteres = rows
    .filter((r) => r.tipo === "interes")
    .reduce((s, r) => s + r.monto, 0)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Pagos recibidos</h1>
        <p className="text-muted-foreground text-sm">
          Cada fila corresponde a una distribución que te llegó proporcional a
          tu participación en el destino.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Total cobrado</div>
            <div className="text-xl font-semibold tabular-nums">
              {formatMXN(totalCobrado)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Capital devuelto</div>
            <div className="text-xl font-semibold tabular-nums">
              {formatMXN(totalCapital)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Intereses</div>
            <div className="text-xl font-semibold tabular-nums">
              {formatMXN(totalInteres)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Sin pagos recibidos todavía.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.fecha ? formatDate(r.fecha) : "—"}</TableCell>
                <TableCell>{r.destLabel}</TableCell>
                <TableCell className="capitalize">{r.destType}</TableCell>
                <TableCell className="capitalize">{r.tipo}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMXN(r.monto)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
