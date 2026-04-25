"use client"

import { useFormState, useFormStatus } from "react-dom"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { ActionResult } from "@/app/(admin)/admin/inversiones/actions"

export type InversionFormDefaults = {
  nombre?: string | null
  domicilio_fiscal?: string | null
  presupuesto?: number | string | null
  estado?: "activo" | "exitado" | "cancelado" | null
  google_drive_folder_url?: string | null
  detalles?: string | null
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : label}
    </Button>
  )
}

export function InversionForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: ActionResult | null, fd: FormData) => Promise<ActionResult>
  defaults?: InversionFormDefaults
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
        <Label htmlFor="domicilio_fiscal">Domicilio fiscal *</Label>
        <Input
          id="domicilio_fiscal"
          name="domicilio_fiscal"
          required
          defaultValue={defaults?.domicilio_fiscal ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="presupuesto">Presupuesto MXN *</Label>
          <Input
            id="presupuesto"
            name="presupuesto"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={defaults?.presupuesto ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="estado">Estado</Label>
          <select
            id="estado"
            name="estado"
            defaultValue={defaults?.estado ?? "activo"}
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="activo">Activo</option>
            <option value="exitado">Exitado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="google_drive_folder_url">Google Drive (URL)</Label>
        <Input
          id="google_drive_folder_url"
          name="google_drive_folder_url"
          defaultValue={defaults?.google_drive_folder_url ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="detalles">Detalles</Label>
        <Textarea
          id="detalles"
          name="detalles"
          rows={3}
          defaultValue={defaults?.detalles ?? ""}
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
          href="/admin/inversiones"
          className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-sm hover:bg-muted"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
