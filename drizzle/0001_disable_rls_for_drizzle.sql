-- Conexión directa (Drizzle/postgres.js) no usa JWT de Supabase: auth.uid() es NULL
-- y las políticas RLS de 0000_init pueden dejar la BD inusable desde el servidor.
-- Desactivamos RLS; el aislamiento por admin queda en la app (created_by_user_id).

ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "meetings" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "assistants" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "questions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "votes" DISABLE ROW LEVEL SECURITY;
