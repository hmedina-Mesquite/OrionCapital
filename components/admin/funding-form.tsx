"use client"

import { useFormState, useFormStatus } from "react-dom"
import { useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ActionResult } from "@/app/(admin)/admin/_lib/funding-actions"

type Option = { id: string; label: string }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Vinculando…" : "Vincular fuente"}
    </Button>
  )
}

export function FundingForm({
  action,
  tranches,
  disposiciones,
}: {
  action: (s: ActionResult | null, fd: FormData) => Promise<ActionResult>
  tranches: Option[]
  disposiciones: Option[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [sourceType, setSourceType] = useState<
    "investor_tranche" | "bank_disposicion"
  >("investor_tranche")
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    async (s, fd) => {
      const r = await action(s, fd)
      if (r.ok) formRef.current?.reset()
      return r
    },
    null,
  )

  const opts = sourceType === "investor_tranche" ? tranches : disposiciones

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 md:grid-cols-5 items-end"
    >
      <div className="grid gap-2">
        <Label htmlFor="f_st">Tipo fuente</Label>
        <select
          id="f_st"
          name="source_type"
          value={sourceType}
          onChange={(e) =>
            setSourceType(
              e.target.value as "investor_tranche" | "bank_disposicion",
            )
          }
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="investor_tranche">Tranche inversionista</option>
          <option value="bank_disposicion">Disposición bancaria</option>
        </select>
      </div>
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor="f_sid">Fuente</Label>
        <select
          id="f_sid"
          name="source_id"
          required
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="">Seleccionar…</option>
          {opts.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="f_monto">Monto</Label>
        <Input
          id="f_monto"
          name="monto"
          type="number"
          min="0"
          step="0.01"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="f_fecha">Fecha</Label>
        <Input id="f_fecha" name="fecha" type="date" required />
      </div>
      <div className="md:col-span-5 flex gap-3 items-center">
        <SubmitButton />
        {state && !state.ok && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state && state.ok && (
          <p className="text-sm text-emerald-600">Fuente vinculada.</p>
        )}
      </div>
    </form>
  )
}
