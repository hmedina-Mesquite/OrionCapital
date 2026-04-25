import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { formatMXN } from "@/lib/money"
import { formatDate, formatDateTime } from "@/lib/dates"
import { ProofLink } from "@/components/admin/proof-link"
import { DistributionRowEditor } from "@/components/admin/distribution-row"

export const dynamic = "force-dynamic"

const recipientLabels: Record<string, string> = {
  investor_tranche: "Inversionista",
  bank: "Banco",
  orion: "Orion",
  reserva: "Reserva",
}

export default async function PaymentDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("id", params.id)
    .single()
  if (!payment) notFound()

  const { data: distributions } = await supabase
    .from("payment_distributions")
    .select("*")
    .eq("payment_id", params.id)
    .order("recipient_type", { ascending: true })

  // Resolve recipient labels.
  const trancheIds = (distributions ?? [])
    .filter((d) => d.recipient_type === "investor_tranche" && d.recipient_id)
    .map((d) => d.recipient_id as string)
  const bankIds = (distributions ?? [])
    .filter((d) => d.recipient_type === "bank" && d.recipient_id)
    .map((d) => d.recipient_id as string)

  const [{ data: tranchesData }, { data: banks }] = await Promise.all([
    trancheIds.length
      ? supabase
          .from("investor_tranches")
          .select("id, monto, investor_id")
          .in("id", trancheIds)
      : Promise.resolve({ data: [] as { id: string; monto: number; investor_id: string }[] }),
    bankIds.length
      ? supabase.from("banks").select("id, nombre").in("id", bankIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
  ])
  // For tranches, look up investor names too.
  const investorIds = Array.from(
    new Set((tranchesData ?? []).map((t) => t.investor_id)),
  )
  const { data: investors } = investorIds.length
    ? await supabase
        .from("investors")
        .select("id, nombre")
        .in("id", investorIds)
    : { data: [] as { id: string; nombre: string }[] }
  const investorMap = new Map((investors ?? []).map((i) => [i.id, i.nombre]))
  const trancheLabel = new Map(
    (tranchesData ?? []).map((t) => [
      t.id,
      `${investorMap.get(t.investor_id) ?? "—"} (${formatMXN(Number(t.monto))})`,
    ]),
  )
  const bankLabel = new Map((banks ?? []).map((b) => [b.id, b.nombre]))

  // Destination label.
  let destinationLabel = payment.destination_id.slice(0, 8)
  if (payment.destination_type === "credito") {
    const { data: c } = await supabase
      .from("creditos")
      .select("nombre_proyecto")
      .eq("id", payment.destination_id)
      .single()
    if (c) destinationLabel = c.nombre_proyecto
  } else if (payment.destination_type === "prestamo") {
    const { data: p } = await supabase
      .from("prestamos")
      .select("nombre_persona")
      .eq("id", payment.destination_id)
      .single()
    if (p) destinationLabel = p.nombre_persona
  }

  const distSum = (distributions ?? []).reduce(
    (s, d) => s + Number(d.monto),
    0,
  )
  // Sum of capital+interes from the payment itself (mora + interes + capital ≈ monto_total).
  const expectedDistTotal =
    Number(payment.monto_capital) +
    Number(payment.monto_interes) +
    Number(payment.monto_mora)
  const drift = Math.round((distSum - expectedDistTotal) * 100) / 100

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Pago · {formatMXN(payment.monto_total)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(payment.fecha_pago)} ·{" "}
            <span className="capitalize">{payment.destination_type}</span>{" "}
            <Link
              href={
                payment.destination_type === "credito"
                  ? `/admin/creditos/${payment.destination_id}`
                  : `/admin/prestamos/${payment.destination_id}`
              }
              className="hover:underline"
            >
              {destinationLabel}
            </Link>
          </p>
        </div>
        <Link
          href="/admin/pagos"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          ← Volver
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card size="sm">
          <CardContent className="py-3">
            <div className="text-xs text-muted-foreground">Capital</div>
            <div className="text-lg font-semibold tabular-nums">
              {formatMXN(payment.monto_capital)}
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="py-3">
            <div className="text-xs text-muted-foreground">Interés</div>
            <div className="text-lg font-semibold tabular-nums">
              {formatMXN(payment.monto_interes)}
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="py-3">
            <div className="text-xs text-muted-foreground">Mora</div>
            <div className="text-lg font-semibold tabular-nums">
              {formatMXN(payment.monto_mora)}
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="py-3">
            <div className="text-xs text-muted-foreground">Comprobante</div>
            <ProofLink proofFileId={payment.proof_file_id} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>Distribución</CardTitle>
            {Math.abs(drift) > 0.01 && (
              <Badge variant="destructive">
                Descuadre: {formatMXN(drift)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(!distributions || distributions.length === 0) ? (
            <p className="text-sm text-muted-foreground">
              Sin distribución registrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receptor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right w-[320px]">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {distributions.map((d) => {
                  let recipientLabel = "—"
                  if (d.recipient_type === "investor_tranche" && d.recipient_id) {
                    recipientLabel = trancheLabel.get(d.recipient_id) ?? d.recipient_id.slice(0, 8)
                  } else if (d.recipient_type === "bank" && d.recipient_id) {
                    recipientLabel = bankLabel.get(d.recipient_id) ?? d.recipient_id.slice(0, 8)
                  } else if (d.recipient_type === "orion") {
                    recipientLabel = "Orion Capital"
                  } else if (d.recipient_type === "reserva") {
                    recipientLabel = "Reserva"
                  }
                  return (
                    <TableRow key={d.id}>
                      <TableCell>{recipientLabel}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {recipientLabels[d.recipient_type] ?? d.recipient_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{d.tipo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[260px]">
                        {d.override_reason ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DistributionRowEditor
                          id={d.id}
                          monto={Number(d.monto)}
                          manualOverride={d.manual_override}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
              <tfoot>
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-medium">
                    Total distribuido
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatMXN(distSum)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={4} className="text-right text-xs text-muted-foreground">
                    Esperado (capital + interés + mora)
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                    {formatMXN(expectedDistTotal)}
                  </TableCell>
                </TableRow>
              </tfoot>
            </Table>
          )}
        </CardContent>
      </Card>

      {payment.notas && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{payment.notas}</p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Registrado: {formatDateTime(payment.created_at)}
      </p>
    </div>
  )
}
