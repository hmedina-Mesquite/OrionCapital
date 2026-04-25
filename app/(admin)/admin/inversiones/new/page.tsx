import { InversionForm } from "@/components/admin/inversion-form"
import { createInversion } from "../actions"

export default function NewInversionPage() {
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold">Nueva inversión</h1>
        <p className="text-muted-foreground text-sm">
          Datos del venture. Movimientos y fondeos se registran después.
        </p>
      </div>
      <InversionForm action={createInversion} submitLabel="Crear" />
    </div>
  )
}
