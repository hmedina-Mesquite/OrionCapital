import "server-only"
import { createClient as createSbClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Service-role client that bypasses RLS. Never import from a Client Component.
// Used by Sprint 6+ background jobs (mora cron, nightly reconciliation).
export function createAdminClient() {
  return createSbClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
}
