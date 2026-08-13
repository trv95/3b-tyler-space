export function num(n: number): string {
  return n.toLocaleString("en-US");
}

export function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  const v = (part / whole) * 100;
  return `${v < 10 && v > 0 ? v.toFixed(1) : Math.round(v)}%`;
}

export function duration(hours: number | null): string {
  if (hours == null || !Number.isFinite(hours)) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 60) return `${days < 10 ? days.toFixed(1) : Math.round(days)}d`;
  return `${(days / 30.44).toFixed(1)}mo`;
}

export function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "unknown";
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function dateLabel(iso: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function tenantHost(tenant: string): string {
  try {
    return new URL(tenant).host;
  } catch {
    return tenant;
  }
}
