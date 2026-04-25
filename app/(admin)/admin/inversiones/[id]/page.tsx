import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { InversionForm } from "@/components/admin/inversion-form"
import { MovimientoForm } from "@/components/admin/movimiento-form"
import { DeleteButton } from "@/components/admin/delete-button"
import { ProofLink } from "@/components/admin/proof-link"
import { FundingsSection } from "@/components/admin/fundings-section"
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
import {
  updateInversion,
  deleteInversion,
  createMovimiento,
  deleteMovimiento,
} from "../actions"

export const dynamic = "force-dynamic"

export default async function InversionDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data: inv } = await supabase
    .from("inversiones")
    .select("*")
    .eq("id", params.id)
    .single()
  if (!inv) notFound()

  const { data: movs } = await supabase
    .from("inversion_movimientos")
    .select("*")
    .eq("inversion_id", params.id)
    .order("fecha", { ascending: false })

  const ingreso = (movs ?? [])
    .filter((m) => m.tipo === "ingreso")
    .reduce((s, m) => s + Number(m.monto), 0)
  const gasto = (movs ?? [])
    .filter((m) => m.tipo === "gasto")
    .reduce((s, m) => s + Number(m.monto), 0)

  const updateBound = updateInversion.bind(null, params.id)
  const deleteBound = deleteInversion.bind(null, params.id)
  const createMovBound = createMovimiento.bind(null, params.id)

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{inv.nombre}</h1>
          <p className="text-muted-foreground text-sm">
            Presupuesto {formatMXN(inv.presupuesto)} · Ingresos{" "}
            {formatMXN(ingreso)} · Gastos {formatMXN(gasto)} · Neto{" "}
            {formatMXN(ingreso - gasto)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/inversiones"
            className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm hover:bg-muted"
          >
            Volver
          </Link>
          <DeleteButton
            action={deleteBound}
            title="¿Eliminar inversión?"
            description="Se eliminarán también sus movimientos."
          />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Datos</h2>
        <InversionForm
          action={updateBound}
          defaults={inv}
          submitLabel="Guardar cambios"
        />
      </section>

      <Separator />

      <FundingsSection
        destinationType="inversion"
        destinationId={params.id}
      />

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Movimientos</h2>
        <MovimientoForm action={createMovBound} />

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(movs ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-6"
                  >
                    Sin movimientos.
                  </TableCell>
                </TableRow>
              )}
              {(movs ?? []).map((m) => {
                const deleteMovBound = deleteMovimiento.bind(
                  null,
                  params.id,
                  m.id,
                )
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <span
                        className={
                          m.tipo === "ingreso"
                            ? "text-emerald-600"
                            : "text-destructive"
                        }
                      >
                        {m.tipo}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMXN(m.monto)}
                    </TableCell>
                    <TableCell>{formatDate(m.fecha)}</TableCell>
                    <TableCell>{m.descripcion ?? "—"}</TableCell>
                    <TableCell>
                      <ProofLink proofFileId={m.proof_file_id} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteButton
                        action={deleteMovBound}
                        title="¿Eliminar movimiento?"
                        description="Se eliminará también el proof."
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
