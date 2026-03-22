import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const meetings = pgTable("meetings", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  meetingDate: timestamp("meeting_date", { mode: "date" }).notNull(),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Si es false, la asamblea no aparece en el panel; datos, preguntas y votos se conservan. */
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const assistants = pgTable(
  "assistants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    /** Torre+apartamento en un solo valor (ej. 38503). */
    unidad: text("unidad").notNull(),
    fullName: text("full_name").notNull(),
    /** HMAC-SHA256 del código de votación (búsqueda O(1)) */
    codeHash: text("code_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("assistants_meeting_code_uidx").on(t.meetingId, t.codeHash),
  ]
);

export const questionTypes = [
  "yes_no",
  "multiple_choice",
  "accept_decline",
  "scale_1_5",
] as const;
export type QuestionType = (typeof questionTypes)[number];

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    type: text("type").$type<QuestionType>().notNull(),
    /** Opciones para multiple_choice; vacío o fijo según tipo */
    options: jsonb("options").$type<string[]>().notNull().default([]),
    publicId: uuid("public_id").defaultRandom().notNull(),
    accessCode: text("access_code").notNull(),
    isOpen: boolean("is_open").notNull().default(true),
    /** Si es false, la pregunta no se muestra en el panel ni acepta votos; votos y datos se conservan. */
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("questions_public_id_uidx").on(t.publicId),
    uniqueIndex("questions_access_code_uidx").on(t.accessCode),
  ]
);

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    assistantId: uuid("assistant_id")
      .notNull()
      .references(() => assistants.id, { onDelete: "cascade" }),
    answer: jsonb("answer")
      .$type<{ choice?: string; scale?: number }>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("votes_question_assistant_uidx").on(t.questionId, t.assistantId),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  meetings: many(meetings),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [meetings.createdByUserId],
    references: [users.id],
  }),
  assistants: many(assistants),
  questions: many(questions),
}));

export const assistantsRelations = relations(assistants, ({ one, many }) => ({
  meeting: one(meetings, {
    fields: [assistants.meetingId],
    references: [meetings.id],
  }),
  votes: many(votes),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  meeting: one(meetings, {
    fields: [questions.meetingId],
    references: [meetings.id],
  }),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  question: one(questions, {
    fields: [votes.questionId],
    references: [questions.id],
  }),
  assistant: one(assistants, {
    fields: [votes.assistantId],
    references: [assistants.id],
  }),
}));
