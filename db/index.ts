import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let client: ReturnType<typeof postgres> | undefined;
let dbInstance: DrizzleDb | undefined;

function isSupabaseHost(url: string): boolean {
  return url.includes("supabase.com") || url.includes("supabase.co");
}

/** Pooler compartido: pocas conexiones por proceso (Next dev/HMR abre varios). */
function isSupabasePooler(url: string): boolean {
  return (
    url.includes("pooler.supabase.com") || url.includes("pooler.supabase.co")
  );
}

function isSupabaseSessionPooler(url: string): boolean {
  if (!isSupabasePooler(url)) return false;
  try {
    const u = new URL(url.replace(/^postgresql:/i, "http:"));
    return u.port === "5432" || u.port === "";
  } catch {
    return /:5432\//.test(url) || /:5432(?:\?|$)/.test(url);
  }
}

function getDbInstance(): DrizzleDb {
  if (dbInstance) return dbInstance;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida");
  }

  const isSupabase = isSupabaseHost(connectionString);
  const pooler = isSupabasePooler(connectionString);
  const sessionPooler = isSupabaseSessionPooler(connectionString);

  // Session pooler (5432): 1 conexión por proceso (cupo mínimo en Supabase).
  // Transaction pooler (6543): pool pequeño por instancia Node; PgBouncer multiplexa muchos clientes.
  // Sobreescribe con DATABASE_POOL_MAX=1|2 si saturaras el plan o tienes muchas réplicas de la app.
  const envPool = process.env.DATABASE_POOL_MAX?.trim();
  const parsedPool = envPool ? Number(envPool) : NaN;
  const defaultPoolMax = pooler
    ? sessionPooler
      ? 1
      : 2
    : isSupabase
      ? 5
      : 10;

  const max = Number.isFinite(parsedPool) && parsedPool >= 1
    ? Math.min(10, Math.max(1, Math.floor(parsedPool)))
    : pooler || isSupabase
      ? Math.min(10, Math.max(1, defaultPoolMax))
      : 10;

  client = postgres(connectionString, {
    prepare: false,
    max,
    idle_timeout: 20,
    connect_timeout: 15,
    // Recicla conexiones ante límites del pooler / redes largas.
    max_lifetime: 60 * 30,
    ...(isSupabase ? { ssl: "require" as const } : {}),
  });
  dbInstance = drizzle(client, { schema });
  return dbInstance;
}

/** Acceso perezoso: solo conecta al usar `.select()`, `.insert()`, etc. */
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    const inst = getDbInstance();
    const val = Reflect.get(inst, prop, inst);
    if (typeof val === "function") {
      return val.bind(inst);
    }
    return val;
  },
});

export type DB = DrizzleDb;
