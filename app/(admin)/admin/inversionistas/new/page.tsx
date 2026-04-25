import { InvestorForm } from "@/components/admin/investor-form"
import { createInvestor } from "../actions"

export default function NewInvestorPage() {
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo inversionista</h1>
        <p className="text-muted-foreground text-sm">
          Datos de contacto y bancarios. Tranches se agregan en la página del
          inversionista.
        </p>
      </div>
      <InvestorForm action={createInvestor} submitLabel="Crear" />
    </div>
  )
}
