# Orion Capital

Financial management app replacing the legacy Excel workflow. Tracks capital sources (inversionistas + bancos), destinations (inversiones, créditos, préstamos), the funding waterfall, and the Reserva fund.

## Stack

Next.js 14 App Router · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres 17 + Auth + Storage + RLS) · Recharts · @react-pdf/renderer. Spanish UI, `es-MX` locale, MXN-only currency, `America/Monterrey` timezone.

## Prerequisites

- Node 20.11+ (use `.nvmrc`)
- pnpm 9 (`corepack enable pnpm && corepack prepare pnpm@9 --activate`)
- Supabase CLI (installed as dev dep — run via `pnpm exec supabase ...`)

## First-run setup

1. `cp .env.example .env.local`, then paste the `service_role` JWT from Supabase dashboard → Project Settings → API into `SUPABASE_SERVICE_ROLE_KEY`.
2. `pnpm install`
3. `pnpm dev` — opens at <http://localhost:3000>.

## Bootstrap the first admin

The database default role for new signups is `debtor` (least-privileged). After signing up with your email via the Supabase dashboard (Auth → Add User) or by hitting `/login` once you build a signup page, promote yourself with this SQL in the Supabase SQL editor:

```sql
update public.profiles
set role = 'admin'
where email = 'hector.medina.rdz.123@gmail.com';
```

Sign out and sign back in — you will land at `/admin`.

## Scripts

- `pnpm dev` — Next dev server
- `pnpm build` — production build
- `pnpm lint` — eslint
- `pnpm exec supabase db diff --linked` — diff local migrations vs cloud (run `pnpm exec supabase link --project-ref gtncjcbjwmybcvgoivbd` once to set up)
- Regenerate DB types: `pnpm exec supabase gen types typescript --project-id gtncjcbjwmybcvgoivbd > types/database.ts`

## Project layout

```
web/
├── app/                   Next.js App Router routes
│   ├── (auth)/            /login, centered-card layout
│   ├── (admin)/admin/*    Admin routes (sidebar shell)
│   ├── (investor)/        Investor portal (Sprint 7)
│   ├── (debtor)/          Debtor portal (Sprint 7)
│   └── auth/callback      OAuth / magic-link exchange
├── components/
│   ├── ui/                shadcn primitives
│   ├── admin/             sidebar + top-nav + user-menu
│   └── auth/              login-form
├── lib/
│   ├── supabase/          client / server / middleware / admin
│   ├── auth.ts            requireRole helper
│   ├── money.ts           formatMXN / parseMXN
│   ├── dates.ts           America/Monterrey helpers
│   └── validators.ts      RFC + CLABE
├── middleware.ts          auth refresh + role-based routing
├── supabase/
│   ├── config.toml
│   └── migrations/        0001_enums.sql … 0010_rls_policies.sql
└── types/                 database.ts (generated), domain.ts
```

## Sprint 1 status

- Full schema laid down: 17 tables, 13 enums, 21 RLS policies, generic audit trigger wired to 3 high-value tables.
- Role-based auth flow (login → middleware → role home).
- Admin shell with placeholder pages for every route in the spec.
- No CRUD, no charts, no cron, no PDFs — those land in Sprints 2–10.
