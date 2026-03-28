"use client";

import { updateMeetingActaStepAction } from "@/app/admin/actions";
import type { AdminMeetingRow } from "@/app/admin/actions";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  CheckCircle,
  Clock,
  FileText,
  LogOut,
  MapPin,
  RotateCcw,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

export type AdminMeetingRowInput = Omit<
  AdminMeetingRow,
  "meetingDate" | "actaUpdatedAt"
> & {
  meetingDate: string;
  actaUpdatedAt: string | null;
};

const STEP_LABELS: string[] = [
  "Grabación recibida",
  "Transcripción IA",
  "Validación de contenido",
  "Redacción del acta",
  "Revisión legal",
  "Entrega del acta PDF",
];

interface Asamblea {
  id: string;
  title: string;
  date: string;
  eta: string;
  stepsDone: number;
  isActive: boolean;
}

interface Conjunto {
  id: string;
  name: string;
  ownerEmail: string;
  meetingCount: number;
  asambleas: Asamblea[];
}

function parseIsoDate(s: string): Date {
  return new Date(s);
}

function formatMeetingDateLabel(iso: string): string {
  const d = parseIsoDate(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function defaultEtaLabel(iso: string, stepsDone: number): string {
  if (stepsDone >= 6) return "Entregada";
  const d = parseIsoDate(iso);
  if (Number.isNaN(d.getTime())) return "Máx. 48 h hábiles";
  const approx = new Date(d.getTime() + 48 * 60 * 60 * 1000);
  return `${approx.toLocaleDateString("es", { day: "numeric", month: "short" })} · objetivo`;
}

function rowsToConjuntos(rows: AdminMeetingRowInput[]): Conjunto[] {
  const byOwner = new Map<string, AdminMeetingRowInput[]>();
  for (const r of rows) {
    const key = r.ownerEmail.toLowerCase();
    if (!byOwner.has(key)) byOwner.set(key, []);
    byOwner.get(key)!.push(r);
  }

  return Array.from(byOwner.entries()).map(([emailKey, list]) => {
    const first = list[0];
    const name =
      first.organizationName?.trim() ||
      first.ownerName?.trim() ||
      first.ownerEmail;

    const asambleas: Asamblea[] = [...list]
      .sort(
        (a, b) =>
          parseIsoDate(b.meetingDate).getTime() -
          parseIsoDate(a.meetingDate).getTime()
      )
      .map((r) => ({
        id: r.meetingId,
        title: r.title,
        date: formatMeetingDateLabel(r.meetingDate),
        eta: defaultEtaLabel(r.meetingDate, r.actaStepsCompleted),
        stepsDone: r.actaStepsCompleted,
        isActive: r.isActive,
      }));

    return {
      id: emailKey,
      name,
      ownerEmail: first.ownerEmail,
      meetingCount: asambleas.length,
      asambleas,
    };
  });
}

function getStatus(stepsDone: number) {
  if (stepsDone >= 6) return "completed";
  if (stepsDone === 0) return "scheduled";
  return "in_progress";
}

function pct(stepsDone: number) {
  return Math.round((stepsDone / 6) * 100);
}

function conjuntoAggregateStatus(c: Conjunto): ReturnType<typeof getStatus> {
  const steps = c.asambleas.map((a) => a.stepsDone);
  if (steps.length === 0) return "scheduled";
  if (steps.every((s) => s >= 6)) return "completed";
  if (steps.every((s) => s === 0)) return "scheduled";
  return "in_progress";
}

function conjuntoAvgPct(c: Conjunto): number {
  if (c.asambleas.length === 0) return 0;
  const sum = c.asambleas.reduce((s, a) => s + pct(a.stepsDone), 0);
  return Math.round(sum / c.asambleas.length);
}

function StatusBadgeConjunto({ c }: { c: Conjunto }) {
  const st = conjuntoAggregateStatus(c);
  const stepsDone =
    st === "completed"
      ? 6
      : st === "scheduled"
        ? 0
        : Math.max(
            1,
            Math.min(5, Math.min(...c.asambleas.map((a) => a.stepsDone)))
          );
  return <StatusBadge stepsDone={stepsDone} />;
}

function StatusBadge({ stepsDone }: { stepsDone: number }) {
  const s = getStatus(stepsDone);
  if (s === "completed")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-600">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Completada
      </span>
    );
  if (s === "scheduled")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Programada
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-800">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />{" "}
      En proceso
    </span>
  );
}

interface StepRowProps {
  index: number;
  stepsDone: number;
  isDone: boolean;
  onAdvance: () => void;
  onRevert: () => void;
  disabled: boolean;
}

function StepRow({
  index,
  stepsDone,
  isDone,
  onAdvance,
  onRevert,
  disabled,
}: StepRowProps) {
  const stepDone = index < stepsDone;
  const stepActive = index === stepsDone && !isDone;
  const status = stepDone ? "done" : stepActive ? "active" : "pending";

  return (
    <div className="flex items-center gap-0 border-b border-slate-100 py-2.5">
      {stepDone && (
        <div className="mr-2.5 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-emerald-300 bg-emerald-50">
          <CheckCircle className="h-3 w-3 text-emerald-600" />
        </div>
      )}
      {stepActive && (
        <div className="mr-2.5 flex h-[22px] w-[22px] flex-shrink-0 animate-pulse items-center justify-center rounded-full border-2 border-amber-400 bg-amber-50 shadow-[0_0_0_4px_rgba(251,191,36,0.2)]">
          <div className="h-2 w-2 rounded-full bg-amber-600" />
        </div>
      )}
      {status === "pending" && (
        <div className="mr-2.5 h-[22px] w-[22px] flex-shrink-0 rounded-full border border-slate-200 bg-slate-100" />
      )}

      <span
        className={`flex-1 text-[12px] ${
          stepDone
            ? "text-slate-400"
            : stepActive
              ? "font-semibold text-slate-900"
              : "text-slate-400"
        }`}
      >
        {STEP_LABELS[index]}
      </span>

      <span
        className={`hidden w-24 flex-shrink-0 text-right text-[10px] sm:block ${
          stepDone
            ? "text-slate-400"
            : stepActive
              ? "font-semibold text-amber-700"
              : "text-slate-400"
        }`}
      >
        {stepDone ? "Completado" : stepActive ? "En curso…" : "Pendiente"}
      </span>

      {!isDone && (
        <div className="ml-2 flex flex-shrink-0 items-center gap-1.5">
          {stepActive && (
            <button
              type="button"
              disabled={disabled}
              onClick={onAdvance}
              className="cursor-pointer rounded-md bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ✓ Listo
            </button>
          )}
          {stepDone && index === stepsDone - 1 && (
            <button
              type="button"
              disabled={disabled}
              onClick={onRevert}
              className="flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface ProcessCardProps {
  conjunto: Conjunto;
  asamblea: Asamblea;
  onAdvance: (conjId: string, asmId: string) => void;
  onRevert: (conjId: string, asmId: string) => void;
  busy: boolean;
}

function ProcessCard({
  conjunto: c,
  asamblea: a,
  onAdvance,
  onRevert,
  busy,
}: ProcessCardProps) {
  const sd = a.stepsDone;
  const p = pct(sd);
  const done = getStatus(sd) === "completed";
  const active = getStatus(sd) === "in_progress";

  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
            <FileText className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-900">
              {a.title}
              {!a.isActive ? (
                <span className="ml-2 text-[10px] font-normal text-amber-700">
                  (inactiva en panel conjunto)
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">{a.date}</p>
          </div>
        </div>
        {done ? (
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-600">
            100% completo
          </span>
        ) : (
          <span
            className={`text-[13px] font-bold ${active ? "text-emerald-600" : "text-slate-500"}`}
          >
            {p}%
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className={`h-full rounded-full ${
              done ? "bg-slate-300" : "bg-gradient-to-r from-emerald-500 to-emerald-600"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${p}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <div>
          {STEP_LABELS.map((_, i) => (
            <StepRow
              key={i}
              index={i}
              stepsDone={sd}
              isDone={done}
              disabled={busy}
              onAdvance={() => onAdvance(c.id, a.id)}
              onRevert={() => onRevert(c.id, a.id)}
            />
          ))}
        </div>

        {!done ? (
          <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
            <Clock className="h-3 w-3 shrink-0 text-slate-400" />
            Entrega estimada:{" "}
            <span className="font-medium text-slate-700">{a.eta}</span>
          </div>
        ) : null}
      </div>

      {!done && sd < 6 ? (
        <div className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-[12px] font-semibold text-slate-900">
              Próximo paso
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {STEP_LABELS[sd]}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAdvance(c.id, a.id)}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-[11px] font-bold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Marcar como completado
          </button>
        </div>
      ) : null}

      {done ? (
        <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <p className="text-[12px] font-semibold text-emerald-900">
              Acta entregada
            </p>
            <p className="text-[11px] text-emerald-800/90">
              El administrador del conjunto puede exportar desde su panel (Encuesta).
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface SidebarAdminProps {
  conjuntos: Conjunto[];
  selectedId: string | null;
  onSelect: (c: Conjunto) => void;
}

function SidebarAdmin({ conjuntos, selectedId, onSelect }: SidebarAdminProps) {
  const cities = conjuntos.reduce<Record<string, Conjunto[]>>((acc, c) => {
    const bucket = "Conjuntos";
    if (!acc[bucket]) acc[bucket] = [];
    acc[bucket].push(c);
    return acc;
  }, {});

  return (
    <div className="flex h-full flex-col overflow-y-auto border-r border-slate-200 bg-white px-2.5 py-3">
      {Object.entries(cities).map(([city, items]) => (
        <div key={city}>
          <p className="mb-1.5 mt-4 px-2 text-[9px] font-bold uppercase tracking-widest text-slate-400 first:mt-0">
            {city}
          </p>
          {items.map((c) => {
            const st = conjuntoAggregateStatus(c);
            const isSelected = selectedId === c.id;
            const dotColorClass =
              st === "completed"
                ? "bg-slate-300"
                : st === "scheduled"
                  ? "bg-slate-300"
                  : "bg-emerald-500";

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c)}
                className={`mb-0.5 flex w-full items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left transition-all ${
                  isSelected
                    ? "border-slate-200 bg-slate-100"
                    : "border-transparent hover:bg-slate-50"
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`truncate text-[12px] font-medium ${isSelected ? "text-slate-900" : "text-slate-600"}`}
                  >
                    {c.name}
                  </p>
                  <p
                    className={`mt-0.5 text-[10px] ${isSelected ? "text-slate-500" : "text-slate-400"}`}
                  >
                    {c.meetingCount} asamblea(s) · {conjuntoAvgPct(c)}% medio
                  </p>
                </div>
                <span
                  className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dotColorClass} ${st === "in_progress" ? "animate-pulse" : ""}`}
                />
              </button>
            );
          })}
        </div>
      ))}

      <div className="mt-auto border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex cursor-pointer items-center gap-2 border-none bg-transparent px-2 py-1.5 text-[11px] text-slate-500 transition-colors hover:text-red-600"
        >
          <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}

interface AdminConjuntosPanelProps {
  initialRows: AdminMeetingRowInput[];
  userEmail: string;
}

export function AdminConjuntosPanel({
  initialRows,
  userEmail,
}: AdminConjuntosPanelProps) {
  const router = useRouter();
  const conjuntos = useMemo(() => rowsToConjuntos(initialRows), [initialRows]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const syncedSelected = useMemo(() => {
    if (conjuntos.length === 0) return null;
    if (selectedId) {
      const hit = conjuntos.find((c) => c.id === selectedId);
      if (hit) return hit;
    }
    return conjuntos[0];
  }, [conjuntos, selectedId]);

  const activeCount = useMemo(
    () =>
      conjuntos.filter((c) => conjuntoAggregateStatus(c) === "in_progress")
        .length,
    [conjuntos]
  );

  function runUpdate(meetingId: string, nextSteps: number) {
    setError(null);
    startTransition(async () => {
      const res = await updateMeetingActaStepAction({
        meetingId,
        actaStepsCompleted: nextSteps,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function advance(_conjId: string, asmId: string) {
    const asm = conjuntos
      .flatMap((c) => c.asambleas)
      .find((a) => a.id === asmId);
    if (!asm || asm.stepsDone >= 6) return;
    runUpdate(asmId, asm.stepsDone + 1);
  }

  function revert(_conjId: string, asmId: string) {
    const asm = conjuntos
      .flatMap((c) => c.asambleas)
      .find((a) => a.id === asmId);
    if (!asm || asm.stepsDone <= 0) return;
    runUpdate(asmId, asm.stepsDone - 1);
  }

  const initialLetter = (userEmail.trim().charAt(0) || "?").toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900">
            <Building2 className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-slate-900">
            Dromi
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] text-slate-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {activeCount} en proceso
          </div>
          <div
            title={userEmail}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-600"
          >
            {initialLetter}
          </div>
        </div>
      </div>

      {error ? (
        <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-center text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="flex flex-1 overflow-hidden">
        <div
          className="hidden w-52 shrink-0 flex-col md:flex"
          style={{ minHeight: "calc(100vh - 56px)" }}
        >
          <SidebarAdmin
            conjuntos={conjuntos}
            selectedId={syncedSelected?.id ?? null}
            onSelect={(c) => setSelectedId(c.id)}
          />
        </div>

        <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          {conjuntos.map((c) => {
            const st = conjuntoAggregateStatus(c);
            const isSelected = syncedSelected && syncedSelected.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-[11px] whitespace-nowrap transition-all ${
                  isSelected
                    ? "border-slate-200 bg-slate-100 text-slate-900"
                    : "border-slate-100 bg-white text-slate-600"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${st === "in_progress" ? "bg-emerald-500" : "bg-slate-300"}`}
                />
                {c.name}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            {conjuntos.length === 0 ? (
              <motion.div
                key="empty-all"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <Building2 className="mb-4 h-10 w-10 text-slate-300" />
                <p className="text-[14px] text-slate-500">
                  No hay asambleas registradas aún por los conjuntos.
                </p>
              </motion.div>
            ) : syncedSelected ? (
              <motion.div
                key={syncedSelected.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-2xl"
              >
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">
                      {syncedSelected.name}
                    </h1>
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500">
                      <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                      {syncedSelected.meetingCount} asamblea(s) ·{" "}
                      {syncedSelected.ownerEmail}
                    </p>
                  </div>
                  <StatusBadgeConjunto c={syncedSelected} />
                </div>

                <div className="mb-5 grid grid-cols-3 gap-2.5">
                  {(() => {
                    const avg = conjuntoAvgPct(syncedSelected);
                    const totalSteps = syncedSelected.asambleas.reduce(
                      (s, a) => s + a.stepsDone,
                      0
                    );
                    const maxPossible = syncedSelected.asambleas.length * 6;
                    const allDone = syncedSelected.asambleas.every(
                      (a) => a.stepsDone >= 6
                    );
                    return [
                      {
                        label: "Progreso medio",
                        value: `${avg}%`,
                        sub: "del acta",
                      },
                      {
                        label: "Pasos hechos",
                        value: `${totalSteps} / ${maxPossible}`,
                        sub: "suma etapas",
                      },
                      {
                        label: "Entrega",
                        value: allDone ? "Listas" : "En curso",
                        sub: allDone ? "✓" : "por asamblea",
                      },
                    ].map(({ label, value, sub }) => (
                      <div
                        key={label}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
                      >
                        <p className="mb-1.5 text-[9px] uppercase tracking-wider text-slate-400">
                          {label}
                        </p>
                        <p className="text-[18px] font-bold text-slate-900">
                          {value}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {sub}
                        </p>
                      </div>
                    ));
                  })()}
                </div>

                {syncedSelected.asambleas.map((a) => (
                  <ProcessCard
                    key={a.id}
                    conjunto={syncedSelected}
                    asamblea={a}
                    onAdvance={advance}
                    onRevert={revert}
                    busy={pending}
                  />
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
