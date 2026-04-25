/**
 * Inspection: prints non-empty rows of each sheet so we can see structure.
 * Run: pnpm tsx scripts/inspect-xlsx.ts <path>
 */
import * as XLSX from "xlsx"

const path =
  process.argv[2] ??
  "/Users/hectormedina/Downloads/REP SALDOS ORION CAPITAL 2026 DETALLADO.xlsx"

const wb = XLSX.readFile(path)
const target = process.argv[3] // optional sheet filter

for (const name of wb.SheetNames) {
  if (target && name !== target) continue
  const ws = wb.Sheets[name]
  const rows = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: null,
  }) as unknown[][]

  console.log("\n" + "=".repeat(80))
  console.log(`Sheet: ${name} — ${rows.length} rows`)
  console.log("=".repeat(80))

  // Print the first 60 rows that have at least one non-null cell.
  let printed = 0
  for (let i = 0; i < rows.length && printed < 60; i++) {
    const r = rows[i]
    if (!r || r.every((c) => c === null || c === "")) continue
    const trimmed = r.map((c) => (c === null ? "" : c))
    console.log(`R${i}:`, trimmed)
    printed++
  }
  if (printed === 0) console.log("(empty)")
}
