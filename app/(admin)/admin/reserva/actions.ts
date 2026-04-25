"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const movSchema = z.object({
  tipo: z.enum(["aporte_manual", "retiro_manual"]),
  monto: z.coerce.number().positive(),
  razon: z
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

export async function createReservaMov(
  _: unknown,
  fd: FormData,
): Promise<ActionResult> {
  const parsed = movSchema.safeParse({
    tipo: fdString(fd, "tipo"),
    monto: fdString(fd, "monto"),
    razon: fdString(fd, "razon"),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  }
  const supabase = createClient()

  const { data: latest } = await supabase
    .from("reserva_movements")
    .select("saldo_despues")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const previous = latest ? Number(latest.saldo_despues) : 0
  const sign = parsed.data.tipo === "aporte_manual" ? 1 : -1
  const after = previous + sign * parsed.data.monto

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("reserva_movements").insert({
    tipo: parsed.data.tipo,
    monto: parsed.data.monto,
    saldo_despues: after,
    razon: parsed.data.razon,
    created_by: user?.id ?? null,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath("/admin/reserva")
  return { ok: true }
}
