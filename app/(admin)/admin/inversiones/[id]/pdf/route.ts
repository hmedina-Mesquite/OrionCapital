import { NextResponse, type NextRequest } from "next/server"
import { renderToStream } from "@react-pdf/renderer"
import { createClient } from "@/lib/supabase/server"
import { InversionReport } from "@/components/pdf/inversion-report"
import { formatDate } from "@/lib/dates"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse("Unauthorized", { status: 401 })
  const { data: isAdmin } = await supabase.rpc("is_admin")
  if (!isAdmin) return new NextResponse("Forbidden", { status: 403 })

  const { data: inv } = await supabase
    .from("inversiones")
    .select("*")
    .eq("id", params.id)
    .single()
  if (!inv) return new NextResponse("Not found", { status: 404 })

  const [{ data: movs }, { data: fundings }] = await Promise.all([
    supabase
      .from("inversion_movimientos")
      .select("*")
      .eq("inversion_id", params.id)
      .order("fecha", { ascending: false }),
    supabase
      .from("fundings")
      .select("source_type, source_id, monto, fecha")
      .eq("destination_type", "inversion")
      .eq("destination_id", params.id),
  ])

  // Resolve source labels (investor tranche → investor name; bank disposicion → bank name).
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
          .select("id, monto, investor_id")
          .in("id", trancheIds)
      : Promise.resolve({ data: [] as { id: string; monto: number; investor_id: string }[] }),
    dispoIds.length
      ? supabase
          .from("bank_disposiciones")
          .select("id, monto, bank_id")
          .in("id", dispoIds)
      : Promise.resolve({ data: [] as { id: string; monto: number; bank_id: string }[] }),
  ])
  const investorIds = Array.from(new Set((tranches ?? []).map((t) => t.investor_id)))
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

  const stream = await renderToStream(
    InversionReport({
      nombre: inv.nombre,
      presupuesto: Number(inv.presupuesto),
      domicilioFiscal: inv.domicilio_fiscal,
      estado: inv.estado,
      detalles: inv.detalles,
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
      movimientos: (movs ?? []).map((m) => ({
        id: m.id,
        tipo: m.tipo,
        monto: Number(m.monto),
        fecha: formatDate(m.fecha),
        descripcion: m.descripcion,
      })),
    }),
  )

  const safeName = inv.nombre.replace(/[^\w\-]+/g, "_").slice(0, 60)
  const filename = `orion-inversion-${safeName}-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
