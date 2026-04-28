import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111",
  },
  h1: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  h2: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 6,
  },
  meta: { color: "#555", marginBottom: 12, fontSize: 9 },
  kpiRow: { flexDirection: "row", marginVertical: 8, gap: 8 },
  kpi: {
    flexGrow: 1,
    border: "1pt solid #ddd",
    borderRadius: 4,
    padding: 8,
  },
  kpiLabel: { fontSize: 8, color: "#666" },
  kpiValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
  kvBox: {
    border: "1pt solid #eee",
    padding: 8,
    backgroundColor: "#fafafa",
  },
  kvRow: { flexDirection: "row", paddingVertical: 1 },
  kvLabel: { width: 130, color: "#666" },
  kvValue: { flexGrow: 1 },
  row: {
    flexDirection: "row",
    borderBottom: "1pt solid #eee",
    paddingVertical: 3,
  },
  th: {
    fontFamily: "Helvetica-Bold",
    borderBottom: "1pt solid #999",
  },
  num: { width: 70, textAlign: "right" },
  numWide: { width: 80, textAlign: "right" },
  fecha: { width: 60 },
  cuotaNum: { width: 30, textAlign: "right" },
  estado: { width: 70 },
  desc: { flexGrow: 1 },
  tipo: { width: 60 },
  total: {
    flexDirection: "row",
    marginTop: 8,
    paddingTop: 6,
    borderTop: "1pt solid #999",
    fontFamily: "Helvetica-Bold",
  },
  alert: {
    border: "1pt solid #fca5a5",
    backgroundColor: "#fef2f2",
    padding: 8,
    color: "#991b1b",
    marginVertical: 8,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#888",
    textAlign: "center",
  },
})

export type DestinationStatementProps = {
  kind: "credito" | "prestamo"
  legacyCode: string | null
  nombre: string
  rfc: string | null
  monto: number
  tasaAnual: number
  plazoMeses: number
  fechaInicio: string
  estado: string
  moraMultiplicador: number
  domicilioFiscal: string | null
  contacto: {
    nombre: string | null
    email: string | null
    telefono: string | null
  } | null
  generatedAt: string
  fundings: {
    sourceLabel: string
    sourceType: string
    monto: number
    fecha: string
  }[]
  schedule: {
    numero: number
    fecha: string
    capital: number
    interes: number
    cuota: number
    saldo: number
    estado: string
  }[]
  payments: {
    fecha: string
    capital: number
    interes: number
    mora: number
    total: number
  }[]
  vencidasCount: number
  vencidasTotal: number
  saldoActual: number
  totalPagado: number
}

function fmt(n: number): string {
  return `$${n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  pagada_total: "Pagada",
  pagada_parcial: "Parcial",
  vencida: "Vencida",
}

export function DestinationStatement(props: DestinationStatementProps) {
  const headerLabel = props.kind === "credito" ? "crédito" : "préstamo"
  const debtorRowLabel = props.kind === "credito" ? "Empresa" : "Persona"
  const totalFunding = props.fundings.reduce((s, f) => s + f.monto, 0)
  const totalCap = props.payments.reduce((s, p) => s + p.capital, 0)
  const totalInt = props.payments.reduce((s, p) => s + p.interes, 0)
  const totalMor = props.payments.reduce((s, p) => s + p.mora, 0)

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>Estado de cuenta — Orion Capital</Text>
        <Text style={styles.meta}>
          Reporte de {headerLabel}
          {props.legacyCode ? ` · Código ${props.legacyCode}` : ""} · Generado{" "}
          {props.generatedAt}
        </Text>

        <View style={styles.kvBox}>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>{debtorRowLabel}</Text>
            <Text style={styles.kvValue}>{props.nombre}</Text>
          </View>
          {props.rfc && (
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>RFC</Text>
              <Text style={styles.kvValue}>{props.rfc}</Text>
            </View>
          )}
          {props.domicilioFiscal && (
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Domicilio fiscal</Text>
              <Text style={styles.kvValue}>{props.domicilioFiscal}</Text>
            </View>
          )}
          {props.contacto?.nombre && (
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Contacto</Text>
              <Text style={styles.kvValue}>
                {props.contacto.nombre}
                {props.contacto.email ? ` · ${props.contacto.email}` : ""}
                {props.contacto.telefono ? ` · ${props.contacto.telefono}` : ""}
              </Text>
            </View>
          )}
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Estado</Text>
            <Text style={styles.kvValue}>{props.estado}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Tasa anual</Text>
            <Text style={styles.kvValue}>
              {(props.tasaAnual * 100).toFixed(2)}%{" "}
              <Text style={{ color: "#888" }}>
                (mora ×{props.moraMultiplicador.toFixed(2)})
              </Text>
            </Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Plazo</Text>
            <Text style={styles.kvValue}>{props.plazoMeses} meses</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Fecha de inicio</Text>
            <Text style={styles.kvValue}>{props.fechaInicio}</Text>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Monto contratado</Text>
            <Text style={styles.kpiValue}>{fmt(props.monto)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Total pagado</Text>
            <Text style={styles.kpiValue}>{fmt(props.totalPagado)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Saldo restante</Text>
            <Text style={styles.kpiValue}>{fmt(props.saldoActual)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Cuotas vencidas</Text>
            <Text style={styles.kpiValue}>{props.vencidasCount}</Text>
          </View>
        </View>

        {props.vencidasCount > 0 && (
          <View style={styles.alert}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
              Cuotas vencidas: {props.vencidasCount}
            </Text>
            <Text>
              Importe vencido a la fecha: {fmt(props.vencidasTotal)}
            </Text>
          </View>
        )}

        <Text style={styles.h2}>Fuentes de financiamiento</Text>
        {props.fundings.length === 0 ? (
          <Text style={{ color: "#666" }}>Sin fuentes vinculadas.</Text>
        ) : (
          <>
            <View style={[styles.row, styles.th]}>
              <Text style={styles.fecha}>Fecha</Text>
              <Text style={styles.desc}>Fuente</Text>
              <Text style={styles.tipo}>Tipo</Text>
              <Text style={styles.numWide}>Monto</Text>
            </View>
            {props.fundings.map((f, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.fecha}>{f.fecha}</Text>
                <Text style={styles.desc}>{f.sourceLabel}</Text>
                <Text style={styles.tipo}>
                  {f.sourceType === "investor_tranche" ? "Inv." : "Banco"}
                </Text>
                <Text style={styles.numWide}>{fmt(f.monto)}</Text>
              </View>
            ))}
            <View style={styles.total}>
              <Text style={styles.fecha}></Text>
              <Text style={styles.desc}>Total fuentes</Text>
              <Text style={styles.tipo}></Text>
              <Text style={styles.numWide}>{fmt(totalFunding)}</Text>
            </View>
          </>
        )}

        <Text style={styles.h2}>Pagos recibidos</Text>
        {props.payments.length === 0 ? (
          <Text style={{ color: "#666" }}>Sin pagos registrados.</Text>
        ) : (
          <>
            <View style={[styles.row, styles.th]}>
              <Text style={styles.fecha}>Fecha</Text>
              <Text style={styles.num}>Capital</Text>
              <Text style={styles.num}>Interés</Text>
              <Text style={styles.num}>Mora</Text>
              <Text style={styles.numWide}>Total</Text>
            </View>
            {props.payments.map((p, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.fecha}>{p.fecha}</Text>
                <Text style={styles.num}>{fmt(p.capital)}</Text>
                <Text style={styles.num}>{fmt(p.interes)}</Text>
                <Text style={styles.num}>{fmt(p.mora)}</Text>
                <Text style={styles.numWide}>{fmt(p.total)}</Text>
              </View>
            ))}
            <View style={styles.total}>
              <Text style={styles.fecha}>Totales</Text>
              <Text style={styles.num}>{fmt(totalCap)}</Text>
              <Text style={styles.num}>{fmt(totalInt)}</Text>
              <Text style={styles.num}>{fmt(totalMor)}</Text>
              <Text style={styles.numWide}>{fmt(props.totalPagado)}</Text>
            </View>
          </>
        )}

        <Text break style={styles.h2}>
          Cronograma de amortización
        </Text>
        {props.schedule.length === 0 ? (
          <Text style={{ color: "#666" }}>Cronograma no generado aún.</Text>
        ) : (
          <>
            <View style={[styles.row, styles.th]}>
              <Text style={styles.cuotaNum}>#</Text>
              <Text style={styles.fecha}>Vence</Text>
              <Text style={styles.num}>Capital</Text>
              <Text style={styles.num}>Interés</Text>
              <Text style={styles.num}>Cuota</Text>
              <Text style={styles.num}>Saldo</Text>
              <Text style={styles.estado}>Estado</Text>
            </View>
            {props.schedule.map((r) => (
              <View key={r.numero} style={styles.row}>
                <Text style={styles.cuotaNum}>{r.numero}</Text>
                <Text style={styles.fecha}>{r.fecha}</Text>
                <Text style={styles.num}>{fmt(r.capital)}</Text>
                <Text style={styles.num}>{fmt(r.interes)}</Text>
                <Text style={styles.num}>{fmt(r.cuota)}</Text>
                <Text style={styles.num}>{fmt(r.saldo)}</Text>
                <Text style={styles.estado}>
                  {ESTADO_LABEL[r.estado] ?? r.estado}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.footer}>
          Documento informativo emitido por Orion Capital. Para reconciliación
          oficial, ver registros en el portal.
        </Text>
      </Page>
    </Document>
  )
}
