import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111",
  },
  h1: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  h2: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 18,
    marginBottom: 6,
  },
  meta: { color: "#555", marginBottom: 12 },
  row: { flexDirection: "row", borderBottom: "1pt solid #eee", paddingVertical: 4 },
  th: { fontFamily: "Helvetica-Bold", borderBottom: "1pt solid #999" },
  cell: { flexGrow: 1 },
  num: { width: 90, textAlign: "right" },
  total: {
    flexDirection: "row",
    marginTop: 10,
    paddingTop: 6,
    borderTop: "1pt solid #999",
    fontFamily: "Helvetica-Bold",
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

export type StatementProps = {
  investorName: string
  investorRfc: string
  generatedAt: string
  tranches: {
    id: string
    monto: number
    tasa_anual: number
    plazo_meses: number
    fecha_inicio: string
    fecha_vencimiento: string
    estado: string
  }[]
  distributions: {
    fecha: string | null
    tipo: string
    monto: number
  }[]
}

function fmt(n: number): string {
  return `$${n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function InvestorStatement(props: StatementProps) {
  const total = props.distributions.reduce((s, d) => s + d.monto, 0)
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>Estado de cuenta — Orion Capital</Text>
        <Text style={styles.meta}>
          {props.investorName} · RFC {props.investorRfc} · Generado{" "}
          {props.generatedAt}
        </Text>

        <Text style={styles.h2}>Tranches</Text>
        <View style={[styles.row, styles.th]}>
          <Text style={styles.cell}>Inicio</Text>
          <Text style={styles.cell}>Vence</Text>
          <Text style={styles.num}>Monto</Text>
          <Text style={styles.num}>Tasa</Text>
          <Text style={styles.num}>Plazo</Text>
          <Text style={styles.cell}>Estado</Text>
        </View>
        {props.tranches.map((t) => (
          <View key={t.id} style={styles.row}>
            <Text style={styles.cell}>{t.fecha_inicio}</Text>
            <Text style={styles.cell}>{t.fecha_vencimiento}</Text>
            <Text style={styles.num}>{fmt(t.monto)}</Text>
            <Text style={styles.num}>
              {(t.tasa_anual * 100).toFixed(2)}%
            </Text>
            <Text style={styles.num}>{t.plazo_meses} m</Text>
            <Text style={styles.cell}>{t.estado}</Text>
          </View>
        ))}

        <Text style={styles.h2}>Distribuciones recibidas</Text>
        <View style={[styles.row, styles.th]}>
          <Text style={styles.cell}>Fecha</Text>
          <Text style={styles.cell}>Tipo</Text>
          <Text style={styles.num}>Monto</Text>
        </View>
        {props.distributions.map((d, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.cell}>{d.fecha ?? "—"}</Text>
            <Text style={styles.cell}>{d.tipo}</Text>
            <Text style={styles.num}>{fmt(d.monto)}</Text>
          </View>
        ))}
        <View style={styles.total}>
          <Text style={styles.cell}>Total</Text>
          <Text style={styles.num}>{fmt(total)}</Text>
        </View>

        <Text style={styles.footer}>
          Documento informativo. Para reconciliación oficial, ver registros en
          el portal.
        </Text>
      </Page>
    </Document>
  )
}
