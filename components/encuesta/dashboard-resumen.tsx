"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle,
  Clock,
  Download,
  FileText,
} from "lucide-react";
import { useMemo } from "react";

export type ResumenMeetingRow = {
  id: string;
  title: string;
  meetingDate: string;
  createdAt: string;
  /** Pasos del acta completados (0–6), mismo valor que en BD / panel admin. */
  actaStepsCompleted: number;
  /** Marca ISO (índice 0..5) cuando el admin marcó ese paso como completado. */
  actaStepCompletedAt: (string | null)[];
};

type StepStatus = "done" | "active" | "pending";

interface Step {
  label: string;
  time: string;
  status: StepStatus;
}

export interface AsambleaCardModel {
  id: string;
  title: string;
  date: string;
  status: "in_progress" | "completed" | "scheduled";
  steps: Step[];
  eta?: string;
}

function startOfTodayMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatMeetingWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStepCompletedAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function meetingLineStatus(
  m: ResumenMeetingRow,
  activeId: string
): "in_progress" | "completed" | "scheduled" {
  if (m.actaStepsCompleted >= 6) return "completed";
  if (m.actaStepsCompleted > 0) return "in_progress";
  const t = new Date(m.meetingDate).getTime();
  if (Number.isNaN(t)) return "scheduled";
  if (t < startOfTodayMs() || m.id === activeId) return "in_progress";
  return "scheduled";
}

const STEP_LABELS = [
  "Grabación recibida",
  "Transcripción",
  "Validación de contenido",
  "Redacción del acta",
  "Revisión",
  "Entrega del acta PDF",
] as const;

function buildSteps(
  lineStatus: "in_progress" | "completed" | "scheduled",
  actaStepsCompleted: number,
  stepTimes: (string | null)[]
): Step[] {
  const at = (i: number) => formatStepCompletedAt(stepTimes[i] ?? null);
  if (lineStatus === "completed" || actaStepsCompleted >= 6) {
    return STEP_LABELS.map((label, i) => ({
      label,
      time: at(i),
      status: "done" as const,
    }));
  }
  if (lineStatus === "scheduled") {
    return STEP_LABELS.map((label) => ({
      label,
      time: "Pendiente",
      status: "pending" as const,
    }));
  }
  const c = actaStepsCompleted;
  return STEP_LABELS.map((label, i) => {
    if (i < c) {
      return { label, time: at(i), status: "done" as const };
    }
    if (i === c) {
      return { label, time: "En curso…", status: "active" as const };
    }
    return { label, time: "Pendiente", status: "pending" as const };
  });
}

function toCardModel(
  m: ResumenMeetingRow,
  activeId: string
): AsambleaCardModel {
  const lineStatus = meetingLineStatus(m, activeId);
  const steps = buildSteps(
    lineStatus,
    m.actaStepsCompleted,
    m.actaStepCompletedAt
  );
  const eta =
    lineStatus === "in_progress"
      ? "Máx. 48 h hábiles desde la asamblea"
      : undefined;
  return {
    id: m.id,
    title: m.title,
    date: formatMeetingWhen(m.meetingDate),
    status: lineStatus,
    steps,
    eta,
  };
}

function StepNode({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500">
        <CheckCircle className="h-3 w-3 text-white" strokeWidth={3} />
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="flex h-5 w-5 shrink-0 animate-pulse items-center justify-center rounded-full border-2 border-amber-400 bg-amber-50 shadow-[0_0_0_4px_rgba(251,191,36,0.2)]">
        <div className="h-2 w-2 rounded-full bg-amber-600" />
      </div>
    );
  }
  return (
    <div className="h-5 w-5 shrink-0 rounded-full border border-slate-200 bg-slate-100" />
  );
}

function ProgressTrack({ asamblea }: { asamblea: AsambleaCardModel }) {
  const total = asamblea.steps.length;
  const done = asamblea.steps.filter((s) => s.status === "done").length;
  const pct = Math.round((done / total) * 100);
  const isActive = asamblea.status === "in_progress";

  return (
    <div className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-slate-500">
            Progreso del acta
          </span>
          {isActive ? (
            <span className="animate-pulse rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-800">
              en curso
            </span>
          ) : null}
        </div>
        <span className="text-[13px] font-bold text-slate-900">{pct}%</span>
      </div>

      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: isActive
              ? "linear-gradient(90deg, #10b981, #059669)"
              : "#cbd5e1",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="space-y-3">
        {asamblea.steps.map((step, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <StepNode status={step.status} />
              <span
                className={`text-[13px] ${
                  step.status === "done"
                    ? "text-slate-400"
                    : step.status === "active"
                      ? "font-semibold text-slate-900"
                      : "text-slate-300"
                }`}
              >
                {step.label}
              </span>
            </div>
            <span
              title={
                step.status === "done" && step.time !== "—"
                  ? `Completado: ${step.time}`
                  : undefined
              }
              className={`max-w-[55%] shrink-0 text-right text-[10px] leading-snug sm:max-w-none sm:text-[11px] ${
                step.status === "done"
                  ? "text-slate-500"
                  : step.status === "active"
                    ? "font-semibold text-amber-700"
                    : "text-slate-300"
              }`}
            >
              {step.status === "done" && step.time !== "—"
                ? `Completado · ${step.time}`
                : step.time}
            </span>
          </div>
        ))}
      </div>

      {asamblea.eta ? (
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          Entrega estimada:{" "}
          <span className="font-semibold text-slate-900">{asamblea.eta}</span>
        </div>
      ) : null}
    </div>
  );
}

function AsambleaCard({
  asamblea,
  onDownloadPdf,
}: {
  asamblea: AsambleaCardModel;
  onDownloadPdf: () => void;
}) {
  const isActive = asamblea.status === "in_progress";
  const isDone = asamblea.status === "completed";

  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
            <FileText className="h-4 w-4 text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-slate-900">
              {asamblea.title}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">{asamblea.date}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              En proceso
            </span>
          ) : isDone ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                Completada
              </span>
              <button
                type="button"
                onClick={onDownloadPdf}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                <Download className="h-3 w-3" /> Exportar
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500">
              Programada
            </span>
          )}
        </div>
      </div>
      <ProgressTrack asamblea={asamblea} />
    </div>
  );
}

export function DashboardResumenView({
  meetings,
  activeMeetingId,
  userName,
  userEmail,
  onGoExport,
}: {
  meetings: ResumenMeetingRow[];
  activeMeetingId: string;
  userName: string;
  userEmail: string;
  onGoExport: () => void;
}) {
  const displayName = userName.trim() || userEmail || "Usuario";
  const initial = displayName.charAt(0).toUpperCase() || "?";

  const sortedCards = useMemo(() => {
    const list = meetings.map((m) => toCardModel(m, activeMeetingId));
    const pri = (s: AsambleaCardModel["status"]) =>
      s === "in_progress" ? 0 : s === "scheduled" ? 1 : 2;
    return [...list].sort((a, b) => {
      const d = pri(a.status) - pri(b.status);
      if (d !== 0) return d;
      const ma = meetings.find((x) => x.id === a.id);
      const mb = meetings.find((x) => x.id === b.id);
      return (
        new Date(mb?.meetingDate ?? 0).getTime() -
        new Date(ma?.meetingDate ?? 0).getTime()
      );
    });
  }, [meetings, activeMeetingId]);

  const activeCard = sortedCards.find((c) => c.status === "in_progress");

  const completedCount = sortedCards.filter(
    (c) => c.status === "completed"
  ).length;
  const scheduledCount = sortedCards.filter(
    (c) => c.status === "scheduled"
  ).length;

  if (meetings.length === 0) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <p className="text-sm text-slate-600">
          Cuando crees una asamblea en la pestaña{" "}
          <strong className="text-slate-800">Asamblea</strong>, aquí verás el
          resumen y el seguimiento del acta.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <div className="mb-6 flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: "#0f172a" }}
        >
          {initial}
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Bienvenido de vuelta
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {displayName}
          </h2>
          {userEmail ? (
            <p className="mt-1 text-[13px] text-slate-500">{userEmail}</p>
          ) : null}
        </div>
      </div>

      {activeCard ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-emerald-900">
                Acta en redacción
              </p>
              <p className="mt-0.5 truncate text-[11px] text-emerald-700">
                {activeCard.title}
                {activeCard.eta ? ` · ${activeCard.eta}` : ""}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xl font-bold text-emerald-800">
              {Math.round(
                (activeCard.steps.filter((s) => s.status === "done").length /
                  activeCard.steps.length) *
                  100
              )}
              %
            </p>
            <p className="text-[10px] text-emerald-600">completado</p>
          </div>
        </motion.div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: "Asambleas",
            value: String(meetings.length),
            sub: "registradas",
          },
          {
            label: "Completadas",
            value: String(completedCount),
            sub: "acta cerrada",
          },
          {
            label: "Próximas",
            value: String(scheduledCount),
            sub: "fecha futura",
          },
        ].map(({ label, value, sub }) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              {label}
            </p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="mt-1 text-[10px] text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        Asambleas
      </p>
      <AnimatePresence>
        {sortedCards.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <AsambleaCard asamblea={a} onDownloadPdf={onGoExport} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
