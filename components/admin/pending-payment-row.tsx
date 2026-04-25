"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  approvePendingPayment,
  rejectPendingPayment,
} from "@/app/(admin)/admin/pagos/pendientes/actions"

export function PendingPaymentActions({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const [mode, setMode] = useState<"idle" | "rejecting">("idle")
  const [reason, setReason] = useState("")
  const [msg, setMsg] = useState<string | null>(null)

  function approve() {
    setMsg(null)
    startTransition(async () => {
      const r = await approvePendingPayment(id)
      if (!r.ok) setMsg(`Error: ${r.error}`)
    })
  }

  function reject() {
    if (!reason.trim()) {
      setMsg("Indica el motivo del rechazo.")
      return
    }
    setMsg(null)
    startTransition(async () => {
      const r = await rejectPendingPayment(id, reason)
      if (!r.ok) setMsg(`Error: ${r.error}`)
      else setMode("idle")
    })
  }

  if (mode === "rejecting") {
    return (
      <div className="flex flex-col gap-2 min-w-[280px]">
        <Input
          placeholder="Motivo del rechazo…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={pending}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={reject}
            disabled={pending}
          >
            {pending ? "Rechazando…" : "Confirmar rechazo"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMode("idle")}
            disabled={pending}
          >
            Cancelar
          </Button>
        </div>
        {msg && <p className="text-xs text-destructive">{msg}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 items-end">
      <div className="flex gap-2">
        <Button size="sm" onClick={approve} disabled={pending}>
          {pending ? "Aprobando…" : "Aprobar"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setMode("rejecting")}
          disabled={pending}
        >
          Rechazar
        </Button>
      </div>
      {msg && <p className="text-xs text-destructive">{msg}</p>}
    </div>
  )
}
