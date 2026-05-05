"use client"

import { useFormState, useFormStatus } from "react-dom"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { ActionResult } from "@/app/(admin)/admin/prestamos/actions"

export type PrestamoFormDefaults = {
  tipo?: "personal" | "negocio" | null
  nombre_persona?: string | null
  cantidad?: number | string | null
  tasa_anual?: number | string | null
  plazo_meses?: number | null
  fecha_inicio?: string | null
  tasa_mora_multiplicador?: number | string | null
  estado?: string | null
  rfc?: string | null
  domicilio_fiscal?: string | null
  email?: string | null
  telefono?: string | null
  google_drive_folder_url?: string | null
  detalles?: string | null
  debtor_email?: string | null
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : label}
    </Button>
  )
}

export function PrestamoForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: ActionResult | null, fd: FormData) => Promise<ActionResult>
  defaults?: PrestamoFormDefaults
  submitLabel: string
}) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    action,
    null,
  )

  return (
    <form action={formAction} className="space-y-4 max-w-xl" encType="multipart/form-data">
      <div className="grid gap-2">
        <Label>Tipo de préstamo *</Label>
        <div
          role="radiogroup"
          aria-label="Tipo de préstamo"
          className="inline-flex rounded-lg border border-border bg-background p-0.5"
        >
          {(
            [
              { value: "personal", label: "Personal" },
              { value: "negocio", label: "Negocio" },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              className="relative cursor-pointer select-none px-3 py-1 text-sm rounded-md has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
            >
              <input
                type="radio"
                name="tipo"
                value={opt.value}
                defaultChecked={
                  (defaults?.tipo ?? "personal") === opt.value
                }
                className="sr-only"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="nombre_persona">
          Nombre de la persona / empresa *
        </Label>
        <Input
          id="nombre_persona"
          name="nombre_persona"
          required
          defaultValue={defaults?.nombre_persona ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="cantidad">Cantidad *</Label>
          <Input
            id="cantidad"
            name="cantidad"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={defaults?.cantidad ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="estado">Estado</Label>
          <select
            id="estado"
            name="estado"
            defaultValue={defaults?.estado ?? "pre_aprobado"}
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="pre_aprobado">Pre-aprobado</option>
            <option value="activo">Activo</option>
            <option value="en_mora">En mora</option>
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="tasa_anual">Tasa anual *</Label>
          <Input
            id="tasa_anual"
            name="tasa_anual"
            type="number"
            min="0"
            max="1"
            step="0.0001"
            placeholder="0.30"
            required
            defaultValue={defaults?.tasa_anual ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="plazo_meses">Plazo (meses) *</Label>
          <Input
            id="plazo_meses"
            name="plazo_meses"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={defaults?.plazo_meses ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tasa_mora_multiplicador">Mora x</Label>
          <Input
            id="tasa_mora_multiplicador"
            name="tasa_mora_multiplicador"
            type="number"
            min="1"
            step="0.1"
            defaultValue={defaults?.tasa_mora_multiplicador ?? "1.5"}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="fecha_inicio">Fecha inicio *</Label>
        <Input
          id="fecha_inicio"
          name="fecha_inicio"
          type="date"
          required
          defaultValue={defaults?.fecha_inicio ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="rfc">RFC</Label>
          <Input id="rfc" name="rfc" defaultValue={defaults?.rfc ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="domicilio_fiscal">Domicilio fiscal</Label>
          <Input
            id="domicilio_fiscal"
            name="domicilio_fiscal"
            defaultValue={defaults?.domicilio_fiscal ?? ""}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
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
      </div>
      <div className="grid gap-2">
        <Label htmlFor="debtor_email">Correo del deudor (portal)</Label>
        <Input
          id="debtor_email"
          name="debtor_email"
          type="email"
          defaultValue={defaults?.debtor_email ?? ""}
        />
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
      <div className="grid gap-2">
        <Label htmlFor="contrato">Contrato (PDF/imagen)</Label>
        <Input id="contrato" name="contrato" type="file" />
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
          href="/admin/prestamos"
          className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-sm hover:bg-muted"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
