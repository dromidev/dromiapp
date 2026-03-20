import type { QuestionType } from "@/db/schema";

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
