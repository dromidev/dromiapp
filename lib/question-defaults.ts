import type { QuestionType } from "@/db/schema";

/**
 * Texto del formulario (opción múltiple): acepta una opción por línea o varias
 * en una línea separadas por coma o punto y coma (caso típico: nombres de candidatos).
 */
export function parseMultipleChoiceOptionsText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const lines = trimmed
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length >= 2) return lines;
  return trimmed
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Normaliza lo guardado en JSONB para multiple_choice (array, string u objeto suelto). */
export function coerceMultipleChoiceOptions(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((x) => String(x).trim())
      .filter((s) => s.length > 0);
  }
  if (typeof raw === "string") {
    return parseMultipleChoiceOptionsText(raw);
  }
  if (typeof raw === "object") {
    const vals = Object.values(raw as Record<string, unknown>);
    return vals
      .map((x) => String(x).trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

export function defaultOptionsForType(type: QuestionType): string[] {
  switch (type) {
    case "yes_no":
      return ["Sí", "No"];
    case "accept_decline":
      return ["Acepto", "No acepto"];
    case "scale_1_5":
      return ["1", "2", "3", "4", "5"];
    case "multiple_choice":
      return [];
    default:
      return [];
  }
}

export function isValidChoice(
  type: QuestionType,
  options: string[],
  choice: string
): boolean {
  if (type === "multiple_choice") {
    return options.includes(choice);
  }
  const allowed = defaultOptionsForType(type);
  return allowed.includes(choice);
}
