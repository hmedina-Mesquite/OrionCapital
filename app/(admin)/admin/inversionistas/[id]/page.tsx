import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { InvestorForm } from "@/components/admin/investor-form"
import { TrancheForm } from "@/components/admin/tranche-form"
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
import {
  updateInvestor,
  deleteInvestor,
  createTranche,
  deleteTranche,
} from "../actions"

export const dynamic = "force-dynamic"

export default async function InvestorDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data: inv } = await supabase
    .from("investors")
    .select("*")
    .eq("id", params.id)
    .single()
  if (!inv) notFound()

  const { data: tranches } = await supabase
    .from("investor_tranches")
    .select("*")
    .eq("investor_id", params.id)
    .order("fecha_inicio", { ascending: false })

  const updateBound = updateInvestor.bind(null, params.id)
  const deleteBound = deleteInvestor.bind(null, params.id)
  const createTrancheBound = createTranche.bind(null, params.id)

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{inv.nombre}</h1>
          <p className="text-muted-foreground text-sm">RFC {inv.rfc}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/inversionistas"
            className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm hover:bg-muted"
          >
            Volver
          </Link>
          <DeleteButton
            action={deleteBound}
            title="¿Eliminar inversionista?"
            description="Se eliminarán también sus tranches."
          />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Datos</h2>
        <InvestorForm
          action={updateBound}
          defaults={inv}
          submitLabel="Guardar cambios"
        />
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Tranches</h2>
        <TrancheForm action={createTrancheBound} />

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
                <TableHead>Proof</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tranches ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-6"
                  >
                    Aún no hay tranches.
                  </TableCell>
                </TableRow>
              )}
              {(tranches ?? []).map((t) => {
                const deleteTrancheBound = deleteTranche.bind(
                  null,
                  params.id,
                  t.id,
                )
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-right tabular-nums">
                      {formatMXN(t.monto)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(Number(t.tasa_anual) * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {t.plazo_meses} m
                    </TableCell>
                    <TableCell>{formatDate(t.fecha_inicio)}</TableCell>
                    <TableCell>{formatDate(t.fecha_vencimiento)}</TableCell>
                    <TableCell>{t.estado}</TableCell>
                    <TableCell>
                      <ProofLink proofFileId={t.proof_file_id} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteButton
                        action={deleteTrancheBound}
                        title="¿Eliminar tranche?"
                        description="Se eliminará también el archivo proof."
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
