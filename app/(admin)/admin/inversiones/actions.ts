"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { uploadProof, deleteProof } from "@/lib/storage"

const inversionSchema = z.object({
  nombre: z.string().min(1).max(200),
  domicilio_fiscal: z.string().min(1, "Requerido"),
  presupuesto: z.coerce.number().min(0),
  estado: z.enum(["activo", "exitado", "cancelado"]).default("activo"),
  google_drive_folder_url: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : null)),
  detalles: z
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

function readInversion(fd: FormData) {
  return inversionSchema.safeParse({
    nombre: fdString(fd, "nombre"),
    domicilio_fiscal: fdString(fd, "domicilio_fiscal"),
    presupuesto: fdString(fd, "presupuesto"),
    estado: fdString(fd, "estado") || "activo",
    google_drive_folder_url: fdString(fd, "google_drive_folder_url"),
    detalles: fdString(fd, "detalles"),
  })
}

export async function createInversion(
  _: unknown,
  fd: FormData,
): Promise<ActionResult> {
  const parsed = readInversion(fd)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  }
  const supabase = createClient()
  const { data, error } = await supabase
    .from("inversiones")
    .insert(parsed.data)
    .select("id")
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? "Error" }
  revalidatePath("/admin/inversiones")
  redirect(`/admin/inversiones/${data.id}`)
}

export async function updateInversion(
  id: string,
  _: unknown,
  fd: FormData,
): Promise<ActionResult> {
  const parsed = readInversion(fd)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  }
  const supabase = createClient()
  const { error } = await supabase
    .from("inversiones")
    .update(parsed.data)
    .eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/inversiones")
  revalidatePath(`/admin/inversiones/${id}`)
  return { ok: true }
}

export async function deleteInversion(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from("inversiones").delete().eq("id", id)
  revalidatePath("/admin/inversiones")
  redirect("/admin/inversiones")
}

const movimientoSchema = z.object({
  tipo: z.enum(["ingreso", "gasto"]),
  monto: z.coerce.number().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  descripcion: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : null)),
})

export async function createMovimiento(
  inversionId: string,
  _: unknown,
  fd: FormData,
): Promise<ActionResult> {
  const parsed = movimientoSchema.safeParse({
    tipo: fdString(fd, "tipo"),
    monto: fdString(fd, "monto"),
    fecha: fdString(fd, "fecha"),
    descripcion: fdString(fd, "descripcion"),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  }
  const supabase = createClient()

  let proofId: string | null = null
  const file = fd.get("proof") as File | null
  if (file && file.size > 0) {
    const r = await uploadProof(file, "inversion_movimiento")
    if (!r.ok) return { ok: false, error: r.error }
    proofId = r.proofFileId
  }

  const { error } = await supabase.from("inversion_movimientos").insert({
    inversion_id: inversionId,
    tipo: parsed.data.tipo,
    monto: parsed.data.monto,
    fecha: parsed.data.fecha,
    descripcion: parsed.data.descripcion,
    proof_file_id: proofId,
  })
  if (error) {
    if (proofId) await deleteProof(proofId)
    return { ok: false, error: error.message }
  }
  revalidatePath(`/admin/inversiones/${inversionId}`)
  return { ok: true }
}

export async function deleteMovimiento(
  inversionId: string,
  movId: string,
): Promise<void> {
  const supabase = createClient()
  const { data: m } = await supabase
    .from("inversion_movimientos")
    .select("proof_file_id")
    .eq("id", movId)
    .single()
  await supabase.from("inversion_movimientos").delete().eq("id", movId)
  if (m?.proof_file_id) await deleteProof(m.proof_file_id)
  revalidatePath(`/admin/inversiones/${inversionId}`)
}
