"use client";

import {
  createMeetingAction,
  createQuestionAction,
  deleteMeetingAction,
  deleteQuestionAction,
  getQuestionQrDataUrlAction,
  importAssistantsCsvAction,
  listQuestionsForMeetingAction,
  toggleQuestionOpenAction,
  updateMeetingAction,
} from "@/app/(encuesta)/actions";
import {
  PieResultsSectorLabel,
  ResultsChartTooltip,
} from "@/components/encuesta/recharts-results-tooltip";
import { questions as questionsTable } from "@/db/schema";
import {
  BarChart3,
  Building2,
  CirclePlus,
  FileDown,
  Loader2,
  Pencil,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const SIDEBAR_MAIN_NAV: {
  id: TabId;
  label: string;
  Icon: typeof Building2;
}[] = [
  { id: "meetings", label: "Asamblea", Icon: Building2 },
  { id: "create", label: "Crear Preguntas", Icon: CirclePlus },
  { id: "results", label: "Resultados", Icon: BarChart3 },
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

/** Valor para `<input type="date">` a partir del ISO guardado en el cliente. */
function meetingDateIsoToDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function QrPresentationLink({
  publicId,
  className = "",
  label = "Abrir en pantalla completa (videobeam)",
}: {
  publicId: string;
  className?: string;
  /** Texto del enlace; en Resultados se usa copia específica para el QR. */
  label?: string;
}) {
  return (
    <a
      href={`/dashboard/qr/${publicId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-sm font-medium text-emerald-300 underline-offset-2 hover:text-emerald-200 hover:underline ${className}`}
    >
      {label}
    </a>
  );
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
  const [resultsLoading, setResultsLoading] = useState(false);
  const selectedPublicIdRef = useRef("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingDate, setNewMeetingDate] = useState("");
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [editMeetingTitle, setEditMeetingTitle] = useState("");
  const [editMeetingDate, setEditMeetingDate] = useState("");

  const [qTitle, setQTitle] = useState("");
  const [qDesc, setQDesc] = useState("");
  const [qType, setQType] = useState<
    "yes_no" | "multiple_choice" | "accept_decline" | "scale_1_5"
  >("yes_no");
  const [qOptionsText, setQOptionsText] = useState("");
  const [questionQr, setQuestionQr] = useState<{
    publicId: string;
    dataUrl: string;
    title: string;
  } | null>(null);

  const [assistantsCsvImport, setAssistantsCsvImport] = useState<
    | { phase: "idle" }
    | { phase: "uploading" }
    | { phase: "success"; imported: number }
    | { phase: "error"; message: string }
  >({ phase: "idle" });

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

  selectedPublicIdRef.current = selectedPublicId;

  const fetchLive = useCallback(
    async (opts?: { silent?: boolean }) => {
      const pid = selectedPublicId;
      if (!pid) {
        setLive(null);
        setResultsLoading(false);
        return;
      }
      const silent = opts?.silent ?? false;
      if (!silent) setResultsLoading(true);
      try {
        const res = await fetch(`/api/questions/${pid}/results`, {
          cache: "no-store",
        });
        if (selectedPublicIdRef.current !== pid) return;
        if (!res.ok) return;
        const j = (await res.json()) as LiveResults;
        if (selectedPublicIdRef.current !== pid) return;
        setLive(j);
      } finally {
        if (!silent && selectedPublicIdRef.current === pid) {
          setResultsLoading(false);
        }
      }
    },
    [selectedPublicId]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState tras fetch en fetchLive
    void fetchLive();
  }, [fetchLive]);

  useEffect(() => {
    if (tab !== "results" || !selectedPublicId) return;
    const id = window.setInterval(() => {
      void fetchLive({ silent: true });
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

    if (editingMeetingId === id) cancelEditMeeting();

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

  function startEditMeeting(m: MeetingRow) {
    setEditingMeetingId(m.id);
    setEditMeetingTitle(m.title);
    setEditMeetingDate(meetingDateIsoToDateInput(m.meetingDate));
    setToast(null);
  }

  function cancelEditMeeting() {
    setEditingMeetingId(null);
    setEditMeetingTitle("");
    setEditMeetingDate("");
  }

  async function onSaveMeetingEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMeetingId) return;
    const titleTrim = editMeetingTitle.trim();
    if (!titleTrim) {
      setToast("El título no puede estar vacío");
      return;
    }
    if (!editMeetingDate) {
      setToast("Indica la fecha de la asamblea");
      return;
    }
    setBusy(true);
    setToast(null);
    const fd = new FormData();
    fd.set("meetingId", editingMeetingId);
    fd.set("title", editMeetingTitle);
    fd.set("meetingDate", dateInputToMeetingDateTime(editMeetingDate));
    const r = await updateMeetingAction(fd);
    setBusy(false);
    if (!r.ok) {
      setToast(r.error);
      return;
    }
    const nextIso = new Date(
      dateInputToMeetingDateTime(editMeetingDate)
    ).toISOString();
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === editingMeetingId
          ? { ...m, title: titleTrim, meetingDate: nextIso }
          : m
      )
    );
    cancelEditMeeting();
    setToast("Asamblea actualizada");
  }

  async function loadQuestionQr(publicId: string, title: string) {
    if (!publicId) return;
    setBusy(true);
    setToast(null);
    const qr = await getQuestionQrDataUrlAction(publicId);
    setBusy(false);
    if (!qr.ok) {
      setToast(qr.error);
      return;
    }
    setQuestionQr({ publicId, dataUrl: qr.dataUrl, title });
  }

  async function onCreateQuestion(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setToast(null);
    const titleCapture = qTitle.trim() || "Pregunta";
    const fd = new FormData();
    fd.set("meetingId", meetingId);
    fd.set("title", qTitle);
    fd.set("description", qDesc);
    fd.set("type", qType);
    fd.set("optionsText", qOptionsText);
    const r = await createQuestionAction(fd);
    if (!r.ok) {
      setBusy(false);
      setToast(r.error);
      return;
    }
    const qr = await getQuestionQrDataUrlAction(r.publicId);
    setBusy(false);
    if (qr.ok) {
      setQuestionQr({
        publicId: r.publicId,
        dataUrl: qr.dataUrl,
        title: titleCapture,
      });
      setToast("Pregunta creada");
    } else {
      setToast(`Pregunta creada. ${qr.error}`);
      setQuestionQr(null);
    }
    setQTitle("");
    setQDesc("");
    setQOptionsText("");
    await refreshQuestions(meetingId);
  }

  async function onDeleteQuestion(q: QuestionRow) {
    const ok = window.confirm(
      `¿Eliminar la pregunta «${q.title}»?\n\nSe borrarán los votos de esta pregunta. No se puede deshacer.`
    );
    if (!ok) return;
    setBusy(true);
    setToast(null);
    const r = await deleteQuestionAction(q.id);
    setBusy(false);
    if (!r.ok) {
      setToast(r.error);
      return;
    }
    if (questionQr?.publicId === q.publicId) setQuestionQr(null);
    setToast("Pregunta eliminada");
    await refreshQuestions(meetingId);
    void fetchLive();
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
      setAssistantsCsvImport({
        phase: "error",
        message:
          "Selecciona una asamblea en la pestaña Asamblea antes de importar.",
      });
      return;
    }
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("meetingId", meetingId);
    setAssistantsCsvImport({ phase: "uploading" });
    const r = await importAssistantsCsvAction(fd);
    if (!r.ok) {
      setAssistantsCsvImport({ phase: "error", message: r.error });
      return;
    }
    setAssistantsCsvImport({ phase: "success", imported: r.imported });
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
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#0f1419]">
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-950/90 px-4 py-4 backdrop-blur">
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
              <strong className="font-medium">Asamblea</strong>.
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
              ) : (
                <span className="text-amber-400/90">
                  Define DASHBOARD_USER_ID o SEED_ADMIN_EMAIL para gestionar asambleas
                </span>
              )}
            </p>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-900 bg-zinc-950 py-3 min-h-0">
          <nav
            className="flex min-h-0 flex-1 flex-col gap-0.5 px-2"
            aria-label="Secciones"
          >
            {SIDEBAR_MAIN_NAV.map(({ id, label, Icon }) => {
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
          <div className="mt-auto border-t border-zinc-800 px-2 pt-2">
            <button
              type="button"
              onClick={() => setTab("export")}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                tab === "export"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              <FileDown {...ICON} aria-hidden />
              Exportar
            </button>
          </div>
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
                  Elige cuál usar para preguntas, CSV y exportación. Usa el lápiz
                  para cambiar el nombre o la fecha sin perder datos. Al borrar una
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
                      const isEditing = editingMeetingId === m.id;
                      return (
                        <li
                          key={m.id}
                          className={`flex min-h-[4.5rem] items-stretch gap-0 overflow-hidden rounded-xl border transition ${
                            selected
                              ? "border-[#1E6FFF] bg-[#1E6FFF]/10 ring-1 ring-[#1E6FFF]/40"
                              : "border-zinc-700 bg-zinc-950/50 hover:border-zinc-600"
                          }`}
                        >
                          {isEditing ? (
                            <form
                              onSubmit={onSaveMeetingEdit}
                              className="flex min-w-0 flex-1 flex-col gap-3 px-4 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                value={editMeetingTitle}
                                onChange={(e) =>
                                  setEditMeetingTitle(e.target.value)
                                }
                                className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-white"
                                placeholder="Título de la asamblea"
                                aria-label="Título de la asamblea"
                              />
                              <div>
                                <label className="text-xs font-medium text-zinc-500">
                                  Fecha (día, mes y año)
                                </label>
                                <input
                                  type="date"
                                  value={editMeetingDate}
                                  onChange={(e) =>
                                    setEditMeetingDate(e.target.value)
                                  }
                                  className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-white"
                                />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="submit"
                                  disabled={busy}
                                  className="rounded-lg bg-[#00C9A7] px-3 py-1.5 text-sm font-medium text-zinc-950 disabled:opacity-50"
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={cancelEditMeeting}
                                  className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </form>
                          ) : (
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
                          )}
                          {!isEditing ? (
                            <button
                              type="button"
                              disabled={busy}
                              title="Editar nombre y fecha"
                              aria-label={`Editar asamblea ${m.title}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditMeeting(m);
                              }}
                              className="shrink-0 border-l border-zinc-700/80 px-3 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
                            >
                              <Pencil {...ICON} className="h-5 w-5" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy || isEditing}
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
                  <button
                    type="button"
                    disabled={busy || !selectedPublicId || !selectedQuestionRow}
                    onClick={() => {
                      if (!selectedQuestionRow) return;
                      void loadQuestionQr(
                        selectedQuestionRow.publicId,
                        selectedQuestionRow.title
                      );
                    }}
                    className="mt-5 rounded-lg border border-emerald-600/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100 hover:bg-emerald-950/70 disabled:opacity-40"
                  >
                    Ver código QR
                  </button>
                  {selectedQuestionRow ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onDeleteQuestion(selectedQuestionRow)}
                      className="mt-5 inline-flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200 hover:bg-red-950/50 disabled:opacity-50"
                    >
                      <Trash2 {...ICON} className="h-4 w-4" />
                      Eliminar pregunta
                    </button>
                  ) : null}
                  {selectedPublicId ? (
                    <QrPresentationLink
                      publicId={selectedPublicId}
                      className="basis-full mt-1"
                      label="Abrir QR en pantalla completa"
                    />
                  ) : null}
                </div>
              </div>

              {questionQr ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-emerald-200">
                        Código QR
                      </h3>
                      <p className="mt-1 text-xs text-zinc-400">{questionQr.title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuestionQr(null)}
                      className="text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      Ocultar
                    </button>
                  </div>
                  <div className="mt-4 flex justify-center rounded-xl bg-white p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={questionQr.dataUrl}
                      alt="Código QR"
                      width={280}
                      height={280}
                    />
                  </div>
                  <QrPresentationLink
                    publicId={questionQr.publicId}
                    className="mt-3 block text-center"
                    label="Abrir QR en pantalla completa"
                  />
                </div>
              ) : null}

              {selectedQuestionRow ? (
                <div className="relative min-h-[320px]">
                  {live ? (
                    <>
                      <div
                        className={
                          resultsLoading
                            ? "pointer-events-none blur-[3px] transition-[filter,opacity] duration-200"
                            : undefined
                        }
                      >
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                          <div className="flex min-h-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                            <h3 className="text-sm font-medium text-zinc-400">
                              Participación
                            </h3>
                            <p className="mt-2 text-4xl font-semibold text-white">
                              {live.participation.participationPercent}%
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {live.participation.votedCount} de{" "}
                              {live.participation.totalAssistants} asistentes
                              registrados han votado
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
                          <div className="flex min-h-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                            <h3 className="text-sm font-medium text-zinc-400">
                              Resumen
                            </h3>
                            <p className="mt-2 text-lg text-white">
                              {live.question.title}
                            </p>
                            <p className="mt-2 text-sm text-zinc-500">
                              Total votos: {live.total}
                              {live.winner && !live.tie ? (
                                <span className="ml-2 text-emerald-400">
                                  Ganador: {live.winner}
                                </span>
                              ) : null}
                              {live.tie ? (
                                <span className="ml-2 text-amber-400">
                                  Empate
                                </span>
                              ) : null}
                            </p>
                          </div>
                          <div className="flex min-h-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                            <h3 className="mb-4 text-sm font-medium text-zinc-400">
                              Gráfico de barras
                            </h3>
                            <div className="h-64 min-h-[220px] w-full flex-1 sm:h-72">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={live.breakdown}
                                  barCategoryGap="22%"
                                  margin={{ top: 8, right: 8, left: 4, bottom: 8 }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#27272a"
                                  />
                                  <XAxis
                                    dataKey="label"
                                    stroke="#a1a1aa"
                                    tick={{ fontSize: 11 }}
                                    interval={0}
                                  />
                                  <YAxis
                                    stroke="#a1a1aa"
                                    allowDecimals={false}
                                    domain={[0, "auto"]}
                                  />
                                  <Tooltip
                                    cursor={false}
                                    content={<ResultsChartTooltip />}
                                  />
                                  <Bar
                                    dataKey="count"
                                    maxBarSize={48}
                                    minPointSize={14}
                                    radius={[5, 5, 0, 0]}
                                    isAnimationActive={false}
                                    activeBar={{
                                      fill: "rgba(255,255,255,0.14)",
                                      stroke: "#d4d4d8",
                                      strokeWidth: 1,
                                    }}
                                  >
                                    {live.breakdown.map((_, i) => (
                                      <Cell
                                        key={i}
                                        fill={COLORS[i % COLORS.length]}
                                      />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                          <div className="flex min-h-0 flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                            <h3 className="mb-4 text-sm font-medium text-zinc-400">
                              Gráfico circular
                            </h3>
                            <div className="h-64 min-h-[220px] w-full flex-1 sm:h-72">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart margin={{ top: 24, right: 48, bottom: 24, left: 48 }}>
                                  <Pie
                                    data={live.breakdown}
                                    dataKey="count"
                                    nameKey="label"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={0}
                                    outerRadius="62%"
                                    paddingAngle={0}
                                    isAnimationActive={false}
                                    animationDuration={0}
                                    labelLine={{
                                      stroke: "#a1a1aa",
                                      strokeWidth: 1,
                                    }}
                                    label={PieResultsSectorLabel}
                                  >
                                    {live.breakdown.map((_, i) => (
                                      <Cell
                                        key={i}
                                        fill={COLORS[i % COLORS.length]}
                                      />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    content={<ResultsChartTooltip />}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      </div>
                      {resultsLoading ? (
                        <div
                          className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-zinc-950/35 backdrop-blur-sm"
                          aria-busy="true"
                          aria-live="polite"
                        >
                          <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-600 bg-zinc-900/95 px-10 py-8 shadow-2xl">
                            <Loader2
                              className="h-9 w-9 animate-spin text-[#1E6FFF]"
                              aria-hidden
                            />
                            <p className="text-sm font-medium text-white">
                              Cargando resultados
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : resultsLoading ? (
                    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
                      <Loader2
                        className="h-9 w-9 animate-spin text-[#1E6FFF]"
                        aria-hidden
                      />
                      <p className="text-sm font-medium text-white">
                        Cargando resultados
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">
                      Cargando resultados…
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  {questions.length === 0
                    ? "Crea una pregunta en la pestaña Crear pregunta."
                    : "Selecciona una pregunta para ver los resultados."}
                </p>
              )}
            </section>
          ) : null}

          {meetings.length > 0 && tab === "create" ? (
            <section
              className={
                questions.length > 0 || questionQr
                  ? "mx-auto max-w-6xl"
                  : "mx-auto max-w-3xl"
              }
            >
              <div
                className={
                  questions.length > 0 || questionQr
                    ? "grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2"
                    : "space-y-6"
                }
              >
              <form
                onSubmit={onCreateQuestion}
                className="flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-3"
              >
                <h2 className="text-base font-semibold text-white">
                  Nueva pregunta
                </h2>
                <div>
                  <label
                    htmlFor="create-question-meeting"
                    className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
                  >
                    Asamblea
                  </label>
                  <select
                    id="create-question-meeting"
                    value={meetingId}
                    onChange={(e) => setMeetingId(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                  >
                    {meetings.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                        {formatMeetingCalendarDate(m.meetingDate)
                          ? ` · ${formatMeetingCalendarDate(m.meetingDate)}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    La pregunta se guarda enlazada a esta asamblea. Los
                    asistentes que importes en <strong>Asistentes</strong> deben
                    ser de la <strong>misma</strong> asamblea para que los
                    códigos de votación funcionen.
                  </p>
                </div>
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
                  className="mt-auto rounded-lg bg-[#1E6FFF] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Crear y generar QR
                </button>
              </form>

              {questions.length > 0 || questionQr ? (
                <div className="flex min-h-0 w-full min-w-0 flex-col gap-6">
                  {questions.length > 0 ? (
                    <div className="flex min-h-0 min-w-0 w-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
                      <h3 className="text-sm font-semibold text-white">
                        Ver código QR de una pregunta
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        Elige la pregunta y pulsa el botón para mostrar el QR
                        otra vez.
                      </p>
                      <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                        <div className="min-w-0 w-full flex-1 sm:min-w-[12rem]">
                          <label className="block text-xs text-zinc-500">
                            Pregunta
                          </label>
                          <select
                            value={selectedQ}
                            onChange={(e) => setSelectedQ(e.target.value)}
                            className="mt-1 w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                          >
                            {questions.map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.title.slice(0, 60)}
                                {q.title.length > 60 ? "…" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          disabled={busy || !selectedQuestionRow}
                          onClick={() => {
                            if (!selectedQuestionRow) return;
                            void loadQuestionQr(
                              selectedQuestionRow.publicId,
                              selectedQuestionRow.title
                            );
                          }}
                          className="w-full shrink-0 rounded-lg border border-emerald-600/50 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-950/70 disabled:opacity-40 sm:w-auto"
                        >
                          Ver código QR
                        </button>
                      </div>
                      {selectedQuestionRow ? (
                        <QrPresentationLink
                          publicId={selectedQuestionRow.publicId}
                          className="mt-4 inline-block"
                        />
                      ) : null}
                    </div>
                  ) : null}

                  {questionQr ? (
                    <div className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-emerald-200">
                            Código QR
                          </h3>
                          <p className="mt-1 text-xs text-zinc-400">
                            {questionQr.title}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setQuestionQr(null)}
                          className="text-xs text-zinc-500 hover:text-zinc-300"
                        >
                          Ocultar
                        </button>
                      </div>
                      <div className="mt-4 flex justify-center rounded-xl bg-white p-6 sm:p-8">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={questionQr.dataUrl}
                          alt="Código QR"
                          width={280}
                          height={280}
                          className="mx-auto h-auto w-full max-w-[280px]"
                        />
                      </div>
                      <QrPresentationLink
                        publicId={questionQr.publicId}
                        className="mt-4 block text-center"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              </div>
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
              <div className="mt-3 rounded-xl border border-zinc-700 bg-zinc-950/50 p-4">
                <p className="text-sm font-medium text-zinc-200">
                  Plantilla y formato
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Descarga el archivo de ejemplo, edítalo en Excel o similar y
                  súbelo aquí. <strong>Una fila = una unidad.</strong> El código
                  de votación es el que entregarás a cada copropietario.
                </p>
                <a
                  href="/plantilla-asistentes.csv"
                  download="plantilla-asistentes.csv"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#00C9A7]/50 bg-[#00C9A7]/10 px-3 py-2 text-sm font-medium text-[#00C9A7] transition hover:bg-[#00C9A7]/20"
                >
                  Descargar plantilla CSV
                </a>
                <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/80">
                  <table className="w-full min-w-[320px] text-left text-xs text-zinc-300">
                    <thead>
                      <tr className="border-b border-zinc-700 text-zinc-500">
                        <th className="px-3 py-2 font-medium">Unidad</th>
                        <th className="px-3 py-2 font-medium">Nombre</th>
                        <th className="px-3 py-2 font-medium">
                          Codigo de Votacion
                        </th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-[11px] text-zinc-400">
                      <tr className="border-b border-zinc-800/80">
                        <td className="px-3 py-2">38503</td>
                        <td className="px-3 py-2">Ejemplo copropietario 1</td>
                        <td className="px-3 py-2">CODE001</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2">38504</td>
                        <td className="px-3 py-2">Ejemplo copropietario 2</td>
                        <td className="px-3 py-2">CODE002</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-zinc-600">
                  <strong>Unidad:</strong> torre y apartamento en un solo valor
                  (ej. 38 + 503 → 38503). También puedes usar columnas separadas{" "}
                  <span className="font-mono text-zinc-500">Torre</span> y{" "}
                  <span className="font-mono text-zinc-500">Apto</span> en lugar
                  de Unidad. Los encabezados deben contener esas palabras clave
                  para que el sistema los reconozca.
                </p>
              </div>
              <form onSubmit={onImportCsv} className="mt-4 space-y-3">
                <input type="hidden" name="meetingId" value={meetingId} />
                <input
                  required
                  type="file"
                  name="file"
                  accept=".csv,text/csv"
                  className="block text-sm text-zinc-300"
                  onChange={() => setAssistantsCsvImport({ phase: "idle" })}
                />
                <button
                  type="submit"
                  disabled={
                    assistantsCsvImport.phase === "uploading" || !meetingId
                  }
                  className="rounded-lg bg-[#00C9A7] px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50"
                >
                  {assistantsCsvImport.phase === "uploading"
                    ? "Subiendo…"
                    : "Subir CSV"}
                </button>
              </form>

              {assistantsCsvImport.phase === "uploading" ? (
                <div
                  className="mt-5 rounded-xl border border-zinc-700 bg-zinc-900/60 p-4"
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-sm font-medium text-zinc-200">
                    Procesando CSV…
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Enviando archivo y guardando asistentes en la base de datos.
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="assistants-csv-progress-bar h-full rounded-full bg-[#00C9A7]"
                      aria-hidden
                    />
                  </div>
                </div>
              ) : null}

              {assistantsCsvImport.phase === "success" ? (
                <div
                  className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4"
                  role="status"
                >
                  <p className="text-sm font-semibold text-emerald-100">
                    Importación completada correctamente
                  </p>
                  <p className="mt-2 text-sm text-emerald-200/90">
                    Se registraron{" "}
                    <strong>{assistantsCsvImport.imported}</strong> asistente
                    {assistantsCsvImport.imported === 1 ? "" : "s"} en la
                    asamblea seleccionada.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAssistantsCsvImport({ phase: "idle" })}
                    className="mt-3 text-xs font-medium text-emerald-300 underline-offset-2 hover:underline"
                  >
                    Cerrar aviso
                  </button>
                </div>
              ) : null}

              {assistantsCsvImport.phase === "error" ? (
                <div
                  className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4"
                  role="alert"
                >
                  <p className="text-sm font-semibold text-red-100">
                    No se pudo importar el CSV
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-red-200/90">
                    {assistantsCsvImport.message}
                  </p>
                  <button
                    type="button"
                    onClick={() => setAssistantsCsvImport({ phase: "idle" })}
                    className="mt-3 text-xs font-medium text-red-300 underline-offset-2 hover:underline"
                  >
                    Cerrar aviso
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
