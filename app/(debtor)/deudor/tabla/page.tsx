import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatMXN } from "@/lib/money"
import { formatDate } from "@/lib/dates"

export const dynamic = "force-dynamic"

const estadoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  pagada_parcial: "Pago parcial",
  pagada_total: "Pagada",
  vencida: "Vencida",
}

const estadoVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pagada_total: "default",
  pagada_parcial: "secondary",
  vencida: "destructive",
  pendiente: "outline",
}

export default async function DeudorTabla() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: creditos }, { data: prestamos }] = await Promise.all([
    supabase
      .from("creditos")
      .select("id, nombre_proyecto, presupuesto, plazo_meses, fecha_inicio, estado, tasa_anual")
      .eq("profile_id", user.id),
    supabase
      .from("prestamos")
      .select("id, nombre_persona, cantidad, plazo_meses, fecha_inicio, estado, tasa_anual")
      .eq("profile_id", user.id),
  ])

  const destinations = [
    ...(creditos ?? []).map((c) => ({
      type: "credito" as const,
      id: c.id,
      label: c.nombre_proyecto,
      monto: Number(c.presupuesto),
      tasa: Number(c.tasa_anual),
      plazo: c.plazo_meses,
      estado: c.estado,
    })),
    ...(prestamos ?? []).map((p) => ({
      type: "prestamo" as const,
      id: p.id,
      label: p.nombre_persona,
      monto: Number(p.cantidad),
      tasa: Number(p.tasa_anual),
      plazo: p.plazo_meses,
      estado: p.estado,
    })),
  ]

  if (destinations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tienes créditos ni préstamos vinculados a tu cuenta.
      </p>
    )
  }

  // Fetch all schedules in one query, then group by destination.
  const ids = destinations.map((d) => d.id)
  const { data: schedule } = await supabase
    .from("amortization_schedule")
    .select("*")
    .in("destination_id", ids)
    .order("numero_cuota", { ascending: true })

  const grouped = new Map<string, typeof schedule>()
  for (const r of schedule ?? []) {
    const key = `${r.destination_type}:${r.destination_id}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(r)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Cronograma</h1>
        <p className="text-muted-foreground text-sm">
          Tabla de amortización de cada uno de tus créditos / préstamos.
        </p>
      </div>

      {destinations.map((d) => {
        const rows = grouped.get(`${d.type}:${d.id}`) ?? []
        return (
          <Card key={`${d.type}-${d.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{d.label}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatMXN(d.monto)} · {(d.tasa * 100).toFixed(2)}% ·{" "}
                    {d.plazo} meses
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {d.estado.replace(/_/g, " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no se ha generado el cronograma.
                </p>
              ) : (
                <div className="rounded-md border max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">#</TableHead>
                        <TableHead>Vence</TableHead>
                        <TableHead className="text-right">Capital</TableHead>
                        <TableHead className="text-right">Interés</TableHead>
                        <TableHead className="text-right">Cuota</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-right">{r.numero_cuota}</TableCell>
                          <TableCell>{formatDate(r.fecha_vencimiento)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMXN(r.capital_esperado)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMXN(r.interes_esperado)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMXN(r.cuota_esperada)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMXN(r.saldo_restante)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                estadoVariant[r.estado] ?? "outline"
                              }
                            >
                              {estadoLabels[r.estado] ?? r.estado}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
