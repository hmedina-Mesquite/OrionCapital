"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const settingsSchema = z.object({
  reserva_percentage: z.coerce.number().min(0).max(1),
  default_investor_term_months: z.coerce.number().int().positive(),
  default_mora_multiplier: z.coerce.number().min(1),
})

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string }

function fdString(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === "string" ? v : ""
}

export async function updateSettings(
  _: unknown,
  fd: FormData,
): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse({
    reserva_percentage: fdString(fd, "reserva_percentage"),
    default_investor_term_months: fdString(fd, "default_investor_term_months"),
    default_mora_multiplier: fdString(fd, "default_mora_multiplier"),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido" }
  }
  const supabase = createClient()
  const { error } = await supabase
    .from("settings")
    .update(parsed.data)
    .eq("id", 1)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/settings")
  return { ok: true }
}
