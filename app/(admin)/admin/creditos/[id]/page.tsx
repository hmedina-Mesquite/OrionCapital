import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { CreditoForm } from "@/components/admin/credito-form"
import { DeleteButton } from "@/components/admin/delete-button"
import { ProofLink } from "@/components/admin/proof-link"
import { ScheduleSection } from "@/components/admin/schedule-section"
import { FundingsSection } from "@/components/admin/fundings-section"
import { Separator } from "@/components/ui/separator"
import { formatMXN } from "@/lib/money"
import { updateCredito, deleteCredito } from "../actions"
import { regenerateSchedule } from "../../_lib/schedule-actions"

export const dynamic = "force-dynamic"

export default async function CreditoDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data: c } = await supabase
    .from("creditos")
    .select("*")
    .eq("id", params.id)
    .single()
  if (!c) notFound()

  let debtor_email: string | null = null
  if (c.profile_id) {
    const { data: p } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", c.profile_id)
      .single()
    debtor_email = p?.email ?? null
  }

  const updateBound = updateCredito.bind(null, params.id)
  const deleteBound = deleteCredito.bind(null, params.id)
  const generateBound = regenerateSchedule.bind(null, "credito", params.id)

  const { data: schedule } = await supabase
    .from("amortization_schedule")
    .select("*")
    .eq("destination_type", "credito")
    .eq("destination_id", params.id)
    .order("numero_cuota", { ascending: true })

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{c.nombre_proyecto}</h1>
          <p className="text-muted-foreground text-sm">
            Presupuesto {formatMXN(c.presupuesto)} ·{" "}
            {(Number(c.tasa_anual) * 100).toFixed(2)}% · {c.plazo_meses} meses ·{" "}
            {c.estado}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/creditos"
            className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm hover:bg-muted"
          >
            Volver
          </Link>
          <DeleteButton
            action={deleteBound}
            title="¿Eliminar crédito?"
            description="Se eliminará también su contrato."
          />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Datos</h2>
        <div className="text-sm text-muted-foreground">
          Contrato actual:{" "}
          <ProofLink proofFileId={c.contrato_file_id} />
        </div>
        <CreditoForm
          action={updateBound}
          defaults={{ ...c, debtor_email }}
          submitLabel="Guardar cambios"
        />
      </section>

      <Separator />

      <FundingsSection destinationType="credito" destinationId={params.id} />

      <Separator />

      <ScheduleSection rows={schedule ?? []} generate={generateBound} />
    </div>
  )
}
