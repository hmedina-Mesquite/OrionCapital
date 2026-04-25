// French (Price) amortization schedule generator.
// Inputs: principal P, annual rate r (decimal, e.g. 0.18 for 18%), n monthly periods.
// Monthly rate i = r/12. Cuota = P * i / (1 - (1+i)^-n).
// Edge case: r = 0 → cuota = P / n, no interest.
// Rounding: each component to 2 decimals; final cuota adjusts so saldo_restante hits 0 exactly.

import { addMonthsISO } from "@/lib/dates"
import { round2 } from "@/lib/money"

export type ScheduleRow = {
  numero_cuota: number
  fecha_vencimiento: string // YYYY-MM-DD
  cuota_esperada: number
  interes_esperado: number
  capital_esperado: number
  saldo_restante: number
}

export function generateSchedule(
  principal: number,
  annualRate: number,
  months: number,
  startDateISO: string,
): ScheduleRow[] {
  if (principal <= 0 || months <= 0) return []
  const i = annualRate / 12
  const rows: ScheduleRow[] = []

  const cuota =
    i === 0 ? principal / months : (principal * i) / (1 - Math.pow(1 + i, -months))

  let saldo = principal
  for (let k = 1; k <= months; k++) {
    const interes = round2(saldo * i)
    let capital: number
    let cuotaRow: number
    if (k < months) {
      cuotaRow = round2(cuota)
      capital = round2(cuotaRow - interes)
    } else {
      // Last cuota: pay the remaining saldo exactly so it lands on 0.
      capital = round2(saldo)
      cuotaRow = round2(capital + interes)
    }
    saldo = round2(saldo - capital)
    if (saldo < 0) saldo = 0
    rows.push({
      numero_cuota: k,
      fecha_vencimiento: addMonthsISO(startDateISO, k),
      cuota_esperada: cuotaRow,
      interes_esperado: interes,
      capital_esperado: capital,
      saldo_restante: saldo,
    })
  }
  return rows
}
