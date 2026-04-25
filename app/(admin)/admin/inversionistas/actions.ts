"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { isValidRFC, isValidCLABE } from "@/lib/validators"
import { uploadProof, deleteProof } from "@/lib/storage"
import { addMonthsISO } from "@/lib/dates"

const investorSchema = z.object({
  nombre: z.string().min(1, "Requerido").max(200),
  rfc: z
    .string()
    .min(1, "Requerido")
    .transform((s) => s.toUpperCase().trim())
    .refine(isValidRFC, "RFC inválido"),
  cuenta_bancaria: z
    .string()
    .optional()
    .transform((s) => (s ? s.replace(/\s/g, "") : ""))
    .refine((s) => s === "" || isValidCLABE(s), "CLABE inválida")
    .transform((s) => (s === "" ? null : s)),
  email: z
    .string()
    .optional()
    .transform((s) => (s ? s.trim() : ""))
    .refine((s) => s === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), "Correo inválido")
    .transform((s) => (s === "" ? null : s)),
  telefono: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : null)),
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

export async function createInvestor(_: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = investorSchema.safeParse({
    nombre: fdString(fd, "nombre"),
    rfc: fdString(fd, "rfc"),
    cuenta_bancaria: fdString(fd, "cuenta_bancaria"),
    email: fdString(fd, "email"),
    telefono: fdString(fd, "telefono"),
    notas: fdString(fd, "notas"),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  }
  const supabase = createClient()
  const { data, error } = await supabase
    .from("investors")
    .insert(parsed.data)
    .select("id")
    .single()
  if (error || !data) return { ok: false, error: error?.message ?? "Error" }
  revalidatePath("/admin/inversionistas")
  redirect(`/admin/inversionistas/${data.id}`)
}

export async function updateInvestor(id: string, _: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = investorSchema.safeParse({
    nombre: fdString(fd, "nombre"),
    rfc: fdString(fd, "rfc"),
    cuenta_bancaria: fdString(fd, "cuenta_bancaria"),
    email: fdString(fd, "email"),
    telefono: fdString(fd, "telefono"),
    notas: fdString(fd, "notas"),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  }
  const supabase = createClient()
  const { error } = await supabase
    .from("investors")
    .update(parsed.data)
    .eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/inversionistas")
  revalidatePath(`/admin/inversionistas/${id}`)
  return { ok: true }
}

export async function deleteInvestor(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.from("investors").delete().eq("id", id)
  revalidatePath("/admin/inversionistas")
  redirect("/admin/inversionistas")
}

const trancheSchema = z.object({
  monto: z.coerce.number().positive("Monto > 0"),
  tasa_anual: z.coerce.number().min(0).max(1, "Tasa entre 0 y 1 (decimal)"),
  plazo_meses: z.coerce.number().int().positive(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
})

export async function createTranche(
  investorId: string,
  _: unknown,
  fd: FormData,
): Promise<ActionResult> {
  const parsed = trancheSchema.safeParse({
    monto: fdString(fd, "monto"),
    tasa_anual: fdString(fd, "tasa_anual"),
    plazo_meses: fdString(fd, "plazo_meses"),
    fecha_inicio: fdString(fd, "fecha_inicio"),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  }
  const supabase = createClient()

  // Proof of capital received from the investor is required by the UX spec.
  const file = fd.get("proof") as File | null
  if (!file || file.size === 0) {
    return { ok: false, error: "Comprobante requerido para registrar la aportación." }
  }
  const r = await uploadProof(file, "investor_tranche")
  if (!r.ok) return { ok: false, error: r.error }
  const proofId: string = r.proofFileId

  const fecha_vencimiento = addMonthsISO(
    parsed.data.fecha_inicio,
    parsed.data.plazo_meses,
  )

  const { error } = await supabase.from("investor_tranches").insert({
    investor_id: investorId,
    monto: parsed.data.monto,
    tasa_anual: parsed.data.tasa_anual,
    plazo_meses: parsed.data.plazo_meses,
    fecha_inicio: parsed.data.fecha_inicio,
    fecha_vencimiento,
    proof_file_id: proofId,
  })
  if (error) {
    if (proofId) await deleteProof(proofId)
    return { ok: false, error: error.message }
  }
  revalidatePath(`/admin/inversionistas/${investorId}`)
  return { ok: true }
}

export async function deleteTranche(
  investorId: string,
  trancheId: string,
): Promise<void> {
  const supabase = createClient()
  const { data: t } = await supabase
    .from("investor_tranches")
    .select("proof_file_id")
    .eq("id", trancheId)
    .single()
  await supabase.from("investor_tranches").delete().eq("id", trancheId)
  if (t?.proof_file_id) await deleteProof(t.proof_file_id)
  revalidatePath(`/admin/inversionistas/${investorId}`)
}
