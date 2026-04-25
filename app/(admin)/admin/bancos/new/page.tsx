import { BankForm } from "@/components/admin/bank-form"
import { createBank } from "../actions"

export default function NewBankPage() {
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo banco</h1>
        <p className="text-muted-foreground text-sm">
          Datos de la línea de crédito. Disposiciones se agregan después.
        </p>
      </div>
      <BankForm action={createBank} submitLabel="Crear" />
    </div>
  )
}
