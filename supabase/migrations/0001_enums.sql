-- Orion Capital — enum types used across the schema.
-- Values match the spec's UI labels (snake_cased).

create type public.user_role as enum ('admin', 'investor', 'debtor');

create type public.tipo_credito as enum ('simple', 'revolvente');

create type public.estado_destino as enum (
  'pre_aprobado', 'activo', 'en_mora', 'completado', 'cancelado'
);

create type public.estado_bank as enum ('activo', 'completado', 'cancelado');

create type public.estado_inversion as enum ('activo', 'exitado', 'cancelado');

create type public.estado_tranche as enum ('activo', 'vencido', 'reembolsado');

create type public.source_type as enum ('investor_tranche', 'bank_disposicion');

create type public.destination_type as enum ('inversion', 'credito', 'prestamo');

create type public.recipient_type as enum (
  'bank', 'investor_tranche', 'orion', 'reserva'
);

create type public.tipo_distribucion as enum ('capital', 'interes');

create type public.amortizacion_estado as enum (
  'pendiente', 'pagada_total', 'pagada_parcial', 'vencida'
);

create type public.reserva_tipo as enum (
  'aporte_auto', 'aporte_manual', 'retiro_default', 'retiro_manual'
);

create type public.inversion_movimiento_tipo as enum ('ingreso', 'gasto');
