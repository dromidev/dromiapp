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
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#e4e4e7",
    backgroundColor: "#080c10",
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica",
    fontWeight: 700,
    color: "#fafafa",
    marginBottom: 6,
  },
  meta: {
    fontSize: 9,
    color: "#a1a1aa",
    marginBottom: 16,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#d4d4d8",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#71717a",
  },
});

function TranscriptionDocument({
  transcript,
  generatedAtIso,
}: {
  transcript: string;
  generatedAtIso: string;
}) {
  const dateStr = new Date(generatedAtIso).toLocaleString("es", {
    dateStyle: "long",
    timeStyle: "short",
  });
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Transcripción de audio</Text>
        <Text style={styles.meta}>Generado: {dateStr}</Text>
        <View>
          <Text style={styles.body} wrap>
            {transcript.trim() || "(Sin texto)"}
          </Text>
        </View>
        <Text style={styles.footer} fixed>
          Documento generado desde el panel Dromi. Contenido producido por
          transcripción automática.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderTranscriptionPdfBuffer(
  transcript: string,
  generatedAtIso: string
): Promise<Buffer> {
  const element = (
    <TranscriptionDocument
      transcript={transcript}
      generatedAtIso={generatedAtIso}
    />
  );
  return renderToBuffer(element);
}
