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
import { formatDate, daysBetweenISO, todayISO } from "@/lib/dates"

export const dynamic = "force-dynamic"

export default async function TranchesPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: investor } = await supabase
    .from("investors")
    .select("id, nombre, rfc")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!investor) {
    return (
      <p className="text-muted-foreground text-sm">
        Aún no estás vinculado como inversionista.
      </p>
    )
  }

  const { data: tranches } = await supabase
    .from("investor_tranches")
    .select("*")
    .eq("investor_id", investor.id)
    .order("fecha_inicio", { ascending: false })

  const trancheIds = (tranches ?? []).map((t) => t.id)

  // For each tranche: which destinations did it fund?
  const { data: fundings } = trancheIds.length
    ? await supabase
        .from("fundings")
        .select("source_id, destination_type, destination_id, monto")
        .eq("source_type", "investor_tranche")
        .in("source_id", trancheIds)
    : { data: [] }

  const creditoIds = (fundings ?? [])
    .filter((f) => f.destination_type === "credito")
    .map((f) => f.destination_id)
  const prestamoIds = (fundings ?? [])
    .filter((f) => f.destination_type === "prestamo")
    .map((f) => f.destination_id)

  const [{ data: creditos }, { data: prestamos }] = await Promise.all([
    creditoIds.length
      ? supabase.from("creditos").select("id, nombre_proyecto, estado").in("id", creditoIds)
      : Promise.resolve({ data: [] as { id: string; nombre_proyecto: string; estado: string }[] }),
    prestamoIds.length
      ? supabase.from("prestamos").select("id, nombre_persona, estado").in("id", prestamoIds)
      : Promise.resolve({ data: [] as { id: string; nombre_persona: string; estado: string }[] }),
  ])

  const creditoMap = new Map((creditos ?? []).map((c) => [c.id, c]))
  const prestamoMap = new Map((prestamos ?? []).map((p) => [p.id, p]))

  const today = todayISO()

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Mis tranches</h1>
        <p className="text-muted-foreground text-sm">
          Cada tranche financia uno o más destinos. Aquí ves el desglose.
        </p>
      </div>

      {(tranches ?? []).length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Sin tranches todavía.
          </CardContent>
        </Card>
      )}

      {(tranches ?? []).map((t) => {
        const trancheFundings = (fundings ?? []).filter((f) => f.source_id === t.id)
        const totalFunded = trancheFundings.reduce(
          (s, f) => s + Number(f.monto),
          0,
        )
        const remaining = Math.max(0, Number(t.monto) - totalFunded)
        const daysToMaturity = daysBetweenISO(today, t.fecha_vencimiento)
        return (
          <Card key={t.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">
                    {formatMXN(t.monto)} ·{" "}
                    {(Number(t.tasa_anual) * 100).toFixed(2)}%
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(t.fecha_inicio)} → {formatDate(t.fecha_vencimiento)}
                    {" · "}
                    {t.plazo_meses} meses
                    {t.estado === "activo" && (
                      <span className={daysToMaturity <= 90 ? "ml-2 text-amber-600 font-medium" : "ml-2"}>
                        ({daysToMaturity > 0
                          ? `vence en ${daysToMaturity} días`
                          : daysToMaturity === 0
                            ? "vence hoy"
                            : `vencido hace ${-daysToMaturity} días`})
                      </span>
                    )}
                  </p>
                </div>
                <Badge
                  variant={t.estado === "activo" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {t.estado}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Comprometido</div>
                  <div className="tabular-nums">{formatMXN(totalFunded)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Disponible</div>
                  <div className="tabular-nums">{formatMXN(remaining)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Destinos</div>
                  <div className="tabular-nums">{trancheFundings.length}</div>
                </div>
              </div>

              {trancheFundings.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Destino</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trancheFundings.map((f, i) => {
                        const dest =
                          f.destination_type === "credito"
                            ? creditoMap.get(f.destination_id)
                            : prestamoMap.get(f.destination_id)
                        const label =
                          dest && "nombre_proyecto" in dest
                            ? dest.nombre_proyecto
                            : dest && "nombre_persona" in dest
                              ? dest.nombre_persona
                              : f.destination_id.slice(0, 8)
                        return (
                          <TableRow key={`${f.source_id}-${i}`}>
                            <TableCell>{label}</TableCell>
                            <TableCell className="capitalize">
                              {f.destination_type}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMXN(f.monto)}
                            </TableCell>
                            <TableCell className="capitalize">
                              {dest?.estado ?? "—"}
                            </TableCell>
                          </TableRow>
                        )
                      })}
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
