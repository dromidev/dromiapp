import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { assistants, questions, votes } from "@/db/schema";
import type { QuestionType } from "@/db/schema";
import {
  getAssistantVotingCodeSecret,
  hashAssistantVotingCode,
  normalizeVotingCode,
} from "@/lib/codes";
import { isValidChoice } from "@/lib/question-defaults";

function getVotingSecret(): string {
  const s = getAssistantVotingCodeSecret();
  if (!s) {
    throw new Error(
      "Defina AUTH_SECRET, NEXTAUTH_SECRET o ASSISTANT_VOTING_CODE_SECRET para códigos de asistente"
    );
  }
  return s;
}

export type PublicQuestionPayload = {
  id: string;
  publicId: string;
  title: string;
  description: string | null;
  type: string;
  options: string[];
  isOpen: boolean;
};

async function getQuestionByPublicId(publicId: string) {
  const rows = await db
    .select()
    .from(questions)
    .where(eq(questions.publicId, publicId))
    .limit(1);
  return rows[0] ?? null;
}

export async function verifyVotingStep(input: {
  publicId: string;
  accessCode: string;
  assistantCode: string;
}): Promise<
  | { ok: true; question: PublicQuestionPayload; assistantId: string }
  | {
      ok: false;
      code: "bad_access" | "bad_assistant" | "closed" | "not_found";
    }
  | { ok: false; code: "already_voted" }
> {
  const q = await getQuestionByPublicId(input.publicId);
  if (!q) return { ok: false, code: "not_found" };

  const access = normalizeVotingCode(input.accessCode);
  const expected = normalizeVotingCode(q.accessCode);
  if (access !== expected) return { ok: false, code: "bad_access" };
  if (!q.isOpen) return { ok: false, code: "closed" };

  const secret = getVotingSecret();
  const assistantCodeHash = hashAssistantVotingCode(input.assistantCode, secret);

  const [asst] = await db
    .select()
    .from(assistants)
    .where(
      and(
        eq(assistants.meetingId, q.meetingId),
        eq(assistants.codeHash, assistantCodeHash)
      )
    )
    .limit(1);

  if (!asst) return { ok: false, code: "bad_assistant" };

  const existing = await db
    .select({ id: votes.id })
    .from(votes)
    .where(
      and(eq(votes.questionId, q.id), eq(votes.assistantId, asst.id))
    )
    .limit(1);

  if (existing.length > 0) return { ok: false, code: "already_voted" };

  const opts =
    q.type === "multiple_choice" ? (q.options as string[]) : ([] as string[]);

  return {
    ok: true,
    question: {
      id: q.id,
      publicId: q.publicId,
      title: q.title,
      description: q.description,
      type: q.type,
      options: opts,
      isOpen: q.isOpen,
    },
    assistantId: asst.id,
  };
}

export async function submitVote(input: {
  publicId: string;
  accessCode: string;
  assistantCode: string;
  choice: string;
}): Promise<
  | { ok: true }
  | { ok: false; code: string; message?: string }
> {
  const step = await verifyVotingStep({
    publicId: input.publicId,
    accessCode: input.accessCode,
    assistantCode: input.assistantCode,
  });

  if (!step.ok) {
    if (step.code === "already_voted") {
      return {
        ok: false,
        code: "already_voted",
        message: "Ya has votado por esta pregunta",
      };
    }
    if (step.code === "closed") {
      return { ok: false, code: "closed", message: "Las votaciones están cerradas" };
    }
    if (step.code === "bad_access") {
      return {
        ok: false,
        code: "bad_access",
        message: "Código de acceso incorrecto",
      };
    }
    if (step.code === "bad_assistant") {
      return {
        ok: false,
        code: "bad_assistant",
        message: "Código de copropietario no válido",
      };
    }
    return { ok: false, code: "not_found", message: "Votación no encontrada" };
  }

  // Reutilizamos datos ya cargados en verifyVotingStep (evita un SELECT extra por voto).
  const q = step.question;
  const options =
    q.type === "multiple_choice" ? q.options : ([] as string[]);

  if (!isValidChoice(q.type as QuestionType, options, input.choice)) {
    return { ok: false, code: "bad_choice", message: "Opción no válida" };
  }

  try {
    await db.insert(votes).values({
      questionId: q.id,
      assistantId: step.assistantId,
      answer: { choice: input.choice },
    });
  } catch {
    return {
      ok: false,
      code: "already_voted",
      message: "Ya has votado por esta pregunta",
    };
  }

  return { ok: true };
}

export async function aggregateResults(publicId: string) {
  const q = await getQuestionByPublicId(publicId);
  if (!q) {
    return { total: 0, breakdown: [], winner: null as string | null, tie: false };
  }

  const rows = await db
    .select({
      choice: sql<string>`${votes.answer}->>'choice'`,
      c: sql<number>`count(*)::int`,
    })
    .from(votes)
    .where(eq(votes.questionId, q.id))
    .groupBy(sql`${votes.answer}->>'choice'`);

  const total = rows.reduce((s, r) => s + Number(r.c ?? 0), 0);
  const breakdown = rows.map((r) => ({
    label: r.choice ?? "(sin etiqueta)",
    count: Number(r.c ?? 0),
    percent:
      total === 0 ? 0 : Math.round((Number(r.c ?? 0) / total) * 1000) / 10,
  }));

  let winner: string | null = null;
  let tie = false;
  if (breakdown.length > 0) {
    const max = Math.max(...breakdown.map((b) => b.count));
    const tops = breakdown.filter((b) => b.count === max);
    winner = tops.length === 1 ? tops[0]!.label : null;
    tie = winner === null && tops.length > 1;
  }

  return { total, breakdown, winner, tie };
}

export async function participationStats(publicId: string) {
  const q = await getQuestionByPublicId(publicId);
  if (!q) {
    return { totalAssistants: 0, votedCount: 0, participationPercent: 0 };
  }

  const [{ totalAssistants }] = await db
    .select({ totalAssistants: sql<number>`count(*)::int` })
    .from(assistants)
    .where(eq(assistants.meetingId, q.meetingId));

  const [{ voted }] = await db
    .select({ voted: sql<number>`count(*)::int` })
    .from(votes)
    .where(eq(votes.questionId, q.id));

  const ta = Number(totalAssistants ?? 0);
  const vd = Number(voted ?? 0);
  const pct = ta === 0 ? 0 : Math.round((vd / ta) * 1000) / 10;

  return {
    totalAssistants: ta,
    votedCount: vd,
    participationPercent: pct,
  };
}

/** Payload para `/api/questions/.../results` y pantalla de proyección. */
export async function getPublicQuestionProjection(publicId: string) {
  const q = await getQuestionByPublicId(publicId);
  if (!q) return null;

  const agg = await aggregateResults(publicId);
  const part = await participationStats(publicId);

  return {
    question: {
      title: q.title,
      description: q.description,
      type: q.type,
      isOpen: q.isOpen,
    },
    total: agg.total,
    breakdown: agg.breakdown,
    winner: agg.winner,
    tie: agg.tie,
    participation: part,
  };
}
