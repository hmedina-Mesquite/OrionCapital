import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { renderToStream } from "@react-pdf/renderer"
import { InvestorStatement } from "@/components/pdf/investor-statement"
import { formatDate } from "@/lib/dates"

export const dynamic = "force-dynamic"

export async function GET() {
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
  if (!investor) return new NextResponse("Sin inversionista vinculado", { status: 404 })

  const { data: tranches } = await supabase
    .from("investor_tranches")
    .select("*")
    .eq("investor_id", investor.id)
    .order("fecha_inicio", { ascending: false })

  const trancheIds = (tranches ?? []).map((t) => t.id)
  const { data: distributions } = trancheIds.length
    ? await supabase
        .from("payment_distributions")
        .select("*")
        .eq("recipient_type", "investor_tranche")
        .in("recipient_id", trancheIds)
    : { data: [] }

  const paymentIds = Array.from(
    new Set((distributions ?? []).map((d) => d.payment_id)),
  )
  const { data: paymentRows } = paymentIds.length
    ? await supabase
        .from("payments")
        .select("id, fecha_pago")
        .in("id", paymentIds)
    : { data: [] }
  const paymentDate = new Map(
    (paymentRows ?? []).map((p) => [p.id, p.fecha_pago] as const),
  )

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
      distributions: (distributions ?? []).map((d) => ({
        fecha: paymentDate.get(d.payment_id)
          ? formatDate(paymentDate.get(d.payment_id)!)
          : null,
        tipo: d.tipo,
        monto: Number(d.monto),
      })),
    }),
  )

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="orion-statement.pdf"`,
    },
  })
}
