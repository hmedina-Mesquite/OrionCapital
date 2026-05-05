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

type PrestamoRow = {
  id: string
  nombre_persona: string
  cantidad: number
  tasa_anual: number
  plazo_meses: number
  fecha_inicio: string
  estado: string
  email: string | null
  tipo: "personal" | "negocio"
}

export default async function PrestamosPage() {
  const supabase = createClient()
  const { data: prestamos } = await supabase
    .from("prestamos")
    .select(
      "id, nombre_persona, cantidad, tasa_anual, plazo_meses, fecha_inicio, estado, email, tipo",
    )
    .order("created_at", { ascending: false })

  const all = (prestamos ?? []) as PrestamoRow[]
  const personales = all.filter((p) => p.tipo === "personal")
  const negocios = all.filter((p) => p.tipo === "negocio")

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Préstamos</h1>
          <p className="text-muted-foreground text-sm">
            Préstamos personales y a negocios.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/export?entity=prestamos"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Exportar Excel
          </a>
          <Button render={<Link href="/admin/prestamos/new">Nuevo</Link>} />
        </div>
      </div>

      <PrestamosSection
        title="Préstamos personales"
        subtitle="Otorgados a personas físicas."
        accentClass="bg-sky-500"
        rows={personales}
        emptyLabel="Sin préstamos personales."
      />

      <PrestamosSection
        title="Préstamos a negocios"
        subtitle="Otorgados a personas morales / empresas."
        accentClass="bg-amber-500"
        rows={negocios}
        emptyLabel="Sin préstamos a negocios."
      />
    </div>
  )
}

function PrestamosSection({
  title,
  subtitle,
  accentClass,
  rows,
  emptyLabel,
}: {
  title: string
  subtitle: string
  accentClass: string
  rows: PrestamoRow[]
  emptyLabel: string
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={`inline-block h-2.5 w-2.5 rounded-full ${accentClass}`}
        />
        <h2 className="text-lg font-medium">{title}</h2>
        <span className="text-muted-foreground text-xs">
          ({rows.length})
        </span>
      </div>
      <p className="text-muted-foreground text-xs">{subtitle}</p>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{title.includes("negocios") ? "Empresa" : "Persona"}</TableHead>
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
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-8"
                >
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.nombre_persona}
                </TableCell>
                <TableCell>{p.email ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMXN(p.cantidad)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {(Number(p.tasa_anual) * 100).toFixed(2)}%
                </TableCell>
                <TableCell className="text-right">
                  {p.plazo_meses} m
                </TableCell>
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
    </section>
  )
}
