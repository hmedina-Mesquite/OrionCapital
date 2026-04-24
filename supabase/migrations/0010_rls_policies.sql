-- RLS helpers + policies for all public.* tables + storage.objects.
-- Helpers are security definer with pinned search_path so policies can read
-- profiles without triggering recursive RLS.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Enable RLS everywhere in public.
alter table public.profiles                enable row level security;
alter table public.investors               enable row level security;
alter table public.investor_tranches       enable row level security;
alter table public.banks                   enable row level security;
alter table public.bank_disposiciones      enable row level security;
alter table public.inversiones             enable row level security;
alter table public.inversion_movimientos   enable row level security;
alter table public.creditos                enable row level security;
alter table public.prestamos               enable row level security;
alter table public.fundings                enable row level security;
alter table public.amortization_schedule   enable row level security;
alter table public.payments                enable row level security;
alter table public.payment_distributions   enable row level security;
alter table public.reserva_movements       enable row level security;
alter table public.settings                enable row level security;
alter table public.proof_files             enable row level security;
alter table public.audit_log               enable row level security;

-- profiles: users read their own row; admins manage all.
create policy profiles_select_self_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy profiles_insert_admin on public.profiles
  for insert with check (public.is_admin());
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());
create policy profiles_delete_admin on public.profiles
  for delete using (public.is_admin());

-- Admin full access on every other public table.
create policy investors_admin_all on public.investors
  for all using (public.is_admin()) with check (public.is_admin());
create policy investor_tranches_admin_all on public.investor_tranches
  for all using (public.is_admin()) with check (public.is_admin());
create policy banks_admin_all on public.banks
  for all using (public.is_admin()) with check (public.is_admin());
create policy bank_disposiciones_admin_all on public.bank_disposiciones
  for all using (public.is_admin()) with check (public.is_admin());
create policy inversiones_admin_all on public.inversiones
  for all using (public.is_admin()) with check (public.is_admin());
create policy inversion_movimientos_admin_all on public.inversion_movimientos
  for all using (public.is_admin()) with check (public.is_admin());
create policy creditos_admin_all on public.creditos
  for all using (public.is_admin()) with check (public.is_admin());
create policy prestamos_admin_all on public.prestamos
  for all using (public.is_admin()) with check (public.is_admin());
create policy fundings_admin_all on public.fundings
  for all using (public.is_admin()) with check (public.is_admin());
create policy amortization_admin_all on public.amortization_schedule
  for all using (public.is_admin()) with check (public.is_admin());
create policy payments_admin_all on public.payments
  for all using (public.is_admin()) with check (public.is_admin());
create policy payment_distributions_admin_all on public.payment_distributions
  for all using (public.is_admin()) with check (public.is_admin());
create policy reserva_movements_admin_all on public.reserva_movements
  for all using (public.is_admin()) with check (public.is_admin());
create policy settings_admin_all on public.settings
  for all using (public.is_admin()) with check (public.is_admin());
create policy proof_files_admin_all on public.proof_files
  for all using (public.is_admin()) with check (public.is_admin());
create policy audit_log_admin_all on public.audit_log
  for all using (public.is_admin()) with check (public.is_admin());

-- Investor read access to their own rows.
create policy investors_select_own on public.investors
  for select using (profile_id = auth.uid());

create policy investor_tranches_select_own on public.investor_tranches
  for select using (
    exists (
      select 1 from public.investors i
      where i.id = investor_tranches.investor_id
        and i.profile_id = auth.uid()
    )
  );

create policy payment_distributions_select_own on public.payment_distributions
  for select using (
    recipient_type = 'investor_tranche'
    and exists (
      select 1 from public.investor_tranches it
      join public.investors i on i.id = it.investor_id
      where it.id = payment_distributions.recipient_id
        and i.profile_id = auth.uid()
    )
  );

-- Debtor read access to their creditos / prestamos + related schedule & payments.
create policy creditos_select_own on public.creditos
  for select using (profile_id = auth.uid());

create policy prestamos_select_own on public.prestamos
  for select using (profile_id = auth.uid());

create policy amortization_select_own on public.amortization_schedule
  for select using (
    (destination_type = 'credito' and exists (
      select 1 from public.creditos c
      where c.id = amortization_schedule.destination_id
        and c.profile_id = auth.uid()
    ))
    or (destination_type = 'prestamo' and exists (
      select 1 from public.prestamos p
      where p.id = amortization_schedule.destination_id
        and p.profile_id = auth.uid()
    ))
  );

create policy payments_select_own on public.payments
  for select using (
    (destination_type = 'credito' and exists (
      select 1 from public.creditos c
      where c.id = payments.destination_id
        and c.profile_id = auth.uid()
    ))
    or (destination_type = 'prestamo' and exists (
      select 1 from public.prestamos p
      where p.id = payments.destination_id
        and p.profile_id = auth.uid()
    ))
  );

-- Storage RLS: admin anywhere, debtor in pending_payments/{uid}/ only.
create policy proof_files_admin_rw on storage.objects
  for all
  using (bucket_id = 'proof-files' and public.is_admin())
  with check (bucket_id = 'proof-files' and public.is_admin());

create policy proof_files_debtor_write_pending on storage.objects
  for insert
  with check (
    bucket_id = 'proof-files'
    and (storage.foldername(name))[1] = 'pending_payments'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy proof_files_debtor_read_pending on storage.objects
  for select
  using (
    bucket_id = 'proof-files'
    and (storage.foldername(name))[1] = 'pending_payments'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
