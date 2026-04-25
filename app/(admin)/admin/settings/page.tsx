import { createClient } from "@/lib/supabase/server"
import { SettingsForm } from "@/components/admin/settings-form"
import { updateSettings } from "./actions"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single()

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Parámetros globales de Orion Capital.
        </p>
      </div>
      <SettingsForm
        action={updateSettings}
        defaults={{
          reserva_percentage: Number(settings?.reserva_percentage ?? 0.1),
          default_investor_term_months:
            settings?.default_investor_term_months ?? 24,
          default_mora_multiplier: Number(
            settings?.default_mora_multiplier ?? 1.5,
          ),
        }}
      />
    </div>
  )
}
