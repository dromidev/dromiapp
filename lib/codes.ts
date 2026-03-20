import { createHmac, randomBytes } from "crypto";

export function normalizeVotingCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
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
