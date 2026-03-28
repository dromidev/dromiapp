"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { z } from "zod";

const registerSchema = z.object({
  organizationName: z.string().min(2).max(200),
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

export type RegisterResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

export async function registerConjuntoAdminAction(
  formData: FormData
): Promise<RegisterResult> {
  const raw = {
    organizationName: String(formData.get("organizationName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Revisa nombre del conjunto, correo y contraseña (mín. 8 caracteres)." };
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  if (existing) {
    return { ok: false, error: "Ya existe una cuenta con ese correo." };
  }

  const passwordHash = await hash(parsed.data.password, 12);

  await db.insert(users).values({
    email: parsed.data.email,
    passwordHash,
    name: parsed.data.organizationName,
    organizationName: parsed.data.organizationName,
    role: "client",
  });

  return { ok: true, email: parsed.data.email };
}
