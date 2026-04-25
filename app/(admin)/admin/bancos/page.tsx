import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMXN } from "@/lib/money"

export const dynamic = "force-dynamic"

export default async function BancosPage() {
  const supabase = createClient()
  const [{ data: banks }, { data: dispos }] = await Promise.all([
    supabase
      .from("banks")
      .select(
        "id, nombre, tipo_credito, tasa_anual, plazo_meses, linea_credito, estado",
      )
      .order("created_at", { ascending: false }),
    supabase.from("bank_disposiciones").select("bank_id, monto"),
  ])

  const sumByBank = new Map<string, number>()
  for (const d of dispos ?? []) {
    sumByBank.set(d.bank_id, (sumByBank.get(d.bank_id) ?? 0) + Number(d.monto))
  }

  const rows = (banks ?? []).map((b) => {
    const dispuesto = sumByBank.get(b.id) ?? 0
    const linea = Number(b.linea_credito ?? 0)
    return { ...b, dispuesto, disponible: Math.max(0, linea - dispuesto) }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bancos</h1>
          <p className="text-muted-foreground text-sm">
            Líneas de crédito bancarias y sus disposiciones.
          </p>
        </div>
        <Button render={<Link href="/admin/bancos/new">Nuevo</Link>} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Banco</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Tasa</TableHead>
              <TableHead className="text-right">Plazo</TableHead>
              <TableHead className="text-right">Línea</TableHead>
              <TableHead className="text-right">Dispuesto</TableHead>
              <TableHead className="text-right">Disponible</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-8"
                >
                  Sin bancos.
                </TableCell>
              </TableRow>
            )}
            {rows.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.nombre}</TableCell>
                <TableCell>{b.tipo_credito}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {(Number(b.tasa_anual) * 100).toFixed(2)}%
                </TableCell>
                <TableCell className="text-right">{b.plazo_meses} m</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMXN(b.linea_credito)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMXN(b.dispuesto)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMXN(b.disponible)}
                </TableCell>
                <TableCell>{b.estado}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/admin/bancos/${b.id}`}
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
