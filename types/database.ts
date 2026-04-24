export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      amortization_schedule: {
        Row: {
          capital_esperado: number
          created_at: string
          cuota_esperada: number
          destination_id: string
          destination_type: Database["public"]["Enums"]["destination_type"]
          estado: Database["public"]["Enums"]["amortizacion_estado"]
          fecha_vencimiento: string
          id: string
          interes_esperado: number
          numero_cuota: number
          saldo_restante: number
        }
        Insert: {
          capital_esperado: number
          created_at?: string
          cuota_esperada: number
          destination_id: string
          destination_type: Database["public"]["Enums"]["destination_type"]
          estado?: Database["public"]["Enums"]["amortizacion_estado"]
          fecha_vencimiento: string
          id?: string
          interes_esperado: number
          numero_cuota: number
          saldo_restante: number
        }
        Update: {
          capital_esperado?: number
          created_at?: string
          cuota_esperada?: number
          destination_id?: string
          destination_type?: Database["public"]["Enums"]["destination_type"]
          estado?: Database["public"]["Enums"]["amortizacion_estado"]
          fecha_vencimiento?: string
          id?: string
          interes_esperado?: number
          numero_cuota?: number
          saldo_restante?: number
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          actor: string | null
          after: Json | null
          at: string
          before: Json | null
          id: number
          op: string
          row_id: string
          table_name: string
        }
        Insert: {
          actor?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          id?: number
          op: string
          row_id: string
          table_name: string
        }
        Update: {
          actor?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          id?: number
          op?: string
          row_id?: string
          table_name?: string
        }
        Relationships: []
      }
      bank_disposiciones: {
        Row: {
          bank_id: string
          created_at: string
          descripcion: string | null
          fecha: string
          id: string
          monto: number
          proof_file_id: string | null
        }
        Insert: {
          bank_id: string
          created_at?: string
          descripcion?: string | null
          fecha: string
          id?: string
          monto: number
          proof_file_id?: string | null
        }
        Update: {
          bank_id?: string
          created_at?: string
          descripcion?: string | null
          fecha?: string
          id?: string
          monto?: number
          proof_file_id?: string | null
        }
        Relationships: []
      }
      banks: {
        Row: {
          comision_apertura: number
          contrato_file_id: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_bank"]
          fecha_apertura: string | null
          id: string
          linea_credito: number
          nombre: string
          numero_cuenta: string | null
          plazo_meses: number
          seguro_mensual: number
          tasa_anual: number
          tipo_credito: Database["public"]["Enums"]["tipo_credito"]
          updated_at: string
        }
        Insert: {
          comision_apertura?: number
          contrato_file_id?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_bank"]
          fecha_apertura?: string | null
          id?: string
          linea_credito: number
          nombre: string
          numero_cuenta?: string | null
          plazo_meses: number
          seguro_mensual?: number
          tasa_anual: number
          tipo_credito: Database["public"]["Enums"]["tipo_credito"]
          updated_at?: string
        }
        Update: {
          comision_apertura?: number
          contrato_file_id?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_bank"]
          fecha_apertura?: string | null
          id?: string
          linea_credito?: number
          nombre?: string
          numero_cuenta?: string | null
          plazo_meses?: number
          seguro_mensual?: number
          tasa_anual?: number
          tipo_credito?: Database["public"]["Enums"]["tipo_credito"]
          updated_at?: string
        }
        Relationships: []
      }
      creditos: {
        Row: {
          contacto_email: string | null
          contacto_nombre: string | null
          contacto_telefono: string | null
          contrato_file_id: string | null
          created_at: string
          detalles: string | null
          domicilio_fiscal: string | null
          estado: Database["public"]["Enums"]["estado_destino"]
          fecha_inicio: string
          google_drive_folder_url: string | null
          id: string
          nombre_proyecto: string
          plazo_meses: number
          presupuesto: number
          profile_id: string | null
          rfc_empresa: string | null
          tasa_anual: number
          tasa_mora_multiplicador: number
          updated_at: string
        }
        Insert: {
          contacto_email?: string | null
          contacto_nombre?: string | null
          contacto_telefono?: string | null
          contrato_file_id?: string | null
          created_at?: string
          detalles?: string | null
          domicilio_fiscal?: string | null
          estado?: Database["public"]["Enums"]["estado_destino"]
          fecha_inicio: string
          google_drive_folder_url?: string | null
          id?: string
          nombre_proyecto: string
          plazo_meses: number
          presupuesto: number
          profile_id?: string | null
          rfc_empresa?: string | null
          tasa_anual: number
          tasa_mora_multiplicador?: number
          updated_at?: string
        }
        Update: {
          contacto_email?: string | null
          contacto_nombre?: string | null
          contacto_telefono?: string | null
          contrato_file_id?: string | null
          created_at?: string
          detalles?: string | null
          domicilio_fiscal?: string | null
          estado?: Database["public"]["Enums"]["estado_destino"]
          fecha_inicio?: string
          google_drive_folder_url?: string | null
          id?: string
          nombre_proyecto?: string
          plazo_meses?: number
          presupuesto?: number
          profile_id?: string | null
          rfc_empresa?: string | null
          tasa_anual?: number
          tasa_mora_multiplicador?: number
          updated_at?: string
        }
        Relationships: []
      }
      fundings: {
        Row: {
          created_at: string
          destination_id: string
          destination_type: Database["public"]["Enums"]["destination_type"]
          fecha: string
          id: string
          monto: number
          porcentaje: number | null
          source_id: string
          source_type: Database["public"]["Enums"]["source_type"]
        }
        Insert: {
          created_at?: string
          destination_id: string
          destination_type: Database["public"]["Enums"]["destination_type"]
          fecha: string
          id?: string
          monto: number
          porcentaje?: number | null
          source_id: string
          source_type: Database["public"]["Enums"]["source_type"]
        }
        Update: {
          created_at?: string
          destination_id?: string
          destination_type?: Database["public"]["Enums"]["destination_type"]
          fecha?: string
          id?: string
          monto?: number
          porcentaje?: number | null
          source_id?: string
          source_type?: Database["public"]["Enums"]["source_type"]
        }
        Relationships: []
      }
      inversion_movimientos: {
        Row: {
          created_at: string
          descripcion: string | null
          fecha: string
          id: string
          inversion_id: string
          monto: number
          proof_file_id: string | null
          tipo: Database["public"]["Enums"]["inversion_movimiento_tipo"]
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          fecha: string
          id?: string
          inversion_id: string
          monto: number
          proof_file_id?: string | null
          tipo: Database["public"]["Enums"]["inversion_movimiento_tipo"]
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          fecha?: string
          id?: string
          inversion_id?: string
          monto?: number
          proof_file_id?: string | null
          tipo?: Database["public"]["Enums"]["inversion_movimiento_tipo"]
        }
        Relationships: []
      }
      inversiones: {
        Row: {
          created_at: string
          detalles: string | null
          domicilio_fiscal: string
          estado: Database["public"]["Enums"]["estado_inversion"]
          google_drive_folder_url: string | null
          id: string
          nombre: string
          presupuesto: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          detalles?: string | null
          domicilio_fiscal: string
          estado?: Database["public"]["Enums"]["estado_inversion"]
          google_drive_folder_url?: string | null
          id?: string
          nombre: string
          presupuesto: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          detalles?: string | null
          domicilio_fiscal?: string
          estado?: Database["public"]["Enums"]["estado_inversion"]
          google_drive_folder_url?: string | null
          id?: string
          nombre?: string
          presupuesto?: number
          updated_at?: string
        }
        Relationships: []
      }
      investor_tranches: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["estado_tranche"]
          fecha_inicio: string
          fecha_vencimiento: string
          id: string
          investor_id: string
          monto: number
          plazo_meses: number
          proof_file_id: string | null
          tasa_anual: number
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_tranche"]
          fecha_inicio: string
          fecha_vencimiento: string
          id?: string
          investor_id: string
          monto: number
          plazo_meses: number
          proof_file_id?: string | null
          tasa_anual: number
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_tranche"]
          fecha_inicio?: string
          fecha_vencimiento?: string
          id?: string
          investor_id?: string
          monto?: number
          plazo_meses?: number
          proof_file_id?: string | null
          tasa_anual?: number
        }
        Relationships: []
      }
      investors: {
        Row: {
          created_at: string
          cuenta_bancaria: string | null
          email: string | null
          id: string
          nombre: string
          notas: string | null
          profile_id: string | null
          rfc: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cuenta_bancaria?: string | null
          email?: string | null
          id?: string
          nombre: string
          notas?: string | null
          profile_id?: string | null
          rfc: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cuenta_bancaria?: string | null
          email?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          profile_id?: string | null
          rfc?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_distributions: {
        Row: {
          id: string
          manual_override: boolean
          monto: number
          override_reason: string | null
          payment_id: string
          recipient_id: string | null
          recipient_type: Database["public"]["Enums"]["recipient_type"]
          tipo: Database["public"]["Enums"]["tipo_distribucion"]
        }
        Insert: {
          id?: string
          manual_override?: boolean
          monto: number
          override_reason?: string | null
          payment_id: string
          recipient_id?: string | null
          recipient_type: Database["public"]["Enums"]["recipient_type"]
          tipo: Database["public"]["Enums"]["tipo_distribucion"]
        }
        Update: {
          id?: string
          manual_override?: boolean
          monto?: number
          override_reason?: string | null
          payment_id?: string
          recipient_id?: string | null
          recipient_type?: Database["public"]["Enums"]["recipient_type"]
          tipo?: Database["public"]["Enums"]["tipo_distribucion"]
        }
        Relationships: []
      }
      payments: {
        Row: {
          amortization_schedule_id: string | null
          created_at: string
          created_by: string | null
          destination_id: string
          destination_type: Database["public"]["Enums"]["destination_type"]
          fecha_pago: string
          id: string
          monto_capital: number
          monto_interes: number
          monto_mora: number
          monto_total: number
          notas: string | null
          proof_file_id: string | null
        }
        Insert: {
          amortization_schedule_id?: string | null
          created_at?: string
          created_by?: string | null
          destination_id: string
          destination_type: Database["public"]["Enums"]["destination_type"]
          fecha_pago: string
          id?: string
          monto_capital?: number
          monto_interes?: number
          monto_mora?: number
          monto_total: number
          notas?: string | null
          proof_file_id?: string | null
        }
        Update: {
          amortization_schedule_id?: string | null
          created_at?: string
          created_by?: string | null
          destination_id?: string
          destination_type?: Database["public"]["Enums"]["destination_type"]
          fecha_pago?: string
          id?: string
          monto_capital?: number
          monto_interes?: number
          monto_mora?: number
          monto_total?: number
          notas?: string | null
          proof_file_id?: string | null
        }
        Relationships: []
      }
      prestamos: {
        Row: {
          cantidad: number
          contrato_file_id: string | null
          created_at: string
          detalles: string | null
          domicilio_fiscal: string | null
          email: string | null
          estado: Database["public"]["Enums"]["estado_destino"]
          fecha_inicio: string
          google_drive_folder_url: string | null
          id: string
          nombre_persona: string
          plazo_meses: number
          profile_id: string | null
          rfc: string | null
          tasa_anual: number
          tasa_mora_multiplicador: number
          telefono: string | null
          updated_at: string
        }
        Insert: {
          cantidad: number
          contrato_file_id?: string | null
          created_at?: string
          detalles?: string | null
          domicilio_fiscal?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["estado_destino"]
          fecha_inicio: string
          google_drive_folder_url?: string | null
          id?: string
          nombre_persona: string
          plazo_meses: number
          profile_id?: string | null
          rfc?: string | null
          tasa_anual: number
          tasa_mora_multiplicador?: number
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          cantidad?: number
          contrato_file_id?: string | null
          created_at?: string
          detalles?: string | null
          domicilio_fiscal?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["estado_destino"]
          fecha_inicio?: string
          google_drive_folder_url?: string | null
          id?: string
          nombre_persona?: string
          plazo_meses?: number
          profile_id?: string | null
          rfc?: string | null
          tasa_anual?: number
          tasa_mora_multiplicador?: number
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      proof_files: {
        Row: {
          created_at: string
          file_name: string | null
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      reserva_movements: {
        Row: {
          created_at: string
          created_by: string | null
          default_destination_id: string | null
          default_destination_type:
            | Database["public"]["Enums"]["destination_type"]
            | null
          id: string
          monto: number
          payment_id: string | null
          razon: string | null
          saldo_despues: number
          tipo: Database["public"]["Enums"]["reserva_tipo"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_destination_id?: string | null
          default_destination_type?:
            | Database["public"]["Enums"]["destination_type"]
            | null
          id?: string
          monto: number
          payment_id?: string | null
          razon?: string | null
          saldo_despues: number
          tipo: Database["public"]["Enums"]["reserva_tipo"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_destination_id?: string | null
          default_destination_type?:
            | Database["public"]["Enums"]["destination_type"]
            | null
          id?: string
          monto?: number
          payment_id?: string | null
          razon?: string | null
          saldo_despues?: number
          tipo?: Database["public"]["Enums"]["reserva_tipo"]
        }
        Relationships: []
      }
      settings: {
        Row: {
          default_investor_term_months: number
          default_mora_multiplier: number
          id: number
          reserva_percentage: number
          updated_at: string
        }
        Insert: {
          default_investor_term_months?: number
          default_mora_multiplier?: number
          id: number
          reserva_percentage?: number
          updated_at?: string
        }
        Update: {
          default_investor_term_months?: number
          default_mora_multiplier?: number
          id?: number
          reserva_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      amortizacion_estado:
        | "pendiente"
        | "pagada_total"
        | "pagada_parcial"
        | "vencida"
      destination_type: "inversion" | "credito" | "prestamo"
      estado_bank: "activo" | "completado" | "cancelado"
      estado_destino:
        | "pre_aprobado"
        | "activo"
        | "en_mora"
        | "completado"
        | "cancelado"
      estado_inversion: "activo" | "exitado" | "cancelado"
      estado_tranche: "activo" | "vencido" | "reembolsado"
      inversion_movimiento_tipo: "ingreso" | "gasto"
      recipient_type: "bank" | "investor_tranche" | "orion" | "reserva"
      reserva_tipo:
        | "aporte_auto"
        | "aporte_manual"
        | "retiro_default"
        | "retiro_manual"
      source_type: "investor_tranche" | "bank_disposicion"
      tipo_credito: "simple" | "revolvente"
      tipo_distribucion: "capital" | "interes"
      user_role: "admin" | "investor" | "debtor"
    }
    CompositeTypes: { [_ in never]: never }
  }
}
