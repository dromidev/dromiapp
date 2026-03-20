"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

export function ProjectionClient({ publicId }: { publicId: string }) {
  const [live, setLive] = useState<LiveResults | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/questions/${publicId}/results`, {
        cache: "no-store",
      });
      if (!res.ok || cancelled) return;
      const j = (await res.json()) as LiveResults;
      if (!cancelled) setLive(j);
    }
    void load();
    const id = window.setInterval(() => void load(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [publicId]);

  if (!live) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#05080c] text-zinc-500">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05080c] to-[#0f1419] px-8 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-sm uppercase tracking-[0.35em] text-zinc-500">
          Resultados en vivo
        </p>
        <h1 className="mt-4 text-center font-serif text-4xl font-semibold leading-tight md:text-5xl">
          {live.question.title}
        </h1>
        {live.question.description ? (
          <p className="mx-auto mt-4 max-w-3xl text-center text-lg text-zinc-400">
            {live.question.description}
          </p>
        ) : null}

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur">
            <p className="text-sm text-zinc-400">Participación</p>
            <p className="mt-2 text-5xl font-bold text-[#00C9A7]">
              {live.participation.participationPercent}%
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              {live.participation.votedCount} / {live.participation.totalAssistants} asistentes
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur md:col-span-2">
            <p className="text-sm text-zinc-400">Total votos</p>
            <p className="mt-2 text-5xl font-bold text-[#1E6FFF]">{live.total}</p>
            <p className="mt-3 text-lg text-zinc-300">
              {live.total === 0
                ? "Aún no hay votos"
                : live.tie
                  ? "Empate entre opciones líderes"
                  : live.winner
                    ? `Opción líder: ${live.winner}`
                    : ""}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              {live.question.isOpen ? "Votación abierta" : "Votación cerrada"}
            </p>
          </div>
        </div>

        <div className="mt-14 h-[min(52vh,520px)] w-full rounded-2xl border border-white/10 bg-black/20 p-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={live.breakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="label"
                stroke="#a1a1aa"
                tick={{ fill: "#e4e4e7", fontSize: 14 }}
              />
              <YAxis stroke="#a1a1aa" allowDecimals={false} tick={{ fill: "#e4e4e7" }} />
              <Tooltip
                contentStyle={{
                  background: "#09090b",
                  border: "1px solid #3f3f46",
                  fontSize: 14,
                }}
                labelStyle={{ color: "#fafafa" }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {live.breakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
