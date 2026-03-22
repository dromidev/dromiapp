import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  Path,
  Line,
  Circle,
  renderToBuffer,
} from "@react-pdf/renderer";

const COLORS = [
  "#1E6FFF",
  "#00C9A7",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#64748B",
];

const styles = StyleSheet.create({
  pageDark: {
    padding: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#e4e4e7",
    backgroundColor: "#080c10",
  },
  coverTitle: {
    fontSize: 18,
    fontFamily: "Helvetica",
    fontWeight: 700,
    color: "#fafafa",
    marginBottom: 8,
  },
  coverMeta: { fontSize: 10, color: "#a1a1aa", marginBottom: 4 },
  footerNote: {
    marginTop: 20,
    fontSize: 7,
    color: "#71717a",
    lineHeight: 1.4,
  },
  questionPageTitle: {
    fontSize: 11,
    fontFamily: "Helvetica",
    fontWeight: 700,
    color: "#fafafa",
    marginBottom: 10,
    lineHeight: 1.35,
  },
  pageSub: { fontSize: 7, color: "#71717a", marginBottom: 12 },
  row: {
    flexDirection: "row",
    width: "100%",
    alignItems: "stretch",
    justifyContent: "space-between",
  },
  card: {
    width: "49%",
    backgroundColor: "#12181f",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    minHeight: 118,
  },
  cardFullBottom: {
    width: "49%",
    backgroundColor: "#12181f",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    padding: 10,
    minHeight: 200,
  },
  cardLabel: {
    fontSize: 8,
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  bigNumber: {
    fontSize: 26,
    fontFamily: "Helvetica",
    fontWeight: 700,
    color: "#ffffff",
  },
  cardBody: { fontSize: 8, color: "#a1a1aa", marginTop: 4, lineHeight: 1.35 },
  statusOpen: { color: "#34d399", fontFamily: "Helvetica", fontWeight: 700 },
  statusClosed: { color: "#fbbf24", fontFamily: "Helvetica", fontWeight: 700 },
  summaryTitle: {
    fontSize: 11,
    fontFamily: "Helvetica",
    fontWeight: 700,
    color: "#fafafa",
    marginBottom: 6,
    lineHeight: 1.3,
  },
  winnerLine: { fontSize: 8, color: "#34d399", marginTop: 4 },
  tieLine: { fontSize: 8, color: "#fbbf24", marginTop: 4 },
  chartTitle: {
    fontSize: 8,
    color: "#a1a1aa",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  axisLabel: {
    fontSize: 6,
    color: "#a1a1aa",
    textAlign: "center",
    marginTop: 2,
  },
  legendText: { fontSize: 7, color: "#d4d4d8", marginLeft: 4, flex: 1 },
  emptyChart: {
    fontSize: 8,
    color: "#71717a",
    marginTop: 24,
    textAlign: "center",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  legendSwatch: { width: 8, height: 8, borderRadius: 1, marginRight: 4 },
});

export type ActaMeeting = {
  title: string;
  meetingDate: Date | string;
};

export type ActaQuestion = {
  title: string;
  type: string;
  isOpen: boolean;
  participation: {
    totalAssistants: number;
    votedCount: number;
    participationPercent: number;
  };
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

function typeLabel(t: string): string {
  const m: Record<string, string> = {
    yes_no: "Sí / No",
    multiple_choice: "Opción múltiple",
    accept_decline: "Acepto / No acepto",
    scale_1_5: "Escala 1–5",
  };
  return m[t] ?? t;
}

function truncateLabel(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Arco de pastel en grados (0° = arriba). */
function pieSlicePath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number
): string {
  const rad = Math.PI / 180;
  const s = (startDeg - 90) * rad;
  const e = (endDeg - 90) * rad;
  const x1 = cx + r * Math.cos(s);
  const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e);
  const y2 = cy + r * Math.sin(e);
  const sweep = endDeg - startDeg;
  if (sweep >= 359.99) {
    return "";
  }
  const large = sweep > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

function ActaBarChart({
  breakdown,
  colors,
}: {
  breakdown: { label: string; count: number; percent: number }[];
  colors: string[];
}) {
  const W = 248;
  const H = 88;
  const padL = 4;
  const padR = 4;
  const baseY = H - 12;
  const n = breakdown.length;
  const gap = n > 1 ? 5 : 0;
  const chartW = W - padL - padR;
  const barW = n > 0 ? (chartW - gap * (n - 1)) / n : chartW;
  const maxC = Math.max(...breakdown.map((b) => b.count), 1);
  const plotH = H - 20;

  return (
    <View>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Line
          x1={padL}
          y1={baseY}
          x2={W - padR}
          y2={baseY}
          stroke="#3f3f46"
          strokeWidth={0.75}
        />
        {breakdown.map((b, i) => {
          const h = maxC > 0 ? (b.count / maxC) * plotH : 0;
          const x = padL + i * (barW + gap);
          const y = baseY - h;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 0)}
              fill={colors[i % colors.length]}
              rx={3}
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: "row", width: "100%", marginTop: 2 }}>
        {breakdown.map((b, i) => (
          <View key={i} style={{ flex: 1, paddingHorizontal: 1 }}>
            <Text style={styles.axisLabel}>{truncateLabel(b.label, 10)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ActaPieChart({
  breakdown,
  colors,
  total,
}: {
  breakdown: { label: string; count: number; percent: number }[];
  colors: string[];
  total: number;
}) {
  const vb = 132;
  const cx = 58;
  const cy = 58;
  const r = 50;

  if (total <= 0 || breakdown.length === 0) {
    return (
      <Text style={styles.emptyChart}>
        Sin votos para graficar
      </Text>
    );
  }

  if (breakdown.length === 1) {
    return (
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <Svg width={118} height={118} viewBox={`0 0 ${vb} ${vb}`}>
          <Circle cx={cx} cy={cy} r={r} fill={colors[0]} />
        </Svg>
        <View style={{ flex: 1, marginLeft: 8, marginTop: 8 }}>
          <View style={styles.legendRow}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: colors[0] },
              ]}
            />
            <Text style={styles.legendText}>
              {breakdown[0]!.label}: {breakdown[0]!.percent}%
            </Text>
          </View>
        </View>
      </View>
    );
  }

  let angle = 0;
  const slices: { d: string; fill: string; i: number }[] = [];
  breakdown.forEach((b, i) => {
    const sweep = total > 0 ? (b.count / total) * 360 : 0;
    if (sweep <= 0.01) return;
    const start = angle;
    angle += sweep;
    const d = pieSlicePath(cx, cy, r, start, start + sweep);
    if (d) slices.push({ d, fill: colors[i % colors.length], i });
  });

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
      <Svg width={118} height={118} viewBox={`0 0 ${vb} ${vb}`}>
        {slices.map((s) => (
          <Path key={s.i} d={s.d} fill={s.fill} />
        ))}
      </Svg>
      <View style={{ flex: 1, marginLeft: 6, marginTop: 4 }}>
        {breakdown.map((b, i) => (
          <View key={i} style={styles.legendRow}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: colors[i % colors.length] },
              ]}
            />
            <Text style={styles.legendText}>
              {truncateLabel(b.label, 22)}: {b.percent}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function QuestionPage({
  meeting,
  qIndex,
  totalQuestions,
  q,
}: {
  meeting: ActaMeeting;
  qIndex: number;
  totalQuestions: number;
  q: ActaQuestion;
}) {
  const { participation: p } = q;
  const hasChartData = q.total > 0 && q.breakdown.length > 0;

  return (
    <Page size="A4" style={styles.pageDark}>
      <Text style={styles.pageSub}>
        {meeting.title} · {formatDate(meeting.meetingDate)} · Pregunta{" "}
        {qIndex + 1}/{totalQuestions}
      </Text>
      <Text style={styles.questionPageTitle}>{q.title}</Text>

      <View style={styles.row}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Participación</Text>
          <Text style={styles.bigNumber}>{p.participationPercent}%</Text>
          <Text style={styles.cardBody}>
            {p.votedCount} de {p.totalAssistants} asistentes registrados han
            votado
          </Text>
          <Text style={styles.cardBody}>
            Estado:{" "}
            <Text style={q.isOpen ? styles.statusOpen : styles.statusClosed}>
              {q.isOpen ? "Abierta" : "Cerrada"}
            </Text>
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Resumen</Text>
          <Text style={styles.summaryTitle}>{truncateLabel(q.title, 120)}</Text>
          <Text style={styles.cardBody}>Tipo: {typeLabel(q.type)}</Text>
          <Text style={styles.cardBody}>Total votos: {q.total}</Text>
          {q.total === 0 ? (
            <Text style={styles.cardBody}>Sin votos registrados.</Text>
          ) : q.tie ? (
            <Text style={styles.tieLine}>Empate entre opciones líderes</Text>
          ) : q.winner ? (
            <Text style={styles.winnerLine}>Ganador: {q.winner}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.cardFullBottom}>
          <Text style={styles.chartTitle}>Gráfico de barras</Text>
          {hasChartData ? (
            <ActaBarChart breakdown={q.breakdown} colors={COLORS} />
          ) : (
            <Text style={styles.emptyChart}>Aún no hay votos</Text>
          )}
        </View>
        <View style={styles.cardFullBottom}>
          <Text style={styles.chartTitle}>Gráfico circular</Text>
          {hasChartData ? (
            <ActaPieChart
              breakdown={q.breakdown}
              colors={COLORS}
              total={q.total}
            />
          ) : (
            <Text style={styles.emptyChart}>Aún no hay votos</Text>
          )}
        </View>
      </View>
    </Page>
  );
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
      <Page size="A4" style={styles.pageDark}>
        <Text style={styles.coverTitle}>
          Acta de votación — asamblea de copropietarios
        </Text>
        <Text style={styles.coverMeta}>
          Fecha de la reunión: {formatDate(meeting.meetingDate)}
        </Text>
        <Text style={styles.coverMeta}>Asamblea: {meeting.title}</Text>
        <Text style={styles.coverMeta}>
          Preguntas incluidas: {questions.length} (solo activas en el panel)
        </Text>
        {questions.length === 0 ? (
          <Text
            style={[
              styles.coverMeta,
              { marginTop: 16, color: "#fbbf24" },
            ]}
          >
            No hay preguntas activas en esta asamblea. Activa una pregunta en el
            panel o crea una nueva para incluirla en futuras exportaciones.
          </Text>
        ) : null}
        <Text style={styles.footerNote}>
          Documento generado electrónicamente. Cada página siguiente corresponde
          a una pregunta activa, con participación, resumen y gráficos al
          momento de la exportación. Las preguntas desactivadas no se incluyen.
        </Text>
      </Page>
      {questions.map((q, i) => (
        <QuestionPage
          key={i}
          meeting={meeting}
          qIndex={i}
          totalQuestions={questions.length}
          q={q}
        />
      ))}
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
