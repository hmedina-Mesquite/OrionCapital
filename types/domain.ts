import type { Database } from "./database"

export type UserRole = Database["public"]["Enums"]["user_role"]
export type EstadoDestino = Database["public"]["Enums"]["estado_destino"]
export type EstadoBank = Database["public"]["Enums"]["estado_bank"]
export type EstadoInversion = Database["public"]["Enums"]["estado_inversion"]
export type EstadoTranche = Database["public"]["Enums"]["estado_tranche"]
export type TipoCredito = Database["public"]["Enums"]["tipo_credito"]
export type SourceType = Database["public"]["Enums"]["source_type"]
export type DestinationType = Database["public"]["Enums"]["destination_type"]
export type RecipientType = Database["public"]["Enums"]["recipient_type"]
export type TipoDistribucion = Database["public"]["Enums"]["tipo_distribucion"]
export type AmortizacionEstado = Database["public"]["Enums"]["amortizacion_estado"]
export type ReservaTipo = Database["public"]["Enums"]["reserva_tipo"]
export type InversionMovimientoTipo =
  Database["public"]["Enums"]["inversion_movimiento_tipo"]

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
