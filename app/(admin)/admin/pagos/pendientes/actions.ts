"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { removeStorageObject } from "@/lib/storage"

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string }

export async function approvePendingPayment(
  pendingId: string,
): Promise<ActionResult> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("approve_pending_payment", {
    p_pending_id: pendingId,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath("/admin/pagos")
  revalidatePath("/admin/pagos/pendientes")
  revalidatePath("/admin/reserva")
  revalidatePath("/admin")
  return { ok: true, id: data as string }
}

export async function rejectPendingPayment(
  pendingId: string,
  reason: string,
): Promise<ActionResult> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("reject_pending_payment", {
    p_pending_id: pendingId,
    p_reason: reason,
  })
  if (error) return { ok: false, error: error.message }

  // The RPC returns the storage_path of the rejected proof so we can clean it up.
  const storagePath = (data as string) ?? null
  if (storagePath) await removeStorageObject(storagePath)

  revalidatePath("/admin/pagos/pendientes")
  return { ok: true }
}
