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

export default async function CreditosPage() {
  const supabase = createClient()
  const { data: creditos } = await supabase
    .from("creditos")
    .select(
      "id, nombre_proyecto, presupuesto, tasa_anual, plazo_meses, fecha_inicio, estado, contacto_nombre",
    )
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Créditos</h1>
          <p className="text-muted-foreground text-sm">
            Créditos comerciales otorgados a empresas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/export?entity=creditos"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Exportar Excel
          </a>
          <Button render={<Link href="/admin/creditos/new">Nuevo</Link>} />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proyecto</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="text-right">Presupuesto</TableHead>
              <TableHead className="text-right">Tasa</TableHead>
              <TableHead className="text-right">Plazo</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(creditos ?? []).length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-8"
                >
                  Sin créditos.
                </TableCell>
              </TableRow>
            )}
            {(creditos ?? []).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nombre_proyecto}</TableCell>
                <TableCell>{c.contacto_nombre ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMXN(c.presupuesto)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {(Number(c.tasa_anual) * 100).toFixed(2)}%
                </TableCell>
                <TableCell className="text-right">{c.plazo_meses} m</TableCell>
                <TableCell>{formatDate(c.fecha_inicio)}</TableCell>
                <TableCell>{c.estado}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/admin/creditos/${c.id}`}
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
