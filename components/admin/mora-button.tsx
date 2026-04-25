"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"

export function MoraButton({
  action,
}: {
  action: () => Promise<{ ok: true; count: number }>
}) {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function onClick() {
    setMsg(null)
    startTransition(async () => {
      const r = await action()
      setMsg(`${r.count} cuotas marcadas vencidas.`)
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={onClick} disabled={pending} variant="outline" size="sm">
        {pending ? "Marcando…" : "Marcar cuotas vencidas"}
      </Button>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
    </div>
  )
}
