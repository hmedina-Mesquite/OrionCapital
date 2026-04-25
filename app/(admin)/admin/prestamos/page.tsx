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
import { formatDate } from "@/lib/dates"

export const dynamic = "force-dynamic"

export default async function PrestamosPage() {
  const supabase = createClient()
  const { data: prestamos } = await supabase
    .from("prestamos")
    .select(
      "id, nombre_persona, cantidad, tasa_anual, plazo_meses, fecha_inicio, estado, email",
    )
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Préstamos</h1>
          <p className="text-muted-foreground text-sm">
            Préstamos personales otorgados a individuos.
          </p>
        </div>
        <Button render={<Link href="/admin/prestamos/new">Nuevo</Link>} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Persona</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Tasa</TableHead>
              <TableHead className="text-right">Plazo</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(prestamos ?? []).length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-8"
                >
                  Sin préstamos.
                </TableCell>
              </TableRow>
            )}
            {(prestamos ?? []).map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nombre_persona}</TableCell>
                <TableCell>{p.email ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMXN(p.cantidad)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {(Number(p.tasa_anual) * 100).toFixed(2)}%
                </TableCell>
                <TableCell className="text-right">{p.plazo_meses} m</TableCell>
                <TableCell>{formatDate(p.fecha_inicio)}</TableCell>
                <TableCell>{p.estado}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/admin/prestamos/${p.id}`}
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
