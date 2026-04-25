import { createClient } from "@/lib/supabase/server"
import { FundingForm } from "@/components/admin/funding-form"
import { DeleteButton } from "@/components/admin/delete-button"
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
import {
  createFunding,
  deleteFunding,
} from "@/app/(admin)/admin/_lib/funding-actions"
import type { Database } from "@/types/database"

type DestinationType = Database["public"]["Enums"]["destination_type"]

export async function FundingsSection({
  destinationType,
  destinationId,
}: {
  destinationType: DestinationType
  destinationId: string
}) {
  const supabase = createClient()
  const [{ data: fundings }, { data: tranches }, { data: dispos }] =
    await Promise.all([
      supabase
        .from("fundings")
        .select("*")
        .eq("destination_type", destinationType)
        .eq("destination_id", destinationId)
        .order("fecha", { ascending: false }),
      supabase
        .from("investor_tranches")
        .select("id, monto, fecha_inicio, investor_id"),
      supabase
        .from("bank_disposiciones")
        .select("id, monto, fecha, bank_id, descripcion"),
    ])

  const [{ data: investors }, { data: banks }] = await Promise.all([
    supabase.from("investors").select("id, nombre"),
    supabase.from("banks").select("id, nombre"),
  ])
  const investorName = new Map((investors ?? []).map((i) => [i.id, i.nombre]))
  const bankName = new Map((banks ?? []).map((b) => [b.id, b.nombre]))

  const trancheOpts = (tranches ?? []).map((t) => ({
    id: t.id,
    label: `${investorName.get(t.investor_id) ?? t.investor_id} · ${formatMXN(t.monto)} · ${formatDate(t.fecha_inicio)}`,
  }))
  const dispoOpts = (dispos ?? []).map((d) => ({
    id: d.id,
    label: `${bankName.get(d.bank_id) ?? d.bank_id} · ${formatMXN(d.monto)} · ${formatDate(d.fecha)}`,
  }))

  const trancheById = new Map((tranches ?? []).map((t) => [t.id, t]))
  const dispoById = new Map((dispos ?? []).map((d) => [d.id, d]))

  const createBound = createFunding.bind(null, destinationType, destinationId)
  const totalAportado = (fundings ?? []).reduce(
    (s, f) => s + Number(f.monto),
    0,
  )

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Fondeo</h2>
        <span className="text-sm text-muted-foreground">
          Total aportado: {formatMXN(totalAportado)}
        </span>
      </div>

      <FundingForm
        action={createBound}
        tranches={trancheOpts}
        disposiciones={dispoOpts}
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fuente</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(fundings ?? []).length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-6"
                >
                  Sin fuentes vinculadas.
                </TableCell>
              </TableRow>
            )}
            {(fundings ?? []).map((f) => {
              let label = f.source_id
              if (f.source_type === "investor_tranche") {
                const t = trancheById.get(f.source_id)
                if (t) label = investorName.get(t.investor_id) ?? f.source_id
              } else if (f.source_type === "bank_disposicion") {
                const d = dispoById.get(f.source_id)
                if (d) label = bankName.get(d.bank_id) ?? f.source_id
              }
              const deleteBound = deleteFunding.bind(
                null,
                destinationType,
                destinationId,
                f.id,
              )
              return (
                <TableRow key={f.id}>
                  <TableCell>{formatDate(f.fecha)}</TableCell>
                  <TableCell>{f.source_type}</TableCell>
                  <TableCell>{label}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMXN(f.monto)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DeleteButton
                      action={deleteBound}
                      title="¿Eliminar fondeo?"
                      description="No se puede deshacer."
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
