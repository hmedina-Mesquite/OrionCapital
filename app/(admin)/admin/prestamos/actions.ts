"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { uploadProof, deleteProof } from "@/lib/storage"
import { regenerateSchedule } from "@/app/(admin)/admin/_lib/schedule-actions"

const prestamoSchema = z.object({
  nombre_persona: z.string().min(1).max(200),
  cantidad: z.coerce.number().min(0),
  tasa_anual: z.coerce.number().min(0).max(1, "Tasa entre 0 y 1 (decimal)"),
  plazo_meses: z.coerce.number().int().positive(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  tasa_mora_multiplicador: z.coerce.number().min(1).default(1.5),
  estado: z
    .enum(["pre_aprobado", "activo", "en_mora", "completado", "cancelado"])
    .default("pre_aprobado"),
  rfc: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() ? s.trim().toUpperCase() : null)),
  domicilio_fiscal: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : null)),
  email: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : null)),
  telefono: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : null)),
  google_drive_folder_url: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : null)),
  detalles: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : null)),
  debtor_email: z
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

function readPrestamo(fd: FormData) {
  return prestamoSchema.safeParse({
    nombre_persona: fdString(fd, "nombre_persona"),
    cantidad: fdString(fd, "cantidad"),
    tasa_anual: fdString(fd, "tasa_anual"),
    plazo_meses: fdString(fd, "plazo_meses"),
    fecha_inicio: fdString(fd, "fecha_inicio"),
    tasa_mora_multiplicador: fdString(fd, "tasa_mora_multiplicador") || "1.5",
    estado: fdString(fd, "estado") || "pre_aprobado",
    rfc: fdString(fd, "rfc"),
    domicilio_fiscal: fdString(fd, "domicilio_fiscal"),
    email: fdString(fd, "email"),
    telefono: fdString(fd, "telefono"),
    google_drive_folder_url: fdString(fd, "google_drive_folder_url"),
    detalles: fdString(fd, "detalles"),
    debtor_email: fdString(fd, "debtor_email"),
  })
}

async function resolveDebtorProfileId(
  supabase: ReturnType<typeof createClient>,
  email: string | null,
): Promise<string | null> {
  if (!email) return null
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle()
  return data?.id ?? null
}

export async function createPrestamo(
  _: unknown,
  fd: FormData,
): Promise<ActionResult> {
  const parsed = readPrestamo(fd)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  }
  const supabase = createClient()
  const { debtor_email, ...rest } = parsed.data
  const profile_id = await resolveDebtorProfileId(supabase, debtor_email)

  let contratoId: string | null = null
  const file = fd.get("contrato") as File | null
  if (file && file.size > 0) {
    const r = await uploadProof(file, "prestamo_contrato")
    if (!r.ok) return { ok: false, error: r.error }
    contratoId = r.proofFileId
  }

  const { data, error } = await supabase
    .from("prestamos")
    .insert({ ...rest, profile_id, contrato_file_id: contratoId })
    .select("id")
    .single()
  if (error || !data) {
    if (contratoId) await deleteProof(contratoId)
    return { ok: false, error: error?.message ?? "Error" }
  }

  // Auto-generate amortization schedule on create.
  await regenerateSchedule("prestamo", data.id)

  revalidatePath("/admin/prestamos")
  redirect(`/admin/prestamos/${data.id}`)
}

export async function updatePrestamo(
  id: string,
  _: unknown,
  fd: FormData,
): Promise<ActionResult> {
  const parsed = readPrestamo(fd)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  }
  const supabase = createClient()
  const { debtor_email, ...rest } = parsed.data
  const profile_id = await resolveDebtorProfileId(supabase, debtor_email)

  let contratoId: string | null | undefined = undefined
  const file = fd.get("contrato") as File | null
  if (file && file.size > 0) {
    const { data: existing } = await supabase
      .from("prestamos")
      .select("contrato_file_id")
      .eq("id", id)
      .single()
    const r = await uploadProof(file, "prestamo_contrato")
    if (!r.ok) return { ok: false, error: r.error }
    contratoId = r.proofFileId
    if (existing?.contrato_file_id) await deleteProof(existing.contrato_file_id)
  }

  const update = {
    ...rest,
    profile_id,
    ...(contratoId !== undefined ? { contrato_file_id: contratoId } : {}),
  }
  const { error } = await supabase.from("prestamos").update(update).eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/prestamos")
  revalidatePath(`/admin/prestamos/${id}`)
  return { ok: true }
}

export async function deletePrestamo(id: string): Promise<void> {
  const supabase = createClient()
  const { data: p } = await supabase
    .from("prestamos")
    .select("contrato_file_id")
    .eq("id", id)
    .single()
  await supabase.from("prestamos").delete().eq("id", id)
  if (p?.contrato_file_id) await deleteProof(p.contrato_file_id)
  revalidatePath("/admin/prestamos")
  redirect("/admin/prestamos")
}
