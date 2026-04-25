import { CreditoForm } from "@/components/admin/credito-form"
import { createCredito } from "../actions"

export default function NewCreditoPage() {
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo crédito</h1>
        <p className="text-muted-foreground text-sm">
          Datos del crédito comercial. Cronograma se generará después.
        </p>
      </div>
      <CreditoForm action={createCredito} submitLabel="Crear" />
    </div>
  )
}
