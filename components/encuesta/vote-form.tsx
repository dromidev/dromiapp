"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { defaultOptionsForType } from "@/lib/question-defaults";
import type { QuestionType } from "@/db/schema";
import { submitVoteAction, verifyVoteSessionAction } from "@/app/(encuesta)/vote-actions";

type Phase = "codes" | "vote" | "done" | "already";

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
  const [accessCode, setAccessCode] = useState("");
  const [assistantCode, setAssistantCode] = useState("");
  /** true si el enlace del QR (u otro) trae el código de acceso en #a=… */
  const [accessFromQrLink, setAccessFromQrLink] = useState(false);
  const [phase, setPhase] = useState<Phase>("codes");
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
    const fromHash = readAccessCodeFromHash();
    if (!fromHash) return;
    setAccessCode(fromHash.trim());
    setAccessFromQrLink(true);
    const path = window.location.pathname + window.location.search;
    window.history.replaceState(null, "", path);
  }, []);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!accessCode.trim()) {
      setMessage(
        "Falta el código de acceso de la votación. Usa el enlace completo del QR o pídelo a la administración."
      );
      return;
    }
    if (!assistantCode.trim()) {
      setMessage("Ingresa el código único de tu apartamento (según el CSV).");
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
        setPhase("already");
        setMessage(r.message);
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
        setPhase("already");
      }
      setMessage(r.message ?? "Error");
      return;
    }
    setPhase("done");
    setMessage(r.message);
  }

  if (phase === "already") {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-center">
        <p className="text-lg font-medium text-amber-100">Ya has votado por esta pregunta</p>
        <p className="mt-2 text-sm text-amber-200/80">
          Cada copropietario puede emitir un solo voto por votación.
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
      {accessFromQrLink ? (
        <p className="rounded-lg border border-[#1E6FFF]/30 bg-[#1E6FFF]/10 px-3 py-2 text-xs text-zinc-300">
          Acceso reconocido desde el QR. Ingresa solo el{" "}
          <strong className="text-white">código único de tu apartamento</strong>{" "}
          (el que cargó la administración en el listado CSV).
        </p>
      ) : (
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Código de acceso de la votación
          </label>
          <input
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            required
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none ring-[#1E6FFF]/40 focus:ring-2"
            placeholder="Te lo indica la administración (junto al enlace o el QR)"
          />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Código único de tu apartamento
        </label>
        <input
          value={assistantCode}
          onChange={(e) => setAssistantCode(e.target.value)}
          required
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none ring-[#1E6FFF]/40 focus:ring-2"
          placeholder="El de tu fila en el CSV (un código por unidad)"
        />
        <p className="mt-1 text-xs text-zinc-600">
          Debe coincidir exactamente con la columna de código que subió la
          administración para tu torre y apartamento.
        </p>
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
