import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMXN } from "@/lib/money"
import { formatDate, formatDateTime } from "@/lib/dates"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

const estadoLabels: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
}

export default async function DeudorHistorial() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: pendings } = await supabase
    .from("pending_payments")
    .select(
      "id, destination_type, destination_id, monto_total, fecha_pago, estado, submitted_at, reviewed_at, rejection_reason, notas",
    )
    .eq("submitted_by", user.id)
    .order("submitted_at", { ascending: false })

  const { data: payments } = await supabase
    .from("payments")
    .select("id, destination_type, destination_id, monto_total, fecha_pago, monto_capital, monto_interes, monto_mora, notas")
    .order("fecha_pago", { ascending: false })

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Historial</h1>
        <Link
          href="/deudor/pagar"
          className={buttonVariants({ size: "sm" })}
        >
          Nuevo comprobante
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comprobantes enviados</CardTitle>
        </CardHeader>
        <CardContent>
          {(!pendings || pendings.length === 0) ? (
            <p className="text-sm text-muted-foreground">Aún no envías comprobantes.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enviado</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Fecha pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendings.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(p.submitted_at)}
                    </TableCell>
                    <TableCell className="capitalize">{p.destination_type}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMXN(p.monto_total)}
                    </TableCell>
                    <TableCell>{formatDate(p.fecha_pago)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.estado === "approved"
                            ? "default"
                            : p.estado === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {estadoLabels[p.estado] ?? p.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.estado === "rejected" && p.rejection_reason
                        ? `Rechazado: ${p.rejection_reason}`
                        : p.notas ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pagos registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {(!payments || payments.length === 0) ? (
            <p className="text-sm text-muted-foreground">No hay pagos registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead className="text-right">Capital</TableHead>
                  <TableHead className="text-right">Interés</TableHead>
                  <TableHead className="text-right">Mora</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.fecha_pago)}</TableCell>
                    <TableCell className="capitalize">{p.destination_type}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMXN(p.monto_capital)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMXN(p.monto_interes)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMXN(p.monto_mora)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatMXN(p.monto_total)}
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
