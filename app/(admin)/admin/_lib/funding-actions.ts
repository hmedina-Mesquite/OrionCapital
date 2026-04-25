"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { formatMXN } from "@/lib/money"
import type { Database } from "@/types/database"

type DestinationType = Database["public"]["Enums"]["destination_type"]
type SourceType = Database["public"]["Enums"]["source_type"]

const fundingSchema = z.object({
  source_type: z.enum(["investor_tranche", "bank_disposicion"]),
  source_id: z.string().uuid(),
  monto: z.coerce.number().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string }

function fdString(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === "string" ? v : ""
}

/** Look up the budget cap for a destination. Returns null if not found. */
async function getDestinationBudget(
  supabase: ReturnType<typeof createClient>,
  type: DestinationType,
  id: string,
): Promise<number | null> {
  if (type === "inversion") {
    const { data } = await supabase
      .from("inversiones")
      .select("presupuesto")
      .eq("id", id)
      .single()
    return data ? Number(data.presupuesto) : null
  }
  if (type === "credito") {
    const { data } = await supabase
      .from("creditos")
      .select("presupuesto")
      .eq("id", id)
      .single()
    return data ? Number(data.presupuesto) : null
  }
  const { data } = await supabase
    .from("prestamos")
    .select("cantidad")
    .eq("id", id)
    .single()
  return data ? Number(data.cantidad) : null
}

/** How much of the source's principal is still uncommitted. Returns null if source not found. */
async function getSourceRemaining(
  supabase: ReturnType<typeof createClient>,
  type: SourceType,
  id: string,
): Promise<number | null> {
  if (type === "investor_tranche") {
    const { data: t } = await supabase
      .from("investor_tranches")
      .select("monto")
      .eq("id", id)
      .single()
    if (!t) return null
    const { data: f } = await supabase
      .from("fundings")
      .select("monto")
      .eq("source_type", "investor_tranche")
      .eq("source_id", id)
    const used = (f ?? []).reduce((s, x) => s + Number(x.monto), 0)
    return Number(t.monto) - used
  }
  const { data: d } = await supabase
    .from("bank_disposiciones")
    .select("monto")
    .eq("id", id)
    .single()
  if (!d) return null
  const { data: f } = await supabase
    .from("fundings")
    .select("monto")
    .eq("source_type", "bank_disposicion")
    .eq("source_id", id)
  const used = (f ?? []).reduce((s, x) => s + Number(x.monto), 0)
  return Number(d.monto) - used
}

export async function createFunding(
  destinationType: DestinationType,
  destinationId: string,
  _: unknown,
  fd: FormData,
): Promise<ActionResult> {
  const parsed = fundingSchema.safeParse({
    source_type: fdString(fd, "source_type"),
    source_id: fdString(fd, "source_id"),
    monto: fdString(fd, "monto"),
    fecha: fdString(fd, "fecha"),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  }
  const supabase = createClient()

  // Block over-funding the destination.
  const budget = await getDestinationBudget(supabase, destinationType, destinationId)
  if (budget == null) {
    return { ok: false, error: "Destino no encontrado" }
  }
  const { data: existing } = await supabase
    .from("fundings")
    .select("monto")
    .eq("destination_type", destinationType)
    .eq("destination_id", destinationId)
  const existingSum = (existing ?? []).reduce((s, f) => s + Number(f.monto), 0)
  if (existingSum + parsed.data.monto > budget + 0.01) {
    return {
      ok: false,
      error: `Excede el presupuesto (${formatMXN(budget)}). Ya cubierto: ${formatMXN(existingSum)}.`,
    }
  }

  // Block over-committing the source.
  const remaining = await getSourceRemaining(
    supabase,
    parsed.data.source_type,
    parsed.data.source_id,
  )
  if (remaining == null) {
    return { ok: false, error: "Fuente no encontrada" }
  }
  if (parsed.data.monto > remaining + 0.01) {
    return {
      ok: false,
      error: `La fuente solo tiene disponible ${formatMXN(remaining)}.`,
    }
  }

  const porcentaje = budget > 0 ? Number((parsed.data.monto / budget).toFixed(4)) : null

  const { error } = await supabase.from("fundings").insert({
    source_type: parsed.data.source_type,
    source_id: parsed.data.source_id,
    destination_type: destinationType,
    destination_id: destinationId,
    monto: parsed.data.monto,
    porcentaje,
    fecha: parsed.data.fecha,
  })
  if (error) return { ok: false, error: error.message }

  const path =
    destinationType === "inversion"
      ? `/admin/inversiones/${destinationId}`
      : destinationType === "credito"
        ? `/admin/creditos/${destinationId}`
        : `/admin/prestamos/${destinationId}`
  revalidatePath(path)
  return { ok: true }
}

export async function deleteFunding(
  destinationType: DestinationType,
  destinationId: string,
  fundingId: string,
): Promise<void> {
  const supabase = createClient()
  await supabase.from("fundings").delete().eq("id", fundingId)
  const path =
    destinationType === "inversion"
      ? `/admin/inversiones/${destinationId}`
      : destinationType === "credito"
        ? `/admin/creditos/${destinationId}`
        : `/admin/prestamos/${destinationId}`
  revalidatePath(path)
}

/** Sweep job. Marks every overdue cuota as `vencida`, then flips the parent
 *  credito/prestamo estado to `en_mora` if it has any vencida row. Idempotent. */
export async function markPastDue(): Promise<{ ok: true; count: number }> {
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: marked } = await supabase
    .from("amortization_schedule")
    .update({ estado: "vencida" })
    .lt("fecha_vencimiento", today)
    .eq("estado", "pendiente")
    .select("destination_type, destination_id")

  // Collect distinct (type, id) pairs that now have at least one vencida row.
  // (Some rows may already have been vencida from a prior sweep; we still want
  // to force-flip the parent estado in case it was reverted.)
  const { data: stillVencida } = await supabase
    .from("amortization_schedule")
    .select("destination_type, destination_id")
    .eq("estado", "vencida")
  const pairs = new Map<string, { type: "credito" | "prestamo"; id: string }>()
  for (const r of stillVencida ?? []) {
    if (r.destination_type === "credito" || r.destination_type === "prestamo") {
      pairs.set(`${r.destination_type}:${r.destination_id}`, {
        type: r.destination_type,
        id: r.destination_id,
      })
    }
  }
  for (const { type, id } of Array.from(pairs.values())) {
    if (type === "credito") {
      await supabase
        .from("creditos")
        .update({ estado: "en_mora" })
        .eq("id", id)
        .in("estado", ["activo", "pre_aprobado"])
    } else {
      await supabase
        .from("prestamos")
        .update({ estado: "en_mora" })
        .eq("id", id)
        .in("estado", ["activo", "pre_aprobado"])
    }
  }

  return { ok: true, count: marked?.length ?? 0 }
}
