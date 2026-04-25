-- Step 1 of the post-Sprint-4 plan: nightly mora sweep.
-- Replaces the manual-only `markPastDue` button. The same RPC is wired into
-- the button in the UI so admin can still force a sweep on demand.
--
-- Schedule: 03:00 UTC daily ≈ 21:00 America/Monterrey (after business hours).

create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.mark_past_due()
returns table (schedule_marked int, destinations_flipped int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_schedule_marked  int := 0;
  v_dest_flipped     int := 0;
  v_today            date := current_date;
  v_rec              record;
begin
  -- 1. Flip pendiente rows past due → vencida.
  update public.amortization_schedule
     set estado = 'vencida'
   where fecha_vencimiento < v_today
     and estado = 'pendiente';
  get diagnostics v_schedule_marked = row_count;

  -- 2. Flip parent credito/prestamo to en_mora if any vencida row remains.
  for v_rec in
    select distinct destination_type, destination_id
      from public.amortization_schedule
     where estado = 'vencida'
  loop
    if v_rec.destination_type = 'credito' then
      update public.creditos
         set estado = 'en_mora'
       where id = v_rec.destination_id
         and estado in ('activo', 'pre_aprobado');
      if found then v_dest_flipped := v_dest_flipped + 1; end if;
    elsif v_rec.destination_type = 'prestamo' then
      update public.prestamos
         set estado = 'en_mora'
       where id = v_rec.destination_id
         and estado in ('activo', 'pre_aprobado');
      if found then v_dest_flipped := v_dest_flipped + 1; end if;
    end if;
  end loop;

  return query select v_schedule_marked, v_dest_flipped;
end;
$$;

-- Re-schedule idempotently. Drop existing job (if any), then create fresh.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'mark_past_due_nightly') then
    perform cron.unschedule('mark_past_due_nightly');
  end if;
end $$;

select cron.schedule(
  'mark_past_due_nightly',
  '0 3 * * *',
  $cron$ select public.mark_past_due(); $cron$
);
