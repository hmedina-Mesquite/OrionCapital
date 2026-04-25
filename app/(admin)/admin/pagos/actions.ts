"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { uploadProof, deleteProof } from "@/lib/storage"

const paymentSchema = z.object({
  destination_type: z.enum(["credito", "prestamo"]),
  destination_id: z.string().uuid(),
  fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monto_total: z.coerce.number().positive(),
  notas: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : null)),
})

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string }

function fdString(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === "string" ? v : ""
}

/**
 * Records a payment by calling the `record_payment` Postgres function, which
 * runs the entire flow (mora computation, waterfall, distributions, reserva
 * ledger, parent estado flips) inside one transaction. The JS layer here only
 * uploads the proof, calls the RPC, and rolls the proof back if the RPC fails.
 */
export async function createPayment(
  _: unknown,
  fd: FormData,
): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse({
    destination_type: fdString(fd, "destination_type"),
    destination_id: fdString(fd, "destination_id"),
    fecha_pago: fdString(fd, "fecha_pago"),
    monto_total: fdString(fd, "monto_total"),
    notas: fdString(fd, "notas"),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  }

  // Spec: every payment requires a proof file.
  const file = fd.get("proof") as File | null
  if (!file || file.size === 0) {
    return { ok: false, error: "Comprobante requerido para registrar el pago." }
  }

  const supabase = createClient()
  const upload = await uploadProof(file, "payment")
  if (!upload.ok) return { ok: false, error: upload.error }

  const { data: paymentId, error: rpcErr } = await supabase.rpc(
    "record_payment",
    {
      p_destination_type: parsed.data.destination_type,
      p_destination_id: parsed.data.destination_id,
      p_fecha_pago: parsed.data.fecha_pago,
      p_monto_total: parsed.data.monto_total,
      p_proof_file_id: upload.proofFileId,
      p_notas: parsed.data.notas,
    },
  )
  if (rpcErr || !paymentId) {
    await deleteProof(upload.proofFileId)
    return { ok: false, error: rpcErr?.message ?? "No se pudo registrar el pago" }
  }

  revalidatePath("/admin/pagos")
  revalidatePath(
    parsed.data.destination_type === "credito"
      ? `/admin/creditos/${parsed.data.destination_id}`
      : `/admin/prestamos/${parsed.data.destination_id}`,
  )
  revalidatePath("/admin/reserva")
  revalidatePath("/admin")
  return { ok: true, id: paymentId as string }
}

export async function deletePayment(id: string): Promise<void> {
  const supabase = createClient()
  const { data: payment } = await supabase
    .from("payments")
    .select("proof_file_id, destination_type, destination_id")
    .eq("id", id)
    .single()
  // payment_distributions cascade via FK; reserva_movements have payment_id
  // set null on delete (FK is on delete set null). Schedule estados are NOT
  // automatically reverted — admin must regenerate the schedule if needed.
  await supabase.from("payments").delete().eq("id", id)
  if (payment?.proof_file_id) await deleteProof(payment.proof_file_id)
  revalidatePath("/admin/pagos")
  if (payment?.destination_type && payment?.destination_id) {
    const path =
      payment.destination_type === "credito"
        ? `/admin/creditos/${payment.destination_id}`
        : `/admin/prestamos/${payment.destination_id}`
    revalidatePath(path)
  }
  revalidatePath("/admin/reserva")
}
