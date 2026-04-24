import { formatInTimeZone } from "date-fns-tz"

export const APP_TZ = "America/Monterrey"

export function formatDate(d: Date | string): string {
  return formatInTimeZone(new Date(d), APP_TZ, "dd/MM/yyyy")
}

export function formatDateTime(d: Date | string): string {
  return formatInTimeZone(new Date(d), APP_TZ, "dd/MM/yyyy HH:mm")
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}
