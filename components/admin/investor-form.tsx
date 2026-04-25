"use client"

import { useFormState, useFormStatus } from "react-dom"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { ActionResult } from "@/app/(admin)/admin/inversionistas/actions"

export type InvestorFormDefaults = {
  nombre?: string | null
  rfc?: string | null
  cuenta_bancaria?: string | null
  email?: string | null
  telefono?: string | null
  notas?: string | null
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : label}
    </Button>
  )
}

export function InvestorForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: ActionResult | null, fd: FormData) => Promise<ActionResult>
  defaults?: InvestorFormDefaults
  submitLabel: string
}) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    action,
    null,
  )

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <div className="grid gap-2">
        <Label htmlFor="nombre">Nombre *</Label>
        <Input
          id="nombre"
          name="nombre"
          required
          defaultValue={defaults?.nombre ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="rfc">RFC *</Label>
        <Input
          id="rfc"
          name="rfc"
          required
          defaultValue={defaults?.rfc ?? ""}
          placeholder="XAXX010101000"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cuenta_bancaria">CLABE</Label>
        <Input
          id="cuenta_bancaria"
          name="cuenta_bancaria"
          defaultValue={defaults?.cuenta_bancaria ?? ""}
          placeholder="18 dígitos"
          inputMode="numeric"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={defaults?.email ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="telefono">Teléfono</Label>
        <Input
          id="telefono"
          name="telefono"
          defaultValue={defaults?.telefono ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notas">Notas</Label>
        <Textarea
          id="notas"
          name="notas"
          rows={3}
          defaultValue={defaults?.notas ?? ""}
        />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state && state.ok && (
        <p className="text-sm text-emerald-600">Guardado.</p>
      )}
      <div className="flex gap-2">
        <SubmitButton label={submitLabel} />
        <Link
          href="/admin/inversionistas"
          className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-sm hover:bg-muted"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
