"use server";

import { revalidatePath } from "next/cache";
import { getDashboardUserId } from "@/lib/dashboard-user";
import { db } from "@/db";
import {
  assistants,
  meetings,
  questions,
  type QuestionType,
} from "@/db/schema";
import { generateAccessCode, hashAssistantVotingCode } from "@/lib/codes";
import { defaultOptionsForType } from "@/lib/question-defaults";
import { aggregateResults } from "@/lib/vote-service";
import { getMeetingExportPayload } from "@/lib/meeting-export";
import { getEncuestaBaseUrl } from "@/lib/public-url";
import { and, desc, eq } from "drizzle-orm";
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
    })
    .from(meetings)
    .where(eq(meetings.createdByUserId, userId))
    .orderBy(desc(meetings.createdAt));

  return data.map(
    (m): MeetingRow => ({
      id: m.id,
      title: m.title,
      meetingDate: toDate(m.meetingDate),
      createdAt: toDate(m.createdAt),
    })
  );
}

/**
 * Elimina la asamblea si pertenece al usuario del panel.
 * En BD, `questions`, `assistants` y `votes` se eliminan en cascada (FK onDelete: cascade).
 */
export async function deleteMeetingAction(meetingId: string) {
  const userId = await getDashboardUserId();
  if (!userId) {
    return { ok: false as const, error: "No autenticado" };
  }
  if (!z.string().uuid().safeParse(meetingId).success) {
    return { ok: false as const, error: "Asamblea inválida" };
  }

  const deleted = await db
    .delete(meetings)
    .where(
      and(eq(meetings.id, meetingId), eq(meetings.createdByUserId, userId))
    )
    .returning({ id: meetings.id });

  if (deleted.length === 0) {
    return { ok: false as const, error: "Asamblea no encontrada" };
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
    options = optionsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (options.length < 2) {
      return {
        ok: false as const,
        error: "Opción múltiple requiere al menos 2 opciones (una por línea)",
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
        eq(meetings.createdByUserId, userId)
      )
    )
    .limit(1);

  if (!m) {
    return { ok: false as const, error: "Asamblea no encontrada" };
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
        eq(meetings.createdByUserId, userId)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    return { ok: false as const, error: "Pregunta no encontrada" };
  }

  await db
    .update(questions)
    .set({ isOpen })
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
      and(eq(meetings.id, meetingId), eq(meetings.createdByUserId, userId))
    )
    .limit(1);

  if (!m) {
    return { ok: false as const, error: "Asamblea no encontrada" };
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
    if (k.includes("torre")) map.tower = h;
    if (k === "apto" || k.includes("apto") || k.includes("apartamento")) {
      map.apartment = h;
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
  if (!map.tower || !map.apartment || !map.name || !map.code) {
    return {
      ok: false as const,
      error:
        "El CSV debe incluir columnas: Torre, Apto (o Apartamento), Nombre, y una columna de código único (p. ej. Codigo de Votacion, Codigo Apartamento o Codigo Unidad)",
    };
  }

  const secret =
    process.env.ASSISTANT_VOTING_CODE_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    return {
      ok: false as const,
      error: "Falta ASSISTANT_VOTING_CODE_SECRET o AUTH_SECRET en el servidor",
    };
  }

  const errors: string[] = [];
  const seenCodes = new Set<string>();
  const toInsert: {
    tower: string;
    apartment: string;
    fullName: string;
    codeHash: string;
  }[] = [];

  rows.forEach((r, idx) => {
    const tower = String(r[map.tower!] ?? "").trim();
    const apartment = String(r[map.apartment!] ?? "").trim();
    const fullName = String(r[map.name!] ?? "").trim();
    const code = String(r[map.code!] ?? "").trim();
    const line = idx + 2;
    if (!tower || !apartment || !fullName || !code) {
      errors.push(`Fila ${line}: campos obligatorios vacíos`);
      return;
    }
    const fp = hashAssistantVotingCode(code, secret);
    if (seenCodes.has(fp)) {
      errors.push(`Fila ${line}: código de votación duplicado en el archivo`);
      return;
    }
    seenCodes.add(fp);
    toInsert.push({ tower, apartment, fullName, codeHash: fp });
  });

  if (errors.length > 0) {
    return { ok: false as const, error: errors.slice(0, 15).join("\n") };
  }

  try {
    if (toInsert.length > 0) {
      await db.insert(assistants).values(
        toInsert.map((t) => ({
          meetingId,
          tower: t.tower,
          apartment: t.apartment,
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
      and(eq(meetings.id, meetingId), eq(meetings.createdByUserId, userId))
    )
    .limit(1);

  if (!meeting) return [];

  const qs = await db
    .select()
    .from(questions)
    .where(eq(questions.meetingId, meetingId))
    .orderBy(desc(questions.createdAt));

  return qs.map(
    (q): QuestionRow => ({
      id: q.id,
      meetingId: q.meetingId,
      title: q.title,
      description: q.description,
      type: q.type,
      options: (q.options as string[]) ?? [],
      publicId: q.publicId,
      accessCode: q.accessCode,
      isOpen: q.isOpen,
      createdAt: toDate(q.createdAt),
    })
  );
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
        eq(meetings.createdByUserId, userId)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return { ok: false as const, error: "No autorizado" };
  }

  const base = getEncuestaBaseUrl();
  /** El fragmento `#a=...` no se envía al servidor; el cliente lo lee y evita pedir el código de acceso otra vez. */
  const url = `${base}/votar/${row.publicId}#a=${encodeURIComponent(row.accessCode)}`;
  const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2 });
  return { ok: true as const, dataUrl, voteUrl: url };
}
