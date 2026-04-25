const FMT = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMXN(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "—"
  const n = typeof amount === "string" ? Number(amount) : amount
  if (!Number.isFinite(n)) return "—"
  return `${FMT.format(n)} MXN`
}

export function parseMXN(input: string): number | null {
  if (!input) return null
  const cleaned = input
    .replace(/[\s$]/g, "")
    .replace(/MXN/gi, "")
    .replace(/,/g, "")
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Round to 2 decimals (MXN cents). Used pervasively in amortization + payment math. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
