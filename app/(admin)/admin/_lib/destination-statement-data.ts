import "server-only"
import { createClient } from "@/lib/supabase/server"
import { formatDate, todayISO } from "@/lib/dates"
import type { DestinationStatementProps } from "@/components/pdf/destination-statement"

/**
 * Loads all the data the destination-statement PDF needs in one place so the
 * /admin/creditos/[id]/pdf and /admin/prestamos/[id]/pdf routes stay tiny.
 *
 * Returns null when the destination row doesn't exist.
 */
export async function loadDestinationStatement(
  kind: "credito" | "prestamo",
  id: string,
): Promise<DestinationStatementProps | null> {
  const supabase = createClient()

  const today = todayISO()

  // Master row.
  let monto = 0
  let nombre = ""
  let rfc: string | null = null
  let tasaAnual = 0
  let plazoMeses = 0
  let fechaInicio = ""
  let estado = ""
  let moraMult = 1.5
  let domicilio: string | null = null
  let legacyCode: string | null = null
  let contacto: DestinationStatementProps["contacto"] = null
  let prestamoTipo: "personal" | "negocio" | null = null

  if (kind === "credito") {
    const { data: c } = await supabase
      .from("creditos")
      .select(
        "legacy_code, nombre_proyecto, rfc_empresa, presupuesto, tasa_anual, plazo_meses, fecha_inicio, estado, tasa_mora_multiplicador, domicilio_fiscal, contacto_nombre, contacto_email, contacto_telefono",
      )
      .eq("id", id)
      .single()
    if (!c) return null
    legacyCode = c.legacy_code
    nombre = c.nombre_proyecto
    rfc = c.rfc_empresa
    monto = Number(c.presupuesto)
    tasaAnual = Number(c.tasa_anual)
    plazoMeses = c.plazo_meses
    fechaInicio = c.fecha_inicio
    estado = c.estado
    moraMult = Number(c.tasa_mora_multiplicador)
    domicilio = c.domicilio_fiscal
    contacto = {
      nombre: c.contacto_nombre,
      email: c.contacto_email,
      telefono: c.contacto_telefono,
    }
  } else {
    const { data: p } = await supabase
      .from("prestamos")
      .select(
        "legacy_code, nombre_persona, rfc, cantidad, tasa_anual, plazo_meses, fecha_inicio, estado, tasa_mora_multiplicador, domicilio_fiscal, email, telefono, tipo",
      )
      .eq("id", id)
      .single()
    if (!p) return null
    legacyCode = p.legacy_code
    nombre = p.nombre_persona
    rfc = p.rfc
    monto = Number(p.cantidad)
    tasaAnual = Number(p.tasa_anual)
    plazoMeses = p.plazo_meses
    fechaInicio = p.fecha_inicio
    estado = p.estado
    moraMult = Number(p.tasa_mora_multiplicador)
    domicilio = p.domicilio_fiscal
    prestamoTipo = p.tipo
    contacto = {
      nombre: nombre,
      email: p.email,
      telefono: p.telefono,
    }
  }

  // Schedule.
  const { data: schedule } = await supabase
    .from("amortization_schedule")
    .select("*")
    .eq("destination_type", kind)
    .eq("destination_id", id)
    .order("numero_cuota", { ascending: true })

  // Payments.
  const { data: payments } = await supabase
    .from("payments")
    .select(
      "fecha_pago, monto_capital, monto_interes, monto_mora, monto_total",
    )
    .eq("destination_type", kind)
    .eq("destination_id", id)
    .order("fecha_pago", { ascending: false })

  const totalPagado = (payments ?? []).reduce(
    (s, p) => s + Number(p.monto_total),
    0,
  )
  const totalCapPaid = (payments ?? []).reduce(
    (s, p) => s + Number(p.monto_capital ?? 0),
    0,
  )
  const saldoActual = Math.max(0, monto - totalCapPaid)

  // Aging — count of overdue cuotas + sum of their cuota_esperada.
  // We trust the schedule.estado from the DB (set atomically by record_payment
  // RPC and the nightly mark_past_due cron). Don't second-guess it here.
  const vencidas = (schedule ?? []).filter(
    (r) =>
      r.estado !== "pagada_total" &&
      r.fecha_vencimiento < today,
  )
  const vencidasTotal = vencidas.reduce(
    (s, r) => s + Number(r.cuota_esperada),
    0,
  )

  // Fundings.
  const { data: fundings } = await supabase
    .from("fundings")
    .select("source_type, source_id, monto, fecha")
    .eq("destination_type", kind)
    .eq("destination_id", id)

  const trancheIds = (fundings ?? [])
    .filter((f) => f.source_type === "investor_tranche")
    .map((f) => f.source_id)
  const dispoIds = (fundings ?? [])
    .filter((f) => f.source_type === "bank_disposicion")
    .map((f) => f.source_id)

  const [{ data: tranches }, { data: dispos }] = await Promise.all([
    trancheIds.length
      ? supabase
          .from("investor_tranches")
          .select("id, investor_id")
          .in("id", trancheIds)
      : Promise.resolve({ data: [] as { id: string; investor_id: string }[] }),
    dispoIds.length
      ? supabase
          .from("bank_disposiciones")
          .select("id, bank_id")
          .in("id", dispoIds)
      : Promise.resolve({ data: [] as { id: string; bank_id: string }[] }),
  ])
  const investorIds = Array.from(
    new Set((tranches ?? []).map((t) => t.investor_id)),
  )
  const bankIds = Array.from(new Set((dispos ?? []).map((d) => d.bank_id)))
  const [{ data: investors }, { data: banks }] = await Promise.all([
    investorIds.length
      ? supabase.from("investors").select("id, nombre").in("id", investorIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
    bankIds.length
      ? supabase.from("banks").select("id, nombre").in("id", bankIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
  ])
  const investorMap = new Map((investors ?? []).map((i) => [i.id, i.nombre]))
  const bankMap = new Map((banks ?? []).map((b) => [b.id, b.nombre]))
  const trancheMap = new Map(
    (tranches ?? []).map((t) => [t.id, investorMap.get(t.investor_id) ?? "—"]),
  )
  const dispoMap = new Map(
    (dispos ?? []).map((d) => [d.id, bankMap.get(d.bank_id) ?? "—"]),
  )

  return {
    kind,
    prestamoTipo,
    legacyCode,
    nombre,
    rfc,
    monto,
    tasaAnual,
    plazoMeses,
    fechaInicio: formatDate(fechaInicio),
    estado,
    moraMultiplicador: moraMult,
    domicilioFiscal: domicilio,
    contacto,
    generatedAt: formatDate(new Date()),
    fundings: (fundings ?? []).map((f) => ({
      sourceLabel:
        f.source_type === "investor_tranche"
          ? trancheMap.get(f.source_id) ?? f.source_id.slice(0, 8)
          : dispoMap.get(f.source_id) ?? f.source_id.slice(0, 8),
      sourceType: f.source_type,
      monto: Number(f.monto),
      fecha: formatDate(f.fecha),
    })),
    schedule: (schedule ?? []).map((r) => ({
      numero: r.numero_cuota,
      fecha: formatDate(r.fecha_vencimiento),
      capital: Number(r.capital_esperado),
      interes: Number(r.interes_esperado),
      cuota: Number(r.cuota_esperada),
      saldo: Number(r.saldo_restante),
      estado: r.estado,
    })),
    payments: (payments ?? []).map((p) => ({
      fecha: formatDate(p.fecha_pago),
      capital: Number(p.monto_capital ?? 0),
      interes: Number(p.monto_interes ?? 0),
      mora: Number(p.monto_mora ?? 0),
      total: Number(p.monto_total),
    })),
    vencidasCount: vencidas.length,
    vencidasTotal,
    saldoActual,
    totalPagado,
  }
}
