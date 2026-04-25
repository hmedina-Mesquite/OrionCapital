import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { BankForm } from "@/components/admin/bank-form"
import { DisposicionForm } from "@/components/admin/disposicion-form"
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
  updateBank,
  deleteBank,
  createDisposicion,
  deleteDisposicion,
} from "../actions"

export const dynamic = "force-dynamic"

export default async function BankDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data: bank } = await supabase
    .from("banks")
    .select("*")
    .eq("id", params.id)
    .single()
  if (!bank) notFound()

  const { data: dispos } = await supabase
    .from("bank_disposiciones")
    .select("*")
    .eq("bank_id", params.id)
    .order("fecha", { ascending: false })

  const total = (dispos ?? []).reduce((s, d) => s + Number(d.monto ?? 0), 0)
  const disponible = Math.max(0, Number(bank.linea_credito) - total)

  const updateBound = updateBank.bind(null, params.id)
  const deleteBound = deleteBank.bind(null, params.id)
  const createDispoBound = createDisposicion.bind(null, params.id)

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{bank.nombre}</h1>
          <p className="text-muted-foreground text-sm">
            Línea {formatMXN(bank.linea_credito)} · Dispuesto{" "}
            {formatMXN(total)} · Disponible {formatMXN(disponible)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/bancos"
            className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm hover:bg-muted"
          >
            Volver
          </Link>
          <DeleteButton
            action={deleteBound}
            title="¿Eliminar banco?"
            description="Se eliminarán también sus disposiciones."
          />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Datos</h2>
        <div className="text-sm text-muted-foreground">
          Contrato actual:{" "}
          <ProofLink proofFileId={bank.contrato_file_id} />
        </div>
        <BankForm
          action={updateBound}
          defaults={bank}
          submitLabel="Guardar cambios"
        />
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-medium">Disposiciones</h2>
        <DisposicionForm action={createDispoBound} />

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(dispos ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-6"
                  >
                    Aún no hay disposiciones.
                  </TableCell>
                </TableRow>
              )}
              {(dispos ?? []).map((d) => {
                const deleteDispoBound = deleteDisposicion.bind(
                  null,
                  params.id,
                  d.id,
                )
                return (
                  <TableRow key={d.id}>
                    <TableCell className="text-right tabular-nums">
                      {formatMXN(d.monto)}
                    </TableCell>
                    <TableCell>{formatDate(d.fecha)}</TableCell>
                    <TableCell>{d.descripcion ?? "—"}</TableCell>
                    <TableCell>
                      <ProofLink proofFileId={d.proof_file_id} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteButton
                        action={deleteDispoBound}
                        title="¿Eliminar disposición?"
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
