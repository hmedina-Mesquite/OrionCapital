"use client"

import { useFormState, useFormStatus } from "react-dom"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ActionResult } from "@/app/(admin)/admin/bancos/actions"

export type BankFormDefaults = {
  nombre?: string | null
  tipo_credito?: "simple" | "revolvente" | null
  numero_cuenta?: string | null
  tasa_anual?: number | string | null
  plazo_meses?: number | null
  linea_credito?: number | string | null
  comision_apertura?: number | string | null
  seguro_mensual?: number | string | null
  fecha_apertura?: string | null
  estado?: "activo" | "completado" | "cancelado" | null
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : label}
    </Button>
  )
}

export function BankForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: ActionResult | null, fd: FormData) => Promise<ActionResult>
  defaults?: BankFormDefaults
  submitLabel: string
}) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    action,
    null,
  )

  return (
    <form action={formAction} className="space-y-4 max-w-xl" encType="multipart/form-data">
      <div className="grid gap-2">
        <Label htmlFor="nombre">Banco *</Label>
        <Input
          id="nombre"
          name="nombre"
          required
          defaultValue={defaults?.nombre ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="tipo_credito">Tipo *</Label>
          <select
            id="tipo_credito"
            name="tipo_credito"
            defaultValue={defaults?.tipo_credito ?? "simple"}
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            required
          >
            <option value="simple">Simple</option>
            <option value="revolvente">Revolvente</option>
          </select>
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
            <option value="completado">Completado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="numero_cuenta">Número de cuenta</Label>
        <Input
          id="numero_cuenta"
          name="numero_cuenta"
          defaultValue={defaults?.numero_cuenta ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="tasa_anual">Tasa anual *</Label>
          <Input
            id="tasa_anual"
            name="tasa_anual"
            type="number"
            min="0"
            max="1"
            step="0.0001"
            placeholder="0.18"
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
      </div>
      <div className="grid gap-2">
        <Label htmlFor="linea_credito">Línea de crédito MXN *</Label>
        <Input
          id="linea_credito"
          name="linea_credito"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={defaults?.linea_credito ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="comision_apertura">Comisión apertura</Label>
          <Input
            id="comision_apertura"
            name="comision_apertura"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaults?.comision_apertura ?? "0"}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="seguro_mensual">Seguro mensual</Label>
          <Input
            id="seguro_mensual"
            name="seguro_mensual"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaults?.seguro_mensual ?? "0"}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="fecha_apertura">Fecha apertura</Label>
        <Input
          id="fecha_apertura"
          name="fecha_apertura"
          type="date"
          defaultValue={defaults?.fecha_apertura ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contrato">Contrato (PDF/imagen)</Label>
        <Input id="contrato" name="contrato" type="file" />
        <p className="text-xs text-muted-foreground">
          Subir reemplaza el contrato anterior.
        </p>
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
          href="/admin/bancos"
          className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 text-sm hover:bg-muted"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
