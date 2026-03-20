import { db } from "@/db";
import { meetings, questions } from "@/db/schema";
import { aggregateResults } from "@/lib/vote-service";
import { and, desc, eq } from "drizzle-orm";

export type MeetingExportResult =
  | {
      ok: true;
      meeting: { title: string; meetingDate: Date };
      questions: {
        title: string;
        type: string;
        total: number;
        breakdown: { label: string; count: number; percent: number }[];
        winner: string | null;
        tie: boolean;
      }[];
    }
  | { ok: false; error: string };

/** Datos del PDF / exportación para una reunión que pertenece a `userId`. */
export async function getMeetingExportPayload(
  meetingId: string,
  userId: string
): Promise<MeetingExportResult> {
  const [m] = await db
    .select({
      title: meetings.title,
      meetingDate: meetings.meetingDate,
    })
    .from(meetings)
    .where(
      and(eq(meetings.id, meetingId), eq(meetings.createdByUserId, userId))
    )
    .limit(1);

  if (!m) {
    return { ok: false, error: "No encontrado" };
  }

  const qs = await db
    .select({
      id: questions.id,
      publicId: questions.publicId,
      title: questions.title,
      type: questions.type,
    })
    .from(questions)
    .where(eq(questions.meetingId, meetingId))
    .orderBy(desc(questions.createdAt));

  const items = [];
  for (const q of qs) {
    const agg = await aggregateResults(q.publicId);
    items.push({
      title: q.title,
      type: q.type,
      total: agg.total,
      breakdown: agg.breakdown,
      winner: agg.winner,
      tie: agg.tie,
    });
  }

  return {
    ok: true,
    meeting: {
      title: m.title,
      meetingDate: m.meetingDate,
    },
    questions: items,
  };
}
