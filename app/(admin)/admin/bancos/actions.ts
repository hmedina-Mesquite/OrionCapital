"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { uploadProof, deleteProof } from "@/lib/storage"

const bankSchema = z.object({
  nombre: z.string().min(1, "Requerido").max(200),
  tipo_credito: z.enum(["simple", "revolvente"]),
  numero_cuenta: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : null)),
  tasa_anual: z.coerce.number().min(0).max(1, "Tasa entre 0 y 1 (decimal)"),
  plazo_meses: z.coerce.number().int().positive(),
  linea_credito: z.coerce.number().min(0),
  comision_apertura: z.coerce.number().min(0).default(0),
  seguro_mensual: z.coerce.number().min(0).default(0),
  fecha_apertura: z
    .string()
    .optional()
    .transform((s) =>
      s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null,
    ),
  estado: z.enum(["activo", "completado", "cancelado"]).default("activo"),
})

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string }

function fdString(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === "string" ? v : ""
}

function readBank(fd: FormData) {
  return bankSchema.safeParse({
    nombre: fdString(fd, "nombre"),
    tipo_credito: fdString(fd, "tipo_credito"),
    numero_cuenta: fdString(fd, "numero_cuenta"),
    tasa_anual: fdString(fd, "tasa_anual"),
    plazo_meses: fdString(fd, "plazo_meses"),
    linea_credito: fdString(fd, "linea_credito"),
    comision_apertura: fdString(fd, "comision_apertura") || "0",
    seguro_mensual: fdString(fd, "seguro_mensual") || "0",
    fecha_apertura: fdString(fd, "fecha_apertura"),
    estado: fdString(fd, "estado") || "activo",
  })
}

export async function createBank(_: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = readBank(fd)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  }
  const supabase = createClient()

  let contratoId: string | null = null
  const file = fd.get("contrato") as File | null
  if (file && file.size > 0) {
    const r = await uploadProof(file, "bank_contrato")
    if (!r.ok) return { ok: false, error: r.error }
    contratoId = r.proofFileId
  }

  const { data, error } = await supabase
    .from("banks")
    .insert({ ...parsed.data, contrato_file_id: contratoId })
    .select("id")
    .single()
  if (error || !data) {
    if (contratoId) await deleteProof(contratoId)
    return { ok: false, error: error?.message ?? "Error" }
  }
  revalidatePath("/admin/bancos")
  redirect(`/admin/bancos/${data.id}`)
}

export async function updateBank(
  id: string,
  _: unknown,
  fd: FormData,
): Promise<ActionResult> {
  const parsed = readBank(fd)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  }
  const supabase = createClient()

  let contratoId: string | null | undefined = undefined
  const file = fd.get("contrato") as File | null
  if (file && file.size > 0) {
    // Replace existing contrato.
    const { data: existing } = await supabase
      .from("banks")
      .select("contrato_file_id")
      .eq("id", id)
      .single()
    const r = await uploadProof(file, "bank_contrato")
    if (!r.ok) return { ok: false, error: r.error }
    contratoId = r.proofFileId
    if (existing?.contrato_file_id) {
      await deleteProof(existing.contrato_file_id)
    }
  }

  const update = {
    ...parsed.data,
    ...(contratoId !== undefined ? { contrato_file_id: contratoId } : {}),
  }

  const { error } = await supabase.from("banks").update(update).eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/bancos")
  revalidatePath(`/admin/bancos/${id}`)
  return { ok: true }
}

export async function deleteBank(id: string): Promise<void> {
  const supabase = createClient()
  const { data: b } = await supabase
    .from("banks")
    .select("contrato_file_id")
    .eq("id", id)
    .single()
  await supabase.from("banks").delete().eq("id", id)
  if (b?.contrato_file_id) await deleteProof(b.contrato_file_id)
  revalidatePath("/admin/bancos")
  redirect("/admin/bancos")
}

const dispoSchema = z.object({
  monto: z.coerce.number().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  descripcion: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : null)),
})

export async function createDisposicion(
  bankId: string,
  _: unknown,
  fd: FormData,
): Promise<ActionResult> {
  const parsed = dispoSchema.safeParse({
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
    const r = await uploadProof(file, "bank_disposicion")
    if (!r.ok) return { ok: false, error: r.error }
    proofId = r.proofFileId
  }

  const { error } = await supabase.from("bank_disposiciones").insert({
    bank_id: bankId,
    monto: parsed.data.monto,
    fecha: parsed.data.fecha,
    descripcion: parsed.data.descripcion,
    proof_file_id: proofId,
  })
  if (error) {
    if (proofId) await deleteProof(proofId)
    return { ok: false, error: error.message }
  }
  revalidatePath(`/admin/bancos/${bankId}`)
  return { ok: true }
}

export async function deleteDisposicion(
  bankId: string,
  dispoId: string,
): Promise<void> {
  const supabase = createClient()
  const { data: d } = await supabase
    .from("bank_disposiciones")
    .select("proof_file_id")
    .eq("id", dispoId)
    .single()
  await supabase.from("bank_disposiciones").delete().eq("id", dispoId)
  if (d?.proof_file_id) await deleteProof(d.proof_file_id)
  revalidatePath(`/admin/bancos/${bankId}`)
}
