import { db } from "@/db";
import { assistants, meetings, questions, votes } from "@/db/schema";
import { aggregateResults, participationStats } from "@/lib/vote-service";
import { and, asc, eq } from "drizzle-orm";

export type RegistroVotosPdfPayload = {
  meetingTitle: string;
  meetingDate: Date;
  questionTitle: string;
  totalAssistants: number;
  totalVotes: number;
  winnerLine: string;
  breakdown: {
    label: string;
    count: number;
    percentOfAssistants: number;
  }[];
  rows: { unidad: string; voteLabel: string }[];
};

function formatVoteCell(answer: {
  choice?: string;
  scale?: number;
}): string {
  if (answer.choice != null && String(answer.choice).trim() !== "") {
    return String(answer.choice);
  }
  if (
    answer.scale != null &&
    typeof answer.scale === "number" &&
    Number.isFinite(answer.scale)
  ) {
    return String(answer.scale);
  }
  return "—";
}

export async function getRegistroVotosPdfPayload(
  meetingId: string,
  questionId: string,
  userId: string
): Promise<
  { ok: true; data: RegistroVotosPdfPayload } | { ok: false; error: string }
> {
  const [row] = await db
    .select({
      meetingTitle: meetings.title,
      meetingDate: meetings.meetingDate,
      questionTitle: questions.title,
      publicId: questions.publicId,
    })
    .from(questions)
    .innerJoin(meetings, eq(questions.meetingId, meetings.id))
    .where(
      and(
        eq(questions.id, questionId),
        eq(questions.meetingId, meetingId),
        eq(meetings.createdByUserId, userId)
      )
    )
    .limit(1);

  if (!row) {
    return { ok: false, error: "Pregunta o asamblea no encontrada" };
  }

  const agg = await aggregateResults(row.publicId);
  const part = await participationStats(row.publicId);
  const ta = part.totalAssistants;

  const breakdown = agg.breakdown.map((b) => ({
    label: b.label,
    count: b.count,
    percentOfAssistants:
      ta === 0 ? 0 : Math.round((b.count / ta) * 1000) / 10,
  }));

  let winnerLine: string;
  if (agg.total === 0) {
    winnerLine = "Sin votos registrados.";
  } else if (agg.tie) {
    winnerLine = "Empate entre las opciones más votadas.";
  } else {
    winnerLine = `Opción ganadora: ${agg.winner ?? "—"}`;
  }

  const voteRows = await db
    .select({
      unidad: assistants.unidad,
      answer: votes.answer,
    })
    .from(votes)
    .innerJoin(assistants, eq(votes.assistantId, assistants.id))
    .where(eq(votes.questionId, questionId))
    .orderBy(asc(assistants.unidad));

  const rows = voteRows.map((r) => ({
    unidad: r.unidad,
    voteLabel: formatVoteCell(
      (r.answer ?? {}) as { choice?: string; scale?: number }
    ),
  }));

  return {
    ok: true,
    data: {
      meetingTitle: row.meetingTitle,
      meetingDate:
        row.meetingDate instanceof Date
          ? row.meetingDate
          : new Date(row.meetingDate),
      questionTitle: row.questionTitle,
      totalAssistants: ta,
      totalVotes: agg.total,
      winnerLine,
      breakdown,
      rows,
    },
  };
}
