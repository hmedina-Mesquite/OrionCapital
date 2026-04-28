import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111",
  },
  h1: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  h2: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 18,
    marginBottom: 6,
  },
  meta: { color: "#555", marginBottom: 12 },
  kpiRow: { flexDirection: "row", marginVertical: 8, gap: 8 },
  kpi: {
    flexGrow: 1,
    border: "1pt solid #ddd",
    borderRadius: 4,
    padding: 8,
  },
  kpiLabel: { fontSize: 8, color: "#666" },
  kpiValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    borderBottom: "1pt solid #eee",
    paddingVertical: 4,
  },
  th: {
    fontFamily: "Helvetica-Bold",
    borderBottom: "1pt solid #999",
  },
  tipo: { width: 60 },
  fecha: { width: 70 },
  num: { width: 90, textAlign: "right" },
  desc: { flexGrow: 1 },
  total: {
    flexDirection: "row",
    marginTop: 10,
    paddingTop: 6,
    borderTop: "1pt solid #999",
    fontFamily: "Helvetica-Bold",
  },
  detallesBox: {
    border: "1pt solid #eee",
    padding: 8,
    backgroundColor: "#fafafa",
    color: "#444",
    fontSize: 9,
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

export type InversionReportProps = {
  nombre: string
  presupuesto: number
  domicilioFiscal: string
  estado: string
  detalles: string | null
  generatedAt: string
  fundings: {
    sourceLabel: string
    sourceType: string
    monto: number
    fecha: string
  }[]
  movimientos: {
    id: string
    tipo: "ingreso" | "gasto"
    monto: number
    fecha: string
    descripcion: string | null
  }[]
}

function fmt(n: number): string {
  return `$${n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function InversionReport(props: InversionReportProps) {
  const ingreso = props.movimientos
    .filter((m) => m.tipo === "ingreso")
    .reduce((s, m) => s + m.monto, 0)
  const gasto = props.movimientos
    .filter((m) => m.tipo === "gasto")
    .reduce((s, m) => s + m.monto, 0)
  const neto = ingreso - gasto
  const totalFunding = props.fundings.reduce((s, f) => s + f.monto, 0)

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>Reporte de inversión — Orion Capital</Text>
        <Text style={styles.meta}>
          {props.nombre} · {props.estado} · Generado {props.generatedAt}
        </Text>

        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Presupuesto</Text>
            <Text style={styles.kpiValue}>{fmt(props.presupuesto)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Ingresos</Text>
            <Text style={styles.kpiValue}>{fmt(ingreso)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Gastos</Text>
            <Text style={styles.kpiValue}>{fmt(gasto)}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Neto</Text>
            <Text style={styles.kpiValue}>{fmt(neto)}</Text>
          </View>
        </View>

        <Text style={styles.h2}>Domicilio fiscal</Text>
        <View style={styles.detallesBox}>
          <Text>{props.domicilioFiscal}</Text>
        </View>

        {props.detalles && (
          <>
            <Text style={styles.h2}>Detalles</Text>
            <View style={styles.detallesBox}>
              <Text>{props.detalles}</Text>
            </View>
          </>
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
              <Text style={styles.num}>Monto</Text>
            </View>
            {props.fundings.map((f, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.fecha}>{f.fecha}</Text>
                <Text style={styles.desc}>{f.sourceLabel}</Text>
                <Text style={styles.tipo}>
                  {f.sourceType === "investor_tranche" ? "Inv." : "Banco"}
                </Text>
                <Text style={styles.num}>{fmt(f.monto)}</Text>
              </View>
            ))}
            <View style={styles.total}>
              <Text style={styles.fecha}></Text>
              <Text style={styles.desc}>Total fuentes</Text>
              <Text style={styles.tipo}></Text>
              <Text style={styles.num}>{fmt(totalFunding)}</Text>
            </View>
          </>
        )}

        <Text style={styles.h2}>Movimientos</Text>
        {props.movimientos.length === 0 ? (
          <Text style={{ color: "#666" }}>Sin movimientos registrados.</Text>
        ) : (
          <>
            <View style={[styles.row, styles.th]}>
              <Text style={styles.fecha}>Fecha</Text>
              <Text style={styles.tipo}>Tipo</Text>
              <Text style={styles.desc}>Descripción</Text>
              <Text style={styles.num}>Monto</Text>
            </View>
            {props.movimientos.map((m) => (
              <View key={m.id} style={styles.row}>
                <Text style={styles.fecha}>{m.fecha}</Text>
                <Text style={styles.tipo}>{m.tipo}</Text>
                <Text style={styles.desc}>{m.descripcion ?? "—"}</Text>
                <Text style={styles.num}>{fmt(m.monto)}</Text>
              </View>
            ))}
            <View style={styles.total}>
              <Text style={styles.fecha}></Text>
              <Text style={styles.tipo}></Text>
              <Text style={styles.desc}>Neto (ingresos − gastos)</Text>
              <Text style={styles.num}>{fmt(neto)}</Text>
            </View>
          </>
        )}

        <Text style={styles.footer}>
          Documento informativo. Para reconciliación oficial, ver registros en el
          portal.
        </Text>
      </Page>
    </Document>
  )
}
