import { createClient } from "@/lib/supabase/server"
import { PaymentForm } from "@/components/admin/payment-form"
import { DeleteButton } from "@/components/admin/delete-button"
import { ProofLink } from "@/components/admin/proof-link"
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
import { formatDate } from "@/lib/dates"
import { createPayment, deletePayment } from "./actions"

export const dynamic = "force-dynamic"

export default async function PagosPage() {
  const supabase = createClient()
  const [{ data: payments }, { data: creditos }, { data: prestamos }] =
    await Promise.all([
      supabase
        .from("payments")
        .select("*")
        .order("fecha_pago", { ascending: false })
        .limit(100),
      supabase
        .from("creditos")
        .select("id, nombre_proyecto")
        .order("nombre_proyecto"),
      supabase
        .from("prestamos")
        .select("id, nombre_persona")
        .order("nombre_persona"),
    ])

  const creditoMap = new Map((creditos ?? []).map((c) => [c.id, c.nombre_proyecto]))
  const prestamoMap = new Map(
    (prestamos ?? []).map((p) => [p.id, p.nombre_persona]),
  )

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Pagos</h1>
        <p className="text-muted-foreground text-sm">
          Registro de pagos recibidos. La distribución usa cascada
          mora→interés→capital sobre las cuotas pendientes.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Registrar pago</h2>
        <PaymentForm
          action={createPayment}
          creditos={(creditos ?? []).map((c) => ({
            id: c.id,
            label: c.nombre_proyecto,
          }))}
          prestamos={(prestamos ?? []).map((p) => ({
            id: p.id,
            label: p.nombre_persona,
          }))}
        />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Últimos 100</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Capital</TableHead>
                <TableHead className="text-right">Interés</TableHead>
                <TableHead className="text-right">Mora</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(payments ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-6"
                  >
                    Sin pagos.
                  </TableCell>
                </TableRow>
              )}
              {(payments ?? []).map((p) => {
                const dest =
                  p.destination_type === "credito"
                    ? creditoMap.get(p.destination_id) ?? p.destination_id
                    : p.destination_type === "prestamo"
                      ? prestamoMap.get(p.destination_id) ?? p.destination_id
                      : p.destination_id
                const deleteBound = deletePayment.bind(null, p.id)
                return (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.fecha_pago)}</TableCell>
                    <TableCell>{p.destination_type}</TableCell>
                    <TableCell>{dest}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMXN(p.monto_total)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMXN(p.monto_capital)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMXN(p.monto_interes)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMXN(p.monto_mora)}
                    </TableCell>
                    <TableCell>
                      <ProofLink proofFileId={p.proof_file_id} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteButton
                        action={deleteBound}
                        title="¿Eliminar pago?"
                        description="No revierte el estado de las cuotas pagadas; ajusta manualmente si es necesario."
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
