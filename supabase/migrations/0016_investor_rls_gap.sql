-- Sprint 1's RLS only granted DEBTORS read access to the destinations they
-- borrow against. Spec also gives INVESTORS read access to destinations they
-- have funded, plus the schedule + payments + fundings tied to those
-- destinations. This migration closes that gap.

-- Reusable predicate: does auth.uid() have a tranche that funds (type, id)?
create or replace function public.investor_funded_destination(
  p_destination_type public.destination_type,
  p_destination_id  uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.fundings f
      join public.investor_tranches it on it.id = f.source_id
      join public.investors i on i.id = it.investor_id
     where f.source_type      = 'investor_tranche'
       and f.destination_type = p_destination_type
       and f.destination_id   = p_destination_id
       and i.profile_id       = auth.uid()
  );
$$;

-- Schedule of destinations they funded.
create policy amortization_select_investor on public.amortization_schedule
  for select using (
    public.investor_funded_destination(destination_type, destination_id)
  );

-- Payments on destinations they funded.
create policy payments_select_investor on public.payments
  for select using (
    public.investor_funded_destination(destination_type, destination_id)
  );

-- Destination metadata (so the portal can render names/status).
create policy creditos_select_investor on public.creditos
  for select using (
    public.investor_funded_destination('credito'::public.destination_type, id)
  );

create policy prestamos_select_investor on public.prestamos
  for select using (
    public.investor_funded_destination('prestamo'::public.destination_type, id)
  );

create policy inversiones_select_investor on public.inversiones
  for select using (
    public.investor_funded_destination('inversion'::public.destination_type, id)
  );

-- Funding rows tied to their tranches.
create policy fundings_select_investor on public.fundings
  for select using (
    source_type = 'investor_tranche'
    and exists (
      select 1
        from public.investor_tranches it
        join public.investors i on i.id = it.investor_id
       where it.id          = fundings.source_id
         and i.profile_id   = auth.uid()
    )
  );
