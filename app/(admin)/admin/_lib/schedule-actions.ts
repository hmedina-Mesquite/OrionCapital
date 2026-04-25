"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { generateSchedule } from "@/lib/amortization"
import type { Database } from "@/types/database"

type DestinationType = Database["public"]["Enums"]["destination_type"]

async function fetchDestination(
  supabase: ReturnType<typeof createClient>,
  type: DestinationType,
  id: string,
) {
  if (type === "credito") {
    const { data } = await supabase
      .from("creditos")
      .select("presupuesto, tasa_anual, plazo_meses, fecha_inicio")
      .eq("id", id)
      .single()
    if (!data) return null
    return {
      principal: Number(data.presupuesto),
      tasa: Number(data.tasa_anual),
      plazo: data.plazo_meses,
      fecha_inicio: data.fecha_inicio,
    }
  }
  if (type === "prestamo") {
    const { data } = await supabase
      .from("prestamos")
      .select("cantidad, tasa_anual, plazo_meses, fecha_inicio")
      .eq("id", id)
      .single()
    if (!data) return null
    return {
      principal: Number(data.cantidad),
      tasa: Number(data.tasa_anual),
      plazo: data.plazo_meses,
      fecha_inicio: data.fecha_inicio,
    }
  }
  return null
}

export async function regenerateSchedule(
  destinationType: DestinationType,
  destinationId: string,
): Promise<{ ok: true; rows: number } | { ok: false; error: string }> {
  if (destinationType !== "credito" && destinationType !== "prestamo") {
    return { ok: false, error: "Solo créditos y préstamos tienen cronograma" }
  }
  const supabase = createClient()
  const dest = await fetchDestination(supabase, destinationType, destinationId)
  if (!dest) return { ok: false, error: "Destino no encontrado" }

  const { data: paid } = await supabase
    .from("amortization_schedule")
    .select("id")
    .eq("destination_type", destinationType)
    .eq("destination_id", destinationId)
    .in("estado", ["pagada_total", "pagada_parcial"])
    .limit(1)
  if (paid && paid.length > 0) {
    return {
      ok: false,
      error: "No se puede regenerar: ya hay cuotas con pagos.",
    }
  }

  await supabase
    .from("amortization_schedule")
    .delete()
    .eq("destination_type", destinationType)
    .eq("destination_id", destinationId)

  const rows = generateSchedule(
    dest.principal,
    dest.tasa,
    dest.plazo,
    dest.fecha_inicio,
  )
  if (rows.length === 0) return { ok: false, error: "Sin filas" }

  const { error } = await supabase.from("amortization_schedule").insert(
    rows.map((r) => ({
      destination_type: destinationType,
      destination_id: destinationId,
      numero_cuota: r.numero_cuota,
      fecha_vencimiento: r.fecha_vencimiento,
      cuota_esperada: r.cuota_esperada,
      interes_esperado: r.interes_esperado,
      capital_esperado: r.capital_esperado,
      saldo_restante: r.saldo_restante,
    })),
  )
  if (error) return { ok: false, error: error.message }

  revalidatePath(
    destinationType === "credito"
      ? `/admin/creditos/${destinationId}`
      : `/admin/prestamos/${destinationId}`,
  )
  return { ok: true, rows: rows.length }
}
