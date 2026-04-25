-- Step 2: pending_payments queue. Debtors upload payment proofs to a
-- holding table; admins approve (which calls record_payment) or reject
-- (which marks rejected and lets the JS layer delete the storage object).
--
-- Spec: "All writes by non-admins are disabled except the debtor proof upload
-- flow, which writes to a `pending_payments` queue that admins approve."
--
-- The proof_files row is NOT created at submission time. We only persist it
-- when the admin approves, so rejected uploads stay out of the canonical
-- proof_files table.

create type public.pending_payment_estado as enum (
  'pending', 'approved', 'rejected'
);

create table public.pending_payments (
  id                  uuid primary key default gen_random_uuid(),
  destination_type    public.destination_type not null
    check (destination_type in ('credito', 'prestamo')),
  destination_id      uuid not null,
  monto_total         numeric(15,2) not null check (monto_total > 0),
  fecha_pago          date not null,
  notas               text,
  -- Storage info for the uploaded proof. Sits in storage at
  -- proof-files/pending_payments/{submitted_by}/...
  proof_storage_path  text not null,
  proof_file_name     text,
  proof_mime_type     text,
  proof_size_bytes    int,
  estado              public.pending_payment_estado not null default 'pending',
  submitted_by        uuid not null references public.profiles(id) on delete cascade,
  submitted_at        timestamptz not null default now(),
  reviewed_by         uuid references public.profiles(id) on delete set null,
  reviewed_at         timestamptz,
  rejection_reason    text,
  approved_payment_id uuid references public.payments(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index pending_payments_estado_idx       on public.pending_payments(estado);
create index pending_payments_destination_idx  on public.pending_payments(destination_type, destination_id);
create index pending_payments_submitted_by_idx on public.pending_payments(submitted_by);

alter table public.pending_payments enable row level security;

-- Admin: full access.
create policy pending_payments_admin_all on public.pending_payments
  for all using (public.is_admin()) with check (public.is_admin());

-- Debtor: insert only against destinations they own (profile_id match).
create policy pending_payments_debtor_insert on public.pending_payments
  for insert
  with check (
    submitted_by = auth.uid()
    and (
      (destination_type = 'credito' and exists (
        select 1 from public.creditos c
         where c.id = destination_id and c.profile_id = auth.uid()
      ))
      or (destination_type = 'prestamo' and exists (
        select 1 from public.prestamos p
         where p.id = destination_id and p.profile_id = auth.uid()
      ))
    )
  );

-- Debtor: read own submissions.
create policy pending_payments_debtor_select on public.pending_payments
  for select using (submitted_by = auth.uid());

create trigger audit_pending_payments
  after insert or update or delete on public.pending_payments
  for each row execute function public.audit_if_modified();

-- Approve: persist a proof_files row, run record_payment, mark approved.
create or replace function public.approve_pending_payment(
  p_pending_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending     public.pending_payments%rowtype;
  v_proof_id    uuid;
  v_payment_id  uuid;
  v_reviewer    uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  select * into v_pending
    from public.pending_payments
   where id = p_pending_id and estado = 'pending'
   for update;
  if not found then
    raise exception 'pending payment not found or already processed: %', p_pending_id;
  end if;

  insert into public.proof_files
    (storage_path, file_name, mime_type, size_bytes, uploaded_by)
  values (
    v_pending.proof_storage_path,
    v_pending.proof_file_name,
    v_pending.proof_mime_type,
    v_pending.proof_size_bytes,
    v_pending.submitted_by
  )
  returning id into v_proof_id;

  v_payment_id := public.record_payment(
    v_pending.destination_type,
    v_pending.destination_id,
    v_pending.fecha_pago,
    v_pending.monto_total,
    v_proof_id,
    coalesce(v_pending.notas, '(aprobado por admin)')
  );

  update public.pending_payments
     set estado              = 'approved',
         reviewed_by         = v_reviewer,
         reviewed_at         = now(),
         approved_payment_id = v_payment_id
   where id = p_pending_id;

  return v_payment_id;
end;
$$;

-- Reject: mark rejected. Storage object cleanup happens from the JS server
-- action (Postgres can't delete from Supabase Storage directly).
create or replace function public.reject_pending_payment(
  p_pending_id uuid,
  p_reason     text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_storage_path text;
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  update public.pending_payments
     set estado           = 'rejected',
         reviewed_by      = auth.uid(),
         reviewed_at      = now(),
         rejection_reason = nullif(trim(p_reason), '')
   where id = p_pending_id and estado = 'pending'
   returning proof_storage_path into v_storage_path;

  if v_storage_path is null then
    raise exception 'pending payment not found or already processed';
  end if;
  return v_storage_path;
end;
$$;
