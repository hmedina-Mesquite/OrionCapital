import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PrestamoForm } from "@/components/admin/prestamo-form"
import { DeleteButton } from "@/components/admin/delete-button"
import { ProofLink } from "@/components/admin/proof-link"
import { ScheduleSection } from "@/components/admin/schedule-section"
import { FundingsSection } from "@/components/admin/fundings-section"
import { Separator } from "@/components/ui/separator"
import { formatMXN } from "@/lib/money"
import { updatePrestamo, deletePrestamo } from "../actions"
import { regenerateSchedule } from "../../_lib/schedule-actions"

export const dynamic = "force-dynamic"

export default async function PrestamoDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data: p } = await supabase
    .from("prestamos")
    .select("*")
    .eq("id", params.id)
    .single()
  if (!p) notFound()

  let debtor_email: string | null = null
  if (p.profile_id) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", p.profile_id)
      .single()
    debtor_email = prof?.email ?? null
  }

  const updateBound = updatePrestamo.bind(null, params.id)
  const deleteBound = deletePrestamo.bind(null, params.id)
  const generateBound = regenerateSchedule.bind(null, "prestamo", params.id)

  const { data: schedule } = await supabase
    .from("amortization_schedule")
    .select("*")
    .eq("destination_type", "prestamo")
    .eq("destination_id", params.id)
    .order("numero_cuota", { ascending: true })

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{p.nombre_persona}</h1>
          <p className="text-muted-foreground text-sm">
            {formatMXN(p.cantidad)} · {(Number(p.tasa_anual) * 100).toFixed(2)}%
            · {p.plazo_meses} meses · {p.estado}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/prestamos"
            className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm hover:bg-muted"
          >
            Volver
          </Link>
          <DeleteButton
            action={deleteBound}
            title="¿Eliminar préstamo?"
            description="Se eliminará también su contrato."
          />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Datos</h2>
        <div className="text-sm text-muted-foreground">
          Contrato actual:{" "}
          <ProofLink proofFileId={p.contrato_file_id} />
        </div>
        <PrestamoForm
          action={updateBound}
          defaults={{ ...p, debtor_email }}
          submitLabel="Guardar cambios"
        />
      </section>

      <Separator />

      <FundingsSection destinationType="prestamo" destinationId={params.id} />

      <Separator />

      <ScheduleSection rows={schedule ?? []} generate={generateBound} />
    </div>
  )
}
