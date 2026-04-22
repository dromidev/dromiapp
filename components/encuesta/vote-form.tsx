"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { defaultOptionsForType } from "@/lib/question-defaults";
import type { QuestionType } from "@/db/schema";
import { submitVoteAction, verifyVoteSessionAction } from "@/app/(encuesta)/vote-actions";

type Phase = "hydrating" | "codes" | "vote" | "done" | "already";

/** Código de acceso de la pregunta (va en el QR en #a=…); persiste en la pestaña al refrescar. */
function voteAccessStorageKey(publicId: string) {
  return `dromi:voteAccess:${publicId}`;
}

function readAccessCodeFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const ac =
    params.get("a") ?? params.get("access") ?? params.get("accessCode");
  if (!ac) return null;
  try {
    return decodeURIComponent(ac.replace(/\+/g, " "));
  } catch {
    return ac;
  }
}

export function VoteForm({ publicId }: { publicId: string }) {
  /** Código de acceso de la votación (desde QR / enlace o sessionStorage); no se muestra al usuario. */
  const [accessCode, setAccessCode] = useState("");
  const [assistantCode, setAssistantCode] = useState("");
  const [phase, setPhase] = useState<Phase>("hydrating");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState<{
    title: string;
    description: string | null;
    type: QuestionType;
    options: string[];
  } | null>(null);

  const choices = useMemo(() => {
    if (!question) return [];
    if (question.type === "multiple_choice") return question.options;
    return defaultOptionsForType(question.type);
  }, [question]);

  useLayoutEffect(() => {
    const storageKey = voteAccessStorageKey(publicId);
    let resolved = "";

    const fromHash = readAccessCodeFromHash();
    if (fromHash) {
      resolved = fromHash.trim();
      try {
        sessionStorage.setItem(storageKey, resolved);
      } catch {
        /* privado / bloqueado */
      }
      const path = window.location.pathname + window.location.search;
      window.history.replaceState(null, "", path);
    } else {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored?.trim()) resolved = stored.trim();
      } catch {
        /* ignorar */
      }
    }

    if (resolved) setAccessCode(resolved);
    setPhase("codes");
  }, [publicId]);

  /** Mismo dispositivo, otro copropietario: el servidor sigue impidiendo dos votos con el mismo código. */
  function resetForAnotherAssistant() {
    setAssistantCode("");
    setQuestion(null);
    setMessage(null);
    setPhase("codes");
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!accessCode.trim()) {
      setMessage(
        "Abre esta página desde el código QR o el enlace completo que te dio la administración. Si recargaste la página, vuelve a escanear el QR."
      );
      return;
    }
    if (!assistantCode.trim()) {
      setMessage("Ingresa el código que te entregó la administración.");
      return;
    }
    setLoading(true);
    const r = await verifyVoteSessionAction({
      publicId,
      accessCode,
      assistantCode,
    });
    setLoading(false);
    if (!r.ok) {
      if (r.code === "already_voted") {
        setMessage(null);
        setPhase("already");
        return;
      }
      setMessage(r.message);
      return;
    }
    setQuestion({
      title: r.question.title,
      description: r.question.description,
      type: r.question.type as QuestionType,
      options: r.question.options,
    });
    setPhase("vote");
  }

  async function onVote(choice: string) {
    setMessage(null);
    setLoading(true);
    const r = await submitVoteAction({
      publicId,
      accessCode,
      assistantCode,
      choice,
    });
    setLoading(false);
    if (!r.ok) {
      if (r.message?.includes("Ya has votado")) {
        setMessage(null);
        setPhase("already");
        return;
      }
      setMessage(r.message ?? "Error");
      return;
    }
    setPhase("done");
    setMessage(null);
  }

  if (phase === "hydrating") {
    return (
      <div
        className="flex min-h-[120px] w-full items-center justify-center px-2 text-center text-sm text-zinc-400"
        aria-busy="true"
      >
        Cargando…
      </div>
    );
  }

  if (phase === "already") {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-center">
        <p className="text-lg font-medium text-amber-100">
          Ese código ya votó en esta pregunta
        </p>
        <p className="mt-2 text-sm text-amber-200/80">
          Cada copropietario puede emitir un solo voto. Si otra persona usa este
          mismo teléfono o computador, puede ingresar{" "}
          <span className="font-medium text-amber-100">su</span> código de
          copropietario.
        </p>
        <button
          type="button"
          onClick={resetForAnotherAssistant}
          className="mx-auto mt-6 w-auto min-w-[10rem] max-w-xs rounded-lg border border-amber-400/50 bg-amber-950/40 px-6 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-950/70"
        >
          Ingresar otro código
        </button>
        <p className="mt-3 text-xs text-amber-200/60">
          También puedes actualizar la página para volver al formulario.
        </p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center sm:p-6">
        <p className="text-lg font-medium text-emerald-100">
          Voto registrado exitosamente
        </p>
        <p className="mt-2 text-sm text-emerald-200/80">Gracias por participar.</p>
        <p className="mt-4 text-sm text-emerald-200/85">
          ¿Otra persona votará con este mismo dispositivo? Ingresa el código que
          le entregó la administración.
        </p>
        <button
          type="button"
          onClick={resetForAnotherAssistant}
          className="mx-auto mt-4 w-auto min-w-[10rem] max-w-xs rounded-lg border border-emerald-400/50 bg-emerald-950/40 px-6 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-950/70"
        >
          Ingresar otro código
        </button>
        <p className="mt-3 text-xs text-emerald-200/60">
          También puedes actualizar la página.
        </p>
      </div>
    );
  }

  if (phase === "vote" && question) {
    const noMcOptions =
      question.type === "multiple_choice" && choices.length === 0;

    return (
      <div className="mx-auto w-full max-w-lg space-y-6 px-0">
        <div className="text-center">
          <h2 className="text-balance text-xl font-semibold text-white sm:text-2xl">
            {question.title}
          </h2>
          {question.description ? (
            <p className="mt-2 text-pretty text-sm text-white/90 sm:text-base">
              {question.description}
            </p>
          ) : null}
        </div>
        {noMcOptions ? (
          <div
            className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-center"
            role="alert"
          >
            <p className="text-sm font-medium text-amber-100">
              Esta pregunta no tiene opciones de respuesta configuradas.
            </p>
            <p className="mt-2 text-xs text-amber-200/80">
              Quien creó la votación debe editar la pregunta en el panel o crearla
              de nuevo con al menos dos opciones (por línea o separadas por coma).
            </p>
          </div>
        ) : null}
        {!noMcOptions ? (
          <div className="flex flex-col items-center gap-3">
            {choices.map((c, idx) => (
              <button
                key={`${idx}-${c}`}
                type="button"
                disabled={loading}
                onClick={() => onVote(c)}
                className="w-full max-w-xs rounded-xl bg-[#1E6FFF] px-5 py-4 text-center text-sm font-medium text-white shadow-sm transition hover:bg-[#185dcc] disabled:opacity-50 sm:text-base"
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}
        {message ? (
          <p className="text-center text-sm text-red-400" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={onVerify}
      className="mx-auto flex w-full max-w-lg flex-col items-center gap-5 px-1 sm:px-2"
    >
      <div className="w-full max-w-[17.5rem] space-y-1 sm:max-w-xs">
        <label
          htmlFor="assistant-code"
          className="block text-center text-sm font-medium leading-snug text-white"
        >
          Código que te entregó la administración
        </label>
        <p className="text-balance px-0.5 text-center text-xs leading-relaxed text-zinc-400">
          Es el código de tu unidad o copropietario para esta votación.
        </p>
        <input
          id="assistant-code"
          value={assistantCode}
          onChange={(e) => setAssistantCode(e.target.value)}
          required
          autoComplete="off"
          inputMode="text"
          className="mx-auto mt-3 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-center text-sm font-medium text-zinc-900 shadow-sm outline-none ring-[#1E6FFF]/35 placeholder:text-zinc-400 focus:border-[#1E6FFF] focus:ring-2 sm:py-2"
          placeholder=""
        />
      </div>
      {message ? (
        <p
          className="max-w-sm px-2 text-center text-sm text-red-400"
          role="alert"
        >
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-auto min-w-[10.5rem] rounded-lg bg-[#1E6FFF] px-8 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#185dcc] disabled:opacity-60"
      >
        {loading ? "Verificando…" : "Continuar"}
      </button>
    </form>
  );
}
