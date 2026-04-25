"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatMXN } from "@/lib/money"
import { updateDistribution } from "@/app/(admin)/admin/pagos/actions"

export function DistributionRowEditor({
  id,
  monto,
  manualOverride,
}: {
  id: string
  monto: number
  manualOverride: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(monto))
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  function save() {
    setErr(null)
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 0) {
      setErr("Monto inválido")
      return
    }
    startTransition(async () => {
      const r = await updateDistribution(id, parsed, reason)
      if (!r.ok) setErr(r.error)
      else setEditing(false)
    })
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="tabular-nums">{formatMXN(monto)}</span>
        {manualOverride && (
          <span className="text-xs text-amber-600 font-medium">override</span>
        )}
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          Editar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 items-end min-w-[280px]">
      <Input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={pending}
        className="text-right tabular-nums"
      />
      <Input
        placeholder="Motivo del override…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={pending}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditing(false)
            setValue(String(monto))
            setReason("")
            setErr(null)
          }}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  )
}
