import Link from "next/link"
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
import { buttonVariants } from "@/components/ui/button"
import { formatDateTime } from "@/lib/dates"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 50

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { table?: string; op?: string; page?: string }
}) {
  const supabase = createClient()
  const page = Math.max(1, Number(searchParams.page ?? 1))
  const tableFilter = searchParams.table ?? ""
  const opFilter = searchParams.op ?? ""

  let q = supabase
    .from("audit_log")
    .select("id, table_name, row_id, op, actor, before, after, at", {
      count: "exact",
    })
    .order("at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
  if (tableFilter) q = q.eq("table_name", tableFilter)
  if (opFilter) q = q.eq("op", opFilter)
  const { data: entries, count } = await q

  const actorIds = Array.from(
    new Set((entries ?? []).map((e) => e.actor).filter(Boolean)),
  ) as string[]
  const { data: actors } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", actorIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] }
  const actorMap = new Map(
    (actors ?? []).map((a) => [a.id, a.full_name ?? a.email ?? a.id.slice(0, 8)]),
  )

  // List of distinct table_names for the filter — small enough to inline.
  const { data: distinctTables } = await supabase
    .from("audit_log")
    .select("table_name")
    .limit(500)
  const tableNames = Array.from(
    new Set((distinctTables ?? []).map((r) => r.table_name)),
  ).sort()

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bitácora de auditoría</h1>
        <p className="text-sm text-muted-foreground">
          {count ?? 0} eventos. Cada cambio en tablas con triggers de auditoría
          queda registrado aquí.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="GET" className="flex flex-wrap gap-3 items-end">
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">Tabla</label>
              <select
                name="table"
                defaultValue={tableFilter}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">Todas</option>
                {tableNames.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <label className="text-xs text-muted-foreground">Operación</label>
              <select
                name="op"
                defaultValue={opFilter}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">Todas</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <button type="submit" className={buttonVariants({ size: "sm" })}>
              Aplicar
            </button>
            {(tableFilter || opFilter) && (
              <Link
                href="/admin/audit"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Limpiar
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Cuándo</TableHead>
                <TableHead>Tabla</TableHead>
                <TableHead>Op</TableHead>
                <TableHead>Fila</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Antes / Después</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(entries ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Sin eventos.
                  </TableCell>
                </TableRow>
              )}
              {(entries ?? []).map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDateTime(e.at)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{e.table_name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        e.op === "DELETE"
                          ? "destructive"
                          : e.op === "INSERT"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {e.op}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {String(e.row_id).slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {e.actor ? actorMap.get(e.actor) ?? "—" : "sistema"}
                  </TableCell>
                  <TableCell>
                    <details className="cursor-pointer">
                      <summary className="text-xs underline">Ver diff</summary>
                      <pre className="text-xs mt-2 bg-muted/50 p-2 rounded max-w-xl overflow-auto">
{JSON.stringify({ before: e.before, after: e.after }, null, 2)}
                      </pre>
                    </details>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <div className="flex-1" />
          {page > 1 && (
            <Link
              href={`/admin/audit?page=${page - 1}${tableFilter ? `&table=${tableFilter}` : ""}${opFilter ? `&op=${opFilter}` : ""}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              ← Anterior
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={`/admin/audit?page=${page + 1}${tableFilter ? `&table=${tableFilter}` : ""}${opFilter ? `&op=${opFilter}` : ""}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
