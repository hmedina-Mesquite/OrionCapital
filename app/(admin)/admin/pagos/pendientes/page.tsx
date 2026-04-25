import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatMXN } from "@/lib/money"
import { formatDate, formatDateTime } from "@/lib/dates"
import { signProofUrl } from "@/lib/storage"
import { PendingPaymentActions } from "@/components/admin/pending-payment-row"

export const dynamic = "force-dynamic"

const estadoLabels: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
}

export default async function PendientesPage() {
  const supabase = createClient()

  const { data: pendings } = await supabase
    .from("pending_payments")
    .select(
      `id, destination_type, destination_id, monto_total, fecha_pago, notas,
       proof_storage_path, proof_file_name, estado,
       submitted_at, reviewed_at, rejection_reason,
       submitted_by, reviewed_by`,
    )
    .order("submitted_at", { ascending: false })

  const submitterIds = Array.from(
    new Set((pendings ?? []).map((p) => p.submitted_by).filter(Boolean)),
  ) as string[]
  const { data: profiles } = submitterIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", submitterIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] }
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name ?? p.email ?? p.id.slice(0, 8)]),
  )

  // Sign URLs for the pending (and recently-reviewed) proof files so the
  // admin can inspect them.
  const proofUrls = new Map<string, string>()
  for (const p of pendings ?? []) {
    if (p.proof_storage_path) {
      const url = await signProofUrl(p.proof_storage_path, 300)
      if (url) proofUrls.set(p.id, url)
    }
  }

  const pendingCount = (pendings ?? []).filter((p) => p.estado === "pending").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pagos pendientes de aprobación</h1>
          <p className="text-sm text-muted-foreground">
            {pendingCount} pendiente{pendingCount === 1 ? "" : "s"}.
          </p>
        </div>
        <Link
          href="/admin/pagos"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          ← Volver a pagos
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cola</CardTitle>
        </CardHeader>
        <CardContent>
          {(!pendings || pendings.length === 0) ? (
            <p className="text-sm text-muted-foreground">Sin envíos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enviado</TableHead>
                  <TableHead>Deudor</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Fecha pago</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendings.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(p.submitted_at)}
                    </TableCell>
                    <TableCell>{profileMap.get(p.submitted_by) ?? "—"}</TableCell>
                    <TableCell className="capitalize">
                      {p.destination_type}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMXN(p.monto_total)}
                    </TableCell>
                    <TableCell>{formatDate(p.fecha_pago)}</TableCell>
                    <TableCell>
                      {proofUrls.get(p.id) ? (
                        <a
                          href={proofUrls.get(p.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline"
                        >
                          {p.proof_file_name ?? "Ver"}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.estado === "approved"
                            ? "default"
                            : p.estado === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {estadoLabels[p.estado] ?? p.estado}
                      </Badge>
                      {p.estado === "rejected" && p.rejection_reason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {p.rejection_reason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.estado === "pending" ? (
                        <PendingPaymentActions id={p.id} />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {p.reviewed_at ? formatDateTime(p.reviewed_at) : "—"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
