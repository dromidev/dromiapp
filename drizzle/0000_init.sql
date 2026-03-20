CREATE TABLE "assistants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"tower" text NOT NULL,
	"apartment" text NOT NULL,
	"full_name" text NOT NULL,
	"code_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"meeting_date" timestamp NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"access_code" text NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"assistant_id" uuid NOT NULL,
	"answer" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assistants" ADD CONSTRAINT "assistants_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_assistant_id_assistants_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "public"."assistants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assistants_meeting_code_uidx" ON "assistants" USING btree ("meeting_id","code_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_public_id_uidx" ON "questions" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_access_code_uidx" ON "questions" USING btree ("access_code");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_question_assistant_uidx" ON "votes" USING btree ("question_id","assistant_id");

--> statement-breakpoint
-- Triggers/constraints para alinear `public.users.id` con `auth.uid()`.
-- Esto permite que las políticas RLS usen `auth.uid()` para ownership.
-- Nota: este trigger se ejecuta en `auth.users` cuando se crea un usuario.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public."users" ("id", "email", "password_hash", "name")
  VALUES (
    NEW.id,
    NEW.email,
    -- Este proyecto usa Supabase Auth para login (luego, `password_hash` no es usado).
    -- Pero la columna es NOT NULL: guardamos un placeholder.
    '',
    COALESCE(NEW.raw_user_meta_data->>'name', NULL)
  )
  ON CONFLICT ("id") DO UPDATE SET
    "email" = EXCLUDED."email",
    "name" = EXCLUDED."name";

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

--> statement-breakpoint
-- RLS (Admin ownership) para `meetings`, `assistants` y `questions`.
-- Por ahora no habilitamos políticas explícitas para anon/votantes; en la fase siguiente se
-- moverá la lógica crítica a RPC/SECURITY DEFINER.

ALTER TABLE "meetings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assistants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "votes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- meetings: admin CRUD propio
CREATE POLICY "meetings_admin_select_own" ON "meetings"
FOR SELECT
USING ("created_by_user_id" = auth.uid());

CREATE POLICY "meetings_admin_insert_own" ON "meetings"
FOR INSERT
WITH CHECK ("created_by_user_id" = auth.uid());

CREATE POLICY "meetings_admin_update_own" ON "meetings"
FOR UPDATE
USING ("created_by_user_id" = auth.uid())
WITH CHECK ("created_by_user_id" = auth.uid());

CREATE POLICY "meetings_admin_delete_own" ON "meetings"
FOR DELETE
USING ("created_by_user_id" = auth.uid());

-- assistants: admin CRUD sobre assistants pertenecientes a meetings propias
CREATE POLICY "assistants_admin_select_own" ON "assistants"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "meetings" m
    WHERE m."id" = "assistants"."meeting_id"
      AND m."created_by_user_id" = auth.uid()
  )
);

CREATE POLICY "assistants_admin_insert_own" ON "assistants"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "meetings" m
    WHERE m."id" = "assistants"."meeting_id"
      AND m."created_by_user_id" = auth.uid()
  )
);

CREATE POLICY "assistants_admin_update_own" ON "assistants"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM "meetings" m
    WHERE m."id" = "assistants"."meeting_id"
      AND m."created_by_user_id" = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "meetings" m
    WHERE m."id" = "assistants"."meeting_id"
      AND m."created_by_user_id" = auth.uid()
  )
);

CREATE POLICY "assistants_admin_delete_own" ON "assistants"
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM "meetings" m
    WHERE m."id" = "assistants"."meeting_id"
      AND m."created_by_user_id" = auth.uid()
  )
);

-- questions: admin CRUD sobre questions pertenecientes a meetings propias
CREATE POLICY "questions_admin_select_own" ON "questions"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "meetings" m
    WHERE m."id" = "questions"."meeting_id"
      AND m."created_by_user_id" = auth.uid()
  )
);

CREATE POLICY "questions_admin_insert_own" ON "questions"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "meetings" m
    WHERE m."id" = "questions"."meeting_id"
      AND m."created_by_user_id" = auth.uid()
  )
);

CREATE POLICY "questions_admin_update_own" ON "questions"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM "meetings" m
    WHERE m."id" = "questions"."meeting_id"
      AND m."created_by_user_id" = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "meetings" m
    WHERE m."id" = "questions"."meeting_id"
      AND m."created_by_user_id" = auth.uid()
  )
);

CREATE POLICY "questions_admin_delete_own" ON "questions"
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM "meetings" m
    WHERE m."id" = "questions"."meeting_id"
      AND m."created_by_user_id" = auth.uid()
  )
);

-- users: solo permitir que un usuario admin/propio consulte su fila.
-- (No se incluyen políticas para exponer `password_hash`; en el cliente no se leerá.)
CREATE POLICY "users_admin_select_own" ON "users"
FOR SELECT
USING ("id" = auth.uid());

--> statement-breakpoint
-- RPC: verificación de paso de votación (público) y obtención de payload de pregunta.

CREATE OR REPLACE FUNCTION public.verify_vote_step(
  p_public_id uuid,
  p_access_code text,
  p_assistant_code_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q RECORD;
  a_id uuid;
  normalized_access text;
  already_voted boolean;
  options_payload jsonb;
BEGIN
  normalized_access := upper(regexp_replace(trim(p_access_code), '\s+', '', 'g'));

  SELECT *
  INTO q
  FROM "questions"
  WHERE "public_id" = p_public_id
  LIMIT 1;

  IF q.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  IF upper(regexp_replace(trim(q.access_code), '\s+', '', 'g')) <> normalized_access THEN
    RETURN jsonb_build_object('ok', false, 'code', 'bad_access');
  END IF;

  IF q.is_open IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok', false, 'code', 'closed');
  END IF;

  SELECT "id"
  INTO a_id
  FROM "assistants"
  WHERE "meeting_id" = q.meeting_id
    AND "code_hash" = p_assistant_code_hash
  LIMIT 1;

  IF a_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'bad_assistant');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM "votes" v
    WHERE v."question_id" = q.id
      AND v."assistant_id" = a_id
  )
  INTO already_voted;

  IF already_voted THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_voted');
  END IF;

  options_payload :=
    CASE
      WHEN q.type = 'multiple_choice' THEN q.options
      ELSE '[]'::jsonb
    END;

  RETURN jsonb_build_object(
    'ok', true,
    'question', jsonb_build_object(
      'id', q.id,
      'publicId', q.public_id,
      'title', q.title,
      'description', q.description,
      'type', q.type,
      'options', options_payload,
      'isOpen', q.is_open
    ),
    'assistantId', a_id
  );
END;
$$;

--> statement-breakpoint
-- RPC: registrar voto (público). Valida códigos, estado y unicidad.

CREATE OR REPLACE FUNCTION public.submit_vote_step(
  p_public_id uuid,
  p_access_code text,
  p_assistant_code_hash text,
  p_choice text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q RECORD;
  a_id uuid;
  normalized_access text;
  already_voted boolean;
  choice_is_allowed boolean;
  inserted_row_count integer;
BEGIN
  normalized_access := upper(regexp_replace(trim(p_access_code), '\s+', '', 'g'));

  SELECT *
  INTO q
  FROM "questions"
  WHERE "public_id" = p_public_id
  LIMIT 1;

  IF q.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  IF upper(regexp_replace(trim(q.access_code), '\s+', '', 'g')) <> normalized_access THEN
    RETURN jsonb_build_object('ok', false, 'code', 'bad_access');
  END IF;

  IF q.is_open IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok', false, 'code', 'closed');
  END IF;

  SELECT "id"
  INTO a_id
  FROM "assistants"
  WHERE "meeting_id" = q.meeting_id
    AND "code_hash" = p_assistant_code_hash
  LIMIT 1;

  IF a_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'bad_assistant');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM "votes" v
    WHERE v."question_id" = q.id
      AND v."assistant_id" = a_id
  )
  INTO already_voted;

  IF already_voted THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_voted');
  END IF;

  -- Validación de elección usando `q.options` para todos los tipos.
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(q.options) AS opt(val)
    WHERE opt.val = p_choice
  )
  INTO choice_is_allowed;

  IF choice_is_allowed IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('ok', false, 'code', 'bad_choice');
  END IF;

  INSERT INTO "votes" ("question_id", "assistant_id", "answer")
  VALUES (
    q.id,
    a_id,
    jsonb_build_object('choice', p_choice)
  )
  ON CONFLICT ("question_id", "assistant_id") DO NOTHING;

  GET DIAGNOSTICS inserted_row_count = ROW_COUNT;

  IF inserted_row_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'already_voted');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

--> statement-breakpoint
-- RPC: resultados de una pregunta (por publicId).

CREATE OR REPLACE FUNCTION public.get_question_results(p_public_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q RECORD;
  total_count integer;
  breakdown jsonb;
  winner_label text;
  tops_count integer;
BEGIN
  SELECT q0.*
  INTO q
  FROM "questions" q0
  WHERE q0."public_id" = p_public_id
  LIMIT 1;

  IF q.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  WITH agg AS (
    SELECT
      COALESCE(v.answer->>'choice', '(sin etiqueta)') AS label,
      COUNT(*)::int AS c
    FROM "votes" v
    WHERE v."question_id" = q.id
    GROUP BY 1
  ),
  tot AS (
    SELECT COALESCE(SUM(c), 0)::int AS total
    FROM agg
  ),
  tops AS (
    SELECT label, c
    FROM agg
    WHERE c = (SELECT MAX(c) FROM agg)
  )
  SELECT
    (SELECT total FROM tot) AS total_count,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'label', agg.label,
          'count', agg.c,
          'percent',
            CASE
              WHEN (SELECT total FROM tot) = 0 THEN 0
              ELSE ROUND((agg.c::numeric / (SELECT total FROM tot)) * 1000) / 10
            END
        )
      ) FROM agg),
      '[]'::jsonb
    ) AS breakdown,
    (SELECT CASE WHEN COUNT(*) = 1 THEN MIN(label) ELSE NULL END FROM tops) AS winner_label,
    (SELECT COUNT(*)::int FROM tops) AS tops_count
  INTO total_count, breakdown, winner_label, tops_count;

  RETURN jsonb_build_object(
    'ok', true,
    'total', total_count,
    'breakdown', breakdown,
    'winner', winner_label,
    'tie', (winner_label IS NULL AND tops_count > 1)
  );
END;
$$;

--> statement-breakpoint
-- RPC: participación de una pregunta (por publicId).

CREATE OR REPLACE FUNCTION public.get_question_participation(p_public_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q RECORD;
  total_assistants integer;
  voted integer;
  pct numeric;
BEGIN
  SELECT q0.*
  INTO q
  FROM "questions" q0
  WHERE q0."public_id" = p_public_id
  LIMIT 1;

  IF q.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT COUNT(*)::int
  INTO total_assistants
  FROM "assistants"
  WHERE "meeting_id" = q.meeting_id;

  SELECT COUNT(*)::int
  INTO voted
  FROM "votes"
  WHERE "question_id" = q.id;

  IF total_assistants = 0 THEN
    pct := 0;
  ELSE
    pct := ROUND((voted::numeric / total_assistants::numeric) * 1000) / 10;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'totalAssistants', total_assistants,
    'votedCount', voted,
    'participationPercent', pct
  );
END;
$$;

--> statement-breakpoint
-- Permisos sobre RPC: restringimos ejecución a roles relevantes.
REVOKE ALL ON FUNCTION public.verify_vote_step(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_vote_step(uuid, text, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.submit_vote_step(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_vote_step(uuid, text, text, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_question_results(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_question_results(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_question_participation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_question_participation(uuid) TO anon, authenticated;

--> statement-breakpoint
-- RPC: payload público + resultados + participación (para endpoint /results sin Drizzle).

CREATE OR REPLACE FUNCTION public.get_public_question_projection(p_public_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q RECORD;
  total_count integer;
  breakdown jsonb;
  winner_label text;
  tops_count integer;
  total_assistants integer;
  voted integer;
  pct numeric;
BEGIN
  SELECT q0.*
  INTO q
  FROM "questions" q0
  WHERE q0."public_id" = p_public_id
  LIMIT 1;

  IF q.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  WITH agg AS (
    SELECT
      COALESCE(v.answer->>'choice', '(sin etiqueta)') AS label,
      COUNT(*)::int AS c
    FROM "votes" v
    WHERE v."question_id" = q.id
    GROUP BY 1
  ),
  tot AS (
    SELECT COALESCE(SUM(c), 0)::int AS total
    FROM agg
  ),
  tops AS (
    SELECT label, c
    FROM agg
    WHERE c = (SELECT MAX(c) FROM agg)
  )
  SELECT
    (SELECT total FROM tot) AS total_count,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'label', agg.label,
          'count', agg.c,
          'percent',
            CASE
              WHEN (SELECT total FROM tot) = 0 THEN 0
              ELSE ROUND((agg.c::numeric / (SELECT total FROM tot)) * 1000) / 10
            END
        )
      ) FROM agg),
      '[]'::jsonb
    ) AS breakdown,
    (SELECT CASE WHEN COUNT(*) = 1 THEN MIN(label) ELSE NULL END FROM tops) AS winner_label,
    (SELECT COUNT(*)::int FROM tops) AS tops_count
  INTO total_count, breakdown, winner_label, tops_count;

  SELECT COUNT(*)::int
  INTO total_assistants
  FROM "assistants"
  WHERE "meeting_id" = q.meeting_id;

  SELECT COUNT(*)::int
  INTO voted
  FROM "votes"
  WHERE "question_id" = q.id;

  IF total_assistants = 0 THEN
    pct := 0;
  ELSE
    pct := ROUND((voted::numeric / total_assistants::numeric) * 1000) / 10;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'question', jsonb_build_object(
      'title', q.title,
      'description', q.description,
      'type', q.type,
      'isOpen', q.is_open
    ),
    'total', total_count,
    'breakdown', breakdown,
    'winner', winner_label,
    'tie', (winner_label IS NULL AND tops_count > 1),
    'participation', jsonb_build_object(
      'totalAssistants', total_assistants,
      'votedCount', voted,
      'participationPercent', pct
    )
  );
END;
$$;

--> statement-breakpoint
REVOKE ALL ON FUNCTION public.get_public_question_projection(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_question_projection(uuid) TO anon, authenticated;

