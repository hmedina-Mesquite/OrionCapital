import { redirect } from "next/navigation"

// Middleware handles all routing; this is just a fallback entry point.
export default function HomePage() {
  redirect("/login")
}
