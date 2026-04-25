import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMXN } from "@/lib/money"
import { formatDate } from "@/lib/dates"

export const dynamic = "force-dynamic"

export default async function InversionistasPage() {
  const supabase = createClient()
  const [{ data: investors }, { data: tranches }] = await Promise.all([
    supabase
      .from("investors")
      .select("id, nombre, rfc, email, telefono, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("investor_tranches").select("investor_id, monto, estado"),
  ])

  const countByInv = new Map<string, number>()
  const activeSumByInv = new Map<string, number>()
  for (const t of tranches ?? []) {
    countByInv.set(t.investor_id, (countByInv.get(t.investor_id) ?? 0) + 1)
    if (t.estado === "activo") {
      activeSumByInv.set(
        t.investor_id,
        (activeSumByInv.get(t.investor_id) ?? 0) + Number(t.monto),
      )
    }
  }

  const rows = (investors ?? []).map((inv) => ({
    ...inv,
    tranches: countByInv.get(inv.id) ?? 0,
    capital_activo: activeSumByInv.get(inv.id) ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inversionistas</h1>
          <p className="text-muted-foreground text-sm">
            Personas que aportan capital. Cada aporte es un tranche.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/export?entity=inversionistas"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Exportar Excel
          </a>
          <Button render={<Link href="/admin/inversionistas/new">Nuevo</Link>} />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead className="text-right">Tranches</TableHead>
              <TableHead className="text-right">Capital activo</TableHead>
              <TableHead>Alta</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  Sin inversionistas. Crea el primero.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nombre}</TableCell>
                <TableCell className="font-mono text-xs">{r.rfc}</TableCell>
                <TableCell>{r.email ?? "—"}</TableCell>
                <TableCell className="text-right">{r.tranches}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMXN(r.capital_activo)}
                </TableCell>
                <TableCell>{formatDate(r.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/admin/inversionistas/${r.id}`}
                    className="text-primary text-sm hover:underline"
                  >
                    Abrir
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
