export function hours(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (v < 1) return `${Math.round(v * 60)}m`;
  if (v < 48) return `${v < 10 ? v.toFixed(1) : Math.round(v)}h`;
  return `${(v / 24).toFixed(v / 24 < 10 ? 1 : 0)}d`;
}

export function pct(v: number | null | undefined, digits = 0): string {
  return v === null || v === undefined ? "—" : `${v.toFixed(digits)}%`;
}

export function num(v: number | null | undefined, digits = 0): string {
  return v === null || v === undefined ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const ticks: number[] = [];
  for (let t = 0; t <= max + step * 0.001; t += step) ticks.push(t);
  return ticks;
}
