"use client"

import { useFormState, useFormStatus } from "react-dom"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ActionResult } from "@/app/(admin)/admin/settings/actions"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar"}
    </Button>
  )
}

export function SettingsForm({
  action,
  defaults,
}: {
  action: (s: ActionResult | null, fd: FormData) => Promise<ActionResult>
  defaults: {
    reserva_percentage: number
    default_investor_term_months: number
    default_mora_multiplier: number
  }
}) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    action,
    null,
  )

  return (
    <form action={formAction} className="space-y-4 max-w-md">
      <div className="grid gap-2">
        <Label htmlFor="reserva_percentage">% de reserva</Label>
        <Input
          id="reserva_percentage"
          name="reserva_percentage"
          type="number"
          step="0.0001"
          min="0"
          max="1"
          required
          defaultValue={defaults.reserva_percentage}
        />
        <p className="text-xs text-muted-foreground">
          Decimal entre 0 y 1. Ej: 0.10 = 10%.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="default_investor_term_months">
          Plazo default tranches (meses)
        </Label>
        <Input
          id="default_investor_term_months"
          name="default_investor_term_months"
          type="number"
          min="1"
          step="1"
          required
          defaultValue={defaults.default_investor_term_months}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="default_mora_multiplier">Multiplicador de mora</Label>
        <Input
          id="default_mora_multiplier"
          name="default_mora_multiplier"
          type="number"
          min="1"
          step="0.01"
          required
          defaultValue={defaults.default_mora_multiplier}
        />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state && state.ok && (
        <p className="text-sm text-emerald-600">Guardado.</p>
      )}
      <SubmitButton />
    </form>
  )
}
