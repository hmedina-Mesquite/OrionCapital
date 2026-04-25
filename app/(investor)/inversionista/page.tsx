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

export default async function InversionistaHome() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: investor } = await supabase
    .from("investors")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle()

  if (!investor) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Mi portafolio</h1>
        <p className="text-muted-foreground text-sm">
          Aún no estás vinculado como inversionista. Pide al administrador que
          asocie tu correo a tu perfil.
        </p>
      </div>
    )
  }

  const { data: tranches } = await supabase
    .from("investor_tranches")
    .select("*")
    .eq("investor_id", investor.id)
    .order("fecha_inicio", { ascending: false })

  const trancheIds = (tranches ?? []).map((t) => t.id)
  const { data: rawDistributions } = trancheIds.length
    ? await supabase
        .from("payment_distributions")
        .select("*")
        .eq("recipient_type", "investor_tranche")
        .in("recipient_id", trancheIds)
    : { data: [] }

  const paymentIds = Array.from(
    new Set((rawDistributions ?? []).map((d) => d.payment_id)),
  )
  const { data: paymentRows } = paymentIds.length
    ? await supabase
        .from("payments")
        .select("id, fecha_pago")
        .in("id", paymentIds)
    : { data: [] }
  const paymentDate = new Map(
    (paymentRows ?? []).map((p) => [p.id, p.fecha_pago] as const),
  )
  const distributions = (rawDistributions ?? []).map((d) => ({
    ...d,
    fecha_pago: paymentDate.get(d.payment_id) ?? null,
  }))

  const capitalActivo = (tranches ?? [])
    .filter((t) => t.estado === "activo")
    .reduce((s, t) => s + Number(t.monto), 0)
  const totalCobrado = (distributions ?? []).reduce(
    (s, d) => s + Number(d.monto),
    0,
  )

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{investor.nombre}</h1>
          <p className="text-muted-foreground text-sm">RFC {investor.rfc}</p>
        </div>
        <a
          href="/inversionista/statement"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm hover:bg-muted"
        >
          Descargar PDF
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Capital activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {formatMXN(capitalActivo)}
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Tranches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {(tranches ?? []).length}
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Total cobrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums">
              {formatMXN(totalCobrado)}
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Tranches</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Tasa</TableHead>
                <TableHead className="text-right">Plazo</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tranches ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-6"
                  >
                    Sin tranches aún.
                  </TableCell>
                </TableRow>
              )}
              {(tranches ?? []).map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-right tabular-nums">
                    {formatMXN(t.monto)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(Number(t.tasa_anual) * 100).toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right">{t.plazo_meses} m</TableCell>
                  <TableCell>{formatDate(t.fecha_inicio)}</TableCell>
                  <TableCell>{formatDate(t.fecha_vencimiento)}</TableCell>
                  <TableCell>{t.estado}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Distribuciones recibidas</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(distributions ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground py-6"
                  >
                    Sin distribuciones aún.
                  </TableCell>
                </TableRow>
              )}
              {(distributions ?? []).map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    {d.fecha_pago ? formatDate(d.fecha_pago) : "—"}
                  </TableCell>
                  <TableCell>{d.tipo}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMXN(d.monto)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
