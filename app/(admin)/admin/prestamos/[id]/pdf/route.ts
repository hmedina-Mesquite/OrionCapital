import { NextResponse, type NextRequest } from "next/server"
import { renderToStream } from "@react-pdf/renderer"
import { createClient } from "@/lib/supabase/server"
import { DestinationStatement } from "@/components/pdf/destination-statement"
import { loadDestinationStatement } from "@/app/(admin)/admin/_lib/destination-statement-data"

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

  const data = await loadDestinationStatement("prestamo", params.id)
  if (!data) return new NextResponse("Not found", { status: 404 })

  const stream = await renderToStream(DestinationStatement(data))
  const safeName = data.nombre.replace(/[^\w\-]+/g, "_").slice(0, 60)
  const filename = `orion-prestamo-${safeName}-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
