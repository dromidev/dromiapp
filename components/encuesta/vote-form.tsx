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
        className="flex min-h-[100px] items-center justify-center text-sm text-zinc-500"
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
          className="mt-6 w-full rounded-lg border border-amber-400/50 bg-amber-950/40 px-4 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-950/70"
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
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
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
          className="mt-4 w-full rounded-lg border border-emerald-400/50 bg-emerald-950/40 px-4 py-2.5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-950/70"
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
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white">{question.title}</h2>
          {question.description ? (
            <p className="mt-2 text-sm text-zinc-400">{question.description}</p>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {choices.map((c) => (
            <button
              key={c}
              type="button"
              disabled={loading}
              onClick={() => onVote(c)}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-4 text-left text-sm font-medium text-white transition hover:border-[#1E6FFF] hover:bg-zinc-800 disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>
        {message ? (
          <p className="text-sm text-red-400" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onVerify} className="space-y-5">
      <div>
        <label
          htmlFor="assistant-code"
          className="block text-sm font-medium text-zinc-200"
        >
          Código que te entregó la administración
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          Es el código de tu unidad o copropietario para esta votación.
        </p>
        <input
          id="assistant-code"
          value={assistantCode}
          onChange={(e) => setAssistantCode(e.target.value)}
          required
          autoComplete="off"
          className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none ring-[#1E6FFF]/40 focus:ring-2"
          placeholder=""
        />
      </div>
      {message ? (
        <p className="text-sm text-red-400" role="alert">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#1E6FFF] py-2.5 text-sm font-medium text-white transition hover:bg-[#185dcc] disabled:opacity-60"
      >
        {loading ? "Verificando…" : "Continuar"}
      </button>
    </form>
  );
}
