import { NextResponse, type NextRequest } from "next/server"
import * as XLSX from "xlsx"
import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/dates"

export const dynamic = "force-dynamic"

type EntityKey =
  | "inversionistas"
  | "bancos"
  | "inversiones"
  | "creditos"
  | "prestamos"
  | "pagos"

const ENTITIES: Record<EntityKey, { label: string }> = {
  inversionistas: { label: "Inversionistas" },
  bancos: { label: "Bancos" },
  inversiones: { label: "Inversiones" },
  creditos: { label: "Creditos" },
  prestamos: { label: "Prestamos" },
  pagos: { label: "Pagos" },
}

function isEntityKey(s: string): s is EntityKey {
  return s in ENTITIES
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse("Unauthorized", { status: 401 })

  // is_admin check via the SQL helper. Falls back to false on error.
  const { data: isAdmin } = await supabase.rpc("is_admin")
  if (!isAdmin) return new NextResponse("Forbidden", { status: 403 })

  const entity = req.nextUrl.searchParams.get("entity") ?? ""
  if (!isEntityKey(entity)) {
    return new NextResponse("Unknown entity", { status: 400 })
  }

  // Build the rows per entity. Each entity is a separate query.
  let rows: Record<string, unknown>[] = []
  switch (entity) {
    case "inversionistas": {
      const { data } = await supabase
        .from("investors")
        .select("nombre, rfc, email, telefono, cuenta_bancaria, notas, created_at")
        .order("nombre", { ascending: true })
      rows = (data ?? []).map((r) => ({
        Nombre: r.nombre,
        RFC: r.rfc,
        Email: r.email,
        Teléfono: r.telefono,
        CLABE: r.cuenta_bancaria,
        Notas: r.notas,
        "Alta": r.created_at ? formatDate(r.created_at) : "",
      }))
      break
    }
    case "bancos": {
      const { data } = await supabase
        .from("banks")
        .select(
          "nombre, tipo_credito, numero_cuenta, linea_credito, tasa_anual, plazo_meses, fecha_apertura, estado, legacy_code",
        )
        .order("nombre", { ascending: true })
      rows = (data ?? []).map((r) => ({
        Banco: r.nombre,
        "Tipo crédito": r.tipo_credito,
        "N° cuenta": r.numero_cuenta,
        "Línea crédito (MXN)": Number(r.linea_credito),
        "Tasa anual": Number(r.tasa_anual),
        "Plazo (meses)": r.plazo_meses,
        "Fecha apertura": r.fecha_apertura ? formatDate(r.fecha_apertura) : "",
        Estado: r.estado,
        "Código legado": r.legacy_code,
      }))
      break
    }
    case "inversiones": {
      const { data } = await supabase
        .from("inversiones")
        .select("nombre, presupuesto, domicilio_fiscal, estado, detalles, created_at")
        .order("nombre", { ascending: true })
      rows = (data ?? []).map((r) => ({
        Inversión: r.nombre,
        "Presupuesto (MXN)": Number(r.presupuesto),
        "Domicilio fiscal": r.domicilio_fiscal,
        Estado: r.estado,
        Detalles: r.detalles,
        "Alta": r.created_at ? formatDate(r.created_at) : "",
      }))
      break
    }
    case "creditos": {
      const { data } = await supabase
        .from("creditos")
        .select(
          "legacy_code, nombre_proyecto, rfc_empresa, presupuesto, tasa_anual, plazo_meses, fecha_inicio, estado, contacto_nombre, contacto_email, contacto_telefono",
        )
        .order("nombre_proyecto", { ascending: true })
      rows = (data ?? []).map((r) => ({
        "Código legado": r.legacy_code,
        Proyecto: r.nombre_proyecto,
        "RFC empresa": r.rfc_empresa,
        "Monto (MXN)": Number(r.presupuesto),
        "Tasa anual": Number(r.tasa_anual),
        "Plazo (meses)": r.plazo_meses,
        "Fecha inicio": r.fecha_inicio ? formatDate(r.fecha_inicio) : "",
        Estado: r.estado,
        Contacto: r.contacto_nombre,
        "Email contacto": r.contacto_email,
        "Tel contacto": r.contacto_telefono,
      }))
      break
    }
    case "prestamos": {
      const { data } = await supabase
        .from("prestamos")
        .select(
          "legacy_code, nombre_persona, rfc, cantidad, tasa_anual, plazo_meses, fecha_inicio, estado, email, telefono",
        )
        .order("nombre_persona", { ascending: true })
      rows = (data ?? []).map((r) => ({
        "Código legado": r.legacy_code,
        Deudor: r.nombre_persona,
        RFC: r.rfc,
        "Monto (MXN)": Number(r.cantidad),
        "Tasa anual": Number(r.tasa_anual),
        "Plazo (meses)": r.plazo_meses,
        "Fecha inicio": r.fecha_inicio ? formatDate(r.fecha_inicio) : "",
        Estado: r.estado,
        Email: r.email,
        Teléfono: r.telefono,
      }))
      break
    }
    case "pagos": {
      const { data } = await supabase
        .from("payments")
        .select(
          "fecha_pago, destination_type, destination_id, monto_total, monto_capital, monto_interes, monto_mora, notas, created_at",
        )
        .order("fecha_pago", { ascending: false })
      // Resolve destination labels.
      const creditoIds = Array.from(
        new Set(
          (data ?? [])
            .filter((p) => p.destination_type === "credito")
            .map((p) => p.destination_id),
        ),
      )
      const prestamoIds = Array.from(
        new Set(
          (data ?? [])
            .filter((p) => p.destination_type === "prestamo")
            .map((p) => p.destination_id),
        ),
      )
      const [{ data: cs }, { data: ps }] = await Promise.all([
        creditoIds.length
          ? supabase.from("creditos").select("id, nombre_proyecto").in("id", creditoIds)
          : Promise.resolve({ data: [] as { id: string; nombre_proyecto: string }[] }),
        prestamoIds.length
          ? supabase.from("prestamos").select("id, nombre_persona").in("id", prestamoIds)
          : Promise.resolve({ data: [] as { id: string; nombre_persona: string }[] }),
      ])
      const cMap = new Map((cs ?? []).map((c) => [c.id, c.nombre_proyecto]))
      const pMap = new Map((ps ?? []).map((p) => [p.id, p.nombre_persona]))
      rows = (data ?? []).map((r) => ({
        Fecha: r.fecha_pago ? formatDate(r.fecha_pago) : "",
        Tipo: r.destination_type,
        Destino:
          r.destination_type === "credito"
            ? cMap.get(r.destination_id) ?? r.destination_id
            : r.destination_type === "prestamo"
              ? pMap.get(r.destination_id) ?? r.destination_id
              : r.destination_id,
        "Monto total (MXN)": Number(r.monto_total),
        "Capital (MXN)": Number(r.monto_capital),
        "Interés (MXN)": Number(r.monto_interes),
        "Mora (MXN)": Number(r.monto_mora),
        Notas: r.notas,
      }))
      break
    }
  }

  if (rows.length === 0) {
    rows = [{ "Sin datos": "" }]
  }

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, ENTITIES[entity].label.slice(0, 31))
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer
  // Copy into a fresh ArrayBuffer to satisfy Web `BodyInit` (NextResponse).
  const ab = new ArrayBuffer(buf.byteLength)
  new Uint8Array(ab).set(buf)

  const filename = `orion-${entity}-${new Date().toISOString().slice(0, 10)}.xlsx`
  return new NextResponse(ab, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
