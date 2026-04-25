import "server-only"
import { createClient } from "@/lib/supabase/server"

export const PROOF_BUCKET = "proof-files"
export const PROOF_MAX_BYTES = 10 * 1024 * 1024
export const PROOF_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

function sanitizeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120)
}

export type UploadProofResult =
  | { ok: true; proofFileId: string; storagePath: string }
  | { ok: false; error: string }

export async function uploadProof(
  file: File,
  category: string,
): Promise<UploadProofResult> {
  if (!file || file.size === 0) return { ok: false, error: "Archivo vacío" }
  if (file.size > PROOF_MAX_BYTES)
    return { ok: false, error: "Archivo excede 10 MB" }
  if (!PROOF_MIMES.includes(file.type))
    return { ok: false, error: `Tipo no permitido: ${file.type}` }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autenticado" }

  const ts = Date.now()
  const path = `admin/${category}/${ts}_${sanitizeName(file.name)}`
  const bytes = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await supabase.storage
    .from(PROOF_BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    })
  if (upErr) return { ok: false, error: upErr.message }

  const { data: row, error: insErr } = await supabase
    .from("proof_files")
    .insert({
      storage_path: path,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: user.id,
    })
    .select("id")
    .single()
  if (insErr || !row) {
    await supabase.storage.from(PROOF_BUCKET).remove([path])
    return { ok: false, error: insErr?.message ?? "No se guardó el proof" }
  }

  return { ok: true, proofFileId: row.id, storagePath: path }
}

export async function signProofUrl(
  storagePath: string,
  seconds = 60,
): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(storagePath, seconds)
  return data?.signedUrl ?? null
}

export async function deleteProof(proofFileId: string | null): Promise<void> {
  if (!proofFileId) return
  const supabase = createClient()
  const { data: pf } = await supabase
    .from("proof_files")
    .select("storage_path")
    .eq("id", proofFileId)
    .single()
  if (pf?.storage_path) {
    await supabase.storage.from(PROOF_BUCKET).remove([pf.storage_path])
  }
  await supabase.from("proof_files").delete().eq("id", proofFileId)
}
