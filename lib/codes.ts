import { createHmac, randomBytes } from "crypto";

/** Mismo orden que NextAuth en este repo: CSV y votación usan el primer valor definido. */
export function getAssistantVotingCodeSecret(): string | undefined {
  const a = process.env.ASSISTANT_VOTING_CODE_SECRET?.trim();
  if (a) return a;
  const b = process.env.AUTH_SECRET?.trim();
  if (b) return b;
  const c = process.env.NEXTAUTH_SECRET?.trim();
  return c || undefined;
}

/** Igual en import CSV y en pantalla de votación (Excel a veces mete espacios raros / BOM). */
export function normalizeVotingCode(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function hashAssistantVotingCode(
  code: string,
  secret: string
): string {
  const n = normalizeVotingCode(code);
  return createHmac("sha256", secret).update(n).digest("hex");
}

export function generateAccessCode(length = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}
