"use client";

import {
  createMeetingAction,
  createQuestionAction,
  deleteMeetingAction,
  getQuestionQrDataUrlAction,
  importAssistantsCsvAction,
  listQuestionsForMeetingAction,
  toggleQuestionOpenAction,
} from "@/app/(encuesta)/actions";
import { questions as questionsTable } from "@/db/schema";
import {
  BarChart3,
  Building2,
  CirclePlus,
  FileDown,
  LogOut,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { signOut } from "next-auth/react";

type MeetingRow = {
  id: string;
  title: string;
  meetingDate: string;
  createdAt: string;
};

type QuestionRow = typeof questionsTable.$inferSelect;

type TabId = "meetings" | "results" | "create" | "export" | "assistants";

type LiveResults = {
  question: {
    title: string;
    description: string | null;
    type: string;
    isOpen: boolean;
  };
  total: number;
  breakdown: { label: string; count: number; percent: number }[];
  winner: string | null;
  tie: boolean;
  participation: {
    totalAssistants: number;
    votedCount: number;
    participationPercent: number;
  };
};

const COLORS = ["#1E6FFF", "#00C9A7", "#F59E0B", "#EC4899", "#8B5CF6", "#64748B"];

/** Iconos con trazo fino (estilo light) */
const ICON = { className: "h-5 w-5 shrink-0", strokeWidth: 1.25 } as const;

const SIDEBAR_NAV: {
  id: TabId;
  label: string;
  Icon: typeof Building2;
}[] = [
  { id: "meetings", label: "Asambleas", Icon: Building2 },
  { id: "results", label: "Resultados", Icon: BarChart3 },
  { id: "create", label: "Crear pregunta", Icon: CirclePlus },
  { id: "export", label: "Exportar", Icon: FileDown },
  { id: "assistants", label: "Asistentes", Icon: UserPlus },
];

/** Solo mes, día y año (sin hora), en español. */
function formatMeetingCalendarDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Convierte valor de `<input type="date">` a ISO enviable al servidor (mediodía local, evita corrimiento UTC). */
function dateInputToMeetingDateTime(isoDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return `${isoDate}T12:00:00`;
  }
  return isoDate;
}

export function DashboardClient({
  initialMeetings,
  userEmail,
  userName,
}: {
  initialMeetings: MeetingRow[];
  userEmail: string;
  userName: string;
}) {
  const [meetings, setMeetings] = useState(initialMeetings);
  const [meetingId, setMeetingId] = useState<string>(
    initialMeetings[0]?.id ?? ""
  );
  const [tab, setTab] = useState<TabId>(() =>
    initialMeetings.length > 0 ? "results" : "meetings"
  );
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [selectedQ, setSelectedQ] = useState<string>("");
  const [live, setLive] = useState<LiveResults | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingDate, setNewMeetingDate] = useState("");

  const [qTitle, setQTitle] = useState("");
  const [qDesc, setQDesc] = useState("");
  const [qType, setQType] = useState<
    "yes_no" | "multiple_choice" | "accept_decline" | "scale_1_5"
  >("yes_no");
  const [qOptionsText, setQOptionsText] = useState("");
  const [lastCreated, setLastCreated] = useState<{
    publicId: string;
    accessCode: string;
    dataUrl: string;
    voteUrl: string;
  } | null>(null);

  const activeMeeting = useMemo(
    () => meetings.find((m) => m.id === meetingId),
    [meetings, meetingId]
  );

  const refreshQuestions = useCallback(async (mid: string) => {
    await Promise.resolve();
    if (!mid) {
      setQuestions([]);
      return;
    }
    const qs = await listQuestionsForMeetingAction(mid);
    setQuestions(qs);
    if (qs.length > 0) {
      setSelectedQ((prev) => {
        if (prev && qs.some((q) => q.id === prev)) return prev;
        return qs[0]!.id;
      });
    } else {
      setSelectedQ("");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState tras await en refreshQuestions
    void refreshQuestions(meetingId);
  }, [meetingId, refreshQuestions]);

  useEffect(() => {
    if (meetings.length === 0 && tab !== "meetings") {
      setTab("meetings");
    }
  }, [meetings.length, tab]);

  const selectedPublicId = useMemo(() => {
    const q = questions.find((x) => x.id === selectedQ);
    return q?.publicId ?? "";
  }, [questions, selectedQ]);

  const fetchLive = useCallback(async () => {
    await Promise.resolve();
    if (!selectedPublicId) {
      setLive(null);
      return;
    }
    const res = await fetch(`/api/questions/${selectedPublicId}/results`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const j = (await res.json()) as LiveResults;
    setLive(j);
  }, [selectedPublicId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState tras fetch en fetchLive
    void fetchLive();
  }, [fetchLive]);

  useEffect(() => {
    if (tab !== "results" || !selectedPublicId) return;
    const id = window.setInterval(() => {
      void fetchLive();
    }, 2500);
    return () => window.clearInterval(id);
  }, [tab, selectedPublicId, fetchLive]);

  async function onCreateMeeting(e: React.FormEvent) {
    e.preventDefault();
    const titleCapture = newMeetingTitle;
    const dateCapture = newMeetingDate;
    setBusy(true);
    setToast(null);
    const fd = new FormData();
    fd.set("title", titleCapture);
    fd.set("meetingDate", dateInputToMeetingDateTime(dateCapture));
    const r = await createMeetingAction(fd);
    setBusy(false);
    if (!r.ok) {
      setToast(r.error);
      return;
    }
    setNewMeetingTitle("");
    setNewMeetingDate("");
    setMeetings((prev) => [
      {
        id: r.meetingId,
        title: titleCapture,
        meetingDate: new Date(
          dateInputToMeetingDateTime(dateCapture)
        ).toISOString(),
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setMeetingId(r.meetingId);
    setToast("Asamblea creada");
  }

  async function onDeleteMeeting(id: string, title: string) {
    const ok = window.confirm(
      `¿Eliminar la asamblea «${title}»?\n\nSe borrarán todas las preguntas, asistentes y votos vinculados. No se puede deshacer.`
    );
    if (!ok) return;

    setBusy(true);
    setToast(null);
    const r = await deleteMeetingAction(id);
    setBusy(false);
    if (!r.ok) {
      setToast(r.error);
      return;
    }

    const nextList = meetings.filter((m) => m.id !== id);
    setMeetings(nextList);
    if (meetingId === id) {
      setMeetingId(nextList[0]?.id ?? "");
    }
    setToast("Asamblea eliminada");
  }

  async function onCreateQuestion(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setToast(null);
    setLastCreated(null);
    const fd = new FormData();
    fd.set("meetingId", meetingId);
    fd.set("title", qTitle);
    fd.set("description", qDesc);
    fd.set("type", qType);
    fd.set("optionsText", qOptionsText);
    const r = await createQuestionAction(fd);
    setBusy(false);
    if (!r.ok) {
      setToast(r.error);
      return;
    }
    const qr = await getQuestionQrDataUrlAction(r.publicId);
    if (qr.ok) {
      setLastCreated({
        publicId: r.publicId,
        accessCode: r.accessCode,
        dataUrl: qr.dataUrl,
        voteUrl: qr.voteUrl,
      });
    }
    setQTitle("");
    setQDesc("");
    setQOptionsText("");
    await refreshQuestions(meetingId);
    setToast("Pregunta creada");
  }

  async function onToggleOpen(q: QuestionRow) {
    setBusy(true);
    const r = await toggleQuestionOpenAction(q.id, !q.isOpen);
    setBusy(false);
    if (!r.ok) setToast(r.error);
    await refreshQuestions(meetingId);
    void fetchLive();
  }

  async function onImportCsv(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!meetingId) {
      setToast("Selecciona una asamblea en la pestaña Asambleas");
      return;
    }
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("meetingId", meetingId);
    setBusy(true);
    setToast(null);
    const r = await importAssistantsCsvAction(fd);
    setBusy(false);
    if (!r.ok) {
      setToast(r.error);
      return;
    }
    setToast(`Importados: ${r.imported} asistentes`);
    form.reset();
  }

  function openProjection() {
    if (!selectedPublicId) return;
    window.open(
      `/proyeccion/${selectedPublicId}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  const selectedQuestionRow = questions.find((q) => q.id === selectedQ);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-950/80 px-4 py-4 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-white">Panel de votación</h1>
          <p className="text-xs text-zinc-500">
            Resultados en vivo y gestión de asambleas
          </p>
          {activeMeeting ? (
            <p className="mt-1 text-sm text-zinc-300">
              <span className="text-zinc-500">Asamblea activa:</span>{" "}
              {activeMeeting.title}
              {formatMeetingCalendarDate(activeMeeting.meetingDate)
                ? ` · ${formatMeetingCalendarDate(activeMeeting.meetingDate)}`
                : ""}
            </p>
          ) : (
            <p className="mt-1 text-sm text-amber-400/90">
              No hay asamblea seleccionada. Créala o elígela en{" "}
              <strong className="font-medium">Asambleas</strong>.
            </p>
          )}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <p className="text-right text-xs text-zinc-500">
              {userName ? (
                <span className="text-zinc-300">{userName}</span>
              ) : null}
              {userName && userEmail ? <span className="text-zinc-600"> · </span> : null}
              {userEmail ? (
                <span className="font-mono text-zinc-400">{userEmail}</span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900 hover:text-white"
            >
              <LogOut {...ICON} className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950/90 py-3">
          <nav className="flex flex-col gap-0.5 px-2" aria-label="Secciones">
            {SIDEBAR_NAV.map(({ id, label, Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                    active
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                >
                  <Icon {...ICON} aria-hidden />
                  {label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          {toast ? (
            <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 whitespace-pre-wrap">
              {toast}
            </div>
          ) : null}

          {tab === "meetings" ? (
            <div className="mx-auto max-w-3xl space-y-8">
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                <h2 className="text-base font-semibold text-white">
                  Nueva asamblea
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Define título y fecha; luego podrás crear preguntas e importar
                  asistentes.
                </p>
                <form
                  onSubmit={onCreateMeeting}
                  className="mt-4 grid gap-3 sm:grid-cols-2"
                >
                  <input
                    required
                    placeholder="Título (ej. Asamblea ordinaria 2025)"
                    value={newMeetingTitle}
                    onChange={(e) => setNewMeetingTitle(e.target.value)}
                    className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-zinc-500">
                      Fecha (día, mes y año)
                    </label>
                    <input
                      required
                      type="date"
                      value={newMeetingDate}
                      onChange={(e) => setNewMeetingDate(e.target.value)}
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-lg bg-[#00C9A7] px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50"
                    >
                      Crear asamblea
                    </button>
                  </div>
                </form>
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                <h2 className="text-base font-semibold text-white">
                  Tus asambleas
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Elige cuál usar para preguntas, CSV y exportación. Al borrar una
                  asamblea se eliminan sus preguntas, asistentes y votos.
                </p>
                {meetings.length === 0 ? (
                  <p className="mt-6 text-sm text-zinc-500">
                    Aún no hay asambleas. Crea la primera arriba.
                  </p>
                ) : (
                  <ul className="mt-4 flex flex-col gap-2">
                    {meetings.map((m) => {
                      const fecha = formatMeetingCalendarDate(m.meetingDate);
                      const selected = m.id === meetingId;
                      return (
                        <li
                          key={m.id}
                          className={`flex min-h-[4.5rem] items-stretch gap-0 overflow-hidden rounded-xl border transition ${
                            selected
                              ? "border-[#1E6FFF] bg-[#1E6FFF]/10 ring-1 ring-[#1E6FFF]/40"
                              : "border-zinc-700 bg-zinc-950/50 hover:border-zinc-600"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setMeetingId(m.id)}
                            className="min-w-0 flex-1 px-4 py-3 text-left"
                          >
                            <p className="font-medium text-white">{m.title}</p>
                            {fecha ? (
                              <p className="mt-0.5 text-xs text-zinc-500">
                                {fecha}
                              </p>
                            ) : null}
                            {selected ? (
                              <p className="mt-1 text-xs font-medium text-[#1E6FFF]">
                                Activa
                              </p>
                            ) : null}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            title="Borrar asamblea"
                            aria-label={`Borrar asamblea ${m.title}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              void onDeleteMeeting(m.id, m.title);
                            }}
                            className="shrink-0 border-l border-zinc-700/80 px-3 text-zinc-500 transition hover:bg-red-950/40 hover:text-red-400 disabled:opacity-40"
                          >
                            <Trash2 {...ICON} className="h-5 w-5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          ) : null}

          {meetings.length > 0 && tab === "results" ? (
            <section className="mx-auto max-w-6xl space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-wrap gap-3">
                  <div>
                    <label className="block text-xs text-zinc-500">Pregunta</label>
                    <select
                      value={selectedQ}
                      onChange={(e) => setSelectedQ(e.target.value)}
                      className="mt-1 min-w-[220px] rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                    >
                      {questions.length === 0 ? (
                        <option value="">Sin preguntas</option>
                      ) : null}
                      {questions.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.title.slice(0, 60)}
                          {q.title.length > 60 ? "…" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedQuestionRow ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onToggleOpen(selectedQuestionRow)}
                      className="mt-5 rounded-lg border border-zinc-600 px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {selectedQuestionRow.isOpen
                        ? "Cerrar votaciones"
                        : "Abrir votaciones"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={openProjection}
                    disabled={!selectedPublicId}
                    className="mt-5 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-40"
                  >
                    Pantalla de proyección
                  </button>
                </div>
              </div>

              {live && selectedQuestionRow ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                    <h3 className="text-sm font-medium text-zinc-400">
                      Participación
                    </h3>
                    <p className="mt-2 text-4xl font-semibold text-white">
                      {live.participation.participationPercent}%
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {live.participation.votedCount} de{" "}
                      {live.participation.totalAssistants} asistentes registrados
                      han votado
                    </p>
                    <p className="mt-4 text-xs text-zinc-500">
                      Estado:{" "}
                      <span
                        className={
                          live.question.isOpen
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }
                      >
                        {live.question.isOpen ? "Abierta" : "Cerrada"}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                    <h3 className="text-sm font-medium text-zinc-400">Resumen</h3>
                    <p className="mt-2 text-lg text-white">{live.question.title}</p>
                    <p className="mt-2 text-sm text-zinc-500">
                      Total votos: {live.total}
                      {live.winner && !live.tie ? (
                        <span className="ml-2 text-emerald-400">
                          Ganador: {live.winner}
                        </span>
                      ) : null}
                      {live.tie ? (
                        <span className="ml-2 text-amber-400">Empate</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                    <h3 className="mb-4 text-sm font-medium text-zinc-400">
                      Gráfico de barras
                    </h3>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={live.breakdown}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis
                            dataKey="label"
                            stroke="#a1a1aa"
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis stroke="#a1a1aa" allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              background: "#18181b",
                              border: "1px solid #3f3f46",
                            }}
                            labelStyle={{ color: "#fafafa" }}
                          />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {live.breakdown.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                    <h3 className="mb-4 text-sm font-medium text-zinc-400">
                      Gráfico circular
                    </h3>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={live.breakdown}
                            dataKey="count"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={(props) => {
                              const name = String(props.name ?? "");
                              const pct = Number(props.percent ?? 0) * 100;
                              return `${name}: ${pct.toFixed(0)}%`;
                            }}
                          >
                            {live.breakdown.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: "#18181b",
                              border: "1px solid #3f3f46",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  {questions.length === 0
                    ? "Crea una pregunta en la pestaña Crear pregunta."
                    : "Cargando resultados…"}
                </p>
              )}
            </section>
          ) : null}

          {meetings.length > 0 && tab === "create" ? (
            <section className="mx-auto max-w-3xl space-y-6">
              <form
                onSubmit={onCreateQuestion}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3"
              >
                <h2 className="text-base font-semibold text-white">
                  Nueva pregunta
                </h2>
                <p className="text-xs text-zinc-500">
                  Se asocia a la <strong>asamblea activa</strong> (pestaña
                  Asambleas).
                </p>
                <input
                  required
                  placeholder="Título de la pregunta"
                  value={qTitle}
                  onChange={(e) => setQTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                />
                <textarea
                  placeholder="Descripción (opcional)"
                  value={qDesc}
                  onChange={(e) => setQDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                />
                <select
                  value={qType}
                  onChange={(e) =>
                    setQType(e.target.value as typeof qType)
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                >
                  <option value="yes_no">Sí / No</option>
                  <option value="accept_decline">Acepto / No acepto</option>
                  <option value="scale_1_5">Escala 1 a 5</option>
                  <option value="multiple_choice">
                    Opción múltiple (una respuesta)
                  </option>
                </select>
                {qType === "multiple_choice" ? (
                  <textarea
                    required
                    placeholder="Una opción por línea"
                    value={qOptionsText}
                    onChange={(e) => setQOptionsText(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  />
                ) : null}
                <button
                  type="submit"
                  disabled={busy || !meetingId}
                  className="rounded-lg bg-[#1E6FFF] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Crear y generar QR
                </button>
              </form>

              {lastCreated ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
                  <h3 className="text-sm font-semibold text-emerald-200">
                    Pregunta creada
                  </h3>
                  <p className="mt-2 text-xs text-zinc-400">
                    Código de acceso (por si compartes el enlace sin QR):{" "}
                    <span className="font-mono text-lg text-white">
                      {lastCreated.accessCode}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    El QR ya incluye ese acceso: cada copropietario solo ingresa
                    su <strong className="text-zinc-400">código de apartamento</strong> del CSV.
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 break-all">
                    {lastCreated.voteUrl}
                  </p>
                  <div className="mt-4 flex justify-center rounded-xl bg-white p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={lastCreated.dataUrl}
                      alt="Código QR"
                      width={280}
                      height={280}
                    />
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {meetings.length > 0 && tab === "export" ? (
            <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h2 className="text-base font-semibold text-white">
                Exportar acta (PDF)
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Incluye fecha de la reunión, preguntas y resultados con opción
                ganadora. Usa la asamblea activa.
              </p>
              <a
                href={meetingId ? `/api/export/pdf?meetingId=${meetingId}` : "#"}
                className="mt-4 inline-flex rounded-lg bg-[#1E6FFF] px-4 py-2 text-sm font-medium text-white hover:bg-[#185dcc] disabled:pointer-events-none disabled:opacity-40"
                {...(meetingId ? { download: true } : {})}
              >
                Descargar PDF
              </a>
            </section>
          ) : null}

          {meetings.length > 0 && tab === "assistants" ? (
            <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h2 className="text-base font-semibold text-white">
                Importar asistentes (CSV)
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Columnas: <strong>Torre</strong>, <strong>Apto</strong> (o
                Apartamento), <strong>Nombre</strong>, y una columna con el{" "}
                <strong>código único por apartamento</strong> (p. ej.{" "}
                <span className="font-mono text-zinc-400">
                  Codigo de Votacion
                </span>
                ,{" "}
                <span className="font-mono text-zinc-400">
                  Codigo Apartamento
                </span>{" "}
                o <span className="font-mono text-zinc-400">Codigo Unidad</span>
                ). Ese es el valor que cada copropietario escribe al votar. Una
                fila por unidad. Asamblea activa.
              </p>
              <form onSubmit={onImportCsv} className="mt-4 space-y-3">
                <input type="hidden" name="meetingId" value={meetingId} />
                <input
                  required
                  type="file"
                  name="file"
                  accept=".csv,text/csv"
                  className="block text-sm text-zinc-300"
                />
                <button
                  type="submit"
                  disabled={busy || !meetingId}
                  className="rounded-lg bg-[#00C9A7] px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50"
                >
                  Subir CSV
                </button>
              </form>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
