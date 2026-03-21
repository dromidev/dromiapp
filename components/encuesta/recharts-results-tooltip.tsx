/** Recharts puede entregar `percent` como 0–1 o como 0–100 según el contexto. */
export function formatPieSectorPercent(percent: number): number {
  const p = Number(percent);
  if (!Number.isFinite(p)) return 0;
  return p > 1 ? Math.round(p) : Math.round(p * 100);
}

/** Referencia estable para `<Pie label={…} />` y evitar re-animaciones por función inline. */
export function PieResultsSectorLabel(props: {
  name?: string;
  percent?: number;
}) {
  const name = String(props.name ?? "");
  const pct = formatPieSectorPercent(props.percent ?? 0);
  return `${name}: ${pct}%`;
}

type TooltipContentArgs = {
  active?: boolean;
  payload?: { value?: unknown; name?: string }[];
  label?: string;
};

export function ResultsChartTooltip({
  active,
  payload,
  label,
}: TooltipContentArgs) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const value = row?.value;
  const title = String(label ?? row?.name ?? "");
  return (
    <div className="rounded-lg border border-zinc-500 bg-zinc-800 px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-sm text-white">
        Conteo:{" "}
        <span className="font-semibold tabular-nums">{String(value)}</span>
      </p>
    </div>
  );
}
