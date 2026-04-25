/**
 * One-shot importer for `REP SALDOS ORION CAPITAL 2026 DETALLADO.xlsx`.
 *
 * Scope:
 *   - Master `creditos` rows from OFLC* codes in `REPORTE DE INVERSIONES ORION CA`.
 *   - Master `prestamos` rows from OFP* codes in same sheet.
 *   - Master `banks` rows for the three known sheets (HSBC, BANORTE, JHMS).
 *
 * Out of scope (left for the admin UI):
 *   - Historical bank_disposiciones, payments, amortization_schedule. The
 *     spec calls for these but auto-parsing the messy ledgers is brittle
 *     and would land bad numbers. Admin imports a clean state and uses the
 *     UI from there.
 *
 * Idempotency: rows are keyed by `legacy_code` (OFLC001…, OFP001…,
 *   BANK_BANORTE, BANK_HSBC, BANK_JHMS). Re-running the script skips rows
 *   already present.
 *
 * Run:
 *   pnpm tsx scripts/import-legacy-xlsx.ts
 *   pnpm tsx scripts/import-legacy-xlsx.ts /path/to/file.xlsx
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in web/.env.local — RLS is bypassed
 * because we use the service-role key.
 */
import * as path from "node:path"
import * as fs from "node:fs"
import * as dotenv from "dotenv"
import * as XLSX from "xlsx"
import { createClient } from "@supabase/supabase-js"

// ---- env ----------------------------------------------------------------
dotenv.config({ path: path.join(__dirname, "..", ".env.local") })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local",
  )
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

// ---- args ---------------------------------------------------------------
const xlsxPath =
  process.argv[2] ??
  "/Users/hectormedina/Downloads/REP SALDOS ORION CAPITAL 2026 DETALLADO.xlsx"
if (!fs.existsSync(xlsxPath)) {
  console.error(`No se encontró el archivo: ${xlsxPath}`)
  process.exit(1)
}

// ---- helpers ------------------------------------------------------------
const EXCEL_EPOCH = Date.UTC(1899, 11, 30) // Dec 30, 1899 — handles 1900 leap-year quirk

function excelSerialToISO(n: number | null | undefined): string | null {
  if (n == null || typeof n !== "number" || !Number.isFinite(n) || n <= 0) return null
  const ms = EXCEL_EPOCH + n * 86400 * 1000
  return new Date(ms).toISOString().slice(0, 10)
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$, ]/g, ""))
  return Number.isFinite(n) ? n : null
}

function str(v: unknown): string | null {
  if (v == null) return null
  const s = String(v).trim()
  return s.length ? s : null
}

function normalizeEstado(raw: string | null): "pre_aprobado" | "activo" | "completado" | "cancelado" | "en_mora" {
  if (!raw) return "pre_aprobado"
  const u = raw.toUpperCase().trim()
  if (u.startsWith("PRE")) return "pre_aprobado"
  if (u === "ACTIVO") return "activo"
  if (u.startsWith("COMPLET")) return "completado"
  if (u.startsWith("CANCEL")) return "cancelado"
  if (u.startsWith("MORA")) return "en_mora"
  return "pre_aprobado"
}

function normalizeBankEstado(raw: string | null): "activo" | "completado" | "cancelado" {
  if (!raw) return "activo"
  const u = raw.toUpperCase().trim()
  if (u.startsWith("COMPLET")) return "completado"
  if (u.startsWith("CANCEL")) return "cancelado"
  return "activo"
}

// ---- read workbook ------------------------------------------------------
console.log(`Leyendo: ${xlsxPath}`)
const wb = XLSX.readFile(xlsxPath)

// ---- 1. creditos + prestamos from main sheet ---------------------------
const mainSheet = wb.Sheets["REPORTE DE INVERSIONES ORION CA"]
if (!mainSheet) {
  console.error("Falta la hoja: REPORTE DE INVERSIONES ORION CA")
  process.exit(1)
}
const mainRows = XLSX.utils.sheet_to_json(mainSheet, {
  header: 1,
  raw: true,
  defval: null,
}) as unknown[][]

type ParsedDestination = {
  legacy_code: string
  nombre: string
  fecha_inicio: string
  monto: number
  tasa_anual: number
  estado: ReturnType<typeof normalizeEstado>
}

const creditos: ParsedDestination[] = []
const prestamos: ParsedDestination[] = []

const today = new Date().toISOString().slice(0, 10)

for (const row of mainRows) {
  const code = str(row?.[0])
  if (!code) continue

  if (code.startsWith("OFLC")) {
    const nombre = str(row[1]) ?? code
    const fecha = excelSerialToISO(num(row[4])) ?? today
    const linea = num(row[5]) ?? 0
    const estado = normalizeEstado(str(row[8]))
    if (linea <= 0) continue
    creditos.push({
      legacy_code: code,
      nombre,
      fecha_inicio: fecha,
      monto: linea,
      tasa_anual: 0.18, // not in sheet; admin edits later
      estado,
    })
  } else if (code.startsWith("OFP")) {
    const nombre = str(row[1]) ?? code
    const fecha = excelSerialToISO(num(row[4])) ?? today
    const cantidad = num(row[5]) ?? 0
    const tasa = num(row[2]) ?? 0.18
    const estado = normalizeEstado(str(row[8]))
    if (cantidad <= 0) continue
    prestamos.push({
      legacy_code: code,
      nombre,
      fecha_inicio: fecha,
      monto: cantidad,
      tasa_anual: tasa,
      estado,
    })
  }
}

console.log(
  `Encontrados: ${creditos.length} créditos, ${prestamos.length} préstamos`,
)

// ---- 2. banks from named sheets ----------------------------------------
type BankDef = {
  legacy_code: string
  sheet: string
  nombre: string
  tipo_credito: "simple" | "revolvente"
  linea_credito_default: number
}
const bankDefs: BankDef[] = [
  {
    legacy_code: "BANK_BANORTE",
    sheet: "CREDITO BANORTE",
    nombre: "BANORTE",
    tipo_credito: "revolvente",
    linea_credito_default: 5_736_000,
  },
  {
    legacy_code: "BANK_HSBC",
    sheet: "CREDITO SIMPLE HSBC",
    nombre: "HSBC",
    tipo_credito: "simple",
    linea_credito_default: 2_700_000,
  },
  {
    legacy_code: "BANK_JHMS",
    sheet: "CREDITO JHMS",
    nombre: "JHMS",
    tipo_credito: "simple",
    linea_credito_default: 3_500_000,
  },
]

type ParsedBank = {
  legacy_code: string
  nombre: string
  tipo_credito: "simple" | "revolvente"
  numero_cuenta: string | null
  linea_credito: number
  tasa_anual: number
  plazo_meses: number
  fecha_apertura: string | null
  estado: ReturnType<typeof normalizeBankEstado>
}

const banks: ParsedBank[] = []
for (const def of bankDefs) {
  const sh = wb.Sheets[def.sheet]
  if (!sh) {
    console.warn(`Hoja faltante: ${def.sheet}, omitida`)
    continue
  }
  const rows = XLSX.utils.sheet_to_json(sh, {
    header: 1,
    raw: true,
    defval: null,
  }) as unknown[][]
  // R0: 'Cuenta No. ...'
  const cuentaRaw = str(rows[0]?.[0]) ?? ""
  const cuentaMatch = cuentaRaw.match(/(\d{6,})/)
  const numero_cuenta = cuentaMatch ? cuentaMatch[1] : null
  // First credit-line deposit (largest INGRESO row before any GASTO).
  let lineaCredito = def.linea_credito_default
  let fechaApertura: string | null = null
  for (const r of rows.slice(3, 30)) {
    const tipo = str(r?.[3]) ?? ""
    const monto = num(r?.[5])
    if (
      tipo.toUpperCase().includes("INGRESO") &&
      monto &&
      monto >= def.linea_credito_default * 0.5
    ) {
      lineaCredito = monto
      fechaApertura = excelSerialToISO(num(r?.[1]))
      break
    }
  }
  banks.push({
    legacy_code: def.legacy_code,
    nombre: def.nombre,
    tipo_credito: def.tipo_credito,
    numero_cuenta,
    linea_credito: lineaCredito,
    tasa_anual: 0.16, // sensible default; admin edits
    plazo_meses: 36,
    fecha_apertura: fechaApertura,
    estado: "activo",
  })
}

console.log(`Encontrados: ${banks.length} bancos`)

// ---- 3. insert (idempotent via legacy_code) ----------------------------
type Counts = { inserted: number; skipped: number; failed: number }

async function importCreditos(rows: ParsedDestination[]): Promise<Counts> {
  let inserted = 0,
    skipped = 0,
    failed = 0
  for (const r of rows) {
    const { data: existing } = await supabase
      .from("creditos")
      .select("id")
      .eq("legacy_code", r.legacy_code)
      .maybeSingle()
    if (existing) {
      console.log(`  · skip ${r.legacy_code} (ya existe)`)
      skipped++
      continue
    }
    const { error } = await supabase.from("creditos").insert({
      legacy_code: r.legacy_code,
      nombre_proyecto: r.nombre,
      presupuesto: r.monto,
      tasa_anual: r.tasa_anual,
      plazo_meses: 24,
      fecha_inicio: r.fecha_inicio,
      tasa_mora_multiplicador: 1.5,
      estado: r.estado,
    })
    if (error) {
      console.error(`  ✕ ${r.legacy_code}: ${error.message}`)
      failed++
    } else {
      console.log(`  + ${r.legacy_code} ${r.nombre}`)
      inserted++
    }
  }
  return { inserted, skipped, failed }
}

async function importPrestamos(rows: ParsedDestination[]): Promise<Counts> {
  let inserted = 0,
    skipped = 0,
    failed = 0
  for (const r of rows) {
    const { data: existing } = await supabase
      .from("prestamos")
      .select("id")
      .eq("legacy_code", r.legacy_code)
      .maybeSingle()
    if (existing) {
      console.log(`  · skip ${r.legacy_code} (ya existe)`)
      skipped++
      continue
    }
    const { error } = await supabase.from("prestamos").insert({
      legacy_code: r.legacy_code,
      nombre_persona: r.nombre,
      cantidad: r.monto,
      tasa_anual: r.tasa_anual,
      plazo_meses: 24,
      fecha_inicio: r.fecha_inicio,
      tasa_mora_multiplicador: 1.5,
      estado: r.estado,
    })
    if (error) {
      console.error(`  ✕ ${r.legacy_code}: ${error.message}`)
      failed++
    } else {
      console.log(`  + ${r.legacy_code} ${r.nombre}`)
      inserted++
    }
  }
  return { inserted, skipped, failed }
}

async function importBanks(rows: ParsedBank[]): Promise<Counts> {
  let inserted = 0,
    skipped = 0,
    failed = 0
  for (const r of rows) {
    const { data: existing } = await supabase
      .from("banks")
      .select("id")
      .eq("legacy_code", r.legacy_code)
      .maybeSingle()
    if (existing) {
      console.log(`  · skip ${r.legacy_code} (ya existe)`)
      skipped++
      continue
    }
    const { error } = await supabase.from("banks").insert({
      legacy_code: r.legacy_code,
      nombre: r.nombre,
      tipo_credito: r.tipo_credito,
      numero_cuenta: r.numero_cuenta,
      linea_credito: r.linea_credito,
      tasa_anual: r.tasa_anual,
      plazo_meses: r.plazo_meses,
      fecha_apertura: r.fecha_apertura,
      estado: r.estado,
    })
    if (error) {
      console.error(`  ✕ ${r.legacy_code}: ${error.message}`)
      failed++
    } else {
      console.log(`  + ${r.legacy_code} ${r.nombre}`)
      inserted++
    }
  }
  return { inserted, skipped, failed }
}

;(async () => {
  console.log("\nImportando créditos…")
  const c = await importCreditos(creditos)
  console.log("\nImportando préstamos…")
  const p = await importPrestamos(prestamos)
  console.log("\nImportando bancos…")
  const b = await importBanks(banks)

  console.log("\n" + "=".repeat(60))
  console.log("Resumen")
  console.log("=".repeat(60))
  console.log(`Créditos:  +${c.inserted}  ·${c.skipped} skip  ✕${c.failed}`)
  console.log(`Préstamos: +${p.inserted}  ·${p.skipped} skip  ✕${p.failed}`)
  console.log(`Bancos:    +${b.inserted}  ·${b.skipped} skip  ✕${b.failed}`)
  console.log("\nLas líneas históricas (disposiciones, pagos, cronogramas)")
  console.log("se cargan vía la UI admin después de revisar montos y tasas.")
})()
