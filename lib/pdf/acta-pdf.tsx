import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111",
  },
  h1: {
    fontSize: 16,
    marginBottom: 10,
    fontFamily: "Helvetica",
    fontWeight: 700,
  },
  meta: { marginBottom: 4 },
  h2: {
    fontSize: 12,
    marginTop: 14,
    marginBottom: 6,
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
  row: { flexDirection: "row", marginBottom: 3 },
  colOpt: { width: "42%" },
  colCount: { width: "18%" },
  colPct: { width: "18%" },
  winner: { marginTop: 6, fontFamily: "Helvetica", fontWeight: 700 },
  footer: { marginTop: 24, fontSize: 8, color: "#555" },
});

export type ActaMeeting = {
  title: string;
  meetingDate: Date | string;
};

export type ActaQuestion = {
  title: string;
  type: string;
  total: number;
  breakdown: { label: string; count: number; percent: number }[];
  winner: string | null;
  tie: boolean;
};

function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ActaDocument({
  meeting,
  questions,
}: {
  meeting: ActaMeeting;
  questions: ActaQuestion[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Acta de votación — asamblea de copropietarios</Text>
        <Text style={styles.meta}>Fecha de la reunión: {formatDate(meeting.meetingDate)}</Text>
        <Text style={styles.meta}>Asamblea: {meeting.title}</Text>
        <Text style={styles.footer}>
          Documento generado electrónicamente. Los resultados reflejan los votos registrados en el
          sistema al momento de la exportación.
        </Text>

        {questions.map((q, i) => (
          <View key={i} wrap={false}>
            <Text style={styles.h2}>
              Pregunta {i + 1}: {q.title}
            </Text>
            <Text style={styles.meta}>Tipo: {q.type} — Total votos: {q.total}</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.colOpt}>Opción</Text>
              <Text style={styles.colCount}>Votos</Text>
              <Text style={styles.colPct}>%</Text>
            </View>
            {q.breakdown.map((b, j) => (
              <View key={j} style={styles.row}>
                <Text style={styles.colOpt}>{b.label}</Text>
                <Text style={styles.colCount}>{b.count}</Text>
                <Text style={styles.colPct}>{b.percent}</Text>
              </View>
            ))}
            <Text style={styles.winner}>
              {q.total === 0
                ? "Sin votos registrados."
                : q.tie
                  ? "Resultado: empate entre las opciones más votadas."
                  : `Opción ganadora: ${q.winner ?? "—"}`}
            </Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function renderActaPdfBuffer(
  meeting: ActaMeeting,
  questions: ActaQuestion[]
): Promise<Buffer> {
  const element = <ActaDocument meeting={meeting} questions={questions} />;
  return renderToBuffer(element);
}
