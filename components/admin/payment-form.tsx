"use client"

import { useFormState, useFormStatus } from "react-dom"
import { useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ActionResult } from "@/app/(admin)/admin/pagos/actions"

type Option = { id: string; label: string }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando…" : "Registrar pago"}
    </Button>
  )
}

export function PaymentForm({
  action,
  creditos,
  prestamos,
}: {
  action: (state: ActionResult | null, fd: FormData) => Promise<ActionResult>
  creditos: Option[]
  prestamos: Option[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [destType, setDestType] = useState<"credito" | "prestamo">("credito")
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    async (s, fd) => {
      const r = await action(s, fd)
      if (r.ok) formRef.current?.reset()
      return r
    },
    null,
  )

  const opts = destType === "credito" ? creditos : prestamos

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 md:grid-cols-6 items-end"
      encType="multipart/form-data"
    >
      <div className="grid gap-2">
        <Label htmlFor="p_dt">Tipo</Label>
        <select
          id="p_dt"
          name="destination_type"
          value={destType}
          onChange={(e) => setDestType(e.target.value as "credito" | "prestamo")}
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="credito">Crédito</option>
          <option value="prestamo">Préstamo</option>
        </select>
      </div>
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor="p_did">Destino</Label>
        <select
          id="p_did"
          name="destination_id"
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
        <Label htmlFor="p_fecha">Fecha pago</Label>
        <Input id="p_fecha" name="fecha_pago" type="date" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="p_monto">Monto</Label>
        <Input
          id="p_monto"
          name="monto_total"
          type="number"
          min="0"
          step="0.01"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="p_proof">Comprobante (requerido)</Label>
        <Input
          id="p_proof"
          name="proof"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        />
      </div>
      <div className="grid gap-2 md:col-span-6">
        <Label htmlFor="p_notas">Notas</Label>
        <Input id="p_notas" name="notas" />
      </div>
      <div className="md:col-span-6 flex gap-3 items-center">
        <SubmitButton />
        {state && !state.ok && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state && state.ok && (
          <p className="text-sm text-emerald-600">Pago registrado.</p>
        )}
      </div>
    </form>
  )
}
