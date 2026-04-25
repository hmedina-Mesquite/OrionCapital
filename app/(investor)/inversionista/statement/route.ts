import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { renderToStream } from "@react-pdf/renderer"
import { InvestorStatement } from "@/components/pdf/investor-statement"
import { formatDate } from "@/lib/dates"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse("Unauthorized", { status: 401 })

  const { data: investor } = await supabase
    .from("investors")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!investor)
    return new NextResponse("Sin inversionista vinculado", { status: 404 })

  // Optional filters from /inversionista/estados.
  const url = req.nextUrl
  const fromIso = url.searchParams.get("from")
  const toIso = url.searchParams.get("to")
  const filterTranche = url.searchParams.get("tranche_id") || null

  let trancheQuery = supabase
    .from("investor_tranches")
    .select("*")
    .eq("investor_id", investor.id)
    .order("fecha_inicio", { ascending: false })
  if (filterTranche) trancheQuery = trancheQuery.eq("id", filterTranche)
  const { data: tranches } = await trancheQuery

  const trancheIds = (tranches ?? []).map((t) => t.id)
  const distResp = trancheIds.length
    ? await supabase
        .from("payment_distributions")
        .select("*")
        .eq("recipient_type", "investor_tranche")
        .in("recipient_id", trancheIds)
    : { data: [] }
  const distributions = distResp.data ?? []

  const paymentIds = Array.from(new Set(distributions.map((d) => d.payment_id)))
  let paymentsQuery = paymentIds.length
    ? supabase.from("payments").select("id, fecha_pago").in("id", paymentIds)
    : null
  if (paymentsQuery && fromIso) paymentsQuery = paymentsQuery.gte("fecha_pago", fromIso)
  if (paymentsQuery && toIso) paymentsQuery = paymentsQuery.lte("fecha_pago", toIso)
  const paymentsResp = paymentsQuery ? await paymentsQuery : { data: [] }
  const paymentRows = paymentsResp.data ?? []
  const paymentDate = new Map(
    paymentRows.map((p) => [p.id, p.fecha_pago] as const),
  )

  // If a date range was given, drop distributions whose payment fell outside it.
  const filteredDistributions = (fromIso || toIso)
    ? distributions.filter((d) => paymentDate.has(d.payment_id))
    : distributions

  const stream = await renderToStream(
    InvestorStatement({
      investorName: investor.nombre,
      investorRfc: investor.rfc,
      generatedAt: formatDate(new Date()),
      tranches: (tranches ?? []).map((t) => ({
        id: t.id,
        monto: Number(t.monto),
        tasa_anual: Number(t.tasa_anual),
        plazo_meses: t.plazo_meses,
        fecha_inicio: formatDate(t.fecha_inicio),
        fecha_vencimiento: formatDate(t.fecha_vencimiento),
        estado: t.estado,
      })),
      distributions: filteredDistributions.map((d) => ({
        fecha: paymentDate.get(d.payment_id)
          ? formatDate(paymentDate.get(d.payment_id)!)
          : null,
        tipo: d.tipo,
        monto: Number(d.monto),
      })),
    }),
  )

  const filename = fromIso || toIso
    ? `orion-statement-${fromIso ?? "inicio"}-a-${toIso ?? "hoy"}.pdf`
    : "orion-statement.pdf"

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  })
}
