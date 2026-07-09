// Formatting helpers shared by every view. Locale is pl-PL; API timestamps are
// UTC ClickHouse strings and are rendered in the viewer's local time.

const nf0 = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const nf2 = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2 });

/**
 * Parse a ClickHouse UTC string ("YYYY-MM-DD HH:MM:SS[.mmm]") into a Date.
 * Explicitly treated as UTC.
 */
export function parseTs(s: string): Date {
  return new Date(s.replace(" ", "T") + "Z");
}

export function tsToMs(s: string): number {
  return parseTs(s).getTime();
}

/** Unix-seconds axis value for uPlot (which expects seconds). */
export function tsToUnix(s: string): number {
  return parseTs(s).getTime() / 1000;
}

export function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return nf0.format(n);
}

export function fmtNum(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return (digits === 0 ? nf0 : digits === 2 ? nf2 : nf1).format(n);
}

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${fmtNum(n, digits)}%`;
}

/** Bytes → human units (B / KB / MB / GB), base-1024. */
export function fmtBytes(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(Math.abs(n)) / Math.log(1024)));
  const v = n / Math.pow(1024, i);
  return `${fmtNum(v, v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Milliseconds → adaptive µs / ms / s / min. */
export function fmtMs(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n < 1) return `${fmtNum(n * 1000, 0)} µs`;
  if (n < 1000) return `${fmtNum(n, n < 10 ? 1 : 0)} ms`;
  if (n < 60000) return `${fmtNum(n / 1000, 1)} s`;
  return `${fmtNum(n / 60000, 1)} min`;
}

/** Local clock HH:MM:SS from a ClickHouse UTC string. */
export function fmtClock(s: string): string {
  return parseTs(s).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Local date + time from a ClickHouse UTC string. */
export function fmtDateTime(s: string): string {
  return parseTs(s).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** "przed chwilą" / "N min temu" / "N godz. temu" relative to now. */
export function fmtRelative(s: string, now = Date.now()): string {
  const diff = now - tsToMs(s);
  if (!Number.isFinite(diff)) return "—";
  const sec = Math.round(diff / 1000);
  if (sec < 5) return "przed chwilą";
  if (sec < 60) return `${sec} s temu`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min temu`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} godz. temu`;
  const d = Math.round(hr / 24);
  return `${d} dni temu`;
}

/** Title-case a city id for display (e.g. "wroclaw" → "Wrocław" isn't safe, so
 *  just capitalize; keep raw id available separately). */
export function cityLabel(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}
