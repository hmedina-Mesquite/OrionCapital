import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PendingPaymentForm } from "@/components/debtor/pending-payment-form"
import { submitPendingPayment } from "./actions"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function DeudorPagar() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: creditos }, { data: prestamos }] = await Promise.all([
    supabase
      .from("creditos")
      .select("id, nombre_proyecto, presupuesto, estado")
      .eq("profile_id", user.id)
      .in("estado", ["activo", "en_mora"]),
    supabase
      .from("prestamos")
      .select("id, nombre_persona, cantidad, estado")
      .eq("profile_id", user.id)
      .in("estado", ["activo", "en_mora"]),
  ])

  const options = [
    ...(creditos ?? []).map((c) => ({
      id: c.id,
      label: c.nombre_proyecto,
      type: "credito" as const,
      monto: Number(c.presupuesto),
    })),
    ...(prestamos ?? []).map((p) => ({
      id: p.id,
      label: p.nombre_persona,
      type: "prestamo" as const,
      monto: Number(p.cantidad),
    })),
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Subir comprobante de pago</h1>
        <Link
          href="/deudor/historial"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Ver historial
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo comprobante</CardTitle>
        </CardHeader>
        <CardContent>
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tienes créditos o préstamos activos vinculados a tu cuenta.
              Si esto es un error, contacta a administración.
            </p>
          ) : (
            <PendingPaymentForm
              action={submitPendingPayment}
              options={options}
            />
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        El comprobante queda pendiente de aprobación. Una vez que el
        administrador lo confirme, se registrará el pago en tu cronograma.
      </p>
    </div>
  )
}
