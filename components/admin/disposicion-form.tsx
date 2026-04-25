"use client"

import { useFormState, useFormStatus } from "react-dom"
import { useRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ActionResult } from "@/app/(admin)/admin/bancos/actions"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Agregando…" : "Agregar disposición"}
    </Button>
  )
}

export function DisposicionForm({
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
      encType="multipart/form-data"
    >
      <div className="grid gap-2">
        <Label htmlFor="d_monto">Monto MXN</Label>
        <Input
          id="d_monto"
          name="monto"
          type="number"
          min="0"
          step="0.01"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="d_fecha">Fecha</Label>
        <Input id="d_fecha" name="fecha" type="date" required />
      </div>
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor="d_desc">Descripción</Label>
        <Input id="d_desc" name="descripcion" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="d_proof">Proof</Label>
        <Input id="d_proof" name="proof" type="file" />
      </div>
      <div className="md:col-span-5 flex gap-3 items-center">
        <SubmitButton />
        {state && !state.ok && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state && state.ok && (
          <p className="text-sm text-emerald-600">Disposición agregada.</p>
        )}
      </div>
    </form>
  )
}
