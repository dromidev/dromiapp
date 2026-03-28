"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { meetings, users } from "@/db/schema";
import { computeNextStepTimes } from "@/lib/acta-step-times";
import { getSuperadminUserId } from "@/lib/require-superadmin";

export type AdminMeetingRow = {
  meetingId: string;
  title: string;
  meetingDate: Date;
  actaStepsCompleted: number;
  actaUpdatedAt: Date | null;
  isActive: boolean;
  organizationName: string | null;
  ownerEmail: string;
  ownerName: string | null;
};

export async function listMeetingsForAdminAction(): Promise<AdminMeetingRow[]> {
  const adminId = await getSuperadminUserId();
  if (!adminId) return [];

  const rows = await db
    .select({
      meetingId: meetings.id,
      title: meetings.title,
      meetingDate: meetings.meetingDate,
      actaStepsCompleted: meetings.actaStepsCompleted,
      actaUpdatedAt: meetings.actaUpdatedAt,
      isActive: meetings.isActive,
      organizationName: users.organizationName,
      ownerEmail: users.email,
      ownerName: users.name,
    })
    .from(meetings)
    .innerJoin(users, eq(meetings.createdByUserId, users.id))
    .orderBy(desc(meetings.createdAt));

  return rows.map((r) => ({
    meetingId: r.meetingId,
    title: r.title,
    meetingDate: r.meetingDate,
    actaStepsCompleted: r.actaStepsCompleted,
    actaUpdatedAt: r.actaUpdatedAt,
    isActive: r.isActive,
    organizationName: r.organizationName,
    ownerEmail: r.ownerEmail,
    ownerName: r.ownerName,
  }));
}

const updateActaSchema = z.object({
  meetingId: z.string().uuid(),
  actaStepsCompleted: z.number().int().min(0).max(6),
});

export async function updateMeetingActaStepAction(input: {
  meetingId: string;
  actaStepsCompleted: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminId = await getSuperadminUserId();
  if (!adminId) {
    return { ok: false, error: "No autorizado" };
  }
  const parsed = updateActaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" };
  }

  const [found] = await db
    .select({
      id: meetings.id,
      actaStepsCompleted: meetings.actaStepsCompleted,
      actaStepCompletedAt: meetings.actaStepCompletedAt,
    })
    .from(meetings)
    .where(eq(meetings.id, parsed.data.meetingId))
    .limit(1);

  if (!found) {
    return { ok: false, error: "Asamblea no encontrada" };
  }

  const nextStepTimes = computeNextStepTimes(
    found.actaStepsCompleted,
    parsed.data.actaStepsCompleted,
    found.actaStepCompletedAt
  );

  await db
    .update(meetings)
    .set({
      actaStepsCompleted: parsed.data.actaStepsCompleted,
      actaStepCompletedAt: nextStepTimes,
      actaUpdatedAt: new Date(),
    })
    .where(eq(meetings.id, parsed.data.meetingId));

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}
