import { PrestamoForm } from "@/components/admin/prestamo-form"
import { createPrestamo } from "../actions"

export default function NewPrestamoPage() {
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo préstamo</h1>
        <p className="text-muted-foreground text-sm">
          Datos del préstamo personal.
        </p>
      </div>
      <PrestamoForm action={createPrestamo} submitLabel="Crear" />
    </div>
  )
}
