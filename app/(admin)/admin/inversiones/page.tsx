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

export default async function InversionesPage() {
  const supabase = createClient()
  const [{ data: invs }, { data: movs }] = await Promise.all([
    supabase
      .from("inversiones")
      .select("id, nombre, domicilio_fiscal, presupuesto, estado")
      .order("created_at", { ascending: false }),
    supabase.from("inversion_movimientos").select("inversion_id, tipo, monto"),
  ])

  const ingresoByInv = new Map<string, number>()
  const gastoByInv = new Map<string, number>()
  for (const m of movs ?? []) {
    if (m.tipo === "ingreso") {
      ingresoByInv.set(
        m.inversion_id,
        (ingresoByInv.get(m.inversion_id) ?? 0) + Number(m.monto),
      )
    } else {
      gastoByInv.set(
        m.inversion_id,
        (gastoByInv.get(m.inversion_id) ?? 0) + Number(m.monto),
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inversiones</h1>
          <p className="text-muted-foreground text-sm">
            Ventures en los que Orion despliega capital propio.
          </p>
        </div>
        <Button render={<Link href="/admin/inversiones/new">Nueva</Link>} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Domicilio</TableHead>
              <TableHead className="text-right">Presupuesto</TableHead>
              <TableHead className="text-right">Ingresos</TableHead>
              <TableHead className="text-right">Gastos</TableHead>
              <TableHead className="text-right">Neto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(invs ?? []).length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-8"
                >
                  Sin inversiones.
                </TableCell>
              </TableRow>
            )}
            {(invs ?? []).map((i) => {
              const ingreso = ingresoByInv.get(i.id) ?? 0
              const gasto = gastoByInv.get(i.id) ?? 0
              return (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.nombre}</TableCell>
                  <TableCell>{i.domicilio_fiscal}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMXN(i.presupuesto)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMXN(ingreso)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMXN(gasto)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMXN(ingreso - gasto)}
                  </TableCell>
                  <TableCell>{i.estado}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/inversiones/${i.id}`}
                      className="text-primary text-sm hover:underline"
                    >
                      Abrir
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
