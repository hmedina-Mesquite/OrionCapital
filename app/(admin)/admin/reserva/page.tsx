import { createClient } from "@/lib/supabase/server"
import { ReservaForm } from "@/components/admin/reserva-form"
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
import { formatDateTime } from "@/lib/dates"
import { createReservaMov } from "./actions"

export const dynamic = "force-dynamic"

export default async function ReservaPage() {
  const supabase = createClient()
  const { data: movs } = await supabase
    .from("reserva_movements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)

  const saldo = movs && movs.length > 0 ? Number(movs[0].saldo_despues) : 0

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Reserva</h1>
        <p className="text-muted-foreground text-sm">
          Saldo actual: <span className="tabular-nums">{formatMXN(saldo)}</span>
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Aporte / Retiro manual</h2>
        <ReservaForm action={createReservaMov} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Movimientos</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuándo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Saldo después</TableHead>
                <TableHead>Razón</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(movs ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-6"
                  >
                    Sin movimientos.
                  </TableCell>
                </TableRow>
              )}
              {(movs ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{formatDateTime(m.created_at)}</TableCell>
                  <TableCell>{m.tipo}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMXN(m.monto)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMXN(m.saldo_despues)}
                  </TableCell>
                  <TableCell>{m.razon ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
