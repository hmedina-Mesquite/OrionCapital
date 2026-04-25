"use client"

import { useFormState, useFormStatus } from "react-dom"
import { useRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ActionResult } from "@/app/(admin)/admin/inversiones/actions"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Agregando…" : "Agregar movimiento"}
    </Button>
  )
}

export function MovimientoForm({
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
      className="grid gap-3 md:grid-cols-6 items-end"
      encType="multipart/form-data"
    >
      <div className="grid gap-2">
        <Label htmlFor="m_tipo">Tipo</Label>
        <select
          id="m_tipo"
          name="tipo"
          required
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="ingreso">Ingreso</option>
          <option value="gasto">Gasto</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="m_monto">Monto</Label>
        <Input
          id="m_monto"
          name="monto"
          type="number"
          min="0"
          step="0.01"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="m_fecha">Fecha</Label>
        <Input id="m_fecha" name="fecha" type="date" required />
      </div>
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor="m_desc">Descripción</Label>
        <Input id="m_desc" name="descripcion" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="m_proof">Proof</Label>
        <Input id="m_proof" name="proof" type="file" />
      </div>
      <div className="md:col-span-6 flex gap-3 items-center">
        <SubmitButton />
        {state && !state.ok && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state && state.ok && (
          <p className="text-sm text-emerald-600">Movimiento agregado.</p>
        )}
      </div>
    </form>
  )
}
