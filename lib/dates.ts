import { addMonths as dfAddMonths } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"

export const APP_TZ = "America/Monterrey"

export function formatDate(d: Date | string): string {
  return formatInTimeZone(new Date(d), APP_TZ, "dd/MM/yyyy")
}

export function formatDateTime(d: Date | string): string {
  return formatInTimeZone(new Date(d), APP_TZ, "dd/MM/yyyy HH:mm")
}

/** Add months to a Date. Clamps day-of-month to the last day of the target month
 *  (date-fns handles this correctly — naive `setMonth` does NOT). */
export function addMonths(date: Date, months: number): Date {
  return dfAddMonths(date, months)
}

/** Add months to a YYYY-MM-DD ISO string. Clamps day-of-month to the last day of
 *  the target month. Pure UTC arithmetic — no DST surprises.
 *  addMonthsISO("2024-01-31", 1) === "2024-02-29"
 *  addMonthsISO("2024-03-31", 1) === "2024-04-30"
 *  addMonthsISO("2025-01-31", 13) === "2026-02-28" */
export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const totalMonths = m - 1 + months
  const targetYear = y + Math.floor(totalMonths / 12)
  const targetMonth = ((totalMonths % 12) + 12) % 12 // 0..11
  const daysInTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate()
  const targetDay = Math.min(d, daysInTargetMonth)
  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`
}

/** Days between two ISO dates (b - a). Negative if a > b. UTC math. */
export function daysBetweenISO(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T00:00:00Z`).getTime()
  const b = new Date(`${bIso}T00:00:00Z`).getTime()
  return Math.round((b - a) / (24 * 60 * 60 * 1000))
}

/** Today as YYYY-MM-DD in UTC. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
