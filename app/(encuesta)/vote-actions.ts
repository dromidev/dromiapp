"use server";

import { submitVote, verifyVotingStep } from "@/lib/vote-service";

export async function verifyVoteSessionAction(input: {
  publicId: string;
  accessCode: string;
  assistantCode: string;
}) {
  const r = await verifyVotingStep(input);
  if (!r.ok) {
    if (r.code === "already_voted") {
      return {
        ok: false as const,
        code: "already_voted" as const,
        message: "Ya has votado por esta pregunta",
      };
    }
    if (r.code === "bad_access") {
      return {
        ok: false as const,
        code: "bad_access" as const,
        message: "Código de acceso incorrecto",
      };
    }
    if (r.code === "bad_assistant") {
      return {
        ok: false as const,
        code: "bad_assistant" as const,
        message: "Código de copropietario no válido",
      };
    }
    if (r.code === "closed") {
      return {
        ok: false as const,
        code: "closed" as const,
        message: "Las votaciones están cerradas",
      };
    }
    return {
      ok: false as const,
      code: "not_found" as const,
      message: "Votación no encontrada",
    };
  }
  return {
    ok: true as const,
    question: r.question,
  };
}

export async function submitVoteAction(input: {
  publicId: string;
  accessCode: string;
  assistantCode: string;
  choice: string;
}) {
  const r = await submitVote(input);
  if (!r.ok) {
    return {
      ok: false as const,
      message: r.message ?? "No se pudo registrar el voto",
    };
  }
  return { ok: true as const, message: "Voto registrado exitosamente" };
}
