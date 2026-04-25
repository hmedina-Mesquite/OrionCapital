"use client"

import { useState, useTransition } from "react"
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
import type { Database } from "@/types/database"

type ScheduleRow = Database["public"]["Tables"]["amortization_schedule"]["Row"]

export function ScheduleSection({
  rows,
  generate,
}: {
  rows: ScheduleRow[]
  generate: () => Promise<{ ok: true; rows: number } | { ok: false; error: string }>
}) {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function onGenerate() {
    setMsg(null)
    startTransition(async () => {
      const r = await generate()
      if (r.ok) setMsg(`${r.rows} cuotas generadas.`)
      else setMsg(`Error: ${r.error}`)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Cronograma</h2>
        <Button onClick={onGenerate} disabled={pending} variant="outline" size="sm">
          {pending ? "Generando…" : rows.length ? "Regenerar" : "Generar cronograma"}
        </Button>
      </div>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin cronograma. Genera para ver las cuotas calculadas.
        </p>
      ) : (
        <div className="rounded-lg border">
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
                  <TableCell>{r.estado}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
