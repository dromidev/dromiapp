/**
 * Valida DATABASE_URL (forma) y conectividad sin imprimir la contraseña.
 * Uso: npm run db:validate
 */
import { config as loadEnv } from "dotenv";
import postgres from "postgres";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const urlRaw = process.env.DATABASE_URL?.trim();
if (!urlRaw) {
  console.error("❌ DATABASE_URL no está definida (.env o .env.local)");
  process.exit(1);
}
/** Tras el exit anterior, siempre string (TS no estrecha dentro de `main` async). */
const databaseUrl: string = urlRaw;

function diagnoseBadUrl(raw: string) {
  console.error(`  longitud de DATABASE_URL: ${raw.length} caracteres (no muestro el valor por seguridad)`);
  if (!/^postgres(ql)?:\/\//i.test(raw)) {
    console.error("  → Debe empezar por postgresql:// o postgres://");
  }
  if (raw.includes(" ") && !raw.startsWith('"')) {
    console.error("  → Si la URL tiene espacios, ponla entre comillas dobles en .env.local");
  }
  console.error(
    "  → Si la contraseña tiene @ # : / % * + etc., codifícala: encodeURIComponent('tu_pass') y sustituye en la URI."
  );
}

let parsed: URL;
try {
  parsed = new URL(urlRaw);
} catch {
  console.error("❌ DATABASE_URL no es una URL válida para `new URL()`");
  diagnoseBadUrl(urlRaw);
  process.exit(1);
}

const passDecoded = decodeURIComponent(parsed.password || "");
const passNorm = passDecoded.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const looksLikePlaceholder =
  passNorm === "tu_contrasena" ||
  /\[(your-?password|tu_contraseña)\]/i.test(urlRaw) ||
  /\byour-?password\b/i.test(passDecoded);
if (looksLikePlaceholder) {
  console.error(
    "❌ La contraseña en DATABASE_URL sigue siendo un TEXTO DE EJEMPLO (p. ej. TU_CONTRASEÑA o [YOUR-PASSWORD]). Pon la contraseña real: Supabase → Project Settings → Database."
  );
  process.exit(1);
}

const user = parsed.username || "";
const host = parsed.hostname || "";
const port = parsed.port || "5432";
const dbName = (parsed.pathname || "").replace(/^\//, "") || "postgres";

console.log("— Resumen (sin contraseña) —");
console.log(`  host:     ${host}`);
console.log(`  port:     ${port}`);
console.log(`  database: ${dbName}`);
console.log(`  user:     ${user}`);
const passLen = (parsed.password ?? "").length;
console.log(
  `  password: ${passLen > 0 ? `(presente, ${passLen} caracteres tras decodificar URL)` : "❌ VACÍA — la URI está mal: suele pasar si la contraseña tiene @ # : / sin URL-encode"}`
);

if (!user.includes(".")) {
  console.warn(
    "⚠️  En Supabase pooler el usuario suele ser postgres.TU_REF, no solo \"postgres\"."
  );
}
if (host.includes("pooler.supabase.com") && port === "5432") {
  console.log("  (puerto 5432 = session pooler)");
}
if (host.includes("pooler.supabase.com") && port === "6543") {
  console.log("  (puerto 6543 = transaction pooler)");
}

async function main() {
  const isSupabase =
    databaseUrl.includes("supabase.com") ||
    databaseUrl.includes("supabase.co");
  const sql = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    ...(isSupabase ? { ssl: "require" as const } : {}),
  });
  try {
    const ping = await sql`SELECT 1 AS ok`;
    console.log("\n✅ Conexión OK:", ping[0]);

    const [{ n }] = await sql`SELECT count(*)::int AS n FROM public.users`;
    console.log(`✅ Tabla public.users accesible: ${n} fila(s)`);
    if (n === 0) {
      console.warn(
        "⚠️  No hay usuarios. Ejecuta: npm run db:seed-admin (y migraciones si faltan)."
      );
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  const cause =
    e && typeof e === "object" && "cause" in e
      ? (e as { cause?: { message?: string; code?: string } }).cause
      : undefined;
  console.error("\n❌ Error de conexión o consulta:");
  console.error("  ", msg);
  if (cause?.message) console.error("  causa:", cause.message, cause.code ?? "");
  if (String(cause?.code || msg).includes("28P01")) {
    console.error(
      "\n  → Revisa usuario (postgres.REF) y contraseña en Supabase; URL-encode la password si tiene símbolos."
    );
  }
  process.exit(1);
});
