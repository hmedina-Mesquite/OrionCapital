import Link from "next/link"
import { signProofUrl } from "@/lib/storage"
import { createClient } from "@/lib/supabase/server"

export async function ProofLink({
  proofFileId,
  className,
}: {
  proofFileId: string | null
  className?: string
}) {
  if (!proofFileId) return <span className="text-muted-foreground">—</span>
  const supabase = createClient()
  const { data: pf } = await supabase
    .from("proof_files")
    .select("storage_path, file_name")
    .eq("id", proofFileId)
    .single()
  if (!pf) return <span className="text-muted-foreground">—</span>
  const url = await signProofUrl(pf.storage_path, 300)
  if (!url) return <span className="text-muted-foreground">{pf.file_name}</span>
  return (
    <Link
      href={url}
      target="_blank"
      rel="noreferrer"
      className={className ?? "text-primary underline-offset-4 hover:underline"}
    >
      {pf.file_name ?? "Ver"}
    </Link>
  )
}
