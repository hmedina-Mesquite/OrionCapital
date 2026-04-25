-- Step 8: per-admin Google OAuth tokens for Drive folder linking.
-- Each admin connects their own Google account; tokens are scoped to that
-- admin only (RLS).

create table public.admin_google_tokens (
  admin_id      uuid primary key references public.profiles(id) on delete cascade,
  google_email  text,
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz not null,
  scope         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.admin_google_tokens enable row level security;

create policy admin_google_tokens_self on public.admin_google_tokens
  for all using (admin_id = auth.uid()) with check (admin_id = auth.uid());

create trigger admin_google_tokens_set_updated_at
  before update on public.admin_google_tokens
  for each row execute function public.set_updated_at();
