"use server";

import { revalidatePath } from "next/cache";
import { getDashboardUserId } from "@/lib/dashboard-user";
import { db } from "@/db";
import {
  assistants,
  meetings,
  questions,
  votes,
  type QuestionType,
} from "@/db/schema";
import {
  generateAccessCode,
  getAssistantVotingCodeSecret,
  hashAssistantVotingCode,
} from "@/lib/codes";
import {
  coerceMultipleChoiceOptions,
  defaultOptionsForType,
  parseMultipleChoiceOptionsText,
} from "@/lib/question-defaults";
import { aggregateResults } from "@/lib/vote-service";
import { getMeetingExportPayload } from "@/lib/meeting-export";
import { getEncuestaBaseUrl } from "@/lib/public-url";
import { parseActaStepCompletedAt } from "@/lib/acta-step-times";
import { and, asc, desc, eq } from "drizzle-orm";
import QRCode from "qrcode";
import Papa from "papaparse";
import { z } from "zod";

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  return new Date(String(value));
}

type MeetingRow = {
  id: string;
  title: string;
  meetingDate: Date;
  createdAt: Date;
  actaStepsCompleted: number;
  actaStepCompletedAt: (string | null)[];
};

type QuestionRow = {
  id: string;
  meetingId: string;
  title: string;
  description: string | null;
  type: QuestionType;
  options: string[];
  publicId: string;
  accessCode: string;
  isOpen: boolean;
  isActive: boolean;
  createdAt: Date;
};

function isPgUniqueViolation(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const any = e as {
    code?: string;
    cause?: { code?: string };
    message?: string;
  };
  if (any.code === "23505") return true;
  if (any.cause?.code === "23505") return true;
  const m = (any.message ?? "").toLowerCase();
  return m.includes("unique") || m.includes("duplicate");
}

const meetingSchema = z.object({
  title: z.string().min(1).max(500),
  meetingDate: z.string().min(1),
});

export async function createMeetingAction(formData: FormData) {
  const userId = await getDashboardUserId();
  if (!userId) {
    return { ok: false as const, error: "No autenticado" };
  }
  const raw = {
    title: String(formData.get("title") ?? ""),
    meetingDate: String(formData.get("meetingDate") ?? ""),
  };
  const parsed = meetingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: "Datos inválidos" };
  }
  const d = new Date(parsed.data.meetingDate);
  if (Number.isNaN(d.getTime())) {
    return { ok: false as const, error: "Fecha inválida" };
  }

  const [row] = await db
    .insert(meetings)
    .values({
      title: parsed.data.title.trim(),
      meetingDate: d,
      createdByUserId: userId,
      isActive: true,
    })
    .returning({ id: meetings.id });

  if (!row) {
    return { ok: false as const, error: "No se pudo crear la asamblea" };
  }
  revalidatePath("/dashboard");
  return { ok: true as const, meetingId: row.id };
}

export async function listMyMeetingsAction() {
  const userId = await getDashboardUserId();
  if (!userId) return [];
  const data = await db
    .select({
      id: meetings.id,
      title: meetings.title,
      meetingDate: meetings.meetingDate,
      createdAt: meetings.createdAt,
      actaStepsCompleted: meetings.actaStepsCompleted,
      actaStepCompletedAt: meetings.actaStepCompletedAt,
    })
    .from(meetings)
    .where(
      and(eq(meetings.createdByUserId, userId), eq(meetings.isActive, true))
    )
    .orderBy(desc(meetings.createdAt));

  return data.map(
    (m): MeetingRow => ({
      id: m.id,
      title: m.title,
      meetingDate: toDate(m.meetingDate),
      createdAt: toDate(m.createdAt),
      actaStepsCompleted: m.actaStepsCompleted,
      actaStepCompletedAt: parseActaStepCompletedAt(m.actaStepCompletedAt),
    })
  );
}

/**
 * Oculta la asamblea del panel y congela votación pública; no borra preguntas, asistentes ni votos.
 */
export async function deactivateMeetingAction(meetingId: string) {
  const userId = await getDashboardUserId();
  if (!userId) {
    return { ok: false as const, error: "No autenticado" };
  }
  if (!z.string().uuid().safeParse(meetingId).success) {
    return { ok: false as const, error: "Asamblea inválida" };
  }

  const found = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(
      and(
        eq(meetings.id, meetingId),
        eq(meetings.createdByUserId, userId),
        eq(meetings.isActive, true)
      )
    )
    .limit(1);

  if (found.length === 0) {
    return {
      ok: false as const,
      error: "Asamblea no encontrada o ya desactivada",
    };
  }

  await db
    .update(meetings)
    .set({ isActive: false })
    .where(eq(meetings.id, meetingId));

  revalidatePath("/dashboard");
  return { ok: true as const };
}

const updateMeetingSchema = z.object({
  meetingId: z.string().uuid(),
  title: z.string().min(1).max(500),
  meetingDate: z.string().min(1),
});

export async function updateMeetingAction(formData: FormData) {
  const userId = await getDashboardUserId();
  if (!userId) {
    return { ok: false as const, error: "No autenticado" };
  }
  const raw = {
    meetingId: String(formData.get("meetingId") ?? ""),
    title: String(formData.get("title") ?? ""),
    meetingDate: String(formData.get("meetingDate") ?? ""),
  };
  const parsed = updateMeetingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false as const, error: "Datos inválidos" };
  }
  const d = new Date(parsed.data.meetingDate);
  if (Number.isNaN(d.getTime())) {
    return { ok: false as const, error: "Fecha inválida" };
  }

  const updated = await db
    .update(meetings)
    .set({
      title: parsed.data.title.trim(),
      meetingDate: d,
    })
    .where(
      and(
        eq(meetings.id, parsed.data.meetingId),
        eq(meetings.createdByUserId, userId),
        eq(meetings.isActive, true)
      )
    )
    .returning({ id: meetings.id });

  if (updated.length === 0) {
    return {
      ok: false as const,
      error: "Asamblea no encontrada o desactivada",
    };
  }

  revalidatePath("/dashboard");
  return { ok: true as const };
}

const questionSchema = z.object({
  meetingId: z.string().uuid(),
  title: z.string().min(1).max(1000),
  description: z.string().optional(),
  type: z.enum([
    "yes_no",
    "multiple_choice",
    "accept_decline",
    "scale_1_5",
  ] as const),
  optionsText: z.string().optional(),
});

export async function createQuestionAction(formData: FormData) {
  const userId = await getDashboardUserId();
  if (!userId) {
    return { ok: false as const, error: "No autenticado" };
  }
  const type = String(formData.get("type") ?? "") as QuestionType;
  const optionsText = String(formData.get("optionsText") ?? "");
  const parsed = questionSchema.safeParse({
    meetingId: String(formData.get("meetingId") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "") || undefined,
    type,
    optionsText,
  });
  if (!parsed.success) {
    return { ok: false as const, error: "Datos inválidos" };
  }
  let options: string[] = [];
  if (parsed.data.type === "multiple_choice") {
    options = parseMultipleChoiceOptionsText(optionsText);
    if (options.length < 2) {
      return {
        ok: false as const,
        error:
          "Opción múltiple requiere al menos 2 opciones. Escribe una por línea o varias en una línea separadas por coma (ej. Juan, Ana, Luis).",
      };
    }
  } else {
    options = defaultOptionsForType(parsed.data.type);
  }

  const [m] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(
      and(
        eq(meetings.id, parsed.data.meetingId),
        eq(meetings.createdByUserId, userId),
        eq(meetings.isActive, true)
      )
    )
    .limit(1);

  if (!m) {
    return {
      ok: false as const,
      error: "Asamblea no encontrada o desactivada",
    };
  }

  let accessCode = generateAccessCode(6);
  for (let i = 0; i < 12; i++) {
    try {
      const [q] = await db
        .insert(questions)
        .values({
          meetingId: parsed.data.meetingId,
          title: parsed.data.title.trim(),
          description: parsed.data.description?.trim() || null,
          type: parsed.data.type,
          options,
          accessCode,
          isOpen: true,
          isActive: true,
        })
        .returning({
          id: questions.id,
          publicId: questions.publicId,
          accessCode: questions.accessCode,
        });

      if (q) {
        revalidatePath("/dashboard");
        return {
          ok: true as const,
          questionId: q.id,
          publicId: q.publicId,
          accessCode: q.accessCode,
        };
      }
    } catch (e) {
      if (isPgUniqueViolation(e)) {
        accessCode = generateAccessCode(6);
        continue;
      }
      return {
        ok: false as const,
        error: "No se pudo crear la pregunta",
      };
    }
  }
  return { ok: false as const, error: "No se pudo generar un código de acceso" };
}

export async function toggleQuestionOpenAction(
  questionId: string,
  isOpen: boolean
) {
  const userId = await getDashboardUserId();
  if (!userId) {
    return { ok: false as const, error: "No autenticado" };
  }
  const rows = await db
    .select({ id: questions.id })
    .from(questions)
    .innerJoin(meetings, eq(questions.meetingId, meetings.id))
    .where(
      and(
        eq(questions.id, questionId),
        eq(questions.isActive, true),
        eq(meetings.isActive, true),
        eq(meetings.createdByUserId, userId)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    return {
      ok: false as const,
      error: "Pregunta no encontrada o desactivada",
    };
  }

  const updated = await db
    .update(questions)
    .set({ isOpen })
    .where(
      and(eq(questions.id, questionId), eq(questions.isActive, true))
    )
    .returning({ id: questions.id });

  if (updated.length === 0) {
    return {
      ok: false as const,
      error: "Pregunta no encontrada o desactivada",
    };
  }

  revalidatePath("/dashboard");
  return { ok: true as const };
}

/** Oculta la pregunta del panel y cierra votación; no borra filas ni votos. */
export async function deactivateQuestionAction(questionId: string) {
  const userId = await getDashboardUserId();
  if (!userId) {
    return { ok: false as const, error: "No autenticado" };
  }
  if (!z.string().uuid().safeParse(questionId).success) {
    return { ok: false as const, error: "Pregunta inválida" };
  }

  const found = await db
    .select({ id: questions.id })
    .from(questions)
    .innerJoin(meetings, eq(questions.meetingId, meetings.id))
    .where(
      and(
        eq(questions.id, questionId),
        eq(questions.isActive, true),
        eq(meetings.isActive, true),
        eq(meetings.createdByUserId, userId)
      )
    )
    .limit(1);

  if (found.length === 0) {
    return {
      ok: false as const,
      error: "Pregunta no encontrada o ya desactivada",
    };
  }

  await db
    .update(questions)
    .set({ isActive: false, isOpen: false })
    .where(eq(questions.id, questionId));

  revalidatePath("/dashboard");
  return { ok: true as const };
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export async function importAssistantsCsvAction(formData: FormData) {
  const userId = await getDashboardUserId();
  if (!userId) {
    return { ok: false as const, error: "No autenticado" };
  }
  const meetingId = String(formData.get("meetingId") ?? "");
  if (!z.string().uuid().safeParse(meetingId).success) {
    return { ok: false as const, error: "Asamblea inválida" };
  }

  const [m] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(
      and(
        eq(meetings.id, meetingId),
        eq(meetings.createdByUserId, userId),
        eq(meetings.isActive, true)
      )
    )
    .limit(1);

  if (!m) {
    return {
      ok: false as const,
      error: "Asamblea no encontrada o desactivada",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false as const, error: "Archivo requerido" };
  }
  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    return {
      ok: false as const,
      error: parsed.errors.map((e) => e.message).join("; "),
    };
  }
  const rows = parsed.data.filter((r) => Object.keys(r).length > 0);
  if (rows.length === 0) {
    return { ok: false as const, error: "CSV vacío o sin filas" };
  }

  const headers = Object.keys(rows[0]!);
  const map: Record<string, string> = {};
  let codeHeader: string | undefined;
  let codePriority = 0;
  for (const h of headers) {
    const k = normalizeHeader(h);
    /** Una columna con torre+apartamento junto (ej. 38503) o “Unidad” sin ser código. */
    const isCombinedUnitCol =
      (k.includes("unidad") && !k.includes("codigo")) ||
      (k.includes("torre") &&
        (k.includes("apto") || k.includes("apartamento")));
    if (isCombinedUnitCol) {
      map.unidad = h;
    } else {
      if (k.includes("torre")) map.tower = h;
      if (k === "apto" || k.includes("apto") || k.includes("apartamento")) {
        map.apartment = h;
      }
    }
    if (k.includes("nombre")) map.name = h;
    /** Código único por apartamento / copropietario (tú lo defines en el CSV). */
    if (k.includes("codigo")) {
      let p = 0;
      if (k.includes("votacion") || k.includes("voto")) p = 3;
      else if (
        k.includes("apartamento") ||
        k.includes("apto") ||
        k.includes("unidad") ||
        k.includes("copropietario")
      ) {
        p = 2;
      } else if (k === "codigo" || /^codigo\s+/.test(k)) p = 1;
      if (p > codePriority) {
        codePriority = p;
        codeHeader = h;
      }
    }
  }
  if (codeHeader) map.code = codeHeader;

  const hasUnitSource =
    Boolean(map.unidad) ||
    Boolean(map.tower && map.apartment) ||
    Boolean(map.tower);

  if (!hasUnitSource || !map.name || !map.code) {
    return {
      ok: false as const,
      error:
        "El CSV debe incluir: Nombre, código único de votación (p. ej. Codigo de Votacion), y unidad: columna Unidad (o Torre+Apto en una sola columna), o columnas Torre y Apto/Apartamento separadas (se concatenan).",
    };
  }

  function rowUnidad(r: Record<string, string>): string {
    if (map.unidad) return String(r[map.unidad] ?? "").trim();
    const t = map.tower ? String(r[map.tower] ?? "").trim() : "";
    const a = map.apartment ? String(r[map.apartment] ?? "").trim() : "";
    if (t && a) return t + a;
    return t;
  }

  const secret = getAssistantVotingCodeSecret();
  if (!secret) {
    return {
      ok: false as const,
      error:
        "Falta un secreto en el servidor para los códigos de votación. En Vercel (o tu hosting) define AUTH_SECRET o NEXTAUTH_SECRET (o ASSISTANT_VOTING_CODE_SECRET) y vuelve a desplegar.",
    };
  }

  const errors: string[] = [];
  const seenCodes = new Set<string>();
  const toInsert: {
    unidad: string;
    fullName: string;
    codeHash: string;
  }[] = [];

  rows.forEach((r, idx) => {
    const unidad = rowUnidad(r);
    const fullName = String(r[map.name!] ?? "").trim();
    const code = String(r[map.code!] ?? "").trim();
    const line = idx + 2;
    if (!unidad || !fullName || !code) {
      errors.push(`Fila ${line}: campos obligatorios vacíos`);
      return;
    }
    const fp = hashAssistantVotingCode(code, secret);
    if (seenCodes.has(fp)) {
      errors.push(`Fila ${line}: código de votación duplicado en el archivo`);
      return;
    }
    seenCodes.add(fp);
    toInsert.push({ unidad, fullName, codeHash: fp });
  });

  if (errors.length > 0) {
    return { ok: false as const, error: errors.slice(0, 15).join("\n") };
  }

  try {
    if (toInsert.length > 0) {
      await db.insert(assistants).values(
        toInsert.map((t) => ({
          meetingId,
          unidad: t.unidad,
          fullName: t.fullName,
          codeHash: t.codeHash,
        }))
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al guardar";
    return {
      ok: false as const,
      error:
        msg.includes("unique") || msg.includes("duplicate")
          ? "Código duplicado con un asistente ya registrado en esta asamblea"
          : msg,
    };
  }

  revalidatePath("/dashboard");
  return { ok: true as const, imported: toInsert.length };
}

export async function getMeetingExportDataAction(meetingId: string) {
  const userId = await getDashboardUserId();
  if (!userId) {
    return { ok: false as const, error: "No autenticado" };
  }
  const data = await getMeetingExportPayload(meetingId, userId);
  if (!data.ok) {
    return { ok: false as const, error: data.error };
  }
  return {
    ok: true as const,
    meeting: data.meeting,
    questions: data.questions,
  };
}

export async function listQuestionsForMeetingAction(meetingId: string) {
  const userId = await getDashboardUserId();
  if (!userId) return [];

  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(
      and(
        eq(meetings.id, meetingId),
        eq(meetings.createdByUserId, userId),
        eq(meetings.isActive, true)
      )
    )
    .limit(1);

  if (!meeting) return [];

  const qs = await db
    .select()
    .from(questions)
    .where(
      and(
        eq(questions.meetingId, meetingId),
        eq(questions.isActive, true)
      )
    )
    .orderBy(desc(questions.createdAt));

  return qs.map(
    (q): QuestionRow => ({
      id: q.id,
      meetingId: q.meetingId,
      title: q.title,
      description: q.description,
      type: q.type,
      options:
        q.type === "multiple_choice"
          ? coerceMultipleChoiceOptions(q.options)
          : ((q.options as string[]) ?? []),
      publicId: q.publicId,
      accessCode: q.accessCode,
      isOpen: q.isOpen,
      isActive: q.isActive,
      createdAt: toDate(q.createdAt),
    })
  );
}

export type MeetingVoteLogRow = {
  id: string;
  unidad: string;
  questionTitle: string;
  voteLabel: string;
};

function formatStoredVoteAnswer(answer: {
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

/** Filas nombre + pregunta + voto para la asamblea activa (panel). Opcional: una pregunta. */
export async function listMeetingVoteLogAction(
  meetingId: string,
  questionId?: string | null
): Promise<MeetingVoteLogRow[]> {
  const userId = await getDashboardUserId();
  if (!userId) return [];
  if (!z.string().uuid().safeParse(meetingId).success) return [];

  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(
      and(
        eq(meetings.id, meetingId),
        eq(meetings.createdByUserId, userId),
        eq(meetings.isActive, true)
      )
    )
    .limit(1);

  if (!meeting) return [];

  const filterQuestion =
    questionId && z.string().uuid().safeParse(questionId).success
      ? questionId
      : null;

  const rows = await db
    .select({
      id: votes.id,
      unidad: assistants.unidad,
      questionTitle: questions.title,
      answer: votes.answer,
    })
    .from(votes)
    .innerJoin(assistants, eq(votes.assistantId, assistants.id))
    .innerJoin(questions, eq(votes.questionId, questions.id))
    .innerJoin(meetings, eq(questions.meetingId, meetings.id))
    .where(
      and(
        eq(questions.meetingId, meetingId),
        eq(meetings.createdByUserId, userId),
        eq(meetings.isActive, true),
        eq(questions.isActive, true),
        ...(filterQuestion ? [eq(questions.id, filterQuestion)] : [])
      )
    )
    .orderBy(
      ...(filterQuestion
        ? [asc(assistants.unidad)]
        : [asc(questions.title), asc(assistants.unidad)])
    );

  return rows.map((r) => ({
    id: r.id,
    unidad: r.unidad,
    questionTitle: r.questionTitle,
    voteLabel: formatStoredVoteAnswer(
      (r.answer ?? {}) as { choice?: string; scale?: number }
    ),
  }));
}

export async function getQuestionQrDataUrlAction(publicId: string) {
  const userId = await getDashboardUserId();
  if (!userId) {
    return { ok: false as const, error: "No autenticado" };
  }

  const rows = await db
    .select({
      publicId: questions.publicId,
      accessCode: questions.accessCode,
    })
    .from(questions)
    .innerJoin(meetings, eq(questions.meetingId, meetings.id))
    .where(
      and(
        eq(questions.publicId, publicId),
        eq(questions.isActive, true),
        eq(meetings.isActive, true),
        eq(meetings.createdByUserId, userId)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return {
      ok: false as const,
      error:
        "No autorizado, pregunta desactivada o asamblea desactivada",
    };
  }

  const base = getEncuestaBaseUrl();
  /** El fragmento `#a=...` no se envía al servidor; el cliente lo lee y evita pedir el código de acceso otra vez. */
  const url = `${base}/votar/${row.publicId}#a=${encodeURIComponent(row.accessCode)}`;
  const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2 });
  return { ok: true as const, dataUrl, voteUrl: url };
}
