import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { RegistroVotosPdfPayload } from "@/lib/registro-votos-pdf-payload";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111",
  },
  h1: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: "Helvetica",
    fontWeight: 700,
  },
  meta: { marginBottom: 3, fontSize: 9 },
  metaStrong: { fontFamily: "Helvetica", fontWeight: 700 },
  box: {
    marginTop: 10,
    marginBottom: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f9f9f9",
  },
  h2: {
    fontSize: 11,
    marginTop: 8,
    marginBottom: 4,
    fontFamily: "Helvetica",
    fontWeight: 700,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 4,
    marginBottom: 4,
    fontFamily: "Helvetica",
    fontWeight: 700,
  },
  row: { flexDirection: "row", marginBottom: 2 },
  colUnidad: { width: "55%" },
  colVote: { width: "45%" },
  colOpt: { width: "40%" },
  colCount: { width: "20%" },
  colPct: { width: "40%" },
  footer: { marginTop: 16, fontSize: 7, color: "#555" },
});

function formatDate(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function RegistroVotosDocument({ data }: { data: RegistroVotosPdfPayload }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Registro de votos por pregunta</Text>
        <Text style={styles.meta}>
          <Text style={styles.metaStrong}>Fecha: </Text>
          {formatDate(data.meetingDate)}
        </Text>
        <Text style={styles.meta}>
          <Text style={styles.metaStrong}>Asamblea: </Text>
          {data.meetingTitle}
        </Text>
        <Text style={styles.meta}>
          <Text style={styles.metaStrong}>Pregunta: </Text>
          {data.questionTitle}
        </Text>

        <View style={styles.box}>
          <Text style={styles.meta}>{data.winnerLine}</Text>
          <Text style={styles.meta}>
            <Text style={styles.metaStrong}>Total de votos (pregunta): </Text>
            {data.totalVotes}
          </Text>
          <Text style={styles.meta}>
            <Text style={styles.metaStrong}>Total de asistentes registrados: </Text>
            {data.totalAssistants}
          </Text>
        </View>

        <Text style={styles.h2}>
          Porcentaje por opción (sobre total de asistentes)
        </Text>
        <View style={styles.tableHeader}>
          <Text style={styles.colOpt}>Opción</Text>
          <Text style={styles.colCount}>Votos</Text>
          <Text style={styles.colPct}>% sobre asistentes</Text>
        </View>
        {data.breakdown.map((b, j) => (
          <View key={j} style={styles.row}>
            <Text style={styles.colOpt}>{b.label}</Text>
            <Text style={styles.colCount}>{b.count}</Text>
            <Text style={styles.colPct}>{b.percentOfAssistants}%</Text>
          </View>
        ))}

        <Text style={styles.h2}>Detalle por unidad</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.colUnidad}>Unidad</Text>
          <Text style={styles.colVote}>Voto</Text>
        </View>
        {data.rows.map((r, i) => (
          <View key={i} style={styles.row} wrap={false}>
            <Text style={styles.colUnidad}>{r.unidad}</Text>
            <Text style={styles.colVote}>{r.voteLabel}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          Documento generado electrónicamente. Los porcentajes sobre asistentes
          usan el total de unidades registradas en la asamblea como denominador.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderRegistroVotosPdfBuffer(
  data: RegistroVotosPdfPayload
): Promise<Buffer> {
  return renderToBuffer(<RegistroVotosDocument data={data} />);
}
