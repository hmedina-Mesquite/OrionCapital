"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import {
  uploadPendingPaymentProof,
  removeStorageObject,
} from "@/lib/storage"

const submitSchema = z.object({
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

export async function submitPendingPayment(
  _: unknown,
  fd: FormData,
): Promise<ActionResult> {
  const parsed = submitSchema.safeParse({
    destination_type: fdString(fd, "destination_type"),
    destination_id: fdString(fd, "destination_id"),
    fecha_pago: fdString(fd, "fecha_pago"),
    monto_total: fdString(fd, "monto_total"),
    notas: fdString(fd, "notas"),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  }

  const file = fd.get("proof") as File | null
  if (!file || file.size === 0) {
    return { ok: false, error: "Comprobante requerido" }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const upload = await uploadPendingPaymentProof(file)
  if (!upload.ok) return { ok: false, error: upload.error }

  const { data, error } = await supabase
    .from("pending_payments")
    .insert({
      destination_type: parsed.data.destination_type,
      destination_id: parsed.data.destination_id,
      monto_total: parsed.data.monto_total,
      fecha_pago: parsed.data.fecha_pago,
      notas: parsed.data.notas,
      proof_storage_path: upload.storagePath,
      proof_file_name: upload.fileName,
      proof_mime_type: upload.mimeType,
      proof_size_bytes: upload.sizeBytes,
      submitted_by: user.id,
    })
    .select("id")
    .single()
  if (error || !data) {
    // Best-effort cleanup if the row insert is rejected by RLS or constraints.
    await removeStorageObject(upload.storagePath)
    return { ok: false, error: error?.message ?? "No se pudo enviar" }
  }

  revalidatePath("/deudor/historial")
  revalidatePath("/admin/pagos/pendientes")
  return { ok: true, id: data.id }
}
