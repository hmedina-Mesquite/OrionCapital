"use client"

import { useFormState, useFormStatus } from "react-dom"
import { useRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ActionResult } from "@/app/(admin)/admin/inversionistas/actions"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Agregando…" : "Agregar tranche"}
    </Button>
  )
}

export function TrancheForm({
  action,
}: {
  action: (state: ActionResult | null, fd: FormData) => Promise<ActionResult>
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    async (s, fd) => {
      const r = await action(s, fd)
      if (r.ok) formRef.current?.reset()
      return r
    },
    null,
  )

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 md:grid-cols-5 items-end"
    >
      <div className="grid gap-2">
        <Label htmlFor="t_monto">Monto MXN</Label>
        <Input
          id="t_monto"
          name="monto"
          type="number"
          min="0"
          step="0.01"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="t_tasa">Tasa anual</Label>
        <Input
          id="t_tasa"
          name="tasa_anual"
          type="number"
          min="0"
          max="1"
          step="0.0001"
          placeholder="0.12"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="t_plazo">Plazo (meses)</Label>
        <Input
          id="t_plazo"
          name="plazo_meses"
          type="number"
          min="1"
          step="1"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="t_fecha">Fecha inicio</Label>
        <Input id="t_fecha" name="fecha_inicio" type="date" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="t_proof">Proof</Label>
        <Input id="t_proof" name="proof" type="file" />
      </div>
      <div className="md:col-span-5 flex gap-3 items-center">
        <SubmitButton />
        {state && !state.ok && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state && state.ok && (
          <p className="text-sm text-emerald-600">Tranche agregado.</p>
        )}
      </div>
    </form>
  )
}
