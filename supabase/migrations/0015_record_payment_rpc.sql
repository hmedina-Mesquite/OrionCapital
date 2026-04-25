-- record_payment: atomic payment + waterfall + reserva + estado flips.
-- Replaces the multi-step JS flow that could leave the ledger inconsistent
-- on partial failure.
--
-- Spec implementation:
--   1. Walk schedule rows oldest-first.
--   2. For each overdue row, compute mora =
--      saldo_pendiente_de_la_cuota * tasa_anual * mora_mult / 365 * dias_mora
--      and deduct it from the payment first.
--   3. Then deduct that row's interes_esperado, then capital_esperado.
--   4. Mark the row pagada_total / pagada_parcial accordingly.
--   5. Distribute interes + capital pro-rata across fundings (banks first,
--      investors second — pro-rata since fundings carry their own monto).
--   6. Reserva auto-aporte: settings.reserva_percentage of interes.
--   7. Orion gets the spread (interes - investors_share - reserva) + capital
--      rounding crumbs + 100% of mora.
--   8. Auto-flip parent credito/prestamo:
--        completado if every row is pagada_total
--        activo    if it was en_mora and now no vencida rows remain
--
-- Returns the new payment.id.

create or replace function public.record_payment(
  p_destination_type public.destination_type,
  p_destination_id  uuid,
  p_fecha_pago      date,
  p_monto_total     numeric,
  p_proof_file_id   uuid,
  p_notas           text
) returns uuid
language plpgsql
as $$
declare
  v_payment_id          uuid;
  v_remaining           numeric := p_monto_total;
  v_capital_total       numeric := 0;
  v_interes_total       numeric := 0;
  v_mora_total          numeric := 0;
  v_first_schedule_id   uuid;
  v_tasa_anual          numeric;
  v_mora_mult           numeric;
  v_today               date    := current_date;
  v_row                 record;
  v_dias_mora           int;
  v_prior_paid          numeric;
  v_saldo_pendiente     numeric;
  v_mora_due            numeric;
  v_int_part            numeric;
  v_cap_part            numeric;
  v_mora_part           numeric;
  v_funding             record;
  v_total_funding       numeric;
  v_share               numeric;
  v_funding_int_share   numeric;
  v_funding_cap_share   numeric;
  v_interes_asignado    numeric := 0;
  v_capital_asignado    numeric := 0;
  v_reserva_pct         numeric;
  v_reserva_aporte      numeric;
  v_orion_interes       numeric;
  v_capital_remainder   numeric;
  v_prev_reserva        numeric;
  v_actor               uuid    := auth.uid();
  v_dest_estado         public.estado_destino;
  v_pending_count       int;
  v_vencida_count       int;
begin
  if p_proof_file_id is null then
    raise exception 'proof_file_id is required';
  end if;
  if p_destination_type not in ('credito', 'prestamo') then
    raise exception 'payments are only valid for credito or prestamo';
  end if;
  if p_monto_total is null or p_monto_total <= 0 then
    raise exception 'monto_total must be > 0';
  end if;

  if p_destination_type = 'credito' then
    select tasa_anual, tasa_mora_multiplicador
      into v_tasa_anual, v_mora_mult
      from public.creditos where id = p_destination_id;
  else
    select tasa_anual, tasa_mora_multiplicador
      into v_tasa_anual, v_mora_mult
      from public.prestamos where id = p_destination_id;
  end if;
  if v_tasa_anual is null then
    raise exception 'destination not found: % %', p_destination_type, p_destination_id;
  end if;

  -- 1-4. Walk schedule rows; deduct mora → interes → capital.
  for v_row in
    select * from public.amortization_schedule
     where destination_type = p_destination_type
       and destination_id  = p_destination_id
       and estado in ('pendiente', 'pagada_parcial', 'vencida')
     order by numero_cuota asc
  loop
    if v_remaining <= 0 then exit; end if;

    if v_row.fecha_vencimiento < v_today then
      select coalesce(sum(monto_total), 0)
        into v_prior_paid
        from public.payments
       where amortization_schedule_id = v_row.id;
      v_saldo_pendiente := v_row.cuota_esperada - v_prior_paid;
      if v_saldo_pendiente > 0 then
        v_dias_mora := v_today - v_row.fecha_vencimiento;
        v_mora_due := round(
          v_saldo_pendiente * v_tasa_anual * v_mora_mult / 365 * v_dias_mora,
          2
        );
        if v_mora_due > 0 then
          v_mora_part := least(v_mora_due, v_remaining);
          v_remaining  := round(v_remaining - v_mora_part, 2);
          v_mora_total := round(v_mora_total + v_mora_part, 2);
        end if;
      end if;
    end if;

    if v_remaining <= 0 then exit; end if;

    v_int_part := least(v_row.interes_esperado, v_remaining);
    v_remaining     := round(v_remaining - v_int_part, 2);
    v_interes_total := round(v_interes_total + v_int_part, 2);

    v_cap_part := 0;
    if v_remaining > 0 then
      v_cap_part      := least(v_row.capital_esperado, v_remaining);
      v_remaining     := round(v_remaining - v_cap_part, 2);
      v_capital_total := round(v_capital_total + v_cap_part, 2);
    end if;

    if v_int_part >= v_row.interes_esperado - 0.005
       and v_cap_part >= v_row.capital_esperado - 0.005
    then
      update public.amortization_schedule set estado = 'pagada_total' where id = v_row.id;
    else
      update public.amortization_schedule set estado = 'pagada_parcial' where id = v_row.id;
    end if;

    if v_first_schedule_id is null then
      v_first_schedule_id := v_row.id;
    end if;
  end loop;

  -- 5. Insert payment.
  insert into public.payments (
    destination_type, destination_id, fecha_pago, monto_total,
    monto_capital, monto_interes, monto_mora,
    notas, proof_file_id, amortization_schedule_id, created_by
  ) values (
    p_destination_type, p_destination_id, p_fecha_pago, p_monto_total,
    v_capital_total, v_interes_total, v_mora_total,
    p_notas, p_proof_file_id, v_first_schedule_id, v_actor
  ) returning id into v_payment_id;

  -- 6. Pro-rata distribution to fundings.
  select coalesce(sum(monto), 0) into v_total_funding
    from public.fundings
   where destination_type = p_destination_type
     and destination_id  = p_destination_id;

  if v_total_funding > 0 and (v_interes_total > 0 or v_capital_total > 0) then
    for v_funding in
      select source_type, source_id, monto
        from public.fundings
       where destination_type = p_destination_type
         and destination_id  = p_destination_id
    loop
      v_share := v_funding.monto / v_total_funding;
      if v_interes_total > 0 then
        v_funding_int_share := round(v_interes_total * v_share, 2);
        if v_funding_int_share > 0 then
          insert into public.payment_distributions
            (payment_id, recipient_type, recipient_id, tipo, monto)
          values (
            v_payment_id,
            (case when v_funding.source_type = 'investor_tranche'
                  then 'investor_tranche' else 'bank' end)::public.recipient_type,
            v_funding.source_id, 'interes', v_funding_int_share
          );
          v_interes_asignado := round(v_interes_asignado + v_funding_int_share, 2);
        end if;
      end if;
      if v_capital_total > 0 then
        v_funding_cap_share := round(v_capital_total * v_share, 2);
        if v_funding_cap_share > 0 then
          insert into public.payment_distributions
            (payment_id, recipient_type, recipient_id, tipo, monto)
          values (
            v_payment_id,
            (case when v_funding.source_type = 'investor_tranche'
                  then 'investor_tranche' else 'bank' end)::public.recipient_type,
            v_funding.source_id, 'capital', v_funding_cap_share
          );
          v_capital_asignado := round(v_capital_asignado + v_funding_cap_share, 2);
        end if;
      end if;
    end loop;
  end if;

  -- 7. Reserva auto-aporte.
  select reserva_percentage into v_reserva_pct from public.settings where id = 1;
  if v_reserva_pct is null or v_reserva_pct < 0 or v_reserva_pct > 1 then
    v_reserva_pct := 0.10;
  end if;
  v_reserva_aporte := round(v_interes_total * v_reserva_pct, 2);
  if v_reserva_aporte > 0 then
    insert into public.payment_distributions
      (payment_id, recipient_type, recipient_id, tipo, monto)
    values (v_payment_id, 'reserva', null, 'interes', v_reserva_aporte);
  end if;

  -- 8. Orion gets the rest of interes + capital crumbs + all mora.
  v_orion_interes := round(v_interes_total - v_interes_asignado - v_reserva_aporte, 2);
  if v_orion_interes > 0 then
    insert into public.payment_distributions
      (payment_id, recipient_type, recipient_id, tipo, monto)
    values (v_payment_id, 'orion', null, 'interes', v_orion_interes);
  end if;

  v_capital_remainder := round(v_capital_total - v_capital_asignado, 2);
  if v_capital_remainder > 0 then
    insert into public.payment_distributions
      (payment_id, recipient_type, recipient_id, tipo, monto)
    values (v_payment_id, 'orion', null, 'capital', v_capital_remainder);
  end if;

  if v_mora_total > 0 then
    insert into public.payment_distributions
      (payment_id, recipient_type, recipient_id, tipo, monto)
    values (v_payment_id, 'orion', null, 'interes', v_mora_total);
  end if;

  -- 9. Reserva ledger.
  if v_reserva_aporte > 0 then
    select coalesce(saldo_despues, 0)
      into v_prev_reserva
      from public.reserva_movements
     order by created_at desc limit 1;
    insert into public.reserva_movements (
      tipo, monto, saldo_despues, payment_id,
      default_destination_type, default_destination_id, razon, created_by
    ) values (
      'aporte_auto', v_reserva_aporte,
      round(coalesce(v_prev_reserva, 0) + v_reserva_aporte, 2),
      v_payment_id,
      p_destination_type, p_destination_id,
      format('%s%% de interés cobrado', round(v_reserva_pct * 100, 2)::text),
      v_actor
    );
  end if;

  -- 10. Auto-flip parent estado.
  select count(*) into v_pending_count
    from public.amortization_schedule
   where destination_type = p_destination_type
     and destination_id  = p_destination_id
     and estado <> 'pagada_total';

  select count(*) into v_vencida_count
    from public.amortization_schedule
   where destination_type = p_destination_type
     and destination_id  = p_destination_id
     and estado = 'vencida';

  if p_destination_type = 'credito' then
    select estado into v_dest_estado from public.creditos where id = p_destination_id;
    if v_pending_count = 0 then
      update public.creditos set estado = 'completado' where id = p_destination_id;
    elsif v_dest_estado = 'en_mora' and v_vencida_count = 0 then
      update public.creditos set estado = 'activo' where id = p_destination_id;
    end if;
  else
    select estado into v_dest_estado from public.prestamos where id = p_destination_id;
    if v_pending_count = 0 then
      update public.prestamos set estado = 'completado' where id = p_destination_id;
    elsif v_dest_estado = 'en_mora' and v_vencida_count = 0 then
      update public.prestamos set estado = 'activo' where id = p_destination_id;
    end if;
  end if;

  return v_payment_id;
end;
$$;
