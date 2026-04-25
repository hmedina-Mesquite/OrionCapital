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

## Sprint status

- **Sprint 1** — Schema (17 tables, 13 enums, RLS, generic audit), auth + role routing, admin shell, storage bucket.
- **Sprint 2** — Inversionistas + Bancos CRUD with proof uploads + tranches/disposiciones sub-tables. Migrations `0011`–`0012`.
- **Sprint 3** — Inversiones + Créditos + Préstamos CRUD, audit triggers extended, polymorphic FK validation trigger on `fundings`. Migration `0013`.
- **Sprint 4** — French amortization generator, `regenerateSchedule` action, schedule view on credito/prestamo, payments page with mora→interés→capital cascade. Migration `0014`.
- **Sprint 5** — Reserva movements, Settings editor, KPI dashboard.
- **Sprint 6** — Investor + Debtor portals; Reportes (concentración + aging).
- **Sprint 7** — Recharts dashboard charts (cobranza, fuente mix, status).
- **Sprint 8** — Fundings UI on every destination + manual mora marker on Reportes.
- **Sprint 9** — Investor PDF statement at `/inversionista/statement`.
- **Sprint 10** — Payment-distribution waterfall: pro-rata to investor/bank fundings, reserva auto-aporte (per `settings.reserva_percentage`), orion residual.

### Applying new migrations

After pulling, push migrations to the linked Supabase project:

```bash
pnpm exec supabase db push
```

Then regenerate DB types so TS picks up new triggers/columns:

```bash
pnpm exec supabase gen types typescript --project-id gtncjcbjwmybcvgoivbd > types/database.ts
```
