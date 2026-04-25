"use client"

import { useFormState, useFormStatus } from "react-dom"
import { useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { ActionResult } from "@/app/(debtor)/deudor/pagar/actions"

type Option = {
  id: string
  label: string
  type: "credito" | "prestamo"
  monto: number
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enviando…" : "Enviar comprobante"}
    </Button>
  )
}

export function PendingPaymentForm({
  action,
  options,
}: {
  action: (state: ActionResult | null, fd: FormData) => Promise<ActionResult>
  options: Option[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [selectedId, setSelectedId] = useState<string>("")
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    async (s, fd) => {
      const r = await action(s, fd)
      if (r.ok) {
        formRef.current?.reset()
        setSelectedId("")
      }
      return r
    },
    null,
  )

  const selected = options.find((o) => `${o.type}:${o.id}` === selectedId)

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-4 max-w-xl"
      encType="multipart/form-data"
    >
      {/* Hidden fields populated from the selected destination. */}
      <input
        type="hidden"
        name="destination_type"
        value={selected?.type ?? ""}
      />
      <input type="hidden" name="destination_id" value={selected?.id ?? ""} />

      <div className="grid gap-2">
        <Label htmlFor="dp_dest">Destino</Label>
        <select
          id="dp_dest"
          required
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">Selecciona un crédito o préstamo…</option>
          {options.map((o) => (
            <option key={`${o.type}:${o.id}`} value={`${o.type}:${o.id}`}>
              {o.type === "credito" ? "Crédito" : "Préstamo"} · {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="dp_fecha">Fecha del pago</Label>
          <Input id="dp_fecha" name="fecha_pago" type="date" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dp_monto">Monto pagado (MXN)</Label>
          <Input
            id="dp_monto"
            name="monto_total"
            type="number"
            min="0.01"
            step="0.01"
            required
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="dp_proof">Comprobante (imagen o PDF, máx 10 MB)</Label>
        <Input
          id="dp_proof"
          name="proof"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="dp_notas">Notas (opcional)</Label>
        <Textarea
          id="dp_notas"
          name="notas"
          rows={3}
          placeholder="Referencia bancaria, observación, etc."
        />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton />
        {state && !state.ok && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state && state.ok && (
          <p className="text-sm text-emerald-600">
            Enviado. Está pendiente de aprobación por administración.
          </p>
        )}
      </div>
    </form>
  )
}
